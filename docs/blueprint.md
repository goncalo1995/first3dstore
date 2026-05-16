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
em3d-desk-setup-v1
em3d-desk-onboarding-dismissed-v1
```

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
  schemaVersion: 1
  surface: 'top'
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
  items: DeskItem[]
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
- `surface` is currently only `'top'`, but the model is prepared for future `top | under`.
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
  items,
  pricing,
  warnings,
  submittedAt
}
```

## Current Validation Rules

Current validation source of truth:

```text
lib/desk/products.ts
lib/desk/validation.ts
```

Rules:

- Desk width must be between `80cm` and `200cm`.
- Desk depth must be between `50cm` and `100cm`.
- `surface` must currently be `'top'`.
- Product IDs must exist in `lib/desk/products.ts`.
- Rotations must be `0`, `90`, `180`, or `270`.
- Items must remain within desk bounds.
- Product max quantity rules are enforced.
- Selected base/accent colors must be allowed by the product definition.
- Submitted `customConfig` must only contain known keys and valid values for that product.
- Quote submission rejects empty setups.
- Quote submission allows at most `20` items.
- Overlap is a warning only: `Alguns produtos parecem estar sobrepostos.`
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
- `itemsPrice = sum(getDeskItemPrice(item))`.
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

Generator metadata is now used by the Phase 3A payload mapper. It is still preview/debug-only: the app does not execute OpenSCAD and does not generate STL files.

## Current UX Capabilities

Implemented:

- desk presets: `Pequena`, `Standard`, `Grande`;
- custom desk dimensions;
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
- Product catalog is grouped by category.
- Selected/focus badges show product name and computed item price.
- Setup summary includes selected custom options, per-item prices, warnings, and totals.
- Empty desk state suggests adding a starter item through the normal add-product path.
- Mobile drawers remain part of the active workflow.

Homepage state:

- Homepage now introduces `/criar/desk` as the main experience.
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
- each item with product name, position in cm, rotation, colors, selected custom options, derived footprint, and derived item price;
- compact read-only top-down preview;
- collapsible raw JSON.

Unknown, malformed, or stale products/configs are handled gracefully instead of crashing the admin drawer.

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

Important: this is preview/debug only. It does not shell out, write files, create queues/jobs, execute OpenSCAD, or generate STL files.

## Historical / Superseded Notes

The following ideas are preserved for context but are not the current implementation target.

### Under-desk-first assumption

Historical. The product direction moved away from starting under the desk. Under-desk should return later as a second surface after the top-of-desk builder is stronger.

### Strict grid-only assumption

Historical. The builder is now free spatial placement with optional snap. Products can later have their own internal grids, but the desk arrangement itself is not a strict modular grid.

### Checkout/cart-first language

Superseded for Phase 1. The current desk builder uses `Pedir orçamento` and saves a `PENDING_REVIEW` request. Cart/Stripe integration is intentionally deferred.

### `version: 1` desk payload examples

Superseded. Use `schemaVersion: 1` for `DeskSetup`. Existing non-desk `canvasConfig.version` payloads remain part of older flows, but desk setup payloads should not add a separate `version` field.

## Completed Phase Notes

Phase 2A is completed. Product-specific fields are now defined in `lib/desk/products.ts`, rendered generically in `/criar/desk`, persisted into `DeskItem.customConfig`, validated locally/server-side, included in quote notes, and included in generator payload mapping.

Phase 2B, 2C, 2D, and 3A are also completed as described above.

Still defer:

- STL generation;
- OpenSCAD execution;
- cart integration for desk setups;
- Three.js/WebGL;
- under-desk surface.

## Next Recommended Phase

### Phase 3B — OpenSCAD module contract/spec and generator fixtures

Goal:

Define the actual SCAD module interface expected by the generated Phase 3A payload and create deterministic fixture examples for each product/custom option. Keep this docs/helper-level unless explicitly asked to implement STL generation.

Recommended tasks:

- Document the `generate_desk_setup(...)` OpenSCAD module contract.
- Define the item tuple/object contract expected by the SCAD side.
- Create fixture payload examples for:
  - `magsafe_dock_v1` cable exit and phone side combinations;
  - `pen_holder_v1` height presets and dividers;
  - `desk_tray_v1` sizes `S`, `M`, `L`;
  - `headphone_stand_v1` hook side and height presets.
- Add fixture examples that demonstrate:
  - mm coordinate mapping;
  - rotation;
  - derived footprint override for tray sizes;
  - color names;
  - sorted `customConfig`.
- Keep it deterministic and reviewable.
- Do not execute OpenSCAD.
- Do not generate STL files.
- Do not add queues/jobs/storage.
- Do not modify checkout/cart behavior.
