# Booking implementation — 17 September 2026

Project: David Siddharth / JIAA Studio Unisex Salon  
Supabase: David Salon, qrwlkfuwvnqbwhucdxpo  
Status: implementation and database migration complete; **production reservations remain disabled until the OTP provider is configured**. Admin access also requires the owner's Supabase Auth user UUID. WhatsApp Business delivery is not configured.

## 1. Files changed

Existing files updated:
- package.json, package-lock.json: Supabase clients, Zod; test tools and scripts.
- .gitignore: exclude Supabase local link metadata and test artifacts.
- src/app/layout.tsx: public announcement presentation.
- src/app/globals.css: booking entry points, navigation fit, touch-safe contact styles.
- src/components/navbar.tsx: current-route indication also supports /book.
- src/components/service-preview.tsx: Book a visit link after services.
- src/components/location.tsx: primary Book a visit link.
- src/data/navigation.ts: shared desktop/mobile/footer booking destination.
- src/data/business.ts: studio hours derived from the booking schedule.

New application files:
- src/data/booking.ts
- src/components/booking-flow.tsx
- src/components/admin-dashboard.tsx
- src/components/public-notice.tsx
- src/app/book/page.tsx
- src/app/booking.css
- src/app/admin/page.tsx
- src/app/admin/admin.css
- src/app/api/booking/[action]/route.ts
- src/app/api/admin/[action]/route.ts
- src/lib/booking-server.ts
- src/lib/verification.ts
- src/lib/booking-notification.ts
- supabase/migrations/202609170001_booking.sql
- .env.example

Tests and evidence:
- tests/booking.test.ts
- tests/remote-capacity.ts
- tests/browser-qa.mjs
- tests/touch-qa.mjs
- qa/booking-browser-results.json
- qa/booking-touch-results.json
- qa/screenshots/booking/ (ignored screenshots)

.env.local was created locally with credentials retrieved through the authenticated Supabase CLI and a cryptographically generated application signing key. No credentials are printed in this report or placed in client components.

## 2. Components / approved UI

/book has date/time, details plus live summary, OTP, and confirmation states. There is no separate review page. It uses the existing Playfair Display/Manrope fonts, gold accents, editorial headings, bordered cards, date ribbon, hourly grid, progress indicator, and responsive summary arrangement.

The existing navbar, footer, homepage cards, map and imagery remain in place. No prototype toolbar or fake admin demo link was introduced.

## 3. Database tables

The existing remote public schema was inspected and was empty. The migration was previewed with db push --dry-run, then applied with db push --linked.

- bookings: exactly the approved booking fields, server-generated unique JIAA reference, timestamps.
- availability_exceptions: individual closed dates with public reasons.
- public_announcements: one bounded, date-scoped notice.
- booking_challenges: temporary OTP ownership/attempt/lease state; **not a booking or a capacity hold**.
- booking_rate_limits: persistent, hashed server-side limits.
- booking_notifications: durable notification outbox and retry lease.

Only CONFIRMED, CANCELLED and EXPIRED exist in the booking_status enum. No pending/unverified booking statuses or daily slot tables were introduced. No automatic cancellation/expiry policy has been invented.

RLS is enabled on every table. Anonymous and normal authenticated roles cannot read customer data, change these tables or invoke the service-only confirmation functions. Server routes use service-role credentials only after validating the request or verifying admin identity.

## 4. SQL functions

- enforce_booking_capacity: validates date horizon, elapsed periods, closed dates and capacity under a transaction-scoped date lock.
- lock_availability_exception: serializes date closures against concurrent booking inserts.
- consume_booking_limits: atomic persistent rate limits; removes expired rate/challenge records during requests.
- claim_booking_verification: validates challenge ownership/expiry, limits attempts to five, and leases verification.
- release_booking_verification: clears the matching lease.
- confirm_verified_booking: atomic confirmed insert, challenge linkage, reference creation and outbox insertion; idempotent for a completed challenge.
- claim_booking_notification: prevents concurrent notification retries.

All sensitive RPCs are revoked from public/anon/authenticated and granted only to service_role.

## 5. Backend endpoints

Public booking:
- GET /api/booking/availability?date=YYYY-MM-DD: 15 dates, safe aggregate remaining counts, closures, active notices, configuration readiness.
- POST /api/booking/request-code: validates fields, schedule, capacity and request limits, then sends through VerificationService.
- POST /api/booking/verify: checks browser ownership, leases verification, verifies through the provider, revalidates current configuration, then executes atomic confirmation.

Admin:
- POST /api/admin/login
- POST /api/admin/logout
- GET /api/admin/dashboard?offset=0
- POST /api/admin/exception
- POST /api/admin/remove-exception
- POST /api/admin/announcement
- POST /api/admin/retry-notification

POST handlers require a same-origin JSON request with a bounded body. Responses use private, no-store cache headers. Detailed provider/database errors and customer data are not written to public error messages. Customer receipt data is returned only after ownership and OTP checks, or an idempotent retry owned by the same browser.

## 6. OTP integration boundary

src/lib/verification.ts exposes VerificationService.send and .verify. It is server-only; there is no hardcoded OTP, browser-only verification, or production mock mode.

