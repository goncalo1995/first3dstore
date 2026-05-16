# Phase 2 - Parametric Product Component

## Goal

Build the first premium procedural 3D product component: `HeadsetStand3D`.

It should feel polished without relying on external model assets. The purpose is to sell one product beautifully, not recreate manufacturing geometry.

## Product State

Use a compact state shape:

```ts
type HeadsetStandConfig = {
  variant: 'desk-base' | 'clamp'
  colorBase: string
  colorAccent: string
  engravedText: string
}
```

## Component

Create:

```text
components/product-cinematic/products/HeadsetStand3D.tsx
```

The component receives product configuration as props and renders the current visual state. It should not own checkout state, catalog state, or route state.

## Geometry

- Use Drei `RoundedBox` for softened premium shapes.
- Use cylinders, tori, and boxes only where they improve product readability.
- Do not import GLB files initially.
- Keep geometry count low.
- Do not use STL, OpenSCAD, or manufacturing geometry in the shopping experience.

## Variants

Supported initial variants:

- `desk-base`: weighted base, vertical stem, curved rest;
- `clamp`: clamp body, jaw, screw-like visual detail.

Variant changes should animate smoothly. Avoid hard visual swaps unless the animation cost becomes too high on mobile.

## Materials

- `colorBase` maps to the main body.
- `colorAccent` maps to trim, logo plate, inner detail, or edge band.
- Tune roughness and metalness for a premium matte printed finish.
- Use subtle emissive only if it is tasteful and does not make the product feel like a gaming peripheral.

## Engraving Rendering

- Use Drei `Text` or `Text3D` only if performance is acceptable.
- Hide the text mesh when engraving is invalid or empty.
- Do not attempt to extrude or render unsupported glyphs.

## Engraving Safety

The engraving rule must be shared conceptually with the UI and server validation:

- max `16` characters after trimming;
- trim leading and trailing whitespace;
- block empty-only strings;
- allow letters including Portuguese accents, numbers, spaces, hyphen, apostrophe, and period;
- block emojis, control characters, line breaks, invisible formatting characters, and symbols outside the allowlist.

Recommended validation pattern:

```ts
const ENGRAVING_PATTERN = /^[\p{L}\p{N} .'-]+$/u
```

Examples that should be valid:

- `João`
- `Inês M.`
- `D'Ávila`
- `Ana-Maria`
- `Rui 2026`

## Feature Refs

Expose named groups or refs for future scroll highlights:

- `base`;
- `supportArm`;
- `clamp`;
- `engravedPlate`;
- `accentDetail`.

These targets allow Phase 1 scroll sections to highlight features without hard-coding geometry internals in the page.

## Acceptance Criteria

- The product reads clearly as a headset stand.
- Variants update visibly.
- Color changes update immediately.
- Valid engraving appears on the model.
- Invalid engraving never reaches 3D text rendering.
- No external model assets are required.
- Geometry remains performant on mobile.
