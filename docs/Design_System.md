# em3D.pt Design System

## Brand Concept

em3D is a premium 3D-printing studio focused on tangible, physical objects
rather than generic maker culture. The brand should feel closer to luxury
product design and technical manufacturing than to hobbyist fabrication.

The identity combines three ideas:

- Premium physical product: every interface, image, and touchpoint should make
  the printed object feel real, precise, durable, and desirable.
- Produced in Portugal: the palette references Portuguese green, gold/yellow,
  and red, but in muted, material-led tones rather than bright flag or sports
  colors.
- Technical craft: the system should feel engineered, matte, precise, warm,
  premium, and restrained.

Avoid cheap novelty, neon maker-lab visuals, glossy plastic effects, cartoon 3D,
and overly playful fabrication language.

## Logo Guidelines

The logo concept is a literal 3D printed isometric block object. It should look
like a physical studio mark that could be printed, held, photographed, and
placed on a desk.

The core forms are the "E", "M", and "." as separate physical pieces arranged
into a premium studio mark. Each piece may carry a matte material accent
inspired by the Portuguese palette:

- "E": Pine Green
- "M": Muted Gold/Mustard
- ".": Terra-cotta Red

The logo should use blocky, dimensional geometry with crisp edges, subtle depth,
and realistic material behavior. The finish is matte plastic, not glossy acrylic
or metallic chrome. Lighting should reveal volume and surface texture without
turning the mark into a decorative illustration.

Use the isometric block mark in premium contexts such as hero sections,
packaging, proposal decks, invoices, product inserts, and studio photography. In
dense UI or small navigation areas, use a simplified wordmark or compact mark to
preserve clarity.

## Color Palette

The em3D "Portugal Premium" palette is dark, warm, and material-focused. It uses
black and graphite as the dominant environment, gold for conversion and focus,
and restrained green/red accents for provenance, validation, labels, and small
status details.

| Role                         | Hex       | Usage                                                                    |
| ---------------------------- | --------- | ------------------------------------------------------------------------ |
| OLED Black / Dark Anthracite | `#09090b` | Main page background and immersive studio surfaces                       |
| Surface Black                | `#111113` | Cards, popovers, panels, drawers                                         |
| Raised Surface               | `#18181b` | Secondary surfaces, muted controls, subtle contrast blocks               |
| Border Graphite              | `#2a2a30` | Borders, inputs, separators, low-contrast strokes                        |
| Primary Interactive Gold     | `#EAB308` | Primary CTAs, focus rings, selected states, purchase actions             |
| Primary Hover Gold           | `#CA8A04` | Hover/pressed states for gold CTAs                                       |
| Pine Green Accent            | `#1F4D3A` | Portugal reference, quality badges, validation, local-production details |
| Terra-cotta Red Accent       | `#A33A2B` | Portugal reference, destructive/error states, caution accents            |
| Soft Foreground              | `#F4F4F5` | Primary text on dark backgrounds                                         |
| Muted Foreground             | `#A1A1AA` | Secondary copy, metadata, helper text                                    |

Primary gold should be used deliberately. It is a conversion and focus color,
not a general decoration color. Pine Green and Terra-cotta Red should appear as
small signals, badges, material markers, or validation states.

## Typography

em3D uses Inter for UI and body text. Inter should carry product pages,
builders, forms, admin screens, checkout, navigation, labels, pricing, and
technical details.

Playfair Display is reserved for emotional, premium moments: hero headlines,
campaign statements, editorial product storytelling, and select high-impact
headings. Use it sparingly so it remains a luxury contrast rather than a
general-purpose heading style.

Guidelines:

- Use Inter for dense or operational interfaces.
- Use Playfair Display for first-impression brand moments.
- Avoid Playfair in admin/tooling screens, tables, compact cards, forms, and
  builder controls.
- Keep letter spacing neutral; do not over-style typography with exaggerated
  tracking.

## Photography Rules

All product imagery should be high-contrast, directional studio photography. The
goal is to make the viewer feel the object is physically present.

Use lighting that reveals:

- 3D print layer lines
- matte filament texture
- edge sharpness
- surface finish
- scale and depth
- real shadows from a physical object

Prefer dark backgrounds, controlled highlights, macro detail, strong
composition, and real placement in premium environments. Product images should
show material truth rather than hiding the manufacturing process.

Avoid flat ecommerce cutouts as primary hero imagery unless they are paired with
texture or detail shots. Avoid stock-like, blurred, decorative, or purely
atmospheric photography when the product needs to be inspected.

## UI Application Rules

Shadcn/Radix components inherit the global tokens. Use the token roles rather
than hard-coded bright colors whenever possible:

- `primary`: gold CTAs, selected states, focus, active conversion actions.
- `accent`: pine green details, positive badges, Portuguese provenance signals.
- `destructive`: terra-cotta red warnings, failed states, removal actions.
- `card` and `popover`: premium dark surfaces.
- `border` and `input`: graphite strokes that keep interfaces quiet and
  technical.

The default interface should feel calm and precise. Reserve color for action,
status, material meaning, and brand emphasis.
