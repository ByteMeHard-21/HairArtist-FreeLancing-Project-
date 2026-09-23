
-- Membership is provisioned by a project owner, never by public signup.
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'ADMIN' check (role = 'ADMIN'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;
-- AAL1 may read only its own membership to reach MFA enrollment, no customer data.
create policy own_admin_membership on public.admin_users for select to authenticated using (user_id = (select auth.uid()));

create function public.is_studio_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    and exists(select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'ADMIN' and is_active);
$$;
revoke all on function public.is_studio_admin() from public, anon;
grant execute on function public.is_studio_admin() to authenticated;

grant select on public.bookings, public.booking_notifications to authenticated;
create policy admin_read_bookings on public.bookings for select to authenticated using ((select public.is_studio_admin()));
create policy admin_read_notifications on public.booking_notifications for select to authenticated using ((select public.is_studio_admin()));

grant select, insert, update, delete on public.availability_exceptions to authenticated;
create policy admin_exceptions on public.availability_exceptions for all to authenticated
using ((select public.is_studio_admin())) with check ((select public.is_studio_admin()));
grant select, insert, update on public.public_announcements to authenticated;
create policy admin_notices on public.public_announcements for all to authenticated
using ((select public.is_studio_admin())) with check ((select public.is_studio_admin()));

create index bookings_admin_dates on public.bookings (appointment_date,slot_start,id);
create index bookings_customer_search on public.bookings (lower(customer_name) text_pattern_ops);
create index notifications_undelivered on public.booking_notifications(created_at) where delivered_at is null;

create function public.touch_admin_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger admin_users_updated before update on public.admin_users for each row execute function public.touch_admin_updated_at();
create trigger announcements_updated before update on public.public_announcements for each row execute function public.touch_admin_updated_at();

-- Only the allowed status transition is exposed; historical customer fields cannot be edited.
create function public.cancel_studio_booking(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare changed uuid;
begin
  if not public.is_studio_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.bookings set status='CANCELLED',updated_at=now() where id=p_id and status='CONFIRMED' returning id into changed;
  return changed;
end $$;
revoke all on function public.cancel_studio_booking(uuid) from public,anon;
grant execute on function public.cancel_studio_booking(uuid) to authenticated;

-- System-only architecture. No automatic job until the expiration rule is approved.
-- A scheduler supplies a cutoff; future appointments can never be expired.
create function public.expire_studio_bookings(p_before timestamptz) returns integer
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if p_before is null or p_before > now() then raise exception 'INVALID_CUTOFF'; end if;
  update public.bookings set status='EXPIRED',updated_at=now()
    where status='CONFIRMED' and (appointment_date + slot_end) at time zone 'Asia/Kolkata' < p_before;
  get diagnostics changed = row_count;
  return changed;
end $$;
revoke all on function public.expire_studio_bookings(timestamptz) from public,anon,authenticated;
grant execute on function public.expire_studio_bookings(timestamptz) to service_role;
