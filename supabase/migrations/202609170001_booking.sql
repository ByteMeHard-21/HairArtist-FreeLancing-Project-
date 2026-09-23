-- ============================================================================
-- 1. ENUMS, SEQUENCES, AND CORE TABLES
-- ============================================================================
-- Private operational tables. Customers never query PostgREST directly.
create type public.booking_status as enum ('CONFIRMED', 'CANCELLED', 'EXPIRED');

create sequence public.booking_reference_seq start 100001;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text unique not null default ('JIAA-' || nextval('public.booking_reference_seq')),
  appointment_date date not null,
  slot_start time not null,
  slot_end time not null,
  customer_name text not null check (length(customer_name) between 2 and 100),
  gender text not null check (gender in ('men','women')),
  mobile_number text not null check (mobile_number ~ '^\+91[6-9][0-9]{9}$'),
  service text not null check (length(service) between 1 and 100),
  status public.booking_status not null default 'CONFIRMED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

-- Business rules: Slots must start exactly on the hour and last exactly 1 hour
  check (extract(minute from slot_start) = 0 and extract(second from slot_start) = 0),
  check (slot_end - slot_start = interval '1 hour')
);

-- Index to quickly find confirmed bookings for a specific date and time slot
create index bookings_slot on public.bookings (appointment_date,slot_start) where status='CONFIRMED';

-- ============================================================================
-- 2. AVAILABILITY, ANNOUNCEMENTS, AND CHALLENGES
-- ============================================================================
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(), date date unique not null,
  reason text not null check (length(reason) between 1 and 200),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Singleton table for public announcements (enforced by check id=1)
create table public.public_announcements (
  id integer primary key default 1 check (id=1), message text not null check (length(message)<=500),
  active boolean not null default false, start_date date not null, end_date date not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_date>=start_date)
);
-- An OTP challenge is NOT a booking. It expires without ever reserving capacity.
create table public.booking_challenges (
  id uuid primary key, proof_hash text not null, payload jsonb not null,
  provider_id text, attempts integer not null default 0 check (attempts between 0 and 5),
  lease_token uuid, lease_until timestamptz,
  booking_id uuid unique references public.bookings(id),
  expires_at timestamptz not null default now()+interval '10 minutes',
  created_at timestamptz not null default now()
);

create table public.booking_rate_limits (
  key text primary key, count integer not null, expires_at timestamptz not null
);
-- Durable notification outbox: a provider failure never rolls back a booking.
create table public.booking_notifications (
  booking_id uuid primary key references public.bookings(id),
   attempts integer not null default 0,
  delivered_at timestamptz, last_error text, 
  lease_token uuid, lease_until timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. TRIGGERS: CAPACITY ENFORCEMENT & DATE LOCKING
-- ============================================================================

create function public.enforce_booking_capacity() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  new.updated_at := now();
  if new.status='CONFIRMED' then
    -- Every writer, including exception creation, takes the same date lock.
    perform pg_advisory_xact_lock(hashtextextended(new.appointment_date::text,42));
    if new.appointment_date < (now() at time zone 'Asia/Kolkata')::date or
       new.appointment_date > (now() at time zone 'Asia/Kolkata')::date + 14 or
       (new.appointment_date + new.slot_start) at time zone 'Asia/Kolkata' <= now() then
      raise exception 'SLOT_UNAVAILABLE' using errcode='P0001';
    end if;

     -- Check if the date is blocked by an exception
    if exists(select 1 from public.availability_exceptions where date=new.appointment_date) then
      raise exception 'DATE_UNAVAILABLE' using errcode='P0001';
    end if;

     -- Enforce maximum capacity of 3 bookings per slot
    if (select count(*) from public.bookings where appointment_date=new.appointment_date and slot_start=new.slot_start and status='CONFIRMED' and id<>new.id) >= 3 then
      raise exception 'SLOT_UNAVAILABLE' using errcode='P0001';
    end if;
  end if;
  return new;
end $$;

create trigger booking_capacity before insert or update on public.bookings for each row execute function public.enforce_booking_capacity();

create function public.lock_availability_exception() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.date::text,42));
  new.updated_at:=now(); return new;
end $$;

create trigger exception_lock before insert or update on public.availability_exceptions for each row execute function public.lock_availability_exception();

-- ============================================================================
-- 4. RATE LIMITING LOGIC
-- ============================================================================


create function public.consume_booking_limits(p_limits jsonb) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; n integer;
begin
-- Cleanup expired records
  delete from public.booking_rate_limits where expires_at<now()-interval '1 day';
  delete from public.booking_challenges where expires_at<now()-interval '1 day';
  -- Process each limit rule
  for r in select value from jsonb_array_elements(p_limits) order by value->>'key' loop
    insert into public.booking_rate_limits as limits(key,count,expires_at)
      values(r->>'key',1,now()+make_interval(secs=>(r->>'seconds')::integer))
    on conflict(key) do update set
      count=case when limits.expires_at<=now() then 1 else limits.count+1 end,
      expires_at=case when limits.expires_at<=now() then excluded.expires_at else limits.expires_at end
    returning count into n;
     -- Return false if limit is breached
    if n>(r->>'limit')::integer then return false; end if;
  end loop;
  return true;
