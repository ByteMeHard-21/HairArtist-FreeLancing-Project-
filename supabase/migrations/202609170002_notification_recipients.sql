-- Preserve existing David delivery state; enqueue both recipients only for new confirmations.
alter table public.booking_notifications add column recipient text not null default 'david' check (recipient in ('david','customer'));
alter table public.booking_notifications drop constraint booking_notifications_pkey;
alter table public.booking_notifications add primary key (booking_id,recipient);
drop function public.claim_booking_notification(uuid);
create function public.claim_booking_notification(p_id uuid,p_recipient text default 'david') returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare token uuid:=gen_random_uuid(); matched uuid;
begin
  update public.booking_notifications set lease_token=token,lease_until=now()+interval '60 seconds',attempts=attempts+1
  where booking_id=p_id and recipient=p_recipient and delivered_at is null and (lease_until is null or lease_until<now()) returning booking_id into matched;
  if matched is null then return null; end if;
  return token;
end $$;
revoke execute on function public.claim_booking_notification(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_booking_notification(uuid,text) to service_role;

create or replace function public.confirm_verified_booking(p_id uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
  insert into public.booking_notifications(booking_id,recipient) values(b.id,'david'),(b.id,'customer');
  return jsonb_build_object('booking',to_jsonb(b),'created',true);
end $$;
