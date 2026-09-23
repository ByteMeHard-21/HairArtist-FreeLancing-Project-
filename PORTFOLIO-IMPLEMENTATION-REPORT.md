# Homepage portfolio update

Completed 22 September 2026.

## Files changed

- src/data/portfolio.ts: six published men's projects, five women's projects, optional before/after image fields, and a curated six-project All selection.
- src/components/portfolio.tsx: shared card rendering, All / Men / Women filtering, transformation controls, audience-qualified React keys.
- src/app/globals.css: restrained 300 ms filter entrance, 600 ms image slide, transformation labels/focus styling and hover-zoom exclusions.
- public/images: men-hair-styling.png, women-haircut.png, women-hair-colour.png, women-hair-styling.png, women-transformation-before.png, women-transformation-after.png, women-hair-treatment.png.
- tests/portfolio-browser.mjs: responsive interaction and image-loading checks.
- qa/portfolio-browser-results.json and qa/screenshots/portfolio: verification evidence.

## Single-section filtering and content

The homepage retains one portfolio section and one shared grid. Filters use local React state without routes, reloads or scrolling. All shows three men's and three women's projects; Men shows all six men's projects and Women shows all five women's projects. Mobile retains the existing initial three cards and See more work expansion. The Instagram View more work destination is unchanged.

Men's 04 Hair styling now uses the supplied asset. The user confirmed it is David's work and approved the original AI-generated content marking. The source file is copied unchanged, displayed uncropped with contain, and excluded from the hover zoom so the marking remains in frame.

Women's projects are 01 Haircut, 02 Hair colour, 03 Hair styling, 04 Hair transformation and 05 Hair treatment. No unconfirmed treatment names or haircut techniques were added. Source image text and markings are preserved.

## Before/after interaction

Only women's project 04 has before/after imagery and labels. It remains one card. Before appears initially. On mouse entry, the after-image layer slides from right to left over 600 ms with ease-out; mouse exit restores Before. Only the image layer moves.

Touch toggles After on the first tap and Before on the next. The native button also supports Enter and Space, has an accessible name and pressed state, and retains a visible keyboard focus outline. Images have descriptive alt text; the hidden image is excluded from accessibility exposure. The existing reduced-motion rule disables the transition.

## Issues addressed

- Previously, only audiences with published data generated filter chips; Women is now available with its supplied work.
- Audience-qualified keys avoid collisions between men's and women's 01–05 numbering.
- The existing card hover zoom is excluded from transformation images to avoid conflicting animation and from the uncropped marked image.
- The existing work-reveal keyframes were mobile-scoped; they now support restrained filter replacement at all screen widths.

## Verification

- Production build passed, including TypeScript compilation.
- ESLint passed.
- Browser checks passed at 360, 390, 599, 768, 1024 and 1440px.
- Verified one section, exact filter/project counts, selected states, stable scroll position, no navigation/reloads, all image loads and the Instagram URL.
- Verified desktop hover, mobile taps, Enter/Space, visible focus, initial Before state, 600 ms slide, unchanged card position and reduced motion.
- No page/console errors or horizontal overflow in tested views.
- Desktop and mobile screenshots reviewed. Screenshot-only styles hide sticky chrome during section captures; production navigation was not changed.

Browser testing used headless Edge with mobile touch/viewport emulation, not physical mobile hardware. No new libraries were added.