end $$;

-- ============================================================================
-- 5. OTP VERIFICATION FLOW
-- ============================================================================

create function public.claim_booking_verification(p_id uuid,p_hash text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.booking_challenges; token uuid;
begin
  select * into c from public.booking_challenges where id=p_id and proof_hash=p_hash for update;
  if not found then return jsonb_build_object('error','OTP_EXPIRED'); end if;
  if c.booking_id is not null then return jsonb_build_object('booking',(select to_jsonb(b) from public.bookings b where id=c.booking_id)); end if;
  if c.expires_at<=now() then return jsonb_build_object('error','OTP_EXPIRED'); end if;
  if c.attempts>=5 then return jsonb_build_object('error','OTP_ATTEMPTS'); end if;
  if c.lease_until>now() then return jsonb_build_object('error','VERIFY_BUSY'); end if;
  if c.provider_id is null then return jsonb_build_object('error','OTP_UNAVAILABLE'); end if;

  -- Lease the challenge to prevent concurrent verification attempts
  token:=gen_random_uuid();
  update public.booking_challenges set attempts=attempts+1,lease_token=token,lease_until=now()+interval '30 seconds' where id=p_id;
  return jsonb_build_object('token',token,'providerId',c.provider_id,'payload',c.payload);
end $$;

create function public.release_booking_verification(p_id uuid,p_token uuid) returns void language sql security definer set search_path=public,pg_temp as $$
  update public.booking_challenges set lease_until=null,lease_token=null where id=p_id and lease_token=p_token;
$$;

-- ============================================================================
-- 6. BOOKING CONFIRMATION & NOTIFICATIONS
-- ============================================================================

-- Service-role-only: called exclusively AFTER the server's provider verification succeeds.
create function public.confirm_verified_booking(p_id uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.booking_challenges; b public.bookings;
begin
  select * into c from public.booking_challenges where id=p_id and lease_token=p_token for update;
  if not found then return jsonb_build_object('error','OTP_EXPIRED'); end if;
  if c.booking_id is not null then return jsonb_build_object('booking',(select to_jsonb(x) from public.bookings x where id=c.booking_id),'created',false); end if;
  if c.expires_at<=now() or c.lease_until<=now() then return jsonb_build_object('error','OTP_EXPIRED'); end if;
  begin

  -- Insert the actual booking (triggers capacity checks)
    insert into public.bookings(appointment_date,slot_start,slot_end,customer_name,gender,mobile_number,service)
    values((c.payload->>'date')::date,(c.payload->>'start')::time,(c.payload->>'end')::time,
      c.payload->>'name',c.payload->>'gender',c.payload->>'mobile',c.payload->>'service') returning * into b;
  exception when sqlstate 'P0001' then
    return jsonb_build_object('error',sqlerrm);
  end;

  -- Link challenge to booking and queue notification
  update public.booking_challenges set booking_id=b.id where id=p_id;
  insert into public.booking_notifications(booking_id) values(b.id);
  return jsonb_build_object('booking',to_jsonb(b),'created',true);
end $$;

create function public.claim_booking_notification(p_id uuid) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare token uuid:=gen_random_uuid(); matched uuid;
begin
  update public.booking_notifications set lease_token=token,lease_until=now()+interval '60 seconds',attempts=attempts+1
  where booking_id=p_id and delivered_at is null and (lease_until is null or lease_until<now()) returning booking_id into matched;
  if matched is null then return null; end if;
  return token;
end $$;

-- ============================================================================
-- 7. SECURITY: ROW LEVEL SECURITY & PERMISSIONS
-- ============================================================================

alter table public.bookings enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.public_announcements enable row level security;
alter table public.booking_challenges enable row level security;
alter table public.booking_rate_limits enable row level security;
alter table public.booking_notifications enable row level security;

-- Revoke all default access from public, anon, and authenticated roles
revoke all on public.bookings,public.availability_exceptions,public.public_announcements,public.booking_challenges,public.booking_rate_limits,public.booking_notifications from public,anon,authenticated;
revoke all on sequence public.booking_reference_seq from public,anon,authenticated;

-- Grant full access exclusively to the service_role
grant all on public.bookings,public.availability_exceptions,public.public_announcements,public.booking_challenges,public.booking_rate_limits,public.booking_notifications to service_role;
grant usage,select on sequence public.booking_reference_seq to service_role;

-- Revoke and grant function execution exclusively to the service_role
revoke execute on function public.consume_booking_limits(jsonb),public.claim_booking_verification(uuid,text),public.release_booking_verification(uuid,uuid),public.confirm_verified_booking(uuid,uuid),public.claim_booking_notification(uuid) from public,anon,authenticated;
grant execute on function public.consume_booking_limits(jsonb),public.claim_booking_verification(uuid,text),public.release_booking_verification(uuid,uuid),public.confirm_verified_booking(uuid,uuid),public.claim_booking_notification(uuid) to service_role;
