# Invoicing Layer Analysis Report

## Invoicing UI Overview

The invoicing page (`/Users/justinstewart/support-billing-tracker/frontend/src/features/invoices/components/Invoices.tsx`) is a full-lifecycle invoice management system with three primary workflows:

1. **Invoice Generation** -- A modal (`GenerateInvoiceModal.tsx`) that auto-assembles invoices from three revenue streams: Support Hours, Projects, and Hosting. The user selects a customer and billing period; the system fetches billable data from two parallel API calls (support billing summary + comprehensive billing), then the user toggles which revenue streams to include and clicks "Generate Invoice."

2. **Invoice List** -- `InvoiceList.tsx` displays all invoices with filtering by status (`draft`, `sent`, `paid`, `overdue`, `cancelled`) and customer. Supports pagination, bulk export (CSV + QBO CSV simultaneously), send, and delete actions. Only draft invoices can be deleted or sent.

3. **Invoice Detail** -- `InvoiceDetail.tsx` is a rich detail view with:
   - Inline editing of line items (description, quantity, unit_price) for draft invoices
   - Period date editing
   - Request linking/unlinking (add or remove support requests from the invoice)
   - Recalculate button (re-derives support line items from current request data)
   - Payment recording (amount + date)
   - Export buttons: QBO CSV, human-readable CSV, and JSON
   - Hosting detail snapshot table (per-site breakdown)
   - Summary section with category subtotals, discount lines, tax, total, amount paid, and balance due

**Key workflow**: Generate (modal) -> Review/Edit (detail, draft) -> Mark as Sent (locks editing) -> Record Payment -> Paid.

---

## Form Fields Inventory

### Generation Modal (GenerateInvoiceModal.tsx)

| Field | Type | Required | Source |
|-------|------|----------|--------|
| **Customer** | `<select>` dropdown, populated from `GET /api/invoices/customers` | Yes | `listCustomers()` API |
| **Billing Month** | `<input type="month">` (default mode) | Yes (one mode) | Locally computed |
| **Period Start** | `<DateInput>` (custom range mode) | Yes (alt mode) | User input |
| **Period End** | `<DateInput>` (custom range mode) | Yes (alt mode) | User input |
| **Notes** | `<textarea>` (optional) | No | User input |
| **Include Support** | Checkbox toggle | No (default: true) | User toggle |
| **Include Projects** | Checkbox toggle | No (default: true) | User toggle |
| **Include Hosting** | Checkbox toggle | No (default: true) | User toggle |

The modal does NOT have fields for: invoice date, due date, tax rate, or individual line item editing. These are either auto-computed on the backend or editable after generation in the detail view.

### Invoice Detail (InvoiceDetail.tsx) -- Editable Fields (Draft Only)

| Field | Type | Editable When |
|-------|------|---------------|
| **Line Item Description** | Text input | Draft + Edit mode |
| **Line Item Quantity** | Number input (step 0.01) | Draft + Edit mode |
| **Line Item Unit Price** | Number input (step 0.01) | Draft + Edit mode |
| **Period Start** | `<DateInput>` | Draft + Edit mode |
| **Period End** | `<DateInput>` | Draft + Edit mode |
| **Payment Amount** | Number input (step 0.01) | Sent or Overdue status |
| **Payment Date** | Date input | Sent or Overdue status |

### Invoice List (InvoiceList.tsx) -- Filter Fields

| Field | Type |
|-------|------|
| **Status Filter** | `<select>`: All, Draft, Sent, Paid, Overdue, Cancelled |
| **Customer Filter** | `<select>`: populated from `listCustomers()` |

---

## Current Data Shape (Frontend Payload)

### GenerateInvoiceParams (sent to `POST /api/invoices/generate`)

