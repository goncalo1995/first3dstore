# EM3D Modular Space Planner Master Implementation Plan

## Summary

Upgrade `em3d.pt` from a single-menu builder into a premium multi-wall commercial space planner for modular 3D-printed signage. The new flow is:

1. Customer lands on `/colecoes/modular`, a dark full-bleed showcase.
2. They use a “Make It Real” onboarding planner to describe walls, menus, WC signs, hours, branding, and constraints.
3. `/api/ai-menu-formatter` converts intent into `PhysicalWall[]`.
4. `/colecoes/modular/builder` lets them refine each wall with accurate 250mm rail modules, proportional physical letters, spacing, colors, and optional logo SVG upload.
5. Checkout chooses either Stripe auto-pay or manual quote based on complexity.

All visible customer text should be PT-PT.

## Core Data Model

Create the production model around walls, not a single grid.

```ts
export type FontStyle = 'classic' | 'modern'
export type PhysicalGridDimensionSet = 'v1-standard-250'

export type PhysicalColumn = {
  id: string
  railModules: number
  leftText: string
  rightText: string
  align?: 'left' | 'center' | 'right' | 'split'
  colorOverride?: string
}

export type PhysicalRow = {
  id: string
  columns: PhysicalColumn[]
}

export type PhysicalWall = {
  id: string
  name: string
  type?: 'text' | 'logo'
  maxWidthCm?: number
  rows: PhysicalRow[]
  logoSvgUrl?: string
  logoSvgText?: string
  brandColor?: string
}
```

`menuSystem` should store:

```ts
{
  dimensionSet: 'v1-standard-250',
  fontStyle: 'classic' | 'modern',
  walls: PhysicalWall[],
  railColor,
  baseLetterColor,
  accentLetterColor,
  letterCardColor,
  customBrandColor?: string,
  logoSvgUrl?: string,
  columnGapPx: number,
  totalRailModules,
  characterFrequencyByColor,
  checkoutLane: 'stripe_auto_pay' | 'manual_quote'
}
```

Keep legacy `physicalGrid`, `categories`, and `lines` support only inside compatibility readers until existing carts/orders are safe.

## Physical Math

`lib/modular-inventory-config.ts` remains the source of truth:

```ts
RAIL_LENGTH_MM = 250
MODULE_LENGTH_MM = 250
CHARACTER_WIDTH_MM = {
  normal: 38,
  narrow: 22,
  wide: 52,
  space: 24
}
```

`lib/modular-physical-grid.ts` should calculate across all walls:

```ts
measureTextMm(text)
getColumnAvailableMm(column) // railModules * 250
getColumnMetrics(column)
getWallMetrics(wall)
getWallsBom(walls, extraLetterGroups, colors)
```

Overflow rule:

```ts
measureTextMm(leftText + rightText) > railModules * 250
```

Preview tile width:

```ts
(characterWidthMm / (railModules * 250)) * 100
```

Logo walls are excluded from letter-pack counts and force manual quote.

## AI Formatter

Update `/api/ai-menu-formatter` to use OpenAI `gpt-4o-mini` with structured JSON output and `OPENAI_API_KEY`.

