# Phase 2: Catalog Products with Cart & Dynamic Customization

**Context:** We are implementing Flow A (Standard E-commerce) for EM3D, reusing and improving the existing `useCart` hook, cart drawer, and checkout flow. The goal is to allow users to add multiple products to a cart, configure their dynamic text fields, and place a single order with combined shipping.

**Tasks:**

1. **Product Detail Page (`app/produto/[slug]/page.tsx`)**  
   - Refactor the page to the EM3D premium aesthetic (Deep blacks, clean UI).  
   - Fetch product from `catalogProducts` by slug.  
   - **Routing Protection:** If the product has a dedicated configurator (e.g., `isModular === true` or belongs to HexaMemória), the main CTA should redirect to its builder route.
   - **Dynamic Customization:** Map through `product.customizationOptions`. For each option, render the appropriate input field dynamically (respecting `maxChars` and `label`).
   - If product has `variants` (colors, flexible parts), render them as selectable options using the existing robust color logic.  
   - Price updates dynamically based on selected variant and customization fees (`priceAdd`).  
   - CTA: **"Adicionar ao carrinho"** – calls the existing `addItem` from the cart store.

2. **Cart Drawer / Sidebar**  
   - Improve the existing cart drawer UI to match the EM3D brand.  
   - Show product image, name, variant (color), dynamically concatenated custom text (so the user sees what they typed), quantity, unit price, and total per item.  
   - Allow quantity adjustment and item removal.  
   - Show subtotal, shipping estimate, and total.

3. **Checkout Page (`app/checkout/page.tsx`)**  
   - Create a dedicated `/checkout` route.  
   - Collect customer details: Nome, Email, Telemóvel, Método de Envio (Levantamento em Carcavelos / Envio Nacional), Morada Completa, Método de Pagamento (MBWay / Transferência Bancária).  
   - Show an Order Summary (Cart items).
   - Apply shipping logic: 0€ for pickup, €4.99 for national shipping.  
   - Submit order button.

4. **Order Creation Logic (Server-Authoritative)**
   - **IMPORTANT:** All order creation and price calculation MUST be performed server-side via a secure API endpoint (`/api/checkout/cart`). Never allow client-side writes to the `orders` table.
   - The server endpoint validates all inputs, fetches current product pricing from the database, and computes totals server-side to prevent price manipulation.
   - **Payment Flow:** Use Stripe checkout sessions for payment. Payment status transitions are handled server-side via Stripe webhooks.
   - **Schema Mapping:**
     - `customerName`, `customerEmail`, `customerPhone`, `shippingMethod`, `shippingAddress`.
     - `items`: array of objects. Map `productId`, `productName`, `quantity`, `colors`, `selectedVariant`, `unitPrice` (validated server-side).
     - **CustomText Concatenation:** Since `items` has a single `customText: string` field, map the dynamic customizations object into a single formatted string (e.g., `"Nome: João | Idade: 30"`).
     - Set defaults: `subtotal`, `shippingCost`, `total` (all computed server-side), `paymentStatus: 'pending'`, `fulfillmentStatus: 'new'`.
   - Clear cart only after successful payment verification (on the success page with verified session_id).
   - Payment state is managed exclusively via Stripe webhooks handled server-side. Manual payment methods have been deprecated in favor of Stripe-driven flows.

**Test Plan**  
- Add multiple products to cart (with and without custom text), verify cart updates correctly.  
- Proceed to checkout, fill required fields, toggle shipping methods to see total update.  
- Submit order.  
- Confirm order appears in the InstantDB `orders` table with correct items, concatenated text, and totals.  
- Confirm cart clears successfully.