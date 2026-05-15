EM3D.pt — Award-Winning Desk Configurator Vision
Core Concept

Build a premium interactive desk experience where the homepage becomes the configurator.

The user sees a beautiful top-down or slight-isometric desk scene. They can:

adjust desk size;
add products to the desk;
drag/rearrange items;
click an item to zoom/focus;
customize that item;
delete items;
enter/exit edit mode;
save their setup;
return to overview;
buy the full configuration.

The website becomes the product.

Not:

“Choose product → configure → checkout”

But:

“Build your perfect desk setup → customize each object → buy the setup”

This is much more distinctive.

Recommended Direction
Do not start with under-desk

Start with top-of-desk.

It is easier to understand visually, easier to sell, and easier to make beautiful.

Later you add a button like:

Ver parte inferior da secretária

or

Configurar por baixo da secretária

Then the user transitions to the under-desk view.

So the long-term structure becomes:

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

This is a better product universe.

Phase 1 — New Foundation

Phase 1 should not try to solve every product customization field.

Phase 1 should build the spatial system.

Goal

Create the new foundation for an interactive desk builder.

The user can see a desk, edit dimensions, place simple product representations, save the layout, delete items, move items, zoom into an item, and zoom back out.

This phase is about interaction, state, layout, and UX.

Phase 1 Route Structure

I would create:

app/page.tsx

as the immersive landing/configurator.

Or, safer:

app/desk/page.tsx

Then the homepage links into it.

But if you want the homepage to be the actual product experience, then:

app/page.tsx

becomes the live desk.

Recommended:

app/page.tsx                 → award-winning landing + interactive preview
app/criar/desk/page.tsx       → full desk builder

Later, after it is polished, you can merge the homepage and builder more aggressively.

Phase 1 User Experience
1. Initial View

The user lands on a premium dark interface.

They see:

A tua secretária ideal, feita à medida.

And a stylized desk canvas.

The desk has realistic but simple visual elements:

desk surface;
grid/measurement overlay;
subtle shadows;
available products around the side;
CTA to enter edit mode.

Buttons:

Começar configuração
Explorar produtos
2. Edit Mode

When the user clicks edit:

Modo edição ativo

They can:

change desk width/depth;
drag items;
add items;
remove items;
select item;
save setup;
reset setup.

Controls:

Largura da secretária
Profundidade da secretária
Mostrar grelha
Adicionar produto
Guardar configuração
Finalizar encomenda

Use presets first:

deskSizes: [
  { label: "Pequena", widthCm: 100, depthCm: 60 },
  { label: "Standard", widthCm: 120, depthCm: 70 },
  { label: "Grande", widthCm: 160, depthCm: 80 }
]

Then optionally allow custom values:

Largura: 120 cm
Profundidade: 70 cm

But with min/max validation.

3. Product Placement

Each product is represented as a clean 2D/2.5D object.

Examples:

products: [
  {
    productId: "magsafe_dock_v1",
    name: "Suporte MagSafe",
    category: "Carregamento",
    footprintCm: { width: 14, depth: 7 },
    price: 15
  },
  {
    productId: "pen_holder_v1",
    name: "Copo de Canetas",
    category: "Organização",
    footprintCm: { width: 7, depth: 7 },
    price: 8
  },
  {
    productId: "desk_tray_v1",
    name: "Bandeja Modular",
    category: "Arrumação",
    footprintCm: { width: 12, depth: 8 },
    price: 5
  }
]

In Phase 1, these can be beautiful placeholder cards/shapes.

Do not wait for perfect 3D models.

4. Zoom / Focus Mode

This is the important “memorable” interaction.

When the user clicks a product:

the desk dims;
selected product scales up / moves to center;
side panel opens;
product-specific controls appear;
background remains visible;
user can close/zoom out.

Interaction rule:

Click product → zoom into product
Click background / close button → zoom out

This gives the feeling of a premium interactive website without needing full 3D yet.

Use Framer Motion for:

scale;
position transition;
opacity;
blur;
panel slide;
product highlight.
Phase 1 State Model

Use one central setup object.

type DeskSetup = {
  version: 1;
  mode: "view" | "edit" | "focus";
  desk: {
    widthCm: number;
    depthCm: number;
    surfaceColor: string;
  };
  selectedItemId?: string;
  items: DeskItem[];
  totals: {
    itemsPrice: number;
    totalPrice: number;
  };
};

Each placed item:

type DeskItem = {
  id: string;
  productId: string;
  xCm: number;
  yCm: number;
  rotation: 0 | 90 | 180 | 270;
  colorBase?: string;
  colorAccent?: string;
  customConfig?: Record<string, unknown>;
};

This is better than grid-only because the user wants to arrange real desk items naturally.

You can still optionally support a grid/snap mode.

Grid Recommendation

I would not make the grid the main mental model anymore.

Use free placement with optional snapping.

Better UX:

Snap to grid: On/Off
Grid size: 5 cm / 10 cm

Internally:

snapSizeCm: 5

