# Phase 3 - Floating Configurator UI

## Goal

Create the floating product configurator overlay connected to catalog/product state and the 3D product component.

The UI should feel premium, direct, and mobile-first. It should not expose manufacturing or implementation details.

## Metadata

Use existing catalog fields where possible, but do not require an InstantDB schema migration in Phases 1-3.

Add a local mapping layer first:

```ts
cinematicProductConfigBySlug['headset-stand']
```

This mapping should include:

- supported variants;
- base colors;
- accent colors;
- engraving rules;
- variant price additions;
- engraving price additions;
- premium color price additions if needed.

Move this metadata into InstantDB only after the cinematic product flow is validated.

## UI Structure

Top navigation:

- EM3D/back link;
- product name;
- compact price;
- checkout CTA.

Floating configurator:

- variant segmented control;
- base color swatches;
- accent color swatches;
- engraving input;
- quantity if needed;
- price summary;
- `Finalizar encomenda` CTA.

Use glassmorphism:

```tsx
backdrop-blur-xl bg-black/40 border border-white/10
```

## State

- UI state is the source of truth.
- Pass `variant`, `colorBase`, `colorAccent`, and `engravedText` into the 3D product.
- The scroll rig must not duplicate product configuration state.
- The checkout payload must be derived from validated UI state and server-side product rules.

## Client Engraving Validation

The client must use the same rule planned for 3D rendering and server validation:

- max `16` characters after trimming;
- trim leading and trailing whitespace;
- block empty-only strings;
- allow letters including Portuguese accents, numbers, spaces, hyphen, apostrophe, and period;
- block emojis, control characters, line breaks, invisible formatting characters, and symbols outside the allowlist.

Recommended validation pattern:

```ts
const ENGRAVING_PATTERN = /^[\p{L}\p{N} .'-]+$/u
```

Use PT-PT validation copy, for example:

- `A gravação pode ter no máximo 16 caracteres.`
- `Usa apenas letras, números, espaços, hífen, apóstrofo ou ponto.`

## Pricing

Dynamic pricing should include:

- base catalog price;
- variant price add;
- engraving price add;
- premium color price add if needed.

Display:

```text
Total
Finalizar encomenda
```

Never trust the client-side price in Phase 4. The server must recalculate.

## Customer Copy

Use PT-PT customer-facing labels:

- `Escolhe a versão`
- `Cor principal`
- `Detalhe`
- `Gravação`
- `Finalizar encomenda`

Avoid technical terms in customer-facing UI:

- `schemaVersion`
- `canvasConfig`
- `generator`
- `STL`
- `OpenSCAD`
- `API`

## Acceptance Criteria

- Configurator is usable on mobile.
- Product state updates the 3D model immediately.
- Price updates reliably.
- Invalid engraving cannot proceed.
- UI does not obscure the product at key scroll moments.
- No InstantDB schema migration is required.
- All customer copy is PT-PT.
