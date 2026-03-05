# QBO CSV Export — Full Rewrite Plan

## Context

The QBO CSV export (`exportInvoiceQBOCSV` in `backend/services/invoiceService.js`) needs to produce a CSV that imports directly into QuickBooks Online. The date crash bug is already fixed. Now we need to align the export with QBO's required format and our actual QBO product catalog, per specialist recommendations in `docs/qbo-csv-import-recommendations copy.md`.

**Critical prerequisite**: QBO's native CSV importer does not officially support negative `ItemAmount` values. This affects support credits (Q2), hosting volume discounts (Q3), and free project credits (Q5). The plan includes a phased approach — build the negative-amount logic but include a fallback toggle.

## File to Modify

**`backend/services/invoiceService.js`** — rewrite `exportInvoiceQBOCSV()` (lines 967–1001)

---

## Step 0: Prerequisite — Test QBO Negative Amount Import

Before implementing, manually test in QBO:
1. Create a minimal test CSV with one invoice containing a negative `ItemAmount` line
2. Import via QBO (Gear → Import Data → Invoices)
3. Result determines approach for support credits, volume discounts, and free project credits

**If negatives work**: Implement full negative-amount lines as designed below.
**If negatives fail**: Use $0 informational lines for credits (current behavior), skip volume discount/credit lines in hosting breakdown. Add a code comment documenting why.

---

## Step 1: New Column Headers

**Current:** `InvoiceNo,Customer,InvoiceDate,DueDate,ItemDescription,ItemQuantity,ItemRate,ItemAmount`

**New:** `InvoiceNo,Customer,InvoiceDate,DueDate,Terms,Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ServiceDate,Taxable`

### Column Details

- **Terms**: Map from `due_date - invoice_date` gap to QBO-standard strings only:
  ```javascript
  const QBO_TERMS_MAP = { 0: 'Due on receipt', 15: 'Net 15', 30: 'Net 30', 45: 'Net 45', 60: 'Net 60' };
  const daysDiff = Math.round((dueDate - invDate) / (1000 * 60 * 60 * 24));
  const terms = QBO_TERMS_MAP[daysDiff] || ''; // blank if non-standard
  ```
  This avoids emitting invalid terms like "Net 28" that QBO would reject.

- **Item(Product/Service)**: Mapped from item data (see mappings below).
- **ServiceDate**: Use invoice's `period_start`, formatted MM/DD/YYYY. Falls back to `invoice_date` if null.
- **Taxable**: Always `"No"` (all services are non-taxable).

---

## Step 2: Product Name Mapping Constants

```javascript
// Support: map by description (tier-specific per specialist recommendation)
const SUPPORT_PRODUCT_MAP = {
  'Emergency Support Hours': 'p1 - Emergency Support',
  'Same Day Support Hours':  'p2 - Urgent Support',
  'Regular Support Hours':   'p3 - Standard Support',
};

// Hosting: only two products needed for the consolidated invoice approach
// The full per-site detail lives in the CSV supplement, not the QBO invoice
const HOSTING_PRODUCT = 'PeakOne Website Hosting - Turbo (T2) - Per Site';
const HOSTING_DISCOUNT_PRODUCT = 'PeakOne Website Hosting - Turbo (T2) - Volume Discount';

// Projects: map by category field
const PROJECT_PRODUCT_MAP = {
  'Landing_Page': 'Landing Page Development',
  'Multi_Form':   'Multi-Step Lead Form Implementation',
  'Basic_Form':   'Basic Lead Form Implementation',
  'Migration':    'Website Migration Services',
};
const DEFAULT_PROJECT_PRODUCT = 'Custom Development';

// Free project credit products (for two-line split)
const PROJECT_CREDIT_MAP = {
  'Landing_Page': 'Landing Page - Credit',
  'Multi_Form':   'Multi-Step Lead Form - Credit',
  'Basic_Form':   'Basic Lead Form - Credit',
};
```

---

## Step 3: Central `getQBOProductName()` Helper

```javascript
function getQBOProductName(item) {
  if (item._isCreditLine)   return item._creditProduct;
  if (item._isHostingDiscount) return HOSTING_DISCOUNT_PRODUCT;
  if (item.item_type === 'support') return SUPPORT_PRODUCT_MAP[item.description] || 'p3 - Standard Support';
  if (item.item_type === 'other' && item.description?.startsWith('Turbo Support Credit')) return 'Support Credits';
  if (item.item_type === 'project') return PROJECT_PRODUCT_MAP[item.category] || DEFAULT_PROJECT_PRODUCT;
  if (item.item_type === 'hosting') return HOSTING_PRODUCT;
  console.warn(`[QBO Export] Unmapped item type: ${item.item_type}, description: "${item.description}" — falling back to "Services"`);
  return 'Services'; // exists in QBO product list, but warn so unmapped types are caught during development
}
```