```typescript
interface GenerateInvoiceParams {
  customerId: number;              // FK to customers table
  periodStart: string;             // "YYYY-MM-DD"
  periodEnd: string;               // "YYYY-MM-DD"
  invoiceDate?: string;            // "YYYY-MM-DD" (defaults to today on backend)
  dueDate?: string;                // "YYYY-MM-DD" (defaults to today + payment_terms)
  taxRate?: number;                 // Decimal (e.g., 0.0825) -- not exposed in UI, defaults to 0
  notes?: string;                  // Free text
  includeSupport?: boolean;        // Whether to include support line items
  additionalItems?: AdditionalLineItem[];  // Pre-computed project/hosting lines
  hostingDetailSnapshot?: HostingChargeSnapshot[];  // Per-site hosting breakdown
}
```

### AdditionalLineItem (built client-side via `buildAdditionalLineItems()`)

```typescript
interface AdditionalLineItem {
  item_type: 'project' | 'hosting' | 'other';
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;                  // Can be negative for discount/credit lines
  sort_order?: number;
  category?: string;               // e.g., 'LANDING_PAGE', 'HOSTING_CREDIT', 'HOSTING_PRORATED'
}
```

### Invoice (returned from backend, used throughout UI)

```typescript
interface Invoice {
  id: number;
  customer_id: number;
  invoice_number: string;          // Format: "VEL-YYYY-NNN"
  period_start: string;
  period_end: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: string;                // Decimal as string
  tax_rate: string;
  tax_amount: string;
  total: string;
  amount_paid: string;
  balance_due: string;             // Computed column (total - amount_paid)
  payment_date: string | null;
  notes: string | null;
  internal_notes: string | null;
  qbo_invoice_id: string | null;
  qbo_sync_status: 'pending' | 'synced' | 'error' | 'not_applicable';
  qbo_sync_date: string | null;
  qbo_sync_error: string | null;
  hosting_detail_snapshot: HostingChargeSnapshot[] | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
  items?: InvoiceItem[];
  requests?: InvoiceRequest[];
}
```

### InvoiceItem

```typescript
interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_type: 'support' | 'project' | 'hosting' | 'other';
  description: string;
  quantity: string;               // Decimal as string
  unit_price: string;             // Decimal as string
  amount: string;                 // Decimal as string (can be negative for credits)
  sort_order: number;
  category: string | null;        // Project category or hosting credit category
  request_ids: number[] | null;   // Support item linked request IDs
  created_at: string;
  updated_at: string;
}
```

### Customer

```typescript
interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;                // Default 'USA'
  payment_terms: number;          // Default 30 (NET 30)
  qbo_customer_id: string | null; // Already scaffolded for QBO
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## API Integration Points

All API calls use `authenticatedFetch()` (BasicAuth) against `API_CONFIG.BASE_URL` (default: `http://localhost:3011/api`).

### Customer Endpoints

| Method | Endpoint | Frontend Function | Purpose |
|--------|----------|-------------------|---------|
| GET | `/api/invoices/customers?active=true` | `listCustomers()` | Populate customer dropdown |
| GET | `/api/invoices/customers/:id` | `getCustomer()` | Get customer details |

### Invoice CRUD

| Method | Endpoint | Frontend Function | Purpose |
|--------|----------|-------------------|---------|
| GET | `/api/invoices?status=&customerId=&limit=&offset=` | `listInvoices()` | List with filters + pagination |
| GET | `/api/invoices/:id` | `getInvoice()` | Full invoice with items + requests |
| POST | `/api/invoices/generate` | `generateInvoice()` | Create invoice from billing data |
| PUT | `/api/invoices/:id` | `updateInvoice()` | Update status, notes, payment, period, hosting snapshot |
| DELETE | `/api/invoices/:id` | `deleteInvoice()` | Delete draft invoice |

### Billing Summary

| Method | Endpoint | Frontend Function | Purpose |
|--------|----------|-------------------|---------|
| GET | `/api/invoices/billing-summary?customerId=&periodStart=&periodEnd=` | `getBillingSummary()` | Support hours breakdown |
| (frontend-only) | N/A | `generateComprehensiveBilling()` in `billingApi.ts` | Projects + hosting data from existing APIs |

### Invoice Editing (Draft Only)

