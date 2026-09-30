# Admin menu management

Implemented locally on 30 September 2026. Not pushed or deployed in this task.

## Behavior

- `/admin/menu`, accessible through the existing admin navigation, lists services with search and audience filters.
- Active administrators can add Men's/Women's services, edit names/categories/prices, and hide or restore services.
- The existing Groom package supports price and visibility edits while preserving its approved content.
- Data is saved in Supabase. The homepage's featured prices and `/menu` use the same catalogue on each new request. New services appear in the full menu without adding homepage cards.
- Hidden items remain editable; no destructive delete operation is exposed.
- Public layout, service content/prices, and booking records are unchanged until an administrator saves an edit. The preserved online-booking service list remains separate; current public booking uses call/WhatsApp.

## Implementation

- `src/app/admin/menu/page.tsx`, `src/components/admin-menu.tsx`, `src/app/admin/admin.css`: protected page and responsive editor.
- `src/components/admin-dashboard.tsx`, `src/components/admin-auth.tsx`: navigation and actionable errors.
- `src/app/api/admin/[action]/route.ts`: authenticated `GET services`, `POST service-create`, and `POST service-update` operations.
- `src/lib/menu-service-input.ts`: strict server input validation; whole INR prices from 0 to 200000; no caller-controlled IDs on create or persistence flags.
- `src/lib/menu-services.ts`, `src/lib/menu-services-server.ts`: merge approved defaults with stored overrides/custom services, paginate reads, filter hidden items, and handle unavailable data.
- `src/data/services.ts`: categories can be added without a code change; original prices and pricing note retained.
- Homepage, menu page, service preview, catalogue, and Groom card: consume current server data.
- `supabase/migrations/202609270001_menu_service_overrides.sql`: table, constraints, timestamps, and active-admin RLS policies.

## Security and failure handling

Writes reuse the existing session/membership and same-origin checks and an auth-scoped Supabase client. RLS independently checks active studio-admin membership. Anonymous/non-admin writes and destructive deletes are denied. Secrets remain server-only.

The editor cannot save before its initial catalogue loads successfully. Missing migration errors identify the setup step; Refresh recovers after setup. The public site uses the approved defaults before database setup. General database failures show unavailability rather than restoring old prices or previously hidden services.

## Verification

- `npm test`: 9 tests passed, including real SQL migration/RLS checks in PGlite and input/merge tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; `/admin/menu`, `/menu`, and `/` render dynamically.
- `npm run test:admin`: passed against isolated local provider fixtures with real Next routes and Edge/Playwright. Covered edit and reload persistence; public homepage/menu price propagation; women's service/category creation; hiding; Groom pricing; mobile save/focus; unauthorized/deactivated/foreign-origin/invalid-input rejection; missing migration recovery; and database outage behavior.
- Editor checked at 360, 390, 768, and 1440 pixels with no horizontal overflow. Desktop/mobile screenshots reviewed; no browser page errors.
- Existing admin login, availability, appointments, cancellation and recovery regression checks passed.
- No production prices, accounts, or booking rows were modified. Temporary browser-test servers are stopped by the test runner.

## Live-site activation required

A read-only request to the configured Supabase project returned `404 / PGRST205` for `menu_service_overrides`: the new table is not yet installed.

1. In the existing Supabase project's SQL Editor, run `supabase/migrations/202609270001_menu_service_overrides.sql`. The previous booking/admin migrations must already be installed; do not rerun them on the existing database.
2. Commit/push these changes and deploy on Vercel.
3. Sign in with an active administrator and open **Service menu**. Save an intended client-approved price change, then reload the public menu to confirm it.

No new environment variables are needed. Existing Supabase URL, anon key and server-only service role key are reused. Production migration/deployment and a live price edit were not performed in this task.
