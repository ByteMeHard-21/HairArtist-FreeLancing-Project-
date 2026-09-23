# Studio admin implementation report

Updated 20 September 2026 after the approved email/password-only change.

## Current behavior

Admin access uses the existing Supabase email and password, followed directly by the dashboard. Authenticator enrollment, challenge UI and MFA API actions have been removed. The approved account's enrolled TOTP factor was removed using the Supabase Admin API, and no TOTP factors remain on that account. No passwords or authenticator secrets are stored in source.

The homepage ticker defaults to "David is at salon" whenever no active notice exists. An active, dated administrator notice replaces this default. Desktop ticker groups contain one message with at least one viewport of spacing. Mobile keeps its existing spacing and repeat pattern. The public site layout, bookings and business content remain unchanged.

## Authentication and authorization

Routes: /admin/login, /admin, /admin/availability, /admin/reset-password, /admin/callback and /admin/unauthorized.

The proxy refreshes SSR cookies. Server page guards and APIs independently verify the Supabase user and active ADMIN membership. RLS enforces the same membership requirement in the database. Ordinary authenticated accounts cannot read bookings or grant themselves admin access. Inactive admins are rejected without waiting for JWT expiry.

Cookies remain HttpOnly and SameSite=Lax, with Secure enabled in production. Private responses are no-store. Authentication transitions reload the document to discard private UI state. Password recovery exchanges a PKCE code and still requires authorized membership. Authenticator verification is no longer required.

Applied migrations:
- supabase/migrations/202609190001_admin_security.sql
- supabase/migrations/202609200001_admin_password_access.sql

The follow-up migration replaces is_studio_admin() to allow authenticated password-only sessions while keeping the active ADMIN check, restricted function search path, RLS and existing table privileges. Live SQL confirmed the approved account passes this check with an aal1 session.

Cancellation remains restricted to CONFIRMED → CANCELLED through cancel_studio_booking(). Direct arbitrary booking edits, inserts and deletes remain unavailable to the authenticated role. The system-only expiration function remains unscheduled pending the final business rule.

## Dashboard and APIs

The dashboard supports today's confirmed count, upcoming appointments through +14 days, paginated history, server-side customer search, appointment details, customer call/WhatsApp links, cancellation confirmation and notification retries.

The availability page manages exceptional closures. The notice editor supports date-limited public announcements and preserves unsaved drafts across refreshes. Mobile uses cards; desktop uses a table.

GET actions: session, dashboard, settings, booking.
POST actions: login, logout, forgot-password, password, cancel, exception, remove-exception, announcement, retry-notification.

Privileged operations use the authenticated user's SSR client and database RLS. Inputs, same-origin requests, request sizes and authentication rate limits remain validated.

## Files changed in this update

- src/lib/admin-server.ts
- src/proxy.ts
- src/app/api/admin/[action]/route.ts
- src/components/admin-auth.tsx
- src/components/admin-dashboard.tsx
- src/app/admin/admin.css
- src/data/availability.ts
- src/app/globals.css
- .env.example
- supabase/migrations/202609200001_admin_password_access.sql
- tests/admin-security.test.ts
- tests/admin-browser.mjs
- tests/ticker-browser.mjs
- ADMIN-IMPLEMENTATION-REPORT.md

Earlier admin implementation also introduced the admin routes/layout, public-chrome wrapper, footer Studio Login, membership provisioning script and client-secret scanner.

## Verification

- Six SQL/unit tests passed: password-only admin membership, outsider and inactive-account rejection, constrained cancellation, system-only expiry, customer OTP ownership/expiry, hourly capacity and notification outbox behavior.
- TypeScript, lint and production build passed.
- Admin browser tests passed against the real Next.js app with an isolated Supabase provider fixture: wrong-password feedback, direct sign-in, returning sessions, password recovery, unauthorized access, logout, dashboard searches/details, cancellation, exceptions and notices. No authenticator API requests were made.
- Admin layouts passed at 360, 375, 390, 768, 1024 and 1440px.
- Ticker tests passed at 390, 768, 1024, 1440 and 1920px: default message, active-notice override, blank fallback, reduced desktop repetition and no horizontal overflow. Desktop/mobile screenshots were visually inspected.
- Evidence: qa/admin-browser-results.json, qa/ticker-browser-results.json and qa/screenshots/admin / ticker.

The browser checks use Edge with mobile viewport emulation, not physical devices. Auth browser tests use synthetic accounts; real reset-email delivery was not exercised. The remote account factor removal and the password-session database authorization check were performed against the linked Supabase project.

## Remaining external configuration

The customer booking OTP flow is separate from admin authentication and remains intact. No confirmed booking is inserted before verified customer OTP. Three confirmed bookings per hourly period remain enforced transactionally.

Customer OTP and automatic WhatsApp notification delivery still require provider configuration: VERIFICATION_BASE_URL, VERIFICATION_TOKEN, WHATSAPP_NOTIFICATION_URL and WHATSAPP_NOTIFICATION_TOKEN. Notification failures retain confirmed bookings and durable recipient-specific retry records. See MESSAGING-SETUP.md.

For deployment, configure the canonical HTTPS APP_ORIGIN, Supabase Auth Site URL and permitted /admin/callback redirect, plus password-recovery email delivery. SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and BOOKING_HMAC_SECRET remain server configuration. ADMIN_USER_IDS is obsolete.

Approve the expiration policy before scheduling the expiry function.

Reference: [Supabase factor removal](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor). Installed Next.js proxy and cookie documentation was reviewed for this version.