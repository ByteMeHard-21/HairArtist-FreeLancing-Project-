# Men’s menu update — 18 September 2026

## Existing files modified

- src/data/services.ts — all 24 approved men’s services, exact names/order, temporary numeric prices, currency formatter and temporary-pricing note.
- src/components/menu-catalogue.tsx — consumes the shared formatter; existing audience filters and editorial list markup retained.
- src/app/menu/page.tsx — temporary-pricing explanation and accurate page description.
- src/app/globals.css — prevents price wrapping/shrinking; allows service-name flex items to fit narrow screens.

Added tests/menu-qa.ts plus qa/menu-results.json and ignored screenshots in qa/screenshots/menu/. No new dependencies or architectural restructuring.

## Where to change prices

Edit the price number on the relevant service record in src/data/services.ts. Example: change Classic Haircut from price: 100 to price: 350. The existing component renders formatPrice(service.price), producing ₹350 without any JSX change. For a production build, rebuild/redeploy after editing configuration.

Each service has one authoritative price field. No individual price values exist in menu JSX. The shared formatPrice function uses Intl.NumberFormat for INR without fractional digits.

All displayed prices are temporary and unconfirmed. The page explicitly tells visitors to confirm final pricing with David. Service status means the service content is approved; it does not claim that temporary pricing is official.

## Assigned temporary prices

| Category | Service | Price |
| --- | --- | ---: |
| HAIRCUT | Classic Haircut | ₹100 |
| HAIRCUT | Fade Haircut | ₹150 |
| HAIRCUT | Modern / Trendy Haircut | ₹150 |
| HAIRCUT | Precision Haircut | ₹200 |
| HAIRCUT | Haircut + Wash | ₹200 |
| BEARD | Beard Trim & Shape | ₹100 |
| BEARD | Beard Fade | ₹150 |
| BEARD | Italian Beard | ₹150 |
| BEARD | Beard Styling | ₹200 |
| BEARD | Beard Grooming | ₹150 |
| HAIR + BEARD | Haircut + Beard Trim | ₹150 |
| HAIR + BEARD | Haircut + Beard Fade | ₹200 |
| HAIR + BEARD | Haircut + Italian Beard | ₹200 |
| HAIR + BEARD | Signature Hair + Beard | ₹200 |
| HAIR STYLING | Classic Hair Styling | ₹100 |
| HAIR STYLING | Modern Hair Styling | ₹150 |
| HAIR STYLING | Blow-Dry & Finish | ₹150 |
| HAIR STYLING | Occasion Styling | ₹200 |
| HAIR STYLING | Groom Styling | ₹200 |
| HAIR COLOUR | Global Hair Colour | ₹200 |
| HAIR COLOUR | Root Colour | ₹150 |
| HAIR COLOUR | Highlights | ₹200 |
| HAIR COLOUR | Creative / Fashion Colour | ₹200 |
| HAIR COLOUR | Colour Consultation | ₹100 |

Totals: 4 services at ₹100, 9 at ₹150, 11 at ₹200. No other prototype prices were assigned.

## Design and scope

Following the approved layout correction, each category is now a bordered white card. The Men heading sits above a three-column desktop grid: three cards in row one, two in row two. At tablet widths the grid uses two columns; on phones it uses one. Existing typography, colours, left-name/right-price rows, audience filters and footer remain.

The price column has white-space: nowrap and cannot shrink on mobile; name cells may use available space without clipping. Geometry checks verified every row, rather than relying only on overall page width.

Existing unpublished women/children records and their placeholder views are preserved. Only the men’s menu was populated.

Booking service categories and booking UI were not edited. SHA-256 checks before and after matched for src/data/booking.ts, src/components/booking-flow.tsx and src/app/book/page.tsx. The booking selector therefore retains its five top-level male categories.

## Validation

Passed:
- npm run typecheck
- npm run lint
- npm run build
- npx tsx tests/menu-qa.ts

The menu QA verified:
- Exactly five visible men’s categories, in the requested order.
- Exactly 24 service names, in the requested order: 5 / 5 / 4 / 5 / 5.
- Only 100, 150 and 200 in the published men’s data.
- An in-memory price change 100 → 350 rendered ₹350 through the actual MenuCatalogue component; it was restored to 100 in finally. The production data file was never changed to 350.
- At 360, 375, 390, 768, 1024 and 1440 pixels: correct rendered content/prices, right alignment, unwrapped prices, no overlapping name/price text, no clipping and no horizontal document overflow.
- All/Men/Women/Children filtering retains the existing behavior.
- No browser console errors or uncaught page errors.
- Desktop and mobile screenshots visually reviewed.

No application/database/provider configuration was changed. The existing preview is rebuilt and restarted for review after the category-card layout update.


Layout follow-up: tests/menu-qa.ts now also checks actual grid column counts (3 desktop / 2 tablet / 1 mobile), individual card borders/backgrounds, and card wrapping to the next row. Haircut + Wash and Beard Styling are both ₹200 as supplied in the updated examples.
