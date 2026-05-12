# Phase 2: Dynamic Catalog & Direct Checkout

**Context:** We are implementing Flow A. We must respect the existing `customizationOptions` JSON array in `catalogProducts` so products can have 0, 1, or multiple custom text fields.

**Tasks:**
1. **Product Detail Page (`app/produto/[slug]/page.tsx`):**
   - Adapt the page to the EM3D brand aesthetic. Fetch product by slug.
   - **Routing Protection:** If the product has a dedicated configurator (e.g., `isModular` or specific category), the main CTA should redirect to it (e.g., `/criar/hexa`).
   - **Dynamic Customization (Standard Products):** If it's a standard product, map through `product.customizationOptions`. For each option, render the appropriate input field (respecting `maxChars` and `label`). 
   - Dynamically update the price if a customization has a `priceAdd`.

2. **Direct Checkout Flow (To `orders` table):**
   - Add a "Comprar Agora" button that opens a checkout modal/sidebar.
   - Collect: Name, Email, Phone, Shipping Address.
   - Submit to the `orders` table.
   - **Crucial Mapping:** Since the `orders` schema currently has a single `customText: i.string().optional()` field in the `items` array, concatenate the multiple custom fields from the UI into a single formatted string before saving (e.g., "Field 1: Value | Field 2: Value").
   - Set `paymentStatus: 'pending'` and `fulfillmentStatus: 'new'`.
   - Show a Success State.