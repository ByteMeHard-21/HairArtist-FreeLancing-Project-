> Update: Message David now opens WhatsApp using the centralized WhatsApp number and the unchanged booking message. The SMS-specific implementation described below is superseded. The dialog design and Call David action are unchanged.

# Contact to Book — implementation report

The public Book a visit actions now open one shared contact dialog. David confirms availability personally. This flow does not submit a reservation, invoke OTP, send messages, or write booking data.

## Files changed

New implementation:
- `src/components/contact-booking.tsx`: shared provider, native dialog, and reusable BookVisitTrigger.
- `src/components/contact-booking.css`: desktop dialog, mobile bottom sheet, interaction states, and reduced-motion styles.
- `src/lib/contact-booking.ts`: platform-aware SMS URI helper.

Existing implementation updated:
- `src/data/business.ts`: central bookingMode and exact booking SMS message; existing authoritative phone reused.
- `src/data/navigation.ts`: identifies the booking navigation entry.
- `src/app/layout.tsx`: mounts the shared provider once.
- `src/components/navbar.tsx`: desktop/mobile booking triggers; mobile menu closes and focus returns to its toggle.
- `src/components/service-preview.tsx`: preserves View full menu and uses the shared booking trigger.
- `src/components/location.tsx`: shared booking trigger alongside Get directions, Call David, and WhatsApp David.
- `src/components/footer.tsx`: shared booking trigger; Studio Login still links to /admin/login.
- `src/components/action-link.tsx`: recognizes native SMS links.
- `src/app/globals.css`: applies existing navigation/action styles to semantic booking buttons.
- `package.json`: adds test:contact-booking without adding dependencies.
- `tests/contact-booking-browser.mjs`: new contact-flow browser coverage.
- `tests/touch-qa.mjs` and `tests/browser-qa.mjs`: update public booking expectations for the dialog.

QA evidence is saved in `qa/contact-booking-*.json` and `qa/screenshots/contact-booking/`.

## Shared interaction and contact links

ContactBookingProvider owns a single native dialog. Navbar, mobile navigation, service preview, location, and footer all use BookVisitTrigger. In contact mode these are semantic buttons. The central siteConfig.bookingMode is currently "contact"; changing it to "online" restores links to /book for future activation.

Call David uses the centralized native telephone URI, tel:+918238108943. Message David uses the same configured phone through sms:, with the body URL-encoded. Standard platforms use ?body=; detected iPhone/iPad devices use &body=. Both actions close the dialog and leave the operating system to handle the URI. No message is sent automatically.

Exact prefilled SMS:

> Hi David, I found your website and would like to book a visit. Please let me know your availability.

Existing WhatsApp contact links remain WhatsApp links. The new dialog's Message David action is SMS as requested.

## Desktop, mobile, and accessibility

Desktop uses a centered dialog capped at 460px. Mobile uses the same component as a bottom sheet with safe-area padding and internal scrolling on short screens. Existing typography, cream/black/gold colors, and borders are reused.

The dialog has an accessible heading/description, close control, visible focus states, keyboard focus wrapping, Escape and backdrop dismissal, and focus restoration. Background scrolling is locked while open; previous inline styles and scroll position are restored synchronously on close. Mobile navigation restores focus to its visible menu toggle.

Animations run for 250ms; reduced-motion preference disables them. Phone and message actions have explicit foreground/background colors and no loading state. Hover styling is limited to devices with a fine pointer and hover capability. The existing contact-action audit and touch checks found no stuck or unreadable white button in the tested browsers.

Testing exposed and fixed two dialog issues: Tab could reach browser chrome beyond the last action, and the native deferred close event could briefly leave body scrolling locked. Explicit focus wrapping and synchronous page restoration address these cases.

## Online booking preservation

SHA-256 comparisons verified all 13 snapshotted online booking, API, verification, notification, and migration files remain byte-identical. See `qa/contact-booking-preservation-result.json` for the full list.

The /book route, booking components, OTP, capacity logic, notification architecture, and Supabase migrations remain intact. Direct /book requests still return HTTP 200, intentionally preserving the requested route. The public Book a visit entries no longer lead there in contact mode. This flag controls entry points; it does not disable backend routes or configure future OTP/notification providers.

## Validation

- TypeScript: passed.
- Full lint: passed; targeted lint also passed after final changes.
- Production build: passed.
- Existing touch/contact regression suite: passed.
- Edge: passed at 360x800, 375x812, 390x844, 768x1000, 1024x900, 1440x1000, and 390x420.
- Chrome: passed at 390x844 and 1440x1000.
- Screenshots reviewed for desktop, mobile, and short mobile layout.
- Tests check all public entry points, exact contact links and SMS body, a single shared dialog, touch target sizes, focus wrapping/restoration, Escape/close/backdrop dismissal, scroll restoration, stable action colors, reduced motion, absence of booking API writes, and absence of horizontal overflow or browser console errors.
- The shared footer dialog also works on /menu; Studio Login remains available.

## Remaining verification limits

Safari/WebKit could not be run because the browser download repeatedly timed out. iPhone/iPad user-agent emulation checks the Apple SMS URI branch only; it is not Safari-engine validation. Physical iOS Safari and Android Chrome checks remain necessary to confirm that their configured phone and SMS applications open and retain the editable prefilled body. Automated checks deliberately prevent native app launch and do not place calls or send SMS.

No production deployment was performed. The local production preview is available at http://127.0.0.1:3000.
