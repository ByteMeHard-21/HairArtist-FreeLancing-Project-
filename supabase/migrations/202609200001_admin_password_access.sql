-- Approved change: email/password sessions may access the studio dashboard.
-- Membership and all existing RLS/table privileges remain enforced.
create or replace function public.is_studio_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid()) and role = 'ADMIN' and is_active
  );
$$;
revoke all on function public.is_studio_admin() from public, anon;
grant execute on function public.is_studio_admin() to authenticated;
