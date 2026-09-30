-- Admin-managed menu changes. Static services remain the fallback; these rows
-- override an existing service or add a new service without a code deployment.
create table public.menu_service_overrides (
  id text primary key check (length(id) between 1 and 100),
  name text not null check (length(name) between 2 and 100),
  category text not null check (length(category) between 2 and 60),
  audiences text[] not null check (array_ndims(audiences) = 1 and array_lower(audiences,1) = 1 and cardinality(audiences) = 1 and audiences[1] is not null and audiences[1] in ('men','women','groom')),
  price integer not null check (price between 0 and 200000),
  status text not null default 'confirmed' check (status in ('draft','confirmed')),
  is_custom boolean not null default false,
  is_hidden boolean not null default false,
  sort_order integer not null default 10000 check (sort_order between 0 and 2000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groom_package_identity check ((audiences[1] = 'groom') = (id = 'groom-package'))
);

alter table public.menu_service_overrides enable row level security;
revoke all on public.menu_service_overrides from public, anon, authenticated;
grant select, insert, update on public.menu_service_overrides to authenticated;
grant all on public.menu_service_overrides to service_role;

create policy admin_read_menu_services on public.menu_service_overrides for select to authenticated
  using (public.is_studio_admin());
create policy admin_create_menu_services on public.menu_service_overrides for insert to authenticated
  with check (public.is_studio_admin());
create policy admin_update_menu_services on public.menu_service_overrides for update to authenticated
  using (public.is_studio_admin()) with check (public.is_studio_admin());

create trigger menu_service_overrides_updated before update on public.menu_service_overrides
  for each row execute function public.touch_admin_updated_at();
