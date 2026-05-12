# EM3D.pt Blueprint (Master Strategy)

## 1. Product Vision
EM3D.pt is a premium umbrella brand for useful, personalized objects 3D-printed in Portugal. 

## 2. Technical Architecture & Database Mapping
**Flow A: Catalog Sales (E-commerce)**
- Uses `catalogProducts`. 
- **Dynamic Customization:** Products support multiple custom fields via `customizationOptions` JSON array. The UI dynamically generates these inputs.
- Checkout is Direct (No Cart MVP). Saves to `orders`.

**Flow B: Custom Ideas & B2B (Lead Gen)**
- Uses `/pedido-personalizado` form.
- Saves to `orderRequests` with `status: 'PENDING_REVIEW'` and `leadType: 'custom_idea'`.

**Flow C: Legacy/Specialty Configurators**
- Complex products (HexaMemória, Lithophanes) retain their dedicated routes (e.g., `/criar/hexa`). The universal `/produto/[slug]` page acts as a router: if a product is highly complex, its CTA points to the dedicated configurator.

## 3. UX/UI Strategy
- **Aesthetic:** Minimalist, premium. Deep blacks, crisp whites, subtle glassmorphism.
- **Typography:** Inter/Geist for UI, elegant Serif for headings.
- **Language:** Strictly European Portuguese (PT-PT).