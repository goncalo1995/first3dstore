# Step 3: Multi-Wall Builder (Clean-Slate Architecture)

**Summary:** Migrate `/colecoes/modular/builder` to a clean, production-ready
`PhysicalWall[]` state. Since there are no legacy users, we will completely
bypass all backward-compatibility code, draft migrations, and obsolete schema
fallback structures. The system starts fresh with a pristine, modern
architecture.

## 1. Clean-Slate Data Model (`lib/modular-physical-grid.ts`)

Simplify our core types by removing all legacy aliases (like the old `align`
column property):

```typescript
export type RailAlign = "left" | "center" | "right";
export type TextAlign = "left" | "center" | "right";
export type PhysicalColumnKind = "title" | "item";

export type PhysicalColumn = {
   id: string;
   kind: PhysicalColumnKind;
   railModules: number;
   leftText: string;
   rightText: string;
   railAlign: RailAlign;
   textAlign: TextAlign;
   colorOverride?: string;
};

export type PhysicalRow = {
   id: string;
   columns: PhysicalColumn[];
};

export type PhysicalWall = {
   id: string;
   name: string;
   type: "text" | "logo";
   maxWidthCm?: number;
   rows: PhysicalRow[];
   logoSvgUrl?: string;
   logoSvgText?: string;
};
```

## 2. No-Migration State & Storage

- The builder state uses `walls: PhysicalWall[]` and `activeWallId: string`.
- **Draft Key:** Use one single, clean localStorage key:
  `em3d-modular-builder-active`.
- **No Migration Logic:** If the schema in localStorage does not match the
  pristine `v4` shape, simply discard it and initialize the builder with the
  default "Restaurante completo" template. Do not write any code to parse v1,
  v2, or v3 structures.

## 3. Wall Navigation & Preview

- Add premium wall pills above the canvas:
  `[Parede Principal] [Zona Café] [Logo/Identidade] [+ Adicionar Parede]`.
- Clicking a pill changes `activeWallId`.
- Clicking `+ Adicionar Parede` creates a new wall with a single centered title
  row.
- **Global BOM:** The pricing/BOM engine uses `getWallsBom(walls, ...)` so the
  total price represents all walls aggregated, even though the canvas only
  previews the active wall.
- Remove all fake/legacy category headers from the preview. All text on the wall
  must be real, purchasable physical rows.

## 4. Column & Alignment Controls

- Add row actions in the control panel: `+ Linha` (creates a normal item row)
  and `+ Título` (creates a centered title row).
- Add column actions (max 4 per row):
  - Stepper to adjust `railModules` from 1 to 12.
  - Segmented controls for `Rail Align` and `Text Align`.
  - Remove column / Remove row.
- **Proportional Preview Layout:**
  - A column visually renders with `flex: railModules` so a 2-module rail is
    exactly twice the size of a 1-module rail.
  - `railAlign` applies CSS justification to position short rails correctly on
    the wall.
  - `textAlign` controls the visual alignment of the text inside the rail.

## 5. Logo Wall Mode

- If the active wall has `type: 'logo'`, completely hide the text row editors.
- Show an **SVG Upload Area**.
- Read and sanitize the uploaded SVG on the client side (using `sanitizeSvg`
  from `lib/puzzle/svg.ts`).
- Store the sanitized SVG in `wall.logoSvgText` and a local preview data URL in
  `wall.logoSvgUrl`.
- Render the logo in a 2D vector frame, tinted with the user's selected
  brand/custom color.

## 6. Checkout Payload Integration

- Ensure that the checkout payload submitted to `/api/checkout/cart` matches the
  new, clean `walls: PhysicalWall[]` model.
- Server-side validation must recalculate and verify the BOM from the clean
  `walls` array.
