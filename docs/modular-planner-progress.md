# EM3D Modular Planner Progress

## Step 1 - Manufacturing Source of Truth

- [x] `lib/modular-inventory-config.ts` exports 250mm rail constants.
- [x] Character width dictionary exists for normal, narrow, wide and spaces.
- [x] Pack distribution constants exist.
- [x] `lib/modular-physical-grid.ts` defines `PhysicalWall`, `PhysicalRow`,
      `PhysicalColumn`.
- [x] Deterministic text width, overflow, wall metrics and BOM helpers exist.
- [x] TypeScript check passed after Step 1.

## Step 2 - Showcase, Onboarding, AI Formatter

- [x] Legacy `/colecoes/menus/page.tsx` deleted.
- [x] `/colecoes/modular` rebuilt as a premium dark showcase.
- [x] Visual colour simulation widget added.
- [x] Onboarding form added.
- [x] Planning hint checkboxes added.
- [x] `/api/ai-menu-formatter` returns `walls`.
- [x] `@logo` intent creates `logo-wall`.
- [x] Fallback response avoids throwing an error page.
- [x] Onboarding separates available spaces/dimensions from actual content.
- [x] AI fallback uses a curated restaurant template instead of converting
      planner hints into menu rows.
- [x] Fallback toast stays visible long enough to read.
- [x] Builder reads generated `walls` from onboarding storage.
- [x] TypeScript/build passed after the next fixes.

## Step 3 - Multi-Wall Builder

- [x] Builder state migrates from `categories` to `walls`.
- [x] Wall pills switch active wall without losing quote state.
- [x] Titles are physical rows/columns, not category-only UI text.
- [x] Add/remove wall.
- [x] Add/remove row.
- [x] Add/remove column.
- [x] Per-column rail module controls.
- [x] Per-column alignment controls.
- [x] Logo wall SVG upload mode.
- [x] Global BOM aggregates all walls.
- [x] Mobile sticky preview + bottom controls.

## Step 4 - Checkout Lanes

- [x] Stripe auto-pay lane for simple jobs.
- [x] Manual quote lane for >30 rails, custom colours or logo SVG.
- [x] Checkout payload sends `walls`.
- [x] Server validates `walls` and recalculates BOM.
- [x] Manual quote saves `orderRequests.PENDING_REVIEW`.

## Step 5 - Admin / Production / OpenSCAD

- [x] Admin BOM grouped by wall and colour.
- [x] Stripe webhook understands `menuSystem.walls`.
- [x] Order status enum cleaned.
- [x] OpenSCAD rail/letter tooling updated for face-down production.
- [x] `menu_rail_v1.scad` adds a support-free 45-degree rear wedge for 3M tape mounting.
- [x] Production queue can be viewed by client, colour and bagging checklist.
- [x] Print-farm routing schema fields are ready for Step 6.

## Step 6 — The "Print Farm Network" (Scale to Millions)

- [ ] Think if better to make like a blind sale where i send links to all
      propose a price and time for items and colors and in the end of the day
      user could see the print farms that replied and choose the best one. If i
      wanted to print inhouse i could bypass this step and print myself.
- [ ] Implement the "Stripe Connect" split-payment logic (Platform takes 40%,
      Farm gets 60% automatically).
- [ ] Connect the `printFarms` database table to the order routing logic.
- [ ] Create the "Farm Portal" (Where local makers in Lisbon/Porto log in, claim
      pending jobs in their region, and download pre-sliced G-codes).
- [ ] Automate CTT shipping label generation for the Farm once they mark a job
      as `SHIPPED`.
- [ ] Implement the "B2B Lead Commission" program (Affiliates win 10% commission
      for every cafe menu they sell in their local city).
