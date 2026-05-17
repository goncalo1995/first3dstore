# EM3D.pt — Award-Winning Desk Configurator Blueprint

## Core Concept

Build a premium interactive desk experience where the website becomes the product.

The user sees a beautiful top-down or slight-isometric desk scene. They can adjust desk size, add products, drag and rearrange items, click an item to focus, customize that item, delete items, save their setup, return to overview, and eventually buy or request the full configuration.

The target mental model is:

> Build your perfect desk setup → customize each object → request or buy the setup.

Not:

> Choose product → configure → checkout.

This is the core strategic shift. EM3D is not just selling isolated 3D prints; it is selling custom desk systems.

## Recommended Product Direction

Start with top-of-desk, not under-desk.

Top-of-desk is easier to understand visually, easier to sell, and easier to make beautiful. Under-desk remains important, but should come later as a second surface once the spatial builder is stable.

Long-term structure:

```text
Desk Overview
├── Top of Desk
│   ├── MagSafe dock
│   ├── pen holder
│   ├── trays
│   ├── monitor stand
│   ├── keyboard tray
│   └── desk organizer modules
│
└── Under Desk
    ├── cable tray
    ├── headphone hook
    ├── drawer
    ├── power brick mount
    └── USB hub mount
```

Future UI can add:

- `Ver parte inferior da secretária`
- `Configurar por baixo da secretária`

## Current Implemented State

Implemented phases:

- Phase 1A — Spatial Foundation: implemented.
- Phase 1B — Commerce Foundation / quote request: implemented.
- Phase 1C — UX polish: implemented.
- Phase 2A — Product-specific customization: implemented.
- Phase 2B — Premium product visuals and catalog polish: implemented.
- Phase 2C — Homepage-to-builder polish: implemented.
- Phase 2D — Admin desk setup request review: implemented.
- Phase 3A — OpenSCAD payload mapping: implemented.
- Phase 4A — Launchable Desk Studio MVP with top + under-desk surfaces: implemented.

Still not implemented:

- STL generation;
- OpenSCAD execution;
- production queues/jobs for desk setups;
- file writing/storage for generated geometry.

Current route:

```text
/criar/desk
```

The homepage now leads with:

```text
/criar/desk
```

The headset stand remains visible as a secondary product/configurator, not the main desk-builder narrative.

Current localStorage keys:

```text
em3d-desk-setup-v2
em3d-desk-onboarding-dismissed-v1
```

Historical localStorage key:

```text
em3d-desk-setup-v1
```

If a v1 setup is found, it is migrated in-browser: legacy `items` becomes `topItems`, `underItems` starts empty, and the normalized setup is saved to `em3d-desk-setup-v2`.

Current quote request API:

```text
POST /api/desk/request
```

Current quote CTA copy:

```text
Pedir orçamento
```

The current flow is quote/review-first. It does not use the cart, does not use Stripe, does not execute OpenSCAD, and does not generate STL files.

## Current DeskSetup Shape

`schemaVersion` is the only persisted setup version. Do not use a separate `version` field for the desk setup payload.

When the localStorage shape changes, increment both:

- `schemaVersion`
- localStorage key

Current persisted shape:

```ts
type DeskSetup = {
  type: 'desk-setup'
  schemaVersion: 2
  surface: 'top' | 'under'
  mode: 'view' | 'edit' | 'focus'
  desk: {
    widthCm: number
    depthCm: number
    surfaceColor: string
    showGrid: boolean
    snapToGrid: boolean
    snapSizeCm: 5 | 10
  }
  selectedItemId?: string
  topItems: DeskItem[]
  underItems: DeskItem[]
  createdAt: string
  updatedAt: string
}

type DeskItem = {
  id: string
  productId: string
  xCm: number
  yCm: number
  rotation: 0 | 90 | 180 | 270
  zIndex?: number
  colorBase?: string
  colorAccent?: string
  customConfig?: Record<string, unknown>
}
```

Rules:

