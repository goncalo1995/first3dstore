# EM3D Blueprint - Cinematic Single Product Commerce

## Strategic Pivot

EM3D is moving away from the complex desk sandbox/builder model and toward a high-margin, low-tech-debt cinematic single-product e-commerce model.

The new mental model is:

```text
Discover one beautiful product -> experience it cinematically -> personalise a few meaningful details -> checkout.
```

Not:

```text
Build a multi-object desk system with grid placement, collision logic, and sandbox editing.
```

The previous Desk Studio work remains useful as R&D, but it should no longer be the strategic foundation for growth. The stable quote-based builder can remain online while EM3D rebuilds the product experience around individual hero products.

## Product Direction

The first flagship experience is:

```text
/produto/headset-stand
```

The page should behave like an Apple-style product story:

- full-screen 3D product scene;
- scroll-driven product rotation and feature reveals;
- floating glassmorphism configurator;
- variant switching, color changes, and engraved text;
- checkout or review-first payment flow;
- InstantDB-backed catalog and order visibility when the flow is validated.

The commercial goal is fewer configurable dimensions, clearer SKUs, stronger visual storytelling, and faster checkout.

During rollout, `/criar/headset-stand` remains the safe legacy fallback. Do not delete, replace, or refactor it as part of the cinematic product foundation.

## Removed From Core Strategy

The new foundation should avoid:

- multi-object grid sandbox flows;
- collision detection;
- drag-and-drop spatial editing;
- separate top/under desk surfaces;
- complex desk quote payloads;
- OpenSCAD/STL generation in the shopping flow;
- customer-facing manufacturing complexity.

## Tech Stack

- **Next.js App Router**: product pages, API routes, server rendering where useful.
- **React Three Fiber**: product scene rendering.
- **Drei**: `Environment`, `ContactShadows`, `RoundedBox`, `Html`, `Float`, `PresentationControls`, and scene helpers.
- **Three.js**: procedural geometry and materials.
- **Framer Motion**: DOM animation and scroll progress orchestration.
- **InstantDB**: catalog data, order records, admin visibility.
- **Stripe Checkout**: payment sessions and payment confirmation when direct checkout is enabled.
- **Tailwind CSS**: mobile-first glassmorphism UI.

Post-processing such as bloom and vignette can be introduced after the first performant product scene is stable on mobile.

## No Early DB Schema Migrations

Phases 1-3 must not require an InstantDB schema migration.

Use a local mapping layer first, for example:

```ts
cinematicProductConfigBySlug['headset-stand']
```

This local mapping can define cinematic-specific variants, colors, engraving limits, price additions, feature labels, and scroll sections. Move this metadata into InstantDB only after the product flow is validated with real users and operations.

## Core Principles

- Mobile-first: the product must feel premium on a phone.
- Performance-obsessed: procedural primitives first, imported models later only when justified.
- PT-PT copy only.
- One product per page.
- One clear CTA: `Finalizar encomenda`.
- No visible technical terminology for customers.
- Every configuration option must affect the product visuals, price, or checkout payload.
- Admin/order data must be explicit, boring, and reliable.
- If implementation complexity grows, reduce the cinematic scope instead of reintroducing grid/sandbox logic.
