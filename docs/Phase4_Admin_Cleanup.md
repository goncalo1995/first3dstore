# Phase 4: Admin Orders Manager Polish

**Context:** The existing `OrdersManager` fetches `orders` and `orderRequests`. We need to ensure the new EM3D orders are clearly visible without breaking the old layout.

**Tasks:**
1. **Filter & Badges in UI:**
   - In the `orderRequests` view, add a prominent UI badge or filter for `leadType === 'custom_idea'`.
   - Ensure the `notes` field (where the user's custom idea description lives) is easily readable in the list or detail view, so the admin doesn't have to dig for it.

2. **Orders View:**
   - In the standard `orders` view, ensure the `items` array displays correctly, specifically showing the concatenated `customText` string so the admin knows what to print/engrave.