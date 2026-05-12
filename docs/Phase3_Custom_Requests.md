# Phase 3: Custom Request Funnel & Schema Update

**Context:** We are capturing leads for custom ideas and saving them to `orderRequests`.

**Tasks:**
1. **Schema Update (`instant.schema.ts`):**
   - Update the `leadType` field in `orderRequests` to include `'custom_idea'`:
   - `leadType: i.string<'photo_request' | 'b2b' | 'custom_idea'>().optional()`
   - *Note to dev: run `npx instant-cli push schema` after updating.*

2. **Custom Request Form (`app/pedido-personalizado/page.tsx`):**
   - Create a polished long-form UI.
   - Fields: Name, Email (Required), Phone, Type of Request (B2B, Presente, Casa, Outro), Description, File Upload (Optional).
   
3. **Submission Logic:**
   - Handle file upload to S3/R2.
   - Save to `orderRequests`.
   - Map fields: `customerName`, `customerEmail`, `customerPhone`, `notes` (combine Description and Request Type), and `imageUrl`.
   - Set `status: 'PENDING_REVIEW'` and `leadType: 'custom_idea'`.