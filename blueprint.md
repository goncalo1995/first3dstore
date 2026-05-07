# Foto3D.pt Blueprint

## 1. Product Vision: A Glowing Memory

Foto3D.pt sells personalized illuminated lithophane lightboxes: home decor gifts that look like a quiet white object until the light turns on and reveals a cherished photo.

The emotional promise is simple:

> Transforme a sua foto favorita numa memória iluminada.

This is not positioned as a generic 3D print. It is a handmade reveal moment for gifting, remembrance, and emotional home decor.

## 2. Target Market

| Segment | Ideal Client Profile | Occasions |
| --- | --- | --- |
| Pet lovers | Passionate pet owners who want a keepsake | Pet memorials, birthdays, adoption anniversaries |
| Families | Primary gift buyers, especially women aged 25-55 | Anniversaries, newborns, grandparents, birthdays |
| Local supporters | Portugal residents, Lisbon locals, expats | Supporting local artisans, meaningful local gifts |

## 3. Current Launch Strategy

The modular 2D builder is paused. The launch flow now focuses on fixed, standardized product models:

- `moldura-quadrada`
- `moldura-retrato`
- `moldura-paisagem`

This keeps production reliable while still giving customers a high-converting, premium customization experience.

## 4. UX/UI Strategy

### Current User Flow

1. Customer lands on an emotional Apple-style product page at `/produto/[slug]`.
2. Hero section sells the emotional value and shows product/lifestyle imagery.
3. Education section explains:
   - Arte em 3D
   - Magia Oculta
   - Presente Perfeito
4. Customer scrolls to the configurator.
5. Customer uploads a photo.
6. R3F preview maps the uploaded image to a flat lithophane plane.
7. Customer chooses light mode:
   - Luz Desligada
   - Luz Quente
   - Luz Fria
8. Customer chooses a catalog variant, such as base colour/material.
9. Customer requests a free manual review via contact modal.
10. Admin reviews the image before payment.

### Current 3D Preview Strategy

The preview is intentionally not a real lithophane generator.

Implemented:

- React Three Fiber preview.
- Simple frame + flat plane.
- Uploaded photo applied as a texture.
- Product aspect ratio changes by slug:
  - square: `[10, 10]`
  - portrait: `[7.5, 10]`
  - landscape: `[10, 7.5]`
- Light mode changes material, lighting, and CSS glow.
- Mobile scroll guard: touch interactions on the canvas do not trap vertical page scrolling.

Not implemented for MVP:

- Real STL generation.
- Real lithophane geometry.
- Bloom/postprocessing.
- Image crop tool.
- GLB frame model.

## 5. Technical Architecture

### Frontend

Implemented:

- Next.js App Router.
- Tailwind CSS.
- shadcn/ui components.
- Framer Motion already available for motion-heavy pages.
- Playfair Display for emotional headings.
- Inter for UI text.
- Canonical SEO product route: `/produto/[slug]`.
- Compatibility redirect: `/criar?produtoSlug=...` -> `/produto/...#configurador`.

### Catalog

Implemented:

- Product pages load product data from `catalogProducts`.
- Variants render from `catalogProducts.variants`.
- Internal homepage links now prefer `/produto/[slug]`.
- Legacy `/product/[slug]` still exists, but `/produto/[slug]` is the intended public route for Foto3D.pt.

### Image Upload

Implemented:

- Client sends image files via `FormData`.
- API uploads image to existing S3/R2 setup.
- `orderRequests.imageUrl` stores the resulting URL string.

Important guardrail:

- Do not send customer images as Base64 JSON. This risks Vercel/Next.js payload limits and poor performance.

### Database

Implemented:

- `orderRequests` stores fixed-model review requests.
- `canvasConfig` is versioned with `version: 1`.
- `catalogProducts.isModular` exists for future use but is hidden from the public customer flow.
- `productionJobs` can link back to `orderRequests`.

Current clean order status pipeline:

- `PENDING_REVIEW`
- `MODELING`
- `AWAITING_PAYMENT`
- `IN_PRODUCTION`
- `SHIPPED`

Legacy statuses are not part of the current request pipeline.

## 6. Admin Pipeline

Implemented:

1. New customer request is created with `PENDING_REVIEW`.
2. Admin reviews the photo manually.
3. Admin clicks `Aprovar Foto`.
4. Request moves to `AWAITING_PAYMENT`.
5. Admin sends Stripe/MBWay payment link manually.
6. After payment is verified, admin clicks `Aprovar para Produção`.
7. One linked `productionJobs` record is created.
8. Request moves to `IN_PRODUCTION`.

This avoids the earlier mistake of skipping the payment step.

Missing:

- A dedicated payment-confirmation field or audit trail.
- Automated payment link generation.
- Automated transactional emails.
- A richer production Kanban for slicing, printing, assembly, QC, and shipping.

