# OTP and WhatsApp booking messages

## Current status

No live OTP or WhatsApp provider is configured. VerificationService is an integration boundary, not a connected messaging account. Supabase stores and validates bookings but the current application does not use Supabase Auth to send customer OTPs.

Locally configured: Supabase URL/keys and application signing secret. Missing: VERIFICATION_BASE_URL, VERIFICATION_TOKEN, WHATSAPP_NOTIFICATION_URL, WHATSAPP_NOTIFICATION_TOKEN.

The selected OTP channel and existing provider/sender account have been requested from the owner. The current screen says SMS; change that channel copy together with the chosen adapter if WhatsApp OTP is selected.

## Step 2 error fixed

A same-origin POST from http://127.0.0.1:3000 was returning INVALID_ORIGIN because Next represented the internal request URL as localhost. That error was not mapped in the UI and fell back to the generic reservation error.

src/lib/request-origin.ts now validates the browser Origin against the actual HTTP Host (or explicit APP_ORIGIN on deployment), ignoring untrusted forwarded-host headers. Foreign origins remain rejected. The UI maps configuration/origin errors explicitly.

Real browser tests verified both localhost and 127.0.0.1. Valid form submission now returns OTP_UNAVAILABLE and clearly shows that SMS verification is unavailable. It does not move to the OTP screen or create a booking.

## Two independent confirmation messages

Migration 202609170002_notification_recipients.sql is applied to the supplied Supabase project.

booking_notifications now uses (booking_id, recipient) as its primary key, where recipient is david or customer. New confirmations atomically create both outbox rows. Existing historical bookings are not backfilled or messaged.

Each recipient has its own delivery state, attempts, lease and retry action. Retrying David's failed notification does not resend the customer's successful message, and vice versa. Delivery failure never rolls back a confirmed booking.

src/data/booking-messages.ts contains the approved message composition:
- David: NEW APPOINTMENT — JIAA STUDIO, booking ID, full customer name, gender, service, date, time, mobile and CONFIRMED status.
- Customer: JIAA STUDIO — APPOINTMENT CONFIRMED, first-name greeting, appointment date/time/service, booking ID and salon location.

David's destination uses the existing centralized WhatsApp number. The customer's destination uses the OTP-verified booking mobile. The form explains that verification also agrees to receiving this appointment confirmation on WhatsApp.

## Sender and gateway contracts

The messages will originate from the business sender registered with the chosen provider. A customer-facing wa.me link or a Supabase project does not establish an outbound messaging sender. Sender registration and any required approved authentication/utility templates must be completed with the chosen provider. Verify that the configured sender can deliver to David's notification destination as well as customers.

OTP adapter (server-only):
- POST VERIFICATION_BASE_URL/send, Bearer VERIFICATION_TOKEN.
- Body { phone, requestId }; result { verificationId }.
- POST VERIFICATION_BASE_URL/verify.
- Body { verificationId, phone, code }; result { status: approved | invalid | expired }.
- The provider must bind the verification ID to the phone and enforce OTP expiry/verification.
- Replace this adapter if the selected provider uses a different API contract. No universal or test OTP exists.

WhatsApp adapter (server-only):
- POST WHATSAPP_NOTIFICATION_URL, Bearer WHATSAPP_NOTIFICATION_TOKEN.
- Body { to, message, recipient, bookingReference }.
- Idempotency-Key is bookingReference + ":" + recipient.
- The selected gateway must honor that key and map each recipient message to the appropriate approved provider template.
- A 2xx response records gateway acceptance, not a final handset delivery receipt. Provider-specific delivery webhooks are not implemented until a provider is selected.

## Checks performed

- Five local test cases passed, including real PostgreSQL-in-WASM migration/atomic queue tests, independent recipient retries, request-origin protection and exact message content/destinations.
- Production build, TypeScript and lint passed.
- Real Step 2 UI and API tested on localhost and 127.0.0.1. Foreign-origin requests rejected; unconfigured OTP reported accurately.
- Read-only remote inspection confirmed recipient column, confirmation function queuing both recipients, and zero bookings.
- No live SMS or WhatsApp messages were sent.

Automatic approval review declined an additional real-project mutation test because its temporary booking/notification mutation scope was not shown. It was not retried or bypassed. The recipient change was validated using isolated PostgreSQL tests and read-only remote inspection instead.

## Owner input still needed

- OTP channel: SMS or WhatsApp.
- Provider/account name and registered business sender identity.
- Provider credentials configured privately in the server environment.
- Provider-approved message templates where required.
- APP_ORIGIN set to the real site's canonical origin on deployment.

After provider setup, run real OTP delivery/verification, both recipient deliveries, a failed-recipient retry, and provider-specific delivery-status checks before opening production reservations.
