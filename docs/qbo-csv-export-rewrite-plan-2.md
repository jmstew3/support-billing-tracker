# QBO CSV Export — Full Rewrite Plan (Final)

## Context

The QBO CSV export (`exportInvoiceQBOCSV` in `backend/services/invoiceService.js`) needs to produce a CSV that imports directly into QuickBooks Online's native importer. The date crash bug is already fixed. Now we need to align the export with QBO's required format and our actual QBO product catalog, per specialist recommendations in `docs/qbo-csv-import-recommendations copy.md`.

**Confirmed constraints from QBO native importer:**
- Negative `ItemAmount` values are **not supported** — credits must be handled as $0 informational lines or excluded entirely
- `ServiceDate` is **not a native QBO import field** — omit it
- `Taxable` is not needed for our non-taxable services — omit it

These constraints are temporary. Phase 2 (QBO REST API via n8n) will handle credits natively through `DiscountLineDetail` and supports `ServiceDate` as a first-class field. This CSV export is the bridge until that integration is built.

## File to Modify

**`backend/services/invoiceService.js`** — rewrite `exportInvoiceQBOCSV()` (lines 967–1001)

---

## Step 1: New Column Headers

**Current:** `InvoiceNo,Customer,InvoiceDate,DueDate,ItemDescription,ItemQuantity,ItemRate,ItemAmount`

**New:** `InvoiceNo,Customer,InvoiceDate,DueDate,Terms,Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount`

Two columns added vs. current:
- **Terms** — payment terms mapped to QBO-standard strings
- **Item(Product/Service)** — product name mapped from item data

### Column Details

- **Terms**: Map from invoice data to QBO-standard strings. Only these 6 terms exist in our QBO instance (confirmed via Gear → All Lists → Terms):
  ```javascript
  // Exact terms from QBO — do NOT add terms that don't exist in the QBO Terms list
  const QBO_TERMS_MAP = {
    0:  'Due on receipt',
    15: 'Net 15',
    30: 'Net 30',
    60: 'Net 60',
  };

  // "1st of Month" and "3rd of Month" are also in QBO but are date-anchored terms,
  // not day-gap terms. They require knowing the client's payment schedule, not just
  // due_date - invoice_date. If a client uses these, set them manually in QBO after
  // import or add a terms_override field to the invoices table (future enhancement).

  const daysDiff = Math.round((dueDate - invDate) / (1000 * 60 * 60 * 24));
  const terms = QBO_TERMS_MAP[daysDiff] || ''; // blank if non-standard — avoids QBO rejecting values like "Net 28"
  ```
  Note: `dueDate` and `invDate` are Date objects from mysql2. The `|| ''` fallback also covers the "1st of Month" / "3rd of Month" cases — those invoices will import with a blank Terms field, and the bookkeeper sets the term manually. This is preferable to guessing.

- **Item(Product/Service)**: Must match an existing QBO product name exactly. Mapped via `getQBOProductName()` helper (see Step 3).

---

## Step 2: Product Name Mapping Constants

```javascript
// ── Support: tier-specific products (rates differ: $250 / $175 / $150) ──
const SUPPORT_PRODUCT_MAP = {
  'Emergency Support Hours': 'p1 - Emergency Support',
  'Same Day Support Hours':  'p2 - Urgent Support',
  'Regular Support Hours':   'p3 - Standard Support',
};

// ── Hosting: single consolidated product ──
// Per-site detail (domains, prorations, free credits) lives in the CSV supplement, not the QBO invoice.
const HOSTING_PRODUCT = 'PeakOne Website Hosting - Turbo (T2) - Per Site';

// ── Projects: category → QBO product ──
const PROJECT_PRODUCT_MAP = {
  'Landing_Page': 'Landing Page Development',
  'Multi_Form':   'Multi-Step Lead Form Implementation',
  'Basic_Form':   'Basic Lead Form Implementation',
  'Migration':    'Website Migration Services',
};
const DEFAULT_PROJECT_PRODUCT = 'Custom Development';
```

**Note:** The `HOSTING_DISCOUNT_PRODUCT`, `PROJECT_CREDIT_MAP`, and `NEGATIVE_AMOUNTS_SUPPORTED` toggle from earlier plan revisions are removed. QBO's native importer cannot handle negative amounts. These will be reintroduced in Phase 2 (API integration) where `DiscountLineDetail` handles credits natively.

---

## Step 3: Central `getQBOProductName()` Helper