The current adapter expects an authenticated HTTPS gateway:
- POST {VERIFICATION_BASE_URL}/send with { phone, requestId }; returns { verificationId }.
- POST {VERIFICATION_BASE_URL}/verify with { verificationId, phone, code }; returns { status: "approved" | "invalid" | "expired" }.
- Authorization: Bearer VERIFICATION_TOKEN.
- 10-second timeout, no redirects, strict accepted verification results.

The selected SMS/WhatsApp provider can replace just this adapter, or the gateway can translate this contract into the chosen provider API. Merely adding an arbitrary provider URL will not adapt its API automatically. The selected implementation must bind verification IDs to the submitted phone, enforce code expiry and treat repeated approved verification idempotently.

Rate limits include a 60-second resend cooldown, five sends per phone per 15 minutes, source limits, five attempts per challenge, and verification throttling. Phone numbers normalize to +91 plus ten digits. The ownership cookie is HttpOnly, SameSite Strict, scoped to /api/booking and secure in production; the database stores its HMAC rather than the secret.

When the provider is missing, real slot availability, date/time selection and the Details step remain usable. The request-code endpoint rejects verification with OTP_UNAVAILABLE and real Call/WhatsApp links are offered. No fake reservations are created.

## 7. WhatsApp notification boundary

src/lib/booking-notification.ts runs after a successful response via Next.js after(), backed by an outbox inserted in the same transaction as the booking.

Configure an HTTPS gateway that understands:
- POST WHATSAPP_NOTIFICATION_URL
- Authorization: Bearer WHATSAPP_NOTIFICATION_TOKEN
- Idempotency-Key: booking reference
- Body: { to, message, bookingReference }

The message contains the booking reference, customer, phone, gender, service, date, time and studio. The recipient derives from the existing authoritative David WhatsApp number. The gateway/provider must honor the idempotency key and handle any required approved WhatsApp Business template.

A non-2xx response or timeout records a delivery error; a missing provider records NOT_CONFIGURED. The appointment stays CONFIRMED. Admin can retry pending notifications. A gateway success records acceptance; provider delivery receipts are not implemented until a provider is selected.

No automatic wa.me notification or external message was sent during implementation/tests.

## 8. Capacity and schedule

One source for hours/services: src/data/booking.ts.

Confirmed schedule:
- Monday–Saturday, 09:00–13:00 and 14:00–21:00, Asia/Kolkata.
- Sunday closed.
- 13:00–14:00 lunch.
- 11 hourly windows per open day.
- Today through today + 14 days, inclusive.
- Already-started periods are unavailable.
- Maximum 3 CONFIRMED bookings per hour; cancelled/expired rows do not consume capacity.

The homepage hours are derived from this same schedule. Editing the configuration and redeploying updates the public hours and server slot validation. Date exceptions and announcements are editable without redeployment.

Men: Haircut; Beard; Hair + Beard; Hair Styling; Hair Colour.  
Women: Women's Haircut; Women's Hair Colour; Women's Hair Styling; Hair Transformation; Hair Treatment Result.

No unknown sixth men's service, prices, service durations or fabricated client details were added.

## 9. Admin dashboard

/admin initially serves only a public login shell with no customer data. Every data fetch and mutation verifies Supabase Auth with getUser and checks the user's UUID against ADMIN_USER_IDS. Normal authenticated users are not automatically administrators.

Includes today/upcoming appointments, references/statuses/services, optional native call and WhatsApp links, pagination, responsive mobile cards, closed-date management, one public notice, notification status/retry, and sign out.

A new date closure does not silently cancel existing appointments. The UI explains that affected clients must be contacted separately. No CRM, manual booking entry, payment system or analytics dashboard was added.

## 10–12. Homepage, navigation, location

- Book a visit follows the homepage service preview.
- Desktop navigation, mobile navigation and footer share /book.
- Location has a primary gold Book a visit action while retaining Directions, Call and WhatsApp.
- Existing Work, Menu, Artist, Location and Contact destinations remain intact.
- Existing native tel:, WhatsApp prefilled message, Instagram and exact supplied Maps URL are retained.

## 13–14. Bugs / mobile UX

Fixed the persistent touch-hover contact contrast problem: desktop hover colors now apply only on fine hover-capable pointers. The dark mobile bar has explicit readable active/hover colors. Phone/WhatsApp links remain ordinary anchors with no simulated loading state.

Booking layouts use a locally scrollable date ribbon, responsive form/summary, semantic fieldsets/radio controls, live errors, keyboard focus handling, actual disabled full slots, reduced-motion support, and touch-friendly controls.

An outline class collision with Tailwind's generic utility was removed by giving booking buttons a scoped modifier. Public notices render once on /book rather than twice through both layout and booking content.

## 15. Validation

