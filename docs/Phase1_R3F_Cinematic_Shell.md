# Phase 1 - R3F Cinematic Shell & Scroll Rig

## Goal

Create the reusable cinematic page foundation for `/produto/[slug]`, starting with `headset-stand`.

The user should land on a full-screen product scene with floating UI and scroll-driven motion. The legacy `/criar/headset-stand` configurator remains untouched and available as the safety path.

## Safer Rollout

- Build the cinematic page at `/produto/headset-stand`.
- Do not delete, refactor, or replace `/criar/headset-stand`.
- Only change redirect logic for `headset-stand` after the new page builds, loads, and is proven stable.
- If the cinematic route fails WebGL or becomes operationally risky, the user must still be able to use `/criar/headset-stand`.

## Route And Component Plan

- Add a dedicated client component:

```text
components/product-cinematic/CinematicProductExperience.tsx
```

- Render the cinematic experience only for eligible products, starting with `headset-stand`.
- Keep product-specific scene logic separate from route logic so future products can reuse the shell.
- Do not add production navigation to the cinematic route until the experience is verified.

## Full-Screen Canvas Shell

Use a full-screen R3F canvas behind the DOM interface:

```tsx
fixed inset-0 z-0 bg-[#050505]
```

Floating overlay containers should not block the scene:

```tsx
relative z-10 pointer-events-none
```

All buttons, inputs, links, swatches, and checkout controls must opt back into interaction:

```tsx
pointer-events-auto
```

## Scene Baseline

- Use `PerspectiveCamera` with FOV `45` or `50`.
- Use `Environment preset="studio"` for product-friendly lighting.
- Use `ContactShadows` for grounding the model.
- Add key, rim, and soft fill lights.
- Respect reduced motion by disabling non-essential animation and jumping camera transforms instead of smoothing.
- Avoid post-processing until mobile performance is proven.

## Scroll Rig

Use Framer Motion `useScroll` to map page scroll into scene state.

Recommended scroll sections:

- `hero`: product front view;
- `materials`: slow rotation and material emphasis;
- `variants`: camera moves closer while the variant changes are introduced;
- `engraving`: product tilts to reveal the engraving area;
- `checkout`: product settles into the final purchase pose.

Centralize transforms in a `CinematicScrollRig` so product components receive clear, declarative state instead of reading scroll directly in several places.

## Strict Mobile WebGL Rules

- The 3D Canvas must be lazy-loaded with `next/dynamic` and `ssr: false`.
- Cap device pixel ratio on mobile, for example:

```tsx
<Canvas dpr={[1, 1.5]} />
```

- No heavy GLB files in Phase 1.
- No physics.
- No grid math.
- No multi-object sandbox logic.
- If WebGL fails, crashes, or context is lost, the page must remain usable with standard HTML/CSS.
- The fallback must include a clear CTA linking to `/criar/headset-stand`.

## Acceptance Criteria

- `/produto/headset-stand` loads a cinematic product page.
- The canvas fills the viewport.
- Scroll changes the camera/model presentation.
- Mobile remains usable and does not overheat under normal use.
- WebGL fallback works and links to `/criar/headset-stand`.
- `/criar/headset-stand` remains untouched.