This gives freedom while still keeping the manufacturing logic controlled.

For modular products, individual products can still have their own internal grid.

Example:

Desk arrangement uses free 2D placement.
A modular tray product uses a grid inside its own customizer.

That is cleaner.

Phase 1 Payload

For the full desk setup:

{
  "type": "desk-setup",
  "schemaVersion": 1,
  "desk": {
    "widthCm": 120,
    "depthCm": 70,
    "surfaceColor": "walnut"
  },
  "view": {
    "activeSurface": "top"
  },
  "items": [
    {
      "id": "item_01",
      "productId": "magsafe_dock_v1",
      "xCm": 20,
      "yCm": 15,
      "rotation": 0,
      "colorBase": "Preto Fosco",
      "colorAccent": "Pulse Blue",
      "customConfig": {
        "cableExit": "back"
      }
    },
    {
      "id": "item_02",
      "productId": "pen_holder_v1",
      "xCm": 80,
      "yCm": 20,
      "rotation": 0,
      "colorBase": "Preto Fosco",
      "colorAccent": "Madeira Walnut",
      "customConfig": {
        "heightPreset": "standard"
      }
    }
  ],
  "pricing": {
    "itemsTotal": 23,
    "setupDiscount": 0,
    "total": 23
  }
}

This becomes your master commerce payload.

Later, each product can have its own OpenSCAD payload inside customConfig.

Phase 2 — Real Product Customization

Phase 2 is where each product becomes more detailed.

When the user clicks/zooms a product, the panel changes based on product type.

Example for MagSafe:

customFields: [
  {
    key: "phoneSide",
    label: "Lado do telefone",
    type: "select",
    options: ["esquerda", "direita"]
  },
  {
    key: "cableExit",
    label: "Saída do cabo",
    type: "select",
    options: ["trás", "esquerda", "direita"]
  }
]

Example for pen holder:

customFields: [
  {
    key: "heightPreset",
    label: "Altura",
    type: "select",
    options: ["baixo", "standard", "alto"]
  },
  {
    key: "divider",
    label: "Divisórias internas",
    type: "boolean"
  }
]

Example for tray:

customFields: [
  {
    key: "size",
    label: "Tamanho",
    type: "select",
    options: ["S", "M", "L"]
  }
]

Do not hardcode every UI manually. Create a product definition system.

Product Definition System

Create something like:

type DeskProductDefinition = {
  productId: string;
  name: string;
  category: string;
  description: string;
  priceFrom: number;
  footprintCm: {
    width: number;
    depth: number;
  };
  defaultColors: {
    base: string;
    accent: string;
  };
  allowedColors: {
    base: string[];
    accent: string[];
  };
  preview: {
    shape: "rounded-rect" | "circle" | "tray" | "hook" | "dock";
    icon: string;
  };
  customFields: ProductCustomField[];
  validation: {
    maxQuantity?: number;
    minDistanceFromEdgeCm?: number;
    allowedSurfaces: ("top" | "under")[];
  };
  generator: {
    type: "openscad";
    moduleName: string;
    version: string;
  };
};

This lets you add products without rebuilding the whole configurator.

Recommended Build Order
Phase 1A — Foundation

Build:

app/criar/desk/page.tsx
lib/desk/products.ts
lib/desk/types.ts
lib/desk/validation.ts
lib/desk/pricing.ts

Features:

desk canvas;
edit mode;
desk dimensions;
add product;
drag product;
delete product;
select product;
zoom/focus product;
zoom out;
save local state;
price summary.

No checkout yet, or basic payload preview only.

Phase 1B — Commerce

Add:

add full setup to cart;
save setup request;
server validation;
price recalculation;
orderRequests.canvasConfig;
PT-PT order notes.
Phase 1C — Polish

Add the memorable layer:

Framer Motion zoom;
ambient lighting;
glass panels;
keyboard shortcuts;
empty states;
responsive mobile drawer;
smooth onboarding;
“Guardar setup”;
“Voltar ao overview”.
Phase 2 — Real Products

Add:

real product representations;
product-specific custom forms;
product-specific OpenSCAD mappings;
admin preview of payload;
STL generation later.
Visual Direction

Use a premium “technical studio” style:

dark background
soft desk surface
subtle grid
floating glass panels
neon but restrained accents
smooth zoom transitions
product cards like high-end hardware

Copy in PT-PT:

Constrói a tua secretária ideal.
Organizadores modulares impressos em 3D, feitos para o teu setup.

Arrasta. Personaliza. Encomenda.

CTA:

Começar configuração

Secondary:

Ver produtos

Focus panel:

Personalizar Suporte MagSafe
Cor principal
Cor de detalhe
Saída do cabo
Remover produto
Guardar alterações

Zoom out:

Voltar à secretária
Important Decision

I would avoid making the user “create a piece” at first.

Instead, the user creates a desk setup.

That gives you a much bigger brand:

EM3D is not just selling 3D prints. It is selling custom desk systems.

That is more premium, more scalable, and more memorable.