| Method | Endpoint | Frontend Function | Purpose |
|--------|----------|-------------------|---------|
| PUT | `/api/invoices/:id/items/:itemId` | `updateInvoiceItem()` | Edit line item description/qty/price |
| DELETE | `/api/invoices/:id/requests/:requestId` | `unlinkRequest()` | Remove support request from invoice |
| POST | `/api/invoices/:id/requests/:requestId` | `linkRequest()` | Add unbilled request to invoice |
| GET | `/api/invoices/:id/unbilled-requests` | `getUnbilledRequests()` | List available requests to add |
| POST | `/api/invoices/:id/recalculate` | `recalculateInvoice()` | Re-derive support lines from current data |

### Status Transitions

| Method | Endpoint | Frontend Function | Purpose |
|--------|----------|-------------------|---------|
| POST | `/api/invoices/:id/send` | `sendInvoice()` | Draft -> Sent (locks editing) |
| POST | `/api/invoices/:id/pay` | `payInvoice()` | Record payment (Sent/Overdue -> Paid) |

### Export Endpoints

| Method | Endpoint | Frontend Function | Purpose |
|--------|----------|-------------------|---------|
| GET | `/api/invoices/:id/export/csv` | `exportInvoiceCSV()` | Human-readable CSV |
| GET | `/api/invoices/:id/export/qbo-csv` | `exportInvoiceQBOCSV()` | QBO-importable flat CSV |
| GET | `/api/invoices/:id/export/hosting-csv` | `exportHostingDetailCSV()` | Per-site hosting breakdown CSV |
| GET | `/api/invoices/:id/export/json` | `exportInvoiceJSON()` | JSON export |

---

## Line Item Handling

### Line Item Creation (Backend-Driven)

Line items are NOT manually created by the user. They are auto-generated by the backend during `POST /api/invoices/generate`:

1. **Support items** (`item_type: 'support'`): One line per urgency tier (High Priority, Medium Priority, Low Priority) based on gross hours. Each line stores `request_ids` JSON array linking to the source requests.

2. **Free credit line** (`item_type: 'other'`): Negative-amount line for "Turbo Support Credit Applied" when free hours are used. Description includes hours applied (e.g., `"Turbo Support Credit Applied (5.25h free)"`).

3. **Project items** (`item_type: 'project'`): One line per project, built client-side by `buildAdditionalLineItems()`. Free-credited projects get `amount: 0` with `unit_price` set to the original amount. Category stored separately.

4. **Hosting items** (`item_type: 'hosting'`): Single gross line for all hosting sites (quantity = number of sites, unit_price = 99).

5. **Hosting discount lines** (`item_type: 'other'`, category `HOSTING_CREDIT` or `HOSTING_PRORATED`): Negative-amount lines for free hosting credits and prorated adjustments.

### Line Item Editing (Detail View)

- Only billable items (amount > 0) can be edited inline
- Editable fields: description, quantity, unit_price (amount auto-recomputes)
- Credit/discount lines (amount <= 0) are read-only
- Edit mode has a "Recalculate" button that re-derives all support lines from current request data

### Negative/Discount Line Support

Yes, the system has full negative line support:
- **Support credits**: `item_type: 'other'`, negative amount, no HOSTING_ category prefix
- **Hosting free credits**: `item_type: 'other'`, negative amount, `category: 'HOSTING_CREDIT'`
- **Hosting proration adjustments**: `item_type: 'other'`, negative amount, `category: 'HOSTING_PRORATED'`
- **Free project items**: `item_type: 'project'`, `amount: 0` (unit_price shows original value)

### QBO CSV Export Handling of Discounts

The QBO CSV export (`exportInvoiceQBOCSV()` in the backend service) **deliberately excludes** all discount/credit lines (`item_type: 'other'` and $0 project lines). Only positive-amount support, project, and hosting lines are exported. This means:
- Support lines use **gross** hours (before free credit deduction)
- Hosting uses **gross** amount (before credits/proration)
- Free project credits are excluded entirely
- The QBO total will be HIGHER than the internal invoice total

---

## Customer Data Flow

### Customer Selection

Customers are selected from a **dropdown** populated by `GET /api/invoices/customers?active=true`. The dropdown shows `customer.name` and passes `customer.id` (integer) as the selected value.

### Customer Data Passed with Invoice

