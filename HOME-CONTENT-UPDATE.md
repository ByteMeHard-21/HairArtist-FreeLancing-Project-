# Homepage content and testimonial update

Completed 22 September 2026.

- Replaced men's portfolio images 01 and 05 with the supplied assets. New filenames precision-cut-v2.png and hair-colour-v2.png avoid stale image caches. Both copied files match the source hashes. Alt text was updated to describe the replacement photos.
- Updated the artist section with the supplied four-paragraph biography, 6+ years of experience, six work categories, studio location and closing quote. Existing portrait, contact links and visual theme remain.
- Added the four supplied reviews and service attributions exactly as provided, including Mansi. S. No star ratings or verification claims were invented.

## Carousel behavior

One review is centered. Previous and Next arrows slide the track horizontally over 600 ms with ease-out. Automatic rotation waits 5.5 seconds while idle. Matching edge copies make both last-to-first and first-to-last movement seamless; the track normalizes without animation only after reaching the matching copy.

Hover pauses rotation and leaving restarts the interval. Manual navigation starts a fresh interval. Keyboard focus pauses rotation, and an explicit Pause/Resume control is available. Background tabs pause. Reduced-motion preferences disable autoplay and use instant manual changes.

Mobile supports arrows and horizontal swipes. Vertical touch scrolling remains available through pan-y, with directional thresholds and pointer cancellation. Buttons have accessible names, visible focus and busy states. Inactive/cloned reviews are hidden from the accessibility tree. Review cards share a consistent height, avoiding layout jumps.

## Files changed

- src/data/portfolio.ts
- public/images/precision-cut-v2.png
- public/images/hair-colour-v2.png
- src/data/artist.ts
- src/components/artist.tsx
- src/data/testimonials.ts
- src/components/testimonials.tsx
- src/app/globals.css
- tests/home-content-browser.mjs

## Validation

Production build with TypeScript and ESLint passed. Browser checks passed at 360, 390, 599, 768, 1024 and 1440px, covering content, image URLs, forward/backward wrap, stable height, keyboard, reduced motion, mobile swipes, horizontal overflow and console errors. Real-time tests verified the 5.5-second autoplay cycle through all four reviews and back to the first, hover pause and a fresh interval after manual navigation.

Desktop/mobile screenshots were visually inspected. The list bullets were restored after identifying Tailwind's list-style reset. Tests used Edge with touch/viewport emulation, not physical phones.

Evidence: qa/home-content-browser-results.json and qa/screenshots/home-content.