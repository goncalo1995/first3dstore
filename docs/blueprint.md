🟢 Sprint 1: The AI Space Planner (Smart Architectural Layouts) Objetivo: A IA
organiza o espaço. Ela não decide os milímetros, decide as Linhas e Colunas
(Rows & Columns) e a hierarquia visual (Títulos vs Preços). Prompt para o Codex:
PROJECT: EM3D - Sprint 1 (AI Space Planner & Layout Hierarchy) CONTEXT: We are
upgrading /api/ai-menu-formatter/route.ts to output our PhysicalWall[] format.
The AI acts as a Graphic Designer organizing space, NOT a strict mathematician.
REQUIREMENTS: Use OpenAI response_format: { type: "json_object" }. The AI must
ingest the user's messy text and output PhysicalWall arrays containing rows and
columns. The Design Logic: Tell the AI to structure the content smartly:
Titles/Categories (e.g., "BEBIDAS"): Must be placed in a standalone row,
centered (align: 'center'), with kind: 'title'. Items & Prices (e.g., "Espresso
1.50€"): Must be placed in kind: 'item' columns. The Item Name is leftText, the
Price is rightText. Multi-Column: If the user has many short items and provides
a wide maxWidthCm, the AI should cluster items into 2 or 3 columns on the same
row to save vertical space. Do NOT ask the AI to calculate exact railModules.
The AI should default all columns to railModules: 1. Our deterministic TS code
will calculate the required modules later based on font metrics. 🟡 Sprint 2:
The Typographic Engine & V1/V2 Proofing (Backend Math) Objetivo: O código
TypeScript lê o JSON da IA, calcula a largura exata baseada na Fonte e Tamanho
escolhidos, e lida com a física dos acentos. Prompt para o Codex: PROJECT:
EM3D - Sprint 2 (Typographic Engine & Physical Calibration) CONTEXT: We need
deterministic math to calculate physical rail lengths based on font choice, size
(S/M/L), and specific character physics (like floating accents). REQUIREMENTS:
Create lib/modular-typography-config.ts. Define a TypographyProfile interface:
Font Name, Size (S/M/L), and a charWidthMap (mapping characters to absolute mm
widths). The Accent Rule (Physical Constraint): Create an array of
FLOATING_ACCENT_CHARS (e.g., 'Á', 'É', 'Í', 'i', 'j'). Update the PhysicalColumn
type to accept letterSize: 'S'|'M'|'L' and fontFamily: string. Create a
calculateRequiredRailModules(column, typographyProfile) function. It iterates
over the text, summing the widths from the map, adding tracking (spacing between
letters), and returns the Math.ceil(totalWidth / 250) to give us the exact
number of 25cm rail modules needed. No UI updates in this sprint. Just robust,
unit-testable math functions. 🟠 Sprint 3: The 2.5D Canvas & Floating Accent
Warning (Frontend) Objetivo: Renderizar o resultado. Mostrar a estética e avisar
o cliente se ele precisar de "Placas de Fundo" para letras que flutuam. Prompt
para o Codex: PROJECT: EM3D - Sprint 3 (2.5D Canvas & Physical Reality Checks)
CONTEXT: The math works. Now we update the /colecoes/modular/builder UI.
REQUIREMENTS: In the PhysicalGridPreview (2.5D CSS Canvas), render the columns
based on the new calculateRequiredRailModules output. (e.g., if the math says it
needs 3 modules, render it at 300% width of a single module). Visual Hierarchy:
Ensure title columns look distinct from item columns (e.g., slightly larger
font, centered in the rail). Render leftText left-aligned and rightText (prices)
right-aligned in the same rail. The Accent Warning (UI): If the user's text
contains any character from FLOATING_ACCENT_CHARS, display a subtle, premium
info box in the sidebar: "O seu texto contém letras com acentos (ex: Á, É). Para
garantir a integridade física da peça, estas letras serão impressas com uma
placa de fundo fina na mesma cor da calha." Ensure the user can toggle global
fontStyle and letterSize (S/M/L), which instantly triggers the math
recalculation and updates the preview width and required rails. 🔴 Sprint 4: The
Dynamic Production SCAD (The Factory) Objetivo: O OpenSCAD recebe os parâmetros
exatos e lida com a placa de fundo dos acentos automaticamente. Prompt para o
Codex: PROJECT: EM3D - Sprint 4 (Dynamic OpenSCAD Tooling) CONTEXT: We are
creating the final SCAD file that the admin will run to produce the rails and
letters. REQUIREMENTS: Update scripts/openscad/menu_rail_v1.scad. The script
must accept rail_length_mm, font_name, letter_size (S/M/L multiplier),
text_string, and a new boolean: has_floating_accents. If has_floating_accents ==
true, the SCAD script must generate a 1mm thick backing plate (a silhouette
connecting the letters and the floating accents) so they print as one solid
piece. The script must continue to print face-down at Z=0 for a textured PEI
finish. Create a README.md block explaining how the admin passes these variables
from the Order Dashboard to the OpenSCAD CLI. 🟣 Sprint 5: The E-Commerce Engine
(Cart & Routing) Objetivo: Integrar este produto poderoso no ecossistema da EM3D
(onde vendes outros produtos). Prompt para o Codex: PROJECT: EM3D - Sprint 5
(Unified E-Commerce Cart & Routing) CONTEXT: We need this Modular system to play
nicely with our standard catalog products in a unified checkout. REQUIREMENTS:
In the Builder, the "Finalizar Encomenda" button should push the entire
PhysicalWall[] and chosen parameters (Sizes, Fonts, Colors) into our global
useCart state as a single "Modular System" line item. The Cart Drawer must
display the Modular System summary (e.g., "Sistema Modular: Parede de Bebidas -
12 Calhas") alongside standard products (e.g., "Suporte de Telemóvel"). Update
/api/checkout/cart/route.ts to recalculate the Modular System pricing (Rails +
Characters) server-side to prevent tampering, while processing standard products
normally. Generate the Stripe Checkout session with all items cleanly itemized.