---

## Step 4: Export Logic — Row Generation

Replace the current simple loop with explicit handling per item type.

### Invoicing Philosophy: Summary on Invoice, Detail in Supplement

Every invoice we send is accompanied by a CSV supplement containing the full line-item breakdown (per-domain hosting, per-ticket support, per-project detail). The QBO invoice is the **billing document** — its job is to present charges at a category level that is clear, reconcilable, and professional. The CSV supplement is the **supporting schedule** — the proof behind the numbers.

This means the QBO invoice should have ~3–8 line items per client (one per service category or logical grouping), not 20–40 granular lines. This follows standard accounting practice for service businesses: invoices summarize, schedules detail.

Benefits of this approach:
- **Cleaner client experience** — the invoice is readable at a glance
- **Easier reconciliation** — matching payments to 3–5 lines is simpler than matching to 30+
- **QBO import reliability** — stays well within the 1,000-row / 100-invoice limit even for batch exports
- **Accurate books** — the totals are identical; granularity doesn't change revenue recognition
- **Audit-friendly** — auditors and bookkeepers work with clean invoices backed by supporting schedules, not invoices that try to be both

---

### 4a. Support Items (`item_type='support'`, amount > 0)

**One CSV row per support tier used**, not per ticket. If a client has 8 tickets all at `Regular Support Hours`, that's one line with the total hours and amount for that tier.

```
Item:        p3 - Standard Support
Description: Standard support - 12.5 hrs (see supplement for ticket detail)
Qty:         12.5
Rate:        150
Amount:      1875.00
```

If the same invoice has both Regular and Emergency hours, that's two lines — one per tier. This preserves tier-level revenue reporting in QBO's Sales by Product report.

**Implementation:** Group `item_type='support'` items by their `SUPPORT_PRODUCT_MAP` result. Sum `quantity` and `amount` per group. Emit one row per group.

### 4b. Support Credit (`item_type='other'`, description starts with "Turbo Support Credit")

- **quantity** field stores the actual free hours count (e.g., 10), confirmed in codebase
- **If negatives supported**: Emit 1 row: product = `Support Credits`, qty = quantity (the free hours count, e.g. 10), rate = -150 (negative standard rate), amount = -(quantity × 150). This way QBO displays it as "10 hours at -$150/hr = -$1,500" which is clear and consistent with per-unit pricing.
- **If negatives not supported**: Emit 1 row: product = `Support Credits`, qty = quantity, rate = 0, amount = 0 (informational)

### 4c. Project Items (`item_type='project'`)

**One CSV row per project.** Projects are individually scoped deliverables with distinct pricing, so line-per-project is the correct level of detail for the invoice itself.

**Paid projects** (amount > 0): 1 row, product from `PROJECT_PRODUCT_MAP`

**Free credit projects** (amount = 0, unit_price > 0, description contains "(Free Credit)"):
- **If negatives supported AND credit product exists for category**: Emit 2 rows:
  - Row 1: Full-price line (qty=1, rate=unit_price, amount=unit_price), product = development product
  - Row 2: Credit line (qty=1, rate=-unit_price, amount=-unit_price), product = credit product from `PROJECT_CREDIT_MAP`
- **Otherwise**: Emit 1 row at $0 with the development product (current behavior, informational)

### 4d. Hosting Items — Consolidated on Invoice, Per-Site in Supplement

**Do not break out individual sites on the QBO invoice.** A client with 25 sites should see 1–2 hosting lines on their invoice, not 25+. The per-site breakdown (domain names, proration detail, free credits) belongs in the CSV supplement that accompanies each invoice.

**Standard case (no volume discount):** Emit 1 row with the total hosting charge:

```
Item:        PeakOne Website Hosting - Turbo (T2) - Per Site
Description: Website hosting - 25 sites (see supplement for per-site detail)
Qty:         [site count from hosting_detail_snapshot]
Rate:        [effective per-site rate: total amount / site count]
Amount:      [net hosting total]
```

**If volume discount or free credits apply and negatives are supported:** Emit 2 rows:

```
Row 1:
  Item:        PeakOne Website Hosting - Turbo (T2) - Per Site
  Description: Website hosting - 25 sites @ $99/site
  Qty:         25
  Rate:        99
  Amount:      2475.00

Row 2:
  Item:        PeakOne Website Hosting - Turbo (T2) - Volume Discount
  Description: Volume discount - 1 free site per 20 hosted
  Qty:         1
  Rate:        -99
  Amount:      -99.00
```

This keeps the discount visible on the invoice (good for client transparency and accurate revenue categorization in QBO) without cluttering the invoice with 25 individual domain lines.

**If negatives not supported:** Emit 1 row at the net total (after discounts), using the effective per-site rate. The discount is implicit in the lower rate but still documented in the CSV supplement.