Executed:
- npm run typecheck — passed.
- npm run lint — passed, no warnings.
- npm run build — passed; /, /menu, /book, /admin and API routes generated.
- npm test — 3 suites passed: date/time/config validation; input/service validation; PostgreSQL schema/OTP/capacity/privacy/outbox tests.
- Real Supabase concurrent integration check: 8 simultaneous confirmations against one unused slot yielded exactly 3 confirmed bookings and 5 SLOT_UNAVAILABLE results. Anonymous table and confirmation-RPC access denied. All temporary challenges, bookings and notification rows were removed in finally. Sequence gaps from rolled-back/rejected/deleted QA records are expected.
- Live API checks: 15 dates, no customer data in availability, disabled unconfigured OTP, unauthorized admin 401, cross-origin POST 403.
- Browser: homepage, booking and admin login at 360/375/390/768/1024/1440; no horizontal document overflow.
- Booking UI fixture tests at all six widths: full/limited slots, date/time selection, gender/service switch, details summary, invalid/expired OTP, success, and slot lost during confirmation.
- Admin UI fixtures at 360/390/768/1440: cards/table, exceptions, notice forms.
- Touch-emulated WhatsApp tap: correct destination, readable settled colors, enabled link, mobile menu closes.
- Source search: no placeholder href, fake CTA handler, console.log in app source, PENDING or UNVERIFIED status.
- Remote schema inspection: all six tables have RLS enabled.
- Screenshots inspected for desktop details, mobile slots and mobile admin.

Browser OTP and authenticated-admin success paths used explicit test-only network fixtures in tests/browser-qa.mjs. They do not prove live provider delivery or owner admin login. No production mock/test mode was added.

The installed browser-control tool could not start because its Windows sandbox helper failed. Browser QA used headless Microsoft Edge through Playwright. Touch emulation is not a physical Android/iOS device test.

## 16. Owner setup still required

1. Select the OTP provider, adapt/configure VerificationService, and supply its server credentials.
2. Select the WhatsApp Business provider; configure credentials, any approved template, and the notification adapter/gateway.
3. Create/select the intended Supabase Auth admin account and put its UUID in ADMIN_USER_IDS. The authorized admin identity has been requested but has not yet been supplied.
4. Copy server environment configuration to the eventual host. Keep .env.local and all server credentials private.
5. Set TRUSTED_CLIENT_IP_HEADER only to a header your deployment proxy guarantees to overwrite. Without this setting, a conservative shared source rate limit is used; arbitrary X-Forwarded-For is not trusted.
6. Run real OTP delivery, provider failure/retry, owner admin login, deployment cookie/origin handling, and physical-device contact checks before accepting production reservations.

The Supabase project credentials and application signing secret are configured locally. No frontend NEXT_PUBLIC service key exists. The production deployment/domain was not part of this task.

## 17. Remaining limits

Live OTP, live WhatsApp delivery and the owner's authenticated admin session cannot be verified until provider/account configuration is supplied. This implementation must not be described as production-ready before those checks pass.

Existing service-menu prices/content still awaiting confirmation were preserved. This task did not invent prices or rewrite the portfolio.

## Running locally

- npm run dev
- Open http://127.0.0.1:3000/book or /admin.
- npm test runs isolated PostgreSQL tests.
- npm run test:browser expects a running server on port 3000 and installed Microsoft Edge.
- node tests/touch-qa.mjs runs the touch regression.
- npm run test:remote is an explicit real-project integration test, not part of ordinary npm test. It creates temporary owned test rows in an unused slot and cleans them up; do not run casually against a live client project.

After the follow-up Step 1 fix, the existing local preview was rebuilt and restarted on port 3000 for review.

## Follow-up: Step 1 Continue to details regression

Reproduced the reported failure on the running production preview at 390 and 1440 pixels: an available time was selected, but Continue remained disabled. The preview was serving an older build that still coupled Step 1 to OTP-provider readiness. The current source had already separated that condition; its existing edits were preserved.

Additional fixes in src/components/booking-flow.tsx:
- Reselecting the current date is now a no-op, preserving the slot and preventing loading from getting stuck without a date-change fetch.
- Background/step refreshes no longer synchronously reset the loading state or erase user-visible verification errors.
- Temporary state/button debug logging and the unused debug selection handler were removed.
- Full-slot accessible names explicitly include Full.

Added tests/step-one-regression.mjs. Using the actual API (no availability mocks), it passed at 360, 375, 390, 768, 1024 and 1440 pixels: initial button disabled until a slot is chosen; selection enables Continue; reselecting the same date remains responsive; changing dates requires a fresh slot; Continue displays Your Details.

TypeScript, lint, the production build and all three database/input test cases passed again. The production server was restarted with the new build. Provider verification is still enforced on the server before creating a booking.
Final follow-up checks: the full browser suite passed again after the current form-label selectors were updated, including no unexpected console errors. Added src/app/icon.svg to resolve the pre-existing missing browser icon request. Added npm run test:step-one for the live-availability regression. Touch CTA checks, lint, TypeScript and the final production build passed. The rebuilt preview is running at http://127.0.0.1:3000/book.

## Messaging follow-up

See MESSAGING-SETUP.md for the current integration state and tests. Step 2's local-host origin mismatch is fixed. Migration 202609170002_notification_recipients.sql now queues separate David and customer WhatsApp messages for every newly confirmed booking, with independent retry/delivery state. Live OTP and WhatsApp remain unconfigured; no live message delivery is claimed.