```javascript
function getQBOProductName(item) {
  if (item.item_type === 'support') {
    return SUPPORT_PRODUCT_MAP[item.description] || 'p3 - Standard Support';
  }
  if (item.item_type === 'project') {
    return PROJECT_PRODUCT_MAP[item.category] || DEFAULT_PROJECT_PRODUCT;
  }
  if (item.item_type === 'hosting') {
    return HOSTING_PRODUCT;
  }

  // Unmapped type — log a warning so it's caught during development, not silently in production
  console.warn(
    `[QBO Export] Unmapped item type: ${item.item_type}, ` +
    `description: "${item.description}" — falling back to "Services"`
  );
  return 'Services'; // confirmed to exist in QBO product list
}
```

**What this does NOT handle (intentionally):**
- `item_type='other'` with description starting with "Turbo Support Credit" → these are $0 credit lines, handled separately in Step 4b
- Hosting discount/free credit lines → absorbed into the consolidated hosting total in Step 4d

---

## Step 4: Export Logic — Row Generation

Replace the current simple loop with explicit handling per item type.

### Invoicing Philosophy: Summary on Invoice, Detail in Supplement

Every invoice we send is accompanied by a CSV supplement containing the full line-item breakdown (per-domain hosting, per-ticket support hours, per-project detail). The QBO invoice is the **billing document** — its job is to present charges at a category level that is clear, reconcilable, and professional. The CSV supplement is the **supporting schedule** — the proof behind the numbers.

This means the QBO invoice should have ~3–8 line items per client (one per service category), not 20–40 granular lines. This follows standard accounting practice for service businesses: invoices summarize, schedules detail.

Why this matters:
- **Cleaner client experience** — the invoice is readable at a glance
- **Easier reconciliation** — matching payments to 3–5 lines beats matching 30+
- **QBO import reliability** — stays well within the 1,000-row / 100-invoice limit even for batch exports
- **Audit-friendly** — auditors and bookkeepers work with clean invoices backed by supporting schedules

---

### 4a. Support Items (`item_type='support'`, amount > 0)

**One CSV row per support tier used**, not per ticket. If a client has 8 tickets all at `Regular Support Hours`, that's one line with the total hours and amount for that tier.

Example output:
```
Item:        p3 - Standard Support
Description: 12.5 hours (see supplement for ticket detail)
Qty:         12.5
Rate:        150.00
Amount:      1875.00
```

The `Item(Product/Service)` column already identifies the tier ("p3 - Standard Support"), so the description doesn't need to repeat it. Instead, focus the description on the one piece of information the client cares about: how many hours.

If the same invoice has both Regular and Emergency hours, that's two lines — one per tier. This preserves tier-level revenue reporting in QBO's Sales by Product report without cluttering the invoice.

**Implementation:**
```javascript
// Group support items by tier, sum hours and amounts per tier
const supportGroups = {};
items
  .filter(i => i.item_type === 'support' && parseFloat(i.amount) > 0)
  .forEach(item => {
    const product = getQBOProductName(item);
    if (!supportGroups[product]) {
      supportGroups[product] = { product, totalQty: 0, totalAmount: 0, rate: parseFloat(item.unit_price) };
    }
    supportGroups[product].totalQty += parseFloat(item.quantity);
    supportGroups[product].totalAmount += parseFloat(item.amount);
  });

Object.values(supportGroups).forEach(group => {
  rows.push({
    product: group.product,
    description: `${group.totalQty} hours (see supplement for ticket detail)`,
    qty: group.totalQty,
    rate: group.rate,
    amount: group.totalAmount,
  });
});
```

### 4b. Support Credit (`item_type='other'`, description starts with "Turbo Support Credit")

QBO native importer cannot handle negative amounts. Emit a $0 informational line so the credit is documented on the invoice even though it doesn't reduce the total. The actual dollar offset is handled outside the CSV import (manually in QBO, or automatically in Phase 2 via API).

```javascript
// Support credit — $0 informational line
const creditItems = items.filter(
  i => i.item_type === 'other' && i.description?.startsWith('Turbo Support Credit')
);

creditItems.forEach(item => {
  const freeHours = parseFloat(item.quantity) || 0;
  rows.push({
    product: 'Support Credits',
    description: `Turbo Support Credit - ${freeHours} free hrs included (credit applied separately)`,
    qty: freeHours,
    rate: 0,
    amount: 0,
  });
});
```

**Why $0 and not excluded:** The client should see that their free hours exist, even if the CSV importer can't reduce the total. The description makes clear the credit is applied separately. When Phase 2 (API) ships, this becomes a real `DiscountLineDetail` with negative amount.

### 4c. Project Items (`item_type='project'`)

**One CSV row per project.** Projects are individually scoped deliverables with distinct pricing, so line-per-project is the correct invoice granularity.

