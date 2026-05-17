# Phase 4 - Order Pipeline & Stripe

## Goal

Connect the cinematic product experience to InstantDB and Stripe, with a review-first fallback for operational safety.

The checkout system must provide admins with clear production data and must never trust client-side pricing or validation.

## Checkout Payload

Use a focused payload shape:

```ts
type CinematicCheckoutPayload = {
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  item: {
    productSlug: string
    productId?: string
    productName: string
    quantity: number
    selectedVariant: {
      id: string
      name: string
    }
    colors: {
      base: string
      accent: string
    }
    customText?: string
    unitPrice: number
  }
}
```

## API Route

Prefer a focused route:

```text
POST /api/checkout/cinematic-product
```

The server must validate:

- product slug;
- product id when provided;
- selected variant;
- base color;
- accent color;
- engraving text;
- quantity;
- calculated unit price and total.

Never trust the client price.

## Checkout Mode

Use an explicit checkout mode flag:

```ts
type CheckoutMode = 'direct_stripe' | 'review_first'
```

For MVP, default to `review_first` unless EM3D is operationally ready to auto-produce custom engravings.

## Review-First Flow

Use review-first when production confidence is not 100%.

Expected behavior:

- save the request to `orderRequests`;
- set status to `PENDING_REVIEW`;
- include all production details in a readable payload;
- manually review engraving, variant, colors, and shipping details;
- email or send a Stripe payment link after approval.

This path protects the customer experience while the cinematic product process matures.

## Direct Stripe Flow

Direct Stripe checkout is allowed only when production confidence is high.

Expected behavior:

- create one Stripe line item for the configured product;
- use PT-PT product name and description;
- create an InstantDB `orders` record where possible;
- include Stripe session id;
- redirect success to:

```text
/checkout/success?session_id={CHECKOUT_SESSION_ID}
```

- redirect cancel to:

```text
/produto/headset-stand
```

## Server Engraving Validation

Server validation must match the client and 3D rules:

- max `16` characters after trimming;
- trim leading and trailing whitespace;
- block empty-only strings;
- allow letters including Portuguese accents, numbers, spaces, hyphen, apostrophe, and period;
- block emojis, control characters, line breaks, invisible formatting characters, and symbols outside the allowlist.

Recommended validation pattern:

```ts
const ENGRAVING_PATTERN = /^[\p{L}\p{N} .'-]+$/u
```

## Admin Fulfillment Requirements

The resulting admin view or stored payload must show clear, undeniable production data:

- Product Name;
- Variant;
- Base Color;
- Accent Color;
- Engraving Text;
- Quantity;
- Paid/Unpaid Status;
- Stripe Session Reference;
- Customer Contact;
- Shipping Details.

Admin-facing data should be boring and explicit. No one in production should have to infer the chosen variant, color, engraving, or payment state.

## Stripe Webhook

Reuse existing Stripe webhook patterns where possible.

When direct Stripe is enabled:

- mark paid orders as `paymentStatus: 'paid'`;
- preserve fulfillment status;
- keep Stripe session and payment intent references indexed where the existing schema supports it.

## Schema Guidance

Use existing `orders` where possible for direct Stripe.

Use existing `orderRequests` for review-first.

Do not introduce a schema migration unless existing entities cannot safely hold the required production data.

## Acceptance Criteria

- Review-first works before direct Stripe.
- Direct Stripe can be enabled later behind the checkout mode flag.
- Server validates engraving with the same Unicode-safe rule.
- Server recalculates price.
- Admin sees all required fulfillment fields.
- No manufacturing geometry generation is required.
