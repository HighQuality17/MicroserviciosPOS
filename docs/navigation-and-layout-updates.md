# Navigation and Layout Updates

## Scope

Short technical note for the latest authenticated-shell improvements in `Registry POS`.

## Implemented changes

- The mobile hamburger trigger is rendered from `frontend/src/layouts/AppLayout.tsx`, outside `Header.tsx`, so it remains visible while the user scrolls.
- Route changes reset the main scroll position through `frontend/src/app/router/ScrollToTop.tsx` using `window.scrollTo(...)`.
- Mobile navigation closes the sidebar automatically after route changes and after selecting a menu option.
- Desktop includes a compact sidebar collapse/expand control placed between the navigation rail and the main content area.
- The desktop-only collapse control is explicitly hidden on mobile according to the real layout breakpoint.
- The active sidebar item was visually refined to remove the clipped left seam and keep the premium glow aligned inside the button surface.

## Main files involved

- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/app/router/ScrollToTop.tsx`
- `frontend/src/styles.css`

## Visual and UX criteria applied

- Keep the premium dark language intact while reducing visual friction.
- Prefer one clear interaction per viewport instead of mixed mobile and desktop controls.
- Keep sidebar active states compact, centered and visually self-contained.
- Avoid decorative effects that extend outside clipped containers when they create seams or misaligned glow.

## Operational impact

- Mobile navigation remains reachable during long vertical scroll sessions.
- New views start from the top instead of preserving stale scroll positions.
- Mobile transitions feel cleaner because the sidebar closes immediately after navigation.
- Desktop keeps a compact navigation mode without losing icon-based usability.
- Active sidebar states look cleaner and more stable in both desktop and mobile shells.