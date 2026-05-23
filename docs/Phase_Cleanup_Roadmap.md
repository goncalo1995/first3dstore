# Phase Cleanup Roadmap

## Purpose

This roadmap captures the pre-launch cleanup work discovered during the Modular
checkout audit. It is intentionally deferred. Do not execute these deletions
during the safe checkout refactor.

This cleanup phase should run before the Print Farm integration phase.

## Dead Files To Delete Later

### HexaMemória

- `app/criar/hexa/page.tsx`
- `app/api/checkout/hexa/route.ts`
- `components/hexa/HexaCanvas.tsx`
- `components/hexa/HexaCheckoutDialog.tsx`
- `components/hexa/HexaControlsPanel.tsx`
- `components/hexa/HexaEditModal.tsx`
- `lib/hexa-helpers.ts`
- `types/hexa.ts`
- `scripts/openscad/hexa_frame.scad`

### Puzzle

- `app/criar/puzzle/page.tsx`
- `app/api/puzzle/request/route.ts`
- `lib/puzzle/openscad.ts`
- `lib/puzzle/preview.ts`
- `lib/puzzle/pricing.ts`
- `lib/puzzle/types.ts`
- `scripts/puzzle-openscad/README.md`
- `scripts/puzzle-openscad/cut-matrix.scad`
- `scripts/puzzle-openscad/example-params.json`
- `scripts/puzzle-openscad/render-cut-matrix.mjs`

Keep `lib/puzzle/svg.ts` because the Modular builder uses it for SVG logo
sanitization.

## Legacy References To Clean Later

- `app/produto/[slug]/page.tsx`: remove Hexa redirect to `/criar/hexa`.
- `app/encomenda/cancelado/page.tsx`: replace Hexa CTA.
- `app/api/webhooks/stripe/route.ts`: remove Hexa-specific email/payment
  branches.
- `components/email-template.tsx`: remove Hexa email component while keeping
  marketing email code.
- `lib/email-templates.ts`: remove Puzzle and Hexa email helpers.
- `app/admin/order-requests/page.tsx`: remove Puzzle/Hexa admin branches.
- `app/admin/order-requests/actions.ts`: remove Puzzle/Hexa actions.
- `app/admin/orders/orders-manager.tsx`: remove `LegacyOrderRequestStatus`,
  `MODELING`, and `B2B_LEAD` status fallback.
- `scripts/seed-products.ts`: remove Hexa product seed generation.

## Future Schema Cleanup

In `instant.schema.ts`, later narrow statuses to the final pipeline and remove
obsolete fields.

### Status Enums

Future clean enum:

`DRAFT | PENDING_REVIEW | AWAITING_PAYMENT | IN_PRODUCTION | SHIPPED | CANCELLED`

### `orderRequests` Fields To Remove Later

- `imageUrl`
- `baseColor`
- `productType`
- `stlUrl`
- `svgUrl`
- `previewUrl`
- `variantId`
- `variantName`
- `lightMode`
- `engravingText`

### `canvasConfig` Shape To Narrow Later

Keep only the Modular planner shape:

- `version`
- `type: 'modular-list'`
- `walls`
- `extraLetterPackSelections`

Remove old variants:

- `simple`
- `photo-puzzle`
- `svg-puzzle`
- `wall-forge`
- `hexa-memoria`

## Reminder

When this future cleanup is implemented, run:

`npx instant-cli push schema --yes`