**Paid projects** (amount > 0): 1 row, product from `PROJECT_PRODUCT_MAP`.

```javascript
const paidProjects = items.filter(
  i => i.item_type === 'project' && parseFloat(i.amount) > 0
);

paidProjects.forEach(item => {
  rows.push({
    product: getQBOProductName(item),
    description: item.description || item.category || 'Project work',
    qty: parseFloat(item.quantity) || 1,
    rate: parseFloat(item.unit_price),
    amount: parseFloat(item.amount),
  });
});
```

**Free credit projects** (amount = 0, unit_price > 0, description contains "(Free Credit)"): Emit 1 row at $0 as informational. The two-line split (full price + negative credit) is deferred to Phase 2 (API).

```javascript
const freeProjects = items.filter(
  i => i.item_type === 'project' && parseFloat(i.amount) === 0 && parseFloat(i.unit_price) > 0
);

freeProjects.forEach(item => {
  rows.push({
    product: getQBOProductName(item),
    description: `${item.description || item.category} (free credit - see supplement)`,
    qty: 1,
    rate: 0,
    amount: 0,
  });
});
```

### 4d. Hosting — Consolidated on Invoice, Per-Site in Supplement

**Do not break out individual sites on the QBO invoice.** The per-site breakdown (domain names, proration detail, free credits) belongs in the CSV supplement.

**Emit exactly 1 row per hosting line item.** Use Qty=1 at the net total. The site count goes in the description.

```javascript
const hostingItems = items.filter(i => i.item_type === 'hosting');

hostingItems.forEach(item => {
  let siteCount = null;
  let netTotal = parseFloat(item.amount);

  // Try to get site count from hosting_detail_snapshot for a richer description
  if (item.hosting_detail_snapshot) {
    try {
      const snapshot = JSON.parse(item.hosting_detail_snapshot);
      // billingType values are UPPERCASE: 'FULL', 'PRORATED_START', 'PRORATED_END', 'INACTIVE'
      // (confirmed: frontend/src/types/websiteProperty.ts:21, determineBillingType(), all UI code)
      // Credited sites have creditApplied=true and netAmount=0
      // INACTIVE sites are filtered out before snapshot creation, so they won't appear here
      siteCount = snapshot.length; // total sites in snapshot (all are billable or credited)
    } catch (e) {
      console.warn(`[QBO Export] Failed to parse hosting_detail_snapshot: ${e.message}`);
    }
  }

  const siteLabel = siteCount ? `${siteCount} site${siteCount !== 1 ? 's' : ''}` : `${parseFloat(item.quantity) || 1} site${parseFloat(item.quantity) !== 1 ? 's' : ''}`;

  rows.push({
    product: HOSTING_PRODUCT,
    description: `Website hosting - ${siteLabel} (see supplement for per-site detail)`,
    qty: 1,
    rate: netTotal,
    amount: netTotal,
  });
});
```

**Why Qty=1 and not Qty=siteCount:** The net total already accounts for prorations, volume discounts, and free credits. Dividing it by site count to get an "effective rate" produces a number that doesn't exist in our pricing ($89.32/site is neither the contract rate nor a real charge). Qty=1 at the actual total is honest and reconcilable. The description carries the site count for context.

**What about volume discounts and free credits?** They're already baked into `item.amount` (the net total). The CSV supplement documents them individually. In Phase 2 (API), they'll appear as separate `DiscountLineDetail` lines on the QBO invoice.

### 4e. Everything else

Should not occur in normal operation. The `console.warn` in `getQBOProductName()` catches unmapped types during development. Falls back to `Services` product (confirmed to exist in QBO).

---

## Step 5: Implementation Detail

Remove the blanket `parseFloat(item.amount) > 0` filter from the current code. Replace with the explicit per-type handling above. This is necessary because:
- Support credits (`item_type='other'`) have amount=0 but should emit a $0 informational row (4b)
- Free project credits (`item_type='project'`, amount=0) should emit a $0 informational row (4c)

No other zero-amount items exist in the system (confirmed via codebase audit).

### Date formatting helper

All dates must be MM/DD/YYYY for QBO import:

```javascript
function formatQBODate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}
```

### CSV row assembly