**If `hosting_detail_snapshot` is null/empty:** Fall back to 1 consolidated row from the hosting line item's existing `quantity`, `unit_price`, and `amount` fields. Product = `HOSTING_PRODUCT`.

**Implementation detail for computing the consolidated hosting row:**

```javascript
// Parse the hosting_detail_snapshot to compute totals
const snapshot = JSON.parse(item.hosting_detail_snapshot);
const sites = snapshot.filter(s => s.billingType !== 'volume_discount' && s.billingType !== 'free_credit');
const discounts = snapshot.filter(s => s.billingType === 'volume_discount' || s.billingType === 'free_credit');

const siteCount = sites.length;
const siteTotal = sites.reduce((sum, s) => sum + parseFloat(s.netAmount), 0);
const discountTotal = discounts.reduce((sum, s) => sum + parseFloat(s.netAmount), 0); // already negative

// Row 1: sites
rows.push({
  product: HOSTING_PRODUCT,
  description: `Website hosting - ${siteCount} sites${NEGATIVE_AMOUNTS_SUPPORTED ? ' @ $99/site' : ''}`,
  qty: siteCount,
  rate: NEGATIVE_AMOUNTS_SUPPORTED ? 99 : ((siteTotal + discountTotal) / siteCount).toFixed(2),
  amount: NEGATIVE_AMOUNTS_SUPPORTED ? siteTotal : (siteTotal + discountTotal),
});

// Row 2: discount (only if negatives supported and discount exists)
if (NEGATIVE_AMOUNTS_SUPPORTED && discountTotal < 0) {
  const discountCount = discounts.length;
  rows.push({
    product: HOSTING_DISCOUNT_PRODUCT,
    description: `Volume discount - ${discountCount} free site${discountCount > 1 ? 's' : ''} per 20 hosted`,
    qty: discountCount,
    rate: discountTotal / discountCount,
    amount: discountTotal,
    _isHostingDiscount: true,
  });
}
```

### 4e. Everything else

Should not occur. Use `Services` as product (confirmed to exist in QBO). The `console.warn` in `getQBOProductName()` ensures unmapped types are caught during development.

---

## Step 5: Implementation Detail

Remove the blanket `parseFloat(item.amount) > 0` filter. Replace with explicit per-type handling as described above. This is safe — the only zero-amount items are:
- Support credit memo (`item_type='other'`) — handled in 4b
- Free project credits (`item_type='project'`, amount=0) — handled in 4c

No other zero or negative amount items exist in the system (confirmed via codebase audit).

Add a `NEGATIVE_AMOUNTS_SUPPORTED` boolean constant at the top of the function (default: `false` until QBO test passes). This controls whether credits emit real negative amounts or $0 informational lines. Single flag, easy to flip after testing.

---

## Step 6: CSV Supplement (Existing — No Changes Required)

The per-site hosting breakdown, per-ticket support detail, and per-project line items already exist in the CSV supplement that accompanies each invoice. This plan does **not** change the supplement — it continues to provide the full granular detail:

- **Hosting:** Every domain, its billing type (full month, prorated start/end, free credit), rate, and amount
- **Support:** Every ticket ID, title, hours, and rate by tier
- **Projects:** Every project with category, description, and amount

The QBO invoice summarizes. The CSV supplement proves the numbers. Together they give the client and the bookkeeper everything they need.

---

## Verification

1. **Step 0 (before coding)**: Test negative amounts in QBO sandbox, set `NEGATIVE_AMOUNTS_SUPPORTED` accordingly
2. Restart backend: `docker-compose restart backend`
3. Export QBO CSV for an invoice with support hours → verify tier-specific product names (p1/p2/p3), hours aggregated by tier, all 12 columns present
4. Export for an invoice with hosting → verify **consolidated** hosting line (1–2 rows, not per-site), correct site count in description, correct total amount
5. Export for an invoice with free project credits → verify two-line split (if negatives supported) or $0 line (if not)
6. Verify: dates MM/DD/YYYY, Terms is a QBO-standard string or blank, ServiceDate present, Taxable = "No"
7. Import the exported CSV into QBO to confirm end-to-end success
8. Spot-check the CSV supplement alongside the QBO invoice to confirm totals match across both documents

## Known Limits

- **QBO import cap**: Max 100 invoices per import, 1,000 rows per CSV file. With consolidated hosting (1–2 rows instead of per-site), a typical invoice generates ~5–10 rows. This means batch exports of 100+ invoices fit comfortably within QBO limits.
- **Product name matching**: All `Item(Product/Service)` values must match QBO product names exactly. If a product is renamed in QBO, the corresponding constant in this code must be updated.
- **Support hour aggregation**: If a single invoice has the same support tier split across multiple line items (e.g., two separate "Regular Support Hours" entries), the grouping logic must sum them correctly. Add a unit test for this case.