- Persist all item positions in centimetres.
- UI may render in pixels, but saved state is always centimetres.
- Do not store footprint on `DeskItem`; derive dimensions from `productId` and `customConfig`.
- `surface` is the active editing surface, either `'top'` or `'under'`.
- `topItems` stores products placed above the desk.
- `underItems` stores products placed under the desk.
- The old single-list `items` shape is historical/superseded and remains relevant only for v1 migration and old admin request compatibility.
- `customConfig` is actively used.
- New products receive default `customConfig`.
- Invalid saved localStorage `customConfig` falls back to product defaults with PT-PT warnings.
- Server submission rejects invalid `customConfig`.
- Quote notes include selected custom options.

## Current Footprint Rules

Current footprint source of truth:

```text
getDeskItemFootprint(item)
```

Rules:

- Footprint is always derived with `getDeskItemFootprint(item)`.
- Do not read static `product.footprintCm` directly for placement, bounds, collision, display, summaries, or generator mapping.
- `desk_tray_v1.size` can override footprint:
  - `S`: `12cm x 8cm`;
  - `M`: `16cm x 10cm`;
  - `L`: `20cm x 12cm`.
- Bounds, collision warnings, visual size, summaries, quote notes, admin review, and generator mapping must use the derived footprint.

## Current Quote Request Flow

The client submits customer fields plus the current `DeskSetup` to:

```text
POST /api/desk/request
```

The server:

- trims text fields;
- enforces field length limits;
- validates the setup;
- recalculates pricing;
- stores an `orderRequests` record with `status: 'PENDING_REVIEW'`.

Success response:

```json
{
  "success": true,
  "requestId": "string",
  "pricing": {
    "itemsPrice": 0,
    "setupDiscount": 0,
    "totalPrice": 0
  },
  "warnings": [],
  "message": "Pedido enviado para revisão."
}
```

