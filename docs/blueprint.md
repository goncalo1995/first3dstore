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

Phase 1A/1B/1C is implemented as a top-of-desk MVP.

Current route:

```text
/criar/desk
```

The homepage includes a CTA to:

```text
/criar/desk
```

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

The current flow is quote/review-first. It does not use the cart, does not use Stripe, and does not generate STL files.

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
- Do not store footprint on `DeskItem`; derive dimensions from `productId`.
- `surface` is currently only `'top'`, but the model is prepared for future `top | under`.
- `customConfig` exists but Phase 1 does not yet render product-specific fields.

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
- `itemsPrice = sum(product.price)`.
- `setupDiscount = 0`.
- `totalPrice = itemsPrice`.

Phase 2 can add price modifiers from product-specific custom fields.

## Current Product Definitions

Current products live in:

```text
lib/desk/products.ts
```

### magsafe_dock_v1

- Name: `Suporte MagSafe`
- Category: `Carregamento`
- Price: `15`
- Footprint: `14cm x 7cm`
- Allowed base colors: `Preto Fosco`, `Branco Stormtrooper`
- Allowed accent colors: `Madeira Walnut`, `Neon Lime`, `Pulse Blue`
- Max quantity: `2`
- Future generator metadata:
  - type: `openscad`
  - moduleId: `magsafe_v1`
  - moduleName: `magsafe_dock_v1`
  - version: `v1`

### pen_holder_v1

- Name: `Copo de Canetas`
- Category: `Organização`
- Price: `8`
- Footprint: `7cm x 7cm`
- Allowed base colors: `Preto Fosco`, `Branco Stormtrooper`
- Allowed accent colors: `Madeira Walnut`, `Neon Lime`, `Pulse Blue`
- Future generator metadata:
  - type: `openscad`
  - moduleId: `pen_holder_v1`
  - moduleName: `pen_holder_v1`
  - version: `v1`

### desk_tray_v1

- Name: `Bandeja Modular`
- Category: `Arrumação`
- Price: `5`
- Footprint: `12cm x 8cm`
- Allowed base colors: `Preto Fosco`, `Branco Stormtrooper`
- Allowed accent colors: `Madeira Walnut`, `Neon Lime`, `Pulse Blue`
- Future generator metadata:
  - type: `openscad`
  - moduleId: `desk_tray_v1`
  - moduleName: `desk_tray_v1`
  - version: `v1`

### headphone_stand_v1

- Name: `Suporte de Auscultadores`
- Category: `Áudio`
- Price: `24.90`
- Footprint: `12cm x 10cm`
- Allowed base colors: `Preto Fosco`, `Branco Stormtrooper`
- Allowed accent colors: `Madeira Walnut`, `Neon Lime`, `Pulse Blue`
- Future generator metadata:
  - type: `openscad`
  - moduleId: `headphone_stand_v1`
  - moduleName: `headphone_stand_v1`
  - version: `v1`

Generator metadata is future-facing only. Phase 1 does not execute OpenSCAD and does not generate STL files.

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

## Phase 2 Direction

Phase 2 starts turning products from generic shapes into configurable product systems.

When the user focuses a product, the side panel should render controls based on the product definition. Do not hardcode a separate UI for each product. Use a generic field system.

Still defer:

- STL generation;
- OpenSCAD execution;
- cart integration;
- Three.js/WebGL;
- under-desk surface.

Phase 2 should first make `customConfig` meaningful and validated.

## Next Implementation Prompt: Phase 2A

Copy-paste-ready prompt:

```text
Phase 2A: Add product-specific customization fields to the existing /criar/desk focus panel.

Goal:
When a user focuses a product, show fields based on that product’s definition and persist values into DeskItem.customConfig.

Do not add STL generation, OpenSCAD execution, cart, or Three.js.

Tasks:
1. Extend lib/desk/products.ts with customFields definitions.
2. Add a generic custom field renderer in /criar/desk:
   - select
   - boolean/toggle
   - segmented choice
   - number only if bounded by min/max
3. Save field values into DeskItem.customConfig.
4. Validate customConfig on client and server.
5. Recalculate pricing if a field changes price.
6. Show selected options in the quote notes.
7. Keep canvasConfig self-contained and PII-free.
8. Keep /criar/headset-stand untouched.

Initial fields:
- magsafe_dock_v1:
  - cableExit: back | left | right
  - phoneSide: left | right
- pen_holder_v1:
  - heightPreset: low | standard | tall
  - dividers: true | false
- desk_tray_v1:
  - size: S | M | L
- headphone_stand_v1:
  - hookSide: left | right
  - heightPreset: standard | tall

Validation:
- reject unknown customConfig keys;
- reject invalid option values;
- fallback invalid localStorage values to defaults with warning;
- server rejects invalid submitted values.

Run:
- npx tsc --noEmit --pretty false
- npm run build

Report changed files and whether API/schema changed.
```