Only `customerId` (integer FK) is sent in the `generateInvoice` payload. The backend resolves the full customer record from the database and uses it to:
- Set `due_date` based on `customer.payment_terms`
- Associate the invoice via `customer_id` FK

### Customer Schema (DB)

The `customers` table already has a `qbo_customer_id` column (VARCHAR(100)), scaffolded for QBO integration but currently unused in the UI. There is no UI for managing QBO customer ID mappings.

### Single Customer Operation

Currently there is only one customer in the system: "Velocity Business Automation, LLC" (id=1). The customer selector auto-selects when only one customer exists. The system is designed for multi-customer support but effectively operates single-customer today.

---

## State Management Pattern

### No Global State Library

The invoicing layer uses **React local state only** -- no Redux, Zustand, React Query, or context providers. All state is managed with `useState` and `useEffect` hooks within individual components.

### Component-Level State Architecture

**Invoices.tsx** (page container):
- `view`: 'list' | 'detail' (page routing)
- `selectedInvoice`: Invoice | null
- `showGenerateModal`: boolean
- `refreshTrigger`: number (increment to force child data refresh)

**GenerateInvoiceModal.tsx**:
- `customers`: Customer[] (fetched on mount)
- `selectedCustomer`: number | '' (selected customer ID)
- `periodStart`, `periodEnd`: string (date range)
- `billingSummary`: BillingSummary | null (support data from API)
- `monthlyBillingData`: MonthlyBillingSummary | null (projects + hosting from frontend computation)
- `includeSupport`, `includeProjects`, `includeHosting`: boolean (section toggles)
- `notes`: string
- Loading states: `supportLoading`, `comprehensiveLoading`, `generating`
- Computed totals via `useMemo`

**InvoiceList.tsx**:
- `invoices`: Invoice[] + `total`: number (paginated list)
- Filter state: `statusFilter`, `customerFilter`
- Pagination: `currentPage`, `pageSize`
- Toast notifications managed locally

**InvoiceDetail.tsx**:
- `invoice`: Invoice | null (loaded by ID)
- Inline edit state: `editMode`, `editingItem`, `editValues`
- Request management: `unbilledRequests`, `showAddRequests`
- Period editing: `editingPeriod`, `editPeriodStart`, `editPeriodEnd`
- Payment: `paymentAmount`, `paymentDate`, `showPaymentForm`
- Hosting snapshot loading: `snapshotLoading`

### How to Hook In Async QBO Submission

The simplest integration path:
1. Add a "Sync to QBO" button in `InvoiceDetail.tsx` (and optionally `InvoiceList.tsx`)
2. Call a new API endpoint (e.g., `POST /api/invoices/:id/sync-qbo`)
3. Update `invoice.qbo_sync_status` optimistically or on response
4. The existing `qbo_sync_status`, `qbo_invoice_id`, `qbo_sync_date`, and `qbo_sync_error` fields on the Invoice type are already scaffolded
5. No state management migration needed -- just add local state for sync-in-progress and read the sync status from the returned invoice

---

## Gaps & Mismatches

### 1. QBO Product/Service ItemRef Not Selectable in UI

The QBO CSV export uses hardcoded product name mappings in the backend (`SUPPORT_PRODUCT_MAP`, `PROJECT_PRODUCT_MAP`, `HOSTING_PRODUCT`). These map internal item types/categories to QBO "Item(Product/Service)" strings like `"Professional Services:Website Services:Support Services:p1 - Emergency Support"`. There is **no UI** for the user to select or override the QBO product mapping per line item. For QBO API integration, these will need to become `ItemRef` objects with QBO `value` (ID) fields.

**Current hardcoded QBO product mappings (backend)**:

