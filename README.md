# David Siddharth — JIAA Studio

Responsive Next.js App Router website for David Siddharth at JIAA Studio Unisex Salon, Anand. One codebase serves desktop, tablet, and mobile.

## Current features

- Homepage portfolio with men's and women's work, artist profile, testimonials, live availability notice, and location map.
- Dedicated `/menu` page with Men, Women, and Groom service cards.
- Shared **Book a visit** dialog: **Call David** opens the native phone handler; **Message David** opens WhatsApp with an editable booking message. No message is sent automatically.
- Private `/admin/login` and admin tools backed by Supabase.
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
- `src/data/services.ts`: approved service catalogue and pricing.
- `src/data/testimonials.ts`: approved reviews.
- `src/data/booking.ts`: configurable working hours and preserved reservation settings.
- `src/components/contact-booking.tsx`: one shared dialog used by navigation, service preview, location, and footer.
- `src/lib/contact-booking.ts`: centralized WhatsApp booking link generation.

Fonts are bundled locally. Approved imagery is in `public/images`; original visible markings are retained. MapLibre uses OpenFreeMap tiles, with Google Maps as the external directions destination.

## Repository contents

Source, public assets, package lockfile, tests, migrations, and implementation reports are included. Local secrets, dependencies, build output, generated QA results/screenshots, and generated MapLibre worker files are excluded from Git.

The latest local checks passed for TypeScript, lint, production build, and the Chrome desktop/mobile contact flow. Physical-device contact handoff still needs verification; no automated test sends a message or places a call.