```javascript
function buildCSVRow(invoice, lineItem) {
  const invDate = new Date(invoice.invoice_date);
  const dueDate = new Date(invoice.due_date);
  const daysDiff = Math.round((dueDate - invDate) / (1000 * 60 * 60 * 24));
  const terms = QBO_TERMS_MAP[daysDiff] || '';

  return [
    invoice.invoice_number,                    // InvoiceNo
    invoice.customer_name,                     // Customer — must match QBO exactly
    formatQBODate(invoice.invoice_date),       // InvoiceDate
    formatQBODate(invoice.due_date),           // DueDate
    terms,                                     // Terms
    lineItem.product,                          // Item(Product/Service)
    `"${(lineItem.description || '').replace(/"/g, '""')}"`, // ItemDescription — quote-escaped
    lineItem.qty,                              // ItemQuantity
    lineItem.rate,                             // ItemRate
    lineItem.amount,                           // ItemAmount
  ].join(',');
}
```

---

## Step 6: CSV Supplement (Existing — No Changes Required)

The per-site hosting breakdown, per-ticket support detail, and per-project line items already exist in the CSV supplement that accompanies each invoice. This plan does **not** change the supplement — it continues to provide the full granular detail:

- **Hosting:** Every domain, its billing type (full month, prorated start/end, free credit), rate, and amount
- **Support:** Every ticket ID, title, hours, and rate by tier
- **Projects:** Every project with category, description, and amount

The QBO invoice summarizes. The CSV supplement proves the numbers. Together they give the client and the bookkeeper everything they need.

---

## Phase 2 Preview: What Changes With the API

When the QBO REST API integration ships (via n8n HTTP Request node), the following limitations are lifted:

| Current (CSV) | Phase 2 (API) |
|---|---|
| Credits as $0 informational lines | Real `DiscountLineDetail` with negative amounts |
| No ServiceDate | `ServiceDate` as a field on `SalesItemLineDetail` |
| Product matched by exact name string | Product matched by QBO internal `ItemRef` ID (robust) |
| 100 invoice / 1,000 row limit per file | No batch limit — invoices created individually |
| Manual upload step | Automated via n8n webhook trigger |
| Volume discounts hidden in net total | Visible as separate discount line on invoice |

The mapping logic in Steps 2–4 ports directly to the API's Function node in n8n. The main change is swapping product name strings for QBO Item IDs and using `DiscountLineDetail` instead of $0 lines.

---

## Verification

1. Restart backend: `docker-compose restart backend`
2. Export QBO CSV for an invoice with **support hours** → verify:
   - Tier-specific product names (p1/p2/p3)
   - Hours aggregated by tier (not per-ticket)
   - All 10 columns present
   - Terms is a QBO-standard string or blank
   - Dates are MM/DD/YYYY
3. Export for an invoice with **hosting** → verify:
   - Single consolidated hosting row (Qty=1, Amount=net total)
   - Site count in description text
   - No per-site rows on the QBO invoice
4. Export for an invoice with **support credit** → verify:
   - $0 informational line with `Support Credits` product
   - Description indicates credit applied separately
5. Export for an invoice with **free project credit** → verify:
   - $0 informational line with correct development product
   - Description indicates free credit
6. Import the exported CSV into QBO → confirm end-to-end success with no rejected rows
7. Spot-check the CSV supplement alongside the QBO invoice to confirm totals match

---

## Known Limits

- **QBO import cap**: Max 100 invoices per import, 1,000 rows per CSV file. With consolidated hosting (1 row) and aggregated support (1 row per tier), a typical invoice generates 3–8 rows. Batch exports of 100+ invoices fit comfortably within QBO limits.
- **Product name matching**: All `Item(Product/Service)` values must match QBO product names exactly (including spacing, capitalization, punctuation). If a product is renamed in QBO, the corresponding constant in this code must be updated to match.
- **Support hour aggregation**: If a single invoice has the same support tier split across multiple line items (e.g., two separate "Regular Support Hours" entries), the grouping logic must sum them correctly. Add a unit test for this edge case.
- **Customer name matching**: `Customer` column must match the QBO customer display name exactly. Mismatches cause the entire CSV import to fail. Consider adding a customer name lookup/validation step in a future iteration.
- **Credits not reflected in invoice total**: Because negative amounts aren't supported in QBO CSV import, the invoice total in QBO will be higher than the "real" total when credits exist. The bookkeeper must adjust manually until Phase 2 (API) ships. Document this in a runbook or checklist for the invoicing workflow.

## Pre-existing Bug (Out of Scope but Documented)

- **`invoiceApi.ts:480`**: The frontend checks for lowercase `'full_month'` and `'free_credit'` billingType values, but the actual values are UPPERCASE (`'FULL'`, `'PRORATED_START'`, `'PRORATED_END'`). There is no `'free_credit'` billingType — credited sites are identified by `creditApplied=true`. This means the `proratedCount` calculation is always wrong (equals total site count). The bug only affects description text in the frontend, not dollar amounts or the QBO export, but should be fixed separately.