## 7. Production Strategy

Current operating model:

- Manual review is a feature, not a weakness.
- Admin checks photo quality before asking for payment.
- Lithophane generation remains manual in PrusaSlicer/Bambu Studio for launch reliability.
- Fixed frame sizes reduce slicing and assembly risk.
- The custom part is the flat lithophane panel.

Planned physical architecture:

- Standardized CAD frames/bases.
- Snap-fit or low-friction assembly process.
- 5V USB COB LED strips for a clean, dot-free glow.
- Target assembly/packaging time: under 5 minutes once SOPs are mature.

## 8. Week 1 Launch Plan

Goal: 10 sales.

Positioning:

- Local Lisbon/Portugal maker.
- Limited beta slots.
- Personal review before payment.

Channels:

- Lisbon expat Facebook groups.
- Pet owner groups.
- Instagram Reels.
- Small paid test budget.

Core message:

> Transforme a sua foto favorita numa memória iluminada.

Must-have assets still missing:

- Physical prototype photos.
- Short hero GIF/video showing the light turning on.
- Real lifestyle images for pet memorial, anniversary, and newborn use cases.
- Clear delivery time promise.
- Packaging/gift presentation photos.

## 9. Four-Week Roadmap

| Week | Focus | Deliverables |
| --- | --- | --- |
| Week 1 | Prototype & hustle | Physical prototype, hero GIF/video, SEO product pages, fixed-model configurator, first 10 review requests/sales |
| Week 2 | Payment upgrade | Stripe/MBWay payment link workflow, transactional emails, payment status tracking |
| Week 3 | Factory floor | Production Kanban, slicing SOPs, print queue, assembly/QC checklist, logistics workflow |
| Week 4 | Growth & feedback | Meta ads, testimonials, referral loop, first upsells/material options |

## 10. Definition of Done for Day 28

Revenue:

- EUR 1,000+ gross sales.

Software:

- Customer flow from product page to request review is stable.
- Payment workflow is tracked.
- Admin pipeline supports review, payment, production, and shipment.

Production:

- Repeatable fixed-model manufacturing.
- Assembly and packaging under 5 minutes per unit.
- Low failure rate from bad photos because manual review happens before payment.

Marketing:

- At least one proven acquisition channel.
- Early CAC signal from paid or organic campaigns.
- Customer feedback loop producing testimonials and product improvements.

## 11. What Is Already Done

- Premium dark-room homepage exists.
- Dynamic featured product grid exists.
- `/produto/[slug]` product page exists.
- `/criar?produtoSlug=...` redirects to `/produto/[slug]#configurador`.
- R3F preview exists and supports photo texture upload.
- Light modes exist: Desligada, Quente, Fria.
- Fixed-model aspect ratios exist.
- Variants render from the catalog.
- Price updates from selected variant.
- Contact modal exists.
- API submits via multipart `FormData`, not Base64 JSON.
- Images upload to S3/R2 and store URL in `orderRequests`.
- Clean request status pipeline is in place.
- Admin `Aprovar Foto` moves requests to `AWAITING_PAYMENT`.
- Admin `Aprovar para Produção` creates exactly one linked production job and moves to `IN_PRODUCTION`.
- Build passes.

## 12. What Is Missing Next

Highest priority:

- Add image crop with locked aspect ratio before upload/submission.
- Add optional engraving field back into the fixed-model product page if it remains part of the offer.
- Add real prototype/lifestyle media to replace placeholders/catalog leftovers.
- Add payment tracking so `AWAITING_PAYMENT` has a clear paid/not-paid audit trail.
- Add email templates for:
  - review request received
  - photo approved + payment link
  - payment received
  - production/shipping update

Medium priority:

- Make `/product/[slug]` redirect or canonicalize to `/produto/[slug]` if GolfPrint legacy pages are no longer needed.
- Add admin filters by status.
- Add production Kanban stages beyond the current linked job.
- Add delivery estimates and CTT/shipping copy.
- Add privacy/terms copy specific to photo uploads and manual review.

Later:

- Stripe Checkout or Stripe Payment Links automation.
- MBWay flow.
- Bloom/postprocessing if the preview needs extra polish.
- GLB frame model.
- Full modular builder.
- Real STL automation.

## 13. Does the Original Plan Still Make Sense?

Mostly yes, with these updates:

- Fixed models are the right launch constraint. They reduce manufacturing risk and keep the buying journey simple.
- The 2D modular builder should stay paused until fixed-model sales prove demand.
- The admin pipeline must keep the payment step before production.
- Manual maker review is a strong trust feature for Week 1.
- The crop step is now the biggest missing UX piece in the configurator.
- Real product media is now more important than adding more 3D effects.