Enforce this schema:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["walls"],
  "properties": {
    "walls": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "name", "type", "rows"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "type": { "type": "string", "enum": ["text", "logo"] },
          "maxWidthCm": { "type": ["number", "null"] },
          "rows": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["id", "columns"],
              "properties": {
                "id": { "type": "string" },
                "columns": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["id", "railModules", "leftText", "rightText", "align"],
                    "properties": {
                      "id": { "type": "string" },
                      "railModules": { "type": "integer", "minimum": 1, "maximum": 12 },
                      "leftText": { "type": "string" },
                      "rightText": { "type": "string" },
                      "align": { "type": "string", "enum": ["left", "center", "right", "split"] },
                      "colorOverride": { "type": ["string", "null"] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

Prompt rules:

- Act as an architectural space planner.
- Use 250mm rails and the exact width dictionary.
- Create multiple walls when the user describes multiple areas.
- If text mentions `@logo`, `logo`, `logótipo`, or `marca`, always add:
  `id: "logo-wall"`, `name: "Identidade de Marca"`, `type: "logo"`.
- Choose the smallest rail count that fits, max 12.
- Split long text into more rows instead of overflowing.
- Return JSON only.

If AI fails or validates poorly, enter the builder with a restaurant template and show:
`A IA teve uma falha de criatividade. Mas não se preocupe, pode usar os nossos templates!`

## Storefront And Onboarding

Replace `/colecoes/modular` with the premium “Space Planner” entry experience:

- Deep dark `#09090b`, glass panels, refined metal/acrylic highlights, Framer Motion transitions.
- No marketing-heavy card clutter; first viewport should show the product concept immediately.
- Include onboarding inputs:
  - space description textarea
  - optional main wall max width in cm
  - checkboxes for `Menu`, `WC`, `Horários`, `Preços`, `Logo`, `Promoções`
  - CTA: `Make it Real`
- Checkboxes append structured planning hints into the formatter request, not hidden magic.

Delete `/app/colecoes/menus` instead of redirecting it.

## Builder UI

`/colecoes/modular/builder` becomes a multi-wall editor.

State:

```ts
{
  walls: PhysicalWall[],
  activeWallId: string,
  fontStyle,
  railColor,
  baseLetterColor,
  accentLetterColor,
  letterCardColor,
  customBrandColor,
  columnGapPx,
  editingColumn,
  checkoutContactFields
}
```

Navigation:

- Wall pills at the top: `Parede Principal`, `Zona Café`, `Identidade de Marca`, `+ Adicionar Parede`.
- Switching `activeWallId` only changes the visible canvas/control panel.
- BOM and quote always derive from all walls.

Text wall controls:

- Static-to-editable columns.
- Add/remove rows.
- Add/remove columns inside a row.
- Per-column rail module stepper.
- Alignment selector per column: left, center, right, split.
- Overflow blocks checkout but does not block typing.

Logo wall controls:

- Replace text controls with SVG upload.
- Reuse existing SVG sanitization helpers before preview/storage.
- Store uploaded SVG URL/text on the logo wall.
- Logo upload forces manual quote.

Mobile:

- Canvas sticky on top at about `60vh`.
- Controls in a bottom sheet/drawer at about `40vh`.
- Preview remains visible while editing.

## 2.5D Preview

Use CSS and Framer Motion only.

Preview rules:

- One active wall at a time.
- Each row is a physical lane.
- Each column uses `flex-grow: railModules`.
- `columnGapPx` slider applies to row gap, range `0-50`.
- Letter tiles render as individual motion elements with physical percentage widths.
- Use stagger `0.02` on template load/add, disabled when a line has more than 50 characters.
- Active edit column gets a subtle focus glow.
- Overflow column gets a red boundary and:
  `Texto excede o tamanho da calha física.`

Logo wall preview:

- Render sanitized SVG in a clean vector frame.
- Apply selected brand color visually where possible.
- Do not include logo content in letter BOM.

## Checkout Lanes

Derive lane from all walls:

Stripe auto-pay only when:

- total rails `<= 30`
- no custom RGB/brand color
- no logo SVG uploaded
- no overflow
- required catalog colors are selected

CTA:
`Pagar e Finalizar Encomenda`

Use existing `/api/checkout/cart` Stripe flow, updated to validate `walls`.

Manual quote when:

- total rails `> 30`
- custom brand color selected
- logo SVG uploaded

CTA:
`Pedir Orçamento Gratuito`

Create a dedicated manual quote route, for example `/api/modular/quote-request`, that:

- validates the same wall BOM server-side
- saves to `orderRequests`
- sets status `PENDING_REVIEW`
- sends an admin notification email using the existing email infrastructure

## Database And Admin

Update `instant.schema.ts` so order request status is strictly:

```ts
'DRAFT' | 'PENDING_REVIEW' | 'MODELING' | 'AWAITING_PAYMENT' | 'IN_PRODUCTION' | 'SHIPPED'
```

Remove new usage of `READY_FOR_PRODUCTION` and `B2B_LEAD`.
Map old UI paths forward:

- quoted but unpaid: `AWAITING_PAYMENT`
- approved/paid production work: `IN_PRODUCTION`

Admin `/admin/encomendas` should show wall-grouped production BOM:

- wall name and index
- row/column module lengths
- font style
- rail color
- letter color groups
- logo SVG link/preview for logo walls
- examples:
  `PAREDE 1 (Bebidas) - IMPRIMIR EM BRANCO: E(5), S(2)`
  `PAREDE 2 (WC) - IMPRIMIR EM OURO: W(1), C(1)`

Update Stripe webhook/admin detail generation to understand `menuSystem.walls`.

## OpenSCAD

Update `scripts/openscad/custom_frame.scad` so generated rails/letters:

- are face down at `Z=0`
- include mirrored engraved text on the back lip
- preserve 25cm rail module geometry
- remain compatible with the wall/row/column production map

## Test Plan

Run:

- `npm run build`
- `npx tsc --noEmit`

Functional checks:

- `/colecoes/modular` onboarding creates walls from text.
- `@logo`, `logo`, `logótipo`, and `marca` create `logo-wall`.
- AI failure lands in builder with the PT-PT toast and default restaurant template.
- Switching wall pills preserves all wall state and global BOM.
- Add/remove row and add/remove column update preview and BOM.
- Titles count as purchasable letters because they are normal text columns.
- Alignment controls affect preview without changing BOM incorrectly.
- Overflow disables checkout.
- `columnGapPx` changes visual spacing only.
- Auto-pay CTA appears for simple jobs.
- Manual quote CTA appears for rails over 30, custom RGB color, or logo upload.
- Manual quote saves `orderRequests.PENDING_REVIEW`.
- Admin BOM is grouped by wall and color.

## Assumptions

- Existing uncommitted single-grid physical builder work becomes the migration base, not a final target.
- Custom logo production is manual quote only in this version.
- Custom RGB/brand colors are not matched to inventory SKUs automatically.
- Existing Stripe cart path remains for simple modular jobs.
- Existing order/request data is not deleted; only new schema/status usage is cleaned up.