| Internal Type | Internal Description/Category | QBO Product Name |
|---------------|-------------------------------|------------------|
| support | High Priority Support Hours | `Professional Services:Website Services:Support Services:p1 - Emergency Support` |
| support | Medium Priority Support Hours | `Professional Services:Website Services:Support Services:p2 - Urgent Support` |
| support | Low Priority Support Hours | `Professional Services:Website Services:Support Services:p3 - Standard Support` |
| project | LANDING_PAGE | `Professional Services:Website Services:Lead Capture Assets:Landing Page Development` |
| project | MULTI_FORM | `Professional Services:Website Services:Lead Capture Assets:Multi-Step Lead Form Implementation` |
| project | BASIC_FORM | `Professional Services:Website Services:Lead Capture Assets:Basic Lead Form Implementation` |
| project | MIGRATION | `Professional Services:Website Services:Website Migration Services` |
| project | (other) | `Professional Services:Custom Development Services:Custom Development` |
| hosting | (any) | `Managed Services:Hosting Services:PeakOne Website Hosting - Turbo - T2 - Per Site` |

### 2. Discount/Credit Lines Excluded from QBO Export

The QBO CSV deliberately excludes all `item_type: 'other'` lines (credits, discounts) and $0 project lines. This means the QBO invoice total will not match the internal invoice total when credits are applied. For QBO API integration, a decision is needed:
- **Option A**: Continue excluding credits (QBO invoice is gross-only, adjustments handled separately)
- **Option B**: Include credit lines as negative-amount line items in QBO (requires a QBO "Discount" item or negative qty)
- **Option C**: Use QBO's native discount feature

### 3. Customer QBO ID Mapping

The `customers.qbo_customer_id` column exists in the DB and the TypeScript interface but is:
- Never populated by the UI
- Never used in any API logic
- Required for QBO API calls (`CustomerRef.value`)

**Needed**: A one-time mapping step or admin UI to associate internal customer IDs with QBO customer IDs. Alternatively, auto-match by customer name on first sync.

### 4. No QBO Tax Handling

Tax rate is stored but always defaults to 0 and is never exposed in the generation modal UI. QBO invoices typically have `TxnTaxDetail` with `TaxCodeRef`. If tax is needed, the UI will need a tax rate field or the QBO integration should set `GlobalTaxCalculation: "NotApplicable"`.

### 5. No QBO-Specific Line Item IDs

Invoice items have internal `id` fields but no `qbo_item_id` for tracking which QBO `ItemRef.value` each line maps to. For QBO API sync:
- Need a config table or lookup that maps `(item_type, description/category)` to QBO Item IDs
- Or query QBO Items API at sync time to resolve names to IDs

### 6. Missing "Sync to QBO" UI Elements

The frontend already has `qbo_sync_status` in the Invoice type but does not render it anywhere except by implication. Needed:
- QBO sync status badge on InvoiceDetail and InvoiceList
- "Sync to QBO" action button
- Sync error display with retry capability
- Indication of which invoices have been synced vs. pending

### 7. Invoice Number Format

Internal format is `VEL-YYYY-NNN`. QBO's `DocNumber` field accepts this, but verify it does not conflict with QBO's own auto-numbering if enabled.

### 8. Hosting Detail Not a QBO Concept

The hosting detail snapshot (per-site breakdown) is for internal/client transparency. QBO only sees a single "Hosting" line item. No gap per se, but the supplemental hosting CSV would need to be attached manually outside QBO.

### 9. Payment Recording

Payments are recorded locally via `POST /api/invoices/:id/pay`. For QBO integration, payments would need to create QBO `Payment` objects linked to the QBO invoice. The current UI supports single payment recording; QBO supports partial payments via separate Payment entities.

### 10. No `SalesTermRef` on Invoice Object

The backend computes QBO terms string from date difference (`QBO_TERMS_MAP`) for CSV export but does not store a `SalesTermRef` ID. QBO API requires `SalesTermRef.value` (a QBO Terms ID), not a string name.

### 11. Free Project Credits Representation

Free-credited projects are stored with `amount: 0` and `unit_price` = original amount. They are excluded from QBO CSV. For API sync, decide whether to include them as $0 lines (for transparency) or exclude entirely.

### 12. Fluent Support Category Mapping

The invoice service queries for `category NOT IN ('Non-billable', 'Migration')` to filter billable requests. The `category` field on requests comes from FluentSupport ticket data. There is currently a `feat/fluent-category-mapping` branch that may affect how categories are mapped, which could impact which requests appear in billing summaries.