Error response:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Mensagem em PT-PT.",
  "fieldErrors": {}
}
```

## orderRequests Persistence

The request is stored with:

```ts
productSlug: 'desk-setup'
productName: 'Setup de Secretária Personalizado'
status: 'PENDING_REVIEW'
selectedPrice: serverPricing.totalPrice
estimatedPrice: serverPricing.totalPrice
```

Customer PII rules:

- `canvasConfig` must remain PII-free.
- Customer name/email/phone live in existing `orderRequests` fields.
- Address and customer notes live in `orderRequests.notes`.
- Do not duplicate contact details inside `canvasConfig`.

Current `canvasConfig` contains only setup/product data:

```ts
{
  type: 'desk-setup',
  schemaVersion: 1,
  surface: 'top',
  desk,
  topItems,
  underItems,
  pricing,
  warnings,
  submittedAt
}
```

Older v1 `canvasConfig` records may still contain `items`; admin review supports both shapes.

## Current Validation Rules

Current validation source of truth:

```text
lib/desk/products.ts
lib/desk/validation.ts
```

Rules:

- Desk width must be between `80cm` and `200cm`.
- Desk depth must be between `50cm` and `100cm`.
- `surface` must be `'top'` or `'under'`.
- Top products are only valid in `topItems`.
- Under-desk products are only valid in `underItems`.
- Product IDs must exist in `lib/desk/products.ts`.
- Rotations must be `0`, `90`, `180`, or `270`.
- Items must remain within desk bounds.
- Product max quantity rules are enforced.
- Selected base/accent colors must be allowed by the product definition.
- Submitted `customConfig` must only contain known keys and valid values for that product.
- Quote submission rejects setups only when both `topItems` and `underItems` are empty.
- Quote submission allows at most `20` items per surface.
- Overlap is a warning only, evaluated per surface.
- Missing `catalogProducts` seed rows must not block valid Phase 1 desk products.

Old or invalid saved localStorage colors are normalized to the product defaults on load with a PT-PT warning. The server still rejects invalid colors in submitted payloads.

## Current Pricing Rules

Current pricing source of truth:

```text
lib/desk/pricing.ts
```

Rules:

- Server recalculates pricing.
- Client/localStorage pricing is not trusted.
- Pricing uses `getDeskItemPrice(item)`.
- `itemsPrice = sum(getDeskItemPrice(item))` across both `topItems` and `underItems`.
- `setupDiscount = 0`.
- `totalPrice = itemsPrice`.
- Option price adjustments are included.
- Current option price adjustments:
  - `desk_tray_v1.size = M`: `+3€`;
  - `desk_tray_v1.size = L`: `+6€`.

## Current Product Definitions

Current products live in:

```text
lib/desk/products.ts
```

### magsafe_dock_v1

- Name: `Suporte MagSafe`
- Category: `Carregamento`
- Price: `15`
- Base footprint: `14cm x 7cm`
- Allowed base colors: `Preto Fosco`, `Branco Stormtrooper`
- Allowed accent colors: `Madeira Walnut`, `Neon Lime`, `Pulse Blue`
- Max quantity: `2`
- Custom fields:
  - `cableExit`: `back | left | right`, default `back`;
  - `phoneSide`: `left | right`, default `right`.
- Generator metadata:
  - type: `openscad`
  - moduleId: `magsafe_v1`
  - moduleName: `magsafe_dock_v1`
  - version: `v1`

### pen_holder_v1

- Name: `Copo de Canetas`
- Category: `Organização`
- Price: `8`
- Base footprint: `7cm x 7cm`
- Allowed base colors: `Preto Fosco`, `Branco Stormtrooper`
- Allowed accent colors: `Madeira Walnut`, `Neon Lime`, `Pulse Blue`
- Custom fields:
  - `heightPreset`: `low | standard | tall`, default `standard`;
  - `dividers`: boolean, default `false`.
- Generator metadata:
  - type: `openscad`
  - moduleId: `pen_holder_v1`
  - moduleName: `pen_holder_v1`
  - version: `v1`

### desk_tray_v1

- Name: `Bandeja Modular`
- Category: `Arrumação`
- Price: `5`
- Base footprint: `12cm x 8cm`
- Allowed base colors: `Preto Fosco`, `Branco Stormtrooper`
- Allowed accent colors: `Madeira Walnut`, `Neon Lime`, `Pulse Blue`
- Custom fields:
  - `size`: `S | M | L`, default `S`;
  - `S`: `12cm x 8cm`, current price;
  - `M`: `16cm x 10cm`, `+3€`;
  - `L`: `20cm x 12cm`, `+6€`.
- Generator metadata:
  - type: `openscad`
  - moduleId: `desk_tray_v1`
  - moduleName: `desk_tray_v1`
  - version: `v1`

### headphone_stand_v1

- Name: `Suporte de Auscultadores`
- Category: `Áudio`
- Price: `24.90`
- Base footprint: `12cm x 10cm`
- Allowed base colors: `Preto Fosco`, `Branco Stormtrooper`
- Allowed accent colors: `Madeira Walnut`, `Neon Lime`, `Pulse Blue`
- Custom fields:
  - `hookSide`: `left | right`, default `right`;
  - `heightPreset`: `standard | tall`, default `standard`.
- Generator metadata:
  - type: `openscad`
  - moduleId: `headphone_stand_v1`
  - moduleName: `headphone_stand_v1`
  - version: `v1`

### cable_tray_v1

- Name: `Calha para Cabos`
- Category: `Gestão de cabos`
- Price: `19.90`
- Base footprint: `35cm x 10cm`
- Surface: `under`
- Custom fields:
  - `size`: `S | M | L`, default `M`;
  - `cableExit`: `left | right | both`, default `both`.

### cable_clip_v1

- Name: `Clips de Cabos`
- Category: `Gestão de cabos`
- Price: `4.90`
- Base footprint: `6cm x 3cm`
- Surface: `under`
- Custom fields:
  - `packSize`: `3 | 6 | 10`, default `3`.

### power_brick_mount_v1

- Name: `Suporte para Transformador`
- Category: `Gestão de cabos`
- Price: `12.90`
- Base footprint: `16cm x 9cm`
- Surface: `under`
- Custom fields:
  - `strapType`: `elastic | printed`, default `elastic`.

### under_desk_drawer_v1

- Name: `Gaveta Under-Desk`
- Category: `Arrumação`
- Price: `29.90`
- Base footprint: `28cm x 18cm`
- Surface: `under`
- Custom fields:
  - `size`: `compact | standard`, default `standard`;
  - `openingSide`: `front | left | right`, default `front`.

### headphone_hook_under_v1

- Name: `Gancho para Auscultadores`
- Category: `Áudio`
- Price: `9.90`
- Base footprint: `8cm x 6cm`
- Surface: `under`
- Custom fields:
  - `side`: `left | right`, default `right`.

Generator metadata is now used by the Phase 3A payload mapper. It is still preview/debug-only: the app does not execute OpenSCAD and does not generate STL files.

## Current UX Capabilities

Implemented:

- desk presets: `Pequena`, `Standard`, `Grande`;
- custom desk dimensions;
- active surface switching between `Em cima da secretária` and `Por baixo da secretária`;
- optional grid and snap;
- add products;
- drag products;
- select products;
- focus mode;
- rotate selected item;
- delete selected item;
- save setup locally;
- reset setup;
- quote request modal;
- mobile bottom drawers;
- first-time onboarding;
- keyboard shortcuts:
  - `Escape`: exit focus or deselect;
  - `Delete` / `Backspace`: remove selected item in edit mode;
  - `R`: rotate selected item;
  - `G`: toggle grid;
  - `S`: save setup;
- development-only Debug JSON and export.

Current visual/UI polish:

- `/criar/desk` has premium CSS/DOM-only visuals for MagSafe, pen holder, tray, and headphone stand.
- Product catalog is filtered by active surface and category.
- Selected/focus badges show product name and computed item price.
- Setup summary includes selected custom options, per-item prices, warnings, and totals.
- Empty desk state encourages starting with a goal.
- Starter templates are available:
  - `Setup Gaming`;
  - `Criador de Conteúdo`;
  - `Minimal`;
  - `Home Office`;
  - `Gestão de Cabos`.
- A `Pronto para orçamento` panel shows top item count, under-desk item count, estimated total, warnings count, and the quote CTA.
- Mobile drawers remain part of the active workflow.

Homepage state:

- Homepage now introduces `/criar/desk` as the main experience for above-and-under desk organization.
- It includes an inline SVG desk-builder teaser.
- It includes value props for custom spatial fit, 3D-printed parts, and one-request setup creation.
- Headset stand messaging remains visible but secondary.

## Current Admin Review State

Admin desk setup request review lives in:

```text
app/admin/order-requests/page.tsx
```

For `canvasConfig.type === 'desk-setup'`, the admin renderer shows:

- desk dimensions;
- surface;
- item count;
- warnings;
- `Preço no pedido` from `canvasConfig.pricing.totalPrice`;
- `Preço guardado` from `request.selectedPrice` / `request.estimatedPrice`;
- explicit price mismatch warning when stored/request prices differ;
- v1 and v2 desk requests grouped by surface where available;
- each item with product name, position in cm, rotation, colors, selected custom options, derived footprint, and derived item price;
- compact read-only top-down preview;
- collapsible raw JSON.

Unknown, malformed, or stale products/configs are handled gracefully instead of crashing the admin drawer. If under-desk items exist, admin notes that under-surface generator support is not implemented yet.

## Current Generator Mapping State

Generator mapping lives in:

```text
lib/desk/generator.ts
```

It provides:

- `buildDeskGeneratorPayload(input)`;
- `formatDeskGeneratorCall(payload)`;
- `DeskGeneratorPayload`;
- `DeskGeneratorValidationError`.

The mapper builds a deterministic payload:

```ts
{
  type: 'desk-openscad-payload',
  generatorVersion: 'desk-openscad-v1',
  sourceSchemaVersion: 1,
  desk: {
    widthMm,
    depthMm,
    surface: 'top',
    grid?
  },
  items: [...]
}
```

Rules:

- Converts centimetres to integer millimetres with `Math.round(cm * 10)`.
- Uses `generatorVersion: 'desk-openscad-v1'`.
- Maps each item to product generator metadata, mm position, rotation, derived `footprintMm`, colors, and validated `customConfig`.
- Validates only generation-relevant data: type, schema version, surface, desk dimensions, known products, rotation, bounds, colors, and `customConfig`.
- Ignores request-only fields such as pricing, warnings, `submittedAt`, notes, and customer data.
- Formats a safe OpenSCAD-style preview string for admin/debug display.
- Escapes string values including quotes, backslashes, newlines, carriage returns, tabs, and other control characters.

Important: this is preview/debug only. It does not shell out, write files, create queues/jobs, execute OpenSCAD, or generate STL files. After Phase 4A, generator payload remains top-surface only; under-desk generator support is explicitly not implemented yet.

## Historical / Superseded Notes

The following ideas are preserved for context but are not the current implementation target.

### Under-desk-first assumption

Historical. The product direction moved away from starting under the desk. Under-desk should return later as a second surface after the top-of-desk builder is stronger.

### Strict grid-only assumption

Historical. The builder is now free spatial placement with optional snap. Products can later have their own internal grids, but the desk arrangement itself is not a strict modular grid.

### Checkout/cart-first language

Superseded for Phase 1. The current desk builder uses `Pedir orçamento` and saves a `PENDING_REVIEW` request. Cart/Stripe integration is intentionally deferred.

### `version: 1` desk payload examples

Superseded. Use `schemaVersion: 2` for current `DeskSetup`. Existing non-desk `canvasConfig.version` payloads remain part of older flows, and old v1 desk setup records may still exist for migration/admin compatibility, but new desk setup payloads should not add a separate `version` field.

### Single-list `items` desk model

Superseded by `topItems` and `underItems`. The old `items` list should only be accepted for v1 localStorage migration and old admin request compatibility.

## Completed Phase Notes

Phase 2A is completed. Product-specific fields are now defined in `lib/desk/products.ts`, rendered generically in `/criar/desk`, persisted into `DeskItem.customConfig`, validated locally/server-side, included in quote notes, and included in generator payload mapping.

Phase 2B, 2C, 2D, 3A, and 4A are also completed as described above.

Still defer:

- STL generation;
- OpenSCAD execution;
- cart integration for desk setups;
- Three.js/WebGL;
- under-desk generator support.

## Next Recommended Phase

### Phase 4B — Launch hardening and conversion polish

Goal:

Make the Desk Studio reliable and conversion-ready for real users. Focus on clarity, trust, error states, mobile usability, and request conversion. Do not add new product families, STL generation, OpenSCAD execution, Three.js/WebGL, cart/Stripe, or schema migrations.

Recommended tasks:

- Improve request conversion:
  - clearer quote CTA copy around what happens next;
  - show `Recebes uma confirmação e revisão manual antes da produção` near the quote form;
  - after successful quote, show next steps: pedido recebido, revisão do setup, confirmação de preço/prazos, produção.
- Improve mobile usability:
  - ensure surface switch, catalog, focus panel, and quote readiness are reachable without crowding;
  - improve sticky bottom CTA if needed;
  - keep touch targets comfortable.
- Improve error handling:
  - clearer PT-PT messages for invalid setup, invalid saved state, failed quote request, and network failure;
  - prevent users from losing setup after quote errors.
- Improve trust:
  - `Revisão manual antes da impressão`;
  - `Peças feitas por encomenda`;
  - `Sem pagamento automático nesta fase`;
  - `Recebes confirmação antes de avançar`.
- Add lightweight local analytics hooks without external services:
  - surface switched;
  - template applied;
  - product added;
  - quote modal opened;
  - quote submitted successfully;
  - log only in development.
- Polish copy:
  - all visible text in PT-PT;
  - no customer-facing technical terms like `canvasConfig`, `schemaVersion`, generator, or OpenSCAD.

Verification:

- `npx tsc --noEmit --pretty false`;
- `npm run build`;
- manually test desktop and mobile quote flow;
- report changed files and whether API/schema/admin/generator changed.
