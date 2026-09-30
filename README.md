# David Siddharth — JIAA Studio

Responsive Next.js App Router website for David Siddharth at JIAA Studio Unisex Salon, Anand. One codebase serves desktop, tablet, and mobile.

## Current features

- Homepage portfolio with men's and women's work, artist profile, testimonials, live availability notice, and location map.
- Dedicated `/menu` page with Men, Women, and Groom service cards.
- Shared **Book a visit** dialog: **Call David** opens the native phone handler; **Message David** opens WhatsApp with an editable booking message. No message is sent automatically.
- Private `/admin/login` and admin tools backed by Supabase, including `/admin/menu` for prices, service names/categories, new services, and visibility.
- Existing `/book`, OTP, capacity, and booking notification implementation preserved for future use. Public booking buttons use contact mode. The `/book` route and APIs still exist; the contact-mode flag is not a backend access restriction.

## Local development

Use a Node.js version supported by the installed Next.js package (minimum 20.9).

```sh
npm ci
```

Copy `.env.example` to `.env.local` and configure the required values locally. Never commit `.env.local` or real credentials.

```sh
npm run dev
```

## Checks and production build

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

Browser tests require Playwright and the browser used by each test. With the local server running, `npm run test:contact-booking` checks the shared contact dialog; `npm run test:touch` checks contact interactions. Some other suites use isolated local fixtures; `test:remote` exercises a configured database and should only be run intentionally against a suitable test environment.

## Deployment configuration

Deploy as a Next.js application with server support, not a static-only export. Install with `npm ci` and build with `npm run build`. The build script copies MapLibre worker files into `public/maplibre`; include the generated files in the deployment.

Configure environment variables in the hosting provider's secret/environment settings using `.env.example` as the template:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` support admin/data features.
- `BOOKING_HMAC_SECRET` must be a cryptographically random secret of at least 32 characters.
- `APP_ORIGIN` must be the deployed HTTPS origin; configure Supabase Auth site/redirect URLs for the deployed site's authentication and recovery routes.
- `TRUSTED_CLIENT_IP_HEADER` is optional and must only name a header overwritten by the trusted hosting proxy.
- Verification and WhatsApp notification gateway settings belong to the preserved online booking system. They are not required to open the current call/WhatsApp dialog. Do not enable online booking until those integrations are configured and verified.

Apply the SQL migrations in `supabase/migrations` in order for a new database. For an existing configured database, review its migration history before applying anything. Admin authorization is controlled by `public.admin_users`; see `scripts/provision-admin.sql` and the admin implementation report.

`npm run start` binds to localhost for local preview. A self-hosted deployment that requires a public listener can use `npx next start --hostname 0.0.0.0` with the host's configured port. Managed Next.js hosts use their own runtime integration.

Before launch, set `business.websiteUrl` in `src/data/business.ts` to the final HTTPS origin and verify admin login, availability notices, maps, and native contact handoff on real devices.

## Content and configuration

- `src/data/business.ts`: authoritative contact/social/location values, booking message, and `bookingMode` (currently `contact`).
- `src/data/portfolio.ts`: portfolio imagery, audience, crop, and accessible descriptions.
- `src/data/services.ts`: initial approved service catalogue and homepage selections. Saved admin edits in Supabase override these defaults.
- `src/data/testimonials.ts`: approved reviews.
- `src/data/booking.ts`: configurable working hours and preserved reservation settings.
- `src/components/contact-booking.tsx`: one shared dialog used by navigation, service preview, location, and footer.
- `src/lib/contact-booking.ts`: centralized WhatsApp booking link generation.

Fonts are bundled locally. Approved imagery is in `public/images`; original visible markings are retained. MapLibre uses OpenFreeMap tiles, with Google Maps as the external directions destination.

## Admin menu setup and use

For the existing deployed database, apply **only the new** `supabase/migrations/202609270001_menu_service_overrides.sql` in the Supabase SQL Editor, after confirming the earlier migrations are already installed. Then deploy this code to Vercel. No new environment variables are required; the existing Supabase URL, anon key and server-only service role key are reused.

Sign in as an active studio administrator, open **Service menu**, and use **Edit** to change a service or its price. **Add service** creates a Men's or Women's service, with a category and whole-rupee price. Uncheck **Visible on the public menu** to hide a service without deleting it. The Groom package has editable price and visibility; its approved description and included services stay intact. Search and audience filters help find existing services.

Changes persist in `public.menu_service_overrides` and are read on each new homepage/menu request. Visitors already viewing a page must reopen or refresh it. Featured homepage services share their current prices with the full menu; newly added services appear on `/menu` without expanding the homepage's curated cards. Existing booking records and the preserved online-booking service list are not rewritten.

Before the table exists, the public menu retains its original catalogue and the editor shows a setup message with saving disabled. A subsequent database outage shows a temporary-unavailability message rather than republishing stale prices or hidden services. Admin writes require both the existing server membership check and Supabase row-level security; anonymous and non-admin accounts cannot write.

After building, `npm run test:admin` runs the real Next routes against an isolated local provider fixture (ports 3100 and 4319), tests edit/add/hide and public price propagation, and shuts both servers down. `npm test` includes SQL migration/RLS and menu input tests using an in-memory PostgreSQL instance. Neither test changes production prices.

## Repository contents

Source, public assets, package lockfile, tests, migrations, and implementation reports are included. Local secrets, dependencies, build output, generated QA results/screenshots, and generated MapLibre worker files are excluded from Git.

The latest local checks passed for TypeScript, lint, production build, and the Chrome desktop/mobile contact flow. Physical-device contact handoff still needs verification; no automated test sends a message or places a call.
