# David Siddharth — JIAA Studio

One responsive Next.js App Router application for desktop, tablet, and mobile. The homepage and `/menu` share the same navigation, design tokens, contact actions, and footer. No separate mobile app, backend, or booking service is included.

## Run locally

Requires Node.js 20.9 or newer.

```powershell
cd 'D:\Het Mehta\Free Lencing\HairStylist\_website'
npm install
npm run dev
```

Open the local URL printed by Next.js. For the production build:

```powershell
npm run lint
npm run typecheck
npm run build
npm run start
```

## Content configuration

All business content is kept under `src/data`. Unconfirmed data is represented by `null`, an empty array, or an explicit draft status. Do not insert invented values to activate a control.

- `business.ts`: the authoritative `siteConfig` for the supplied phone, WhatsApp number/message, Instagram, exact Google Maps destination and salon coordinates; also salon, artist identity, address, hours, and canonical website origin. `mapConfig` defines the OpenFreeMap Liberty style and initial zoom. The current phone and WhatsApp number share one `clientNumber` value.
- `availability.ts`: neutral ticker copy until David supplies actual availability.
- `social.ts`: forwards Instagram from `siteConfig` without duplicating the client URL.
- `portfolio.ts`: publication state, image crop, alt text, and audience for each work. Filters use published data; Women appears only when published work exists.
- `services.ts`: full service catalogue with explicit approval state, audiences, and nullable pricing. Draft service variants never appear as confirmed offerings.
- `testimonials.ts`: only real client-approved feedback. The empty state is labeled as pending feedback rather than presenting fake reviews.

All contact destinations are now connected to the real client values. CALL DAVID uses the OS-native `tel:` handler. WHATSAPP DAVID uses `wa.me` with the approved message URL-encoded; the visitor still presses Send. Instagram and Maps use the exact supplied URLs. External links open in a new tab with `noopener noreferrer`; internal navigation stays in the site.

The location panel uses MapLibre GL JS with the hosted OpenFreeMap Liberty style. No API key, environment variable, account or backend map service is required. The map renderer loads only in the browser when the homepage location panel approaches view. It uses the shared longitude/latitude coordinates for both the center and salon marker, with initial zoom 16.5. Zoom controls and keyboard navigation remain available; cooperative gestures allow normal page scrolling, two-finger mobile pan/pinch, and Ctrl/Command + wheel zoom. Provider attribution stays visible. Container resizing and unmount cleanup are handled locally. A loading/error state preserves the panel dimensions and the separate contact/directions CTAs remain usable. Google Maps is only an external directions destination; no embed or Google Maps API is used.

`npm run dev` and `npm run build` first run `scripts/copy-maplibre-worker.mjs`, copying MapLibre's worker and shared module from the installed package to `public/maplibre`. This follows the [MapLibre Next.js/Turbopack setup](https://maplibre.org/maplibre-gl-js/docs/#installation). Both files must be deployed with the generated site; do not edit them manually. Use the npm scripts so the files stay synchronized with package updates.

Update `siteConfig` in `src/data/business.ts` to change a destination. URI formatting removes non-digits from phone/WhatsApp numbers, prefixes the telephone number with `+`, and encodes the WhatsApp message. It does not change the underlying number or the supplied social/map URL.

## Design reference and decisions

The user supplied ten desktop/mobile screenshots after Figma access was blocked by its Starter-plan integration limit. The screenshots are the approved visual reference. The user explicitly selected their black/cream/gold theme over Tangerine's current website and authorized close visual font matches.

Typography: locally bundled Playfair Display (including italic) and Manrope. Colors, section rhythm, hero composition, and responsive layouts follow the supplied screenshots. Tiny screenshot text is not treated as confirmed business information. Explicit brief requirements override prototype content: the homepage has a menu preview, `/menu` is separate, unsupported credentials and availability claims are omitted, and unavailable Women portfolio filters are hidden.

## Photography

Source: `D:\Het Mehta\Free Lencing\assets`.

Original files are copied unchanged into `public/images` with stable filenames. Next.js Image serves responsive optimized variants without modifying source files. No stock or generated replacement imagery is used.

| Source | Published file | Status |
| --- | --- | --- |
| 01_Precision_Haircut.png | precision-cut.png | Included |
| 02_Fade+Beard.png | fade-beard.png | Included |
| 03_trendy_Beard.png | italian-beard.png | Included; 335 × 597 original contains InShot marking |
| 04_Hair Styling.png | — | Excluded: visible AI-generated content marking |
| 05_Hair_Colour.png | hair-colour.png | Included |
| 06_weddingHairstyling .png | groom-styling.png | Included; 399 × 501 original |
| david.png | david.png | Included |

The excluded image is not copied into the public directory. To publish Hair Styling later, obtain a confirmed legitimate clean original, add it under `public/images`, and update its data entry. Do not remove the marker from the supplied image. Higher-resolution originals for works 03 and 06 would improve large-screen sharpness.

## Launch checklist

- Phone, WhatsApp, Instagram and Maps have been supplied and connected. Complete a real-device smoke test of the phone handler and WhatsApp handoff.
- Confirm hours and availability process.
- Approve exact services for Men, Women, and Children, plus prices.
- Obtain approved biography and genuine testimonials, if desired.
- Resolve image 04 separately; it remains excluded by default.
- Set `business.websiteUrl` to the final HTTPS origin for canonical links.
- Run lint, typecheck, and production build, then recheck any changed content at narrow and wide widths.
- Choose and configure hosting separately. This task delivers the requested local project.
