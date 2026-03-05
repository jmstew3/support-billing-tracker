# QBO CSV Import — Questions for QBO Specialist

**Date:** 2026-03-04
**Context:** We're building a CSV export from our billing tracker that imports directly into QuickBooks Online. We need the `Item(Product/Service)` column to match existing QBO product names exactly.

---

## Current QBO Products/Services (Support & Credit Related)

| QBO Product Name | Price | Description |
|---|---|---|
| p1 - Emergency Support | $250 | Critical-priority support, 60-min increments |
| p2 - Urgent Support | $175 | Medium-priority support, 30-min increments |
| p3 - Standard Support | $150 | Normal-priority support, 15-min increments |
| p1-p3 - Support Hours | $150 | Generic support hours (all tiers) |
| Support Credits | -$1,500 | Monthly credit for first 10 support hours |
| PeakOne Website Hosting - Turbo (T2) - Per Site | — | Hosting per site |
| PeakOne Website Hosting - Turbo (T2) - Per Site - CREDIT | -$99 | Credit/refund for hosting |
| PeakOne Website Hosting - Turbo (T2) - Per Site - Prorated Start | — | Prorated new site |
| PeakOne Website Hosting - Turbo (T2) - Per Site - Prorated End | — | Prorated offboarded site |
| PeakOne Website Hosting - Turbo (T2) - Volume Discount | — | 1 free site per 20 active sites |

---

## Question 1: Support Hours — Tier-Specific vs Generic Product

Our invoices break support hours into three line items by urgency tier:

| Our Line Item | Hours | Rate | Amount |
|---|---|---|---|
| Emergency Support Hours | 1.5 | $250/hr | $375.00 |
| Same Day Support Hours | 3.0 | $175/hr | $525.00 |
| Regular Support Hours | 8.25 | $150/hr | $1,237.50 |

**Should each line map to its tier-specific QBO product?**

- `Emergency Support Hours` → **p1 - Emergency Support**
- `Same Day Support Hours` → **p2 - Urgent Support**
- `Regular Support Hours` → **p3 - Standard Support**

**Or should all three map to the generic `p1-p3 - Support Hours`?**

Using tier-specific products would allow QBO reporting to break down revenue by support tier. Using the generic product is simpler but loses that granularity.

---

## Question 2: Support Credit Line Items

Currently our system generates a **$0 informational memo** line on invoices:
> "Turbo Support Credit Applied (10h free)"

This is meant to show the client they received 10 free hours. But in QBO, the **Support Credits** product is priced at **-$1,500**.

**How should this be handled in the QBO import?**

- **Option A:** Map to `Support Credits` with a negative amount (e.g., -$1,500 for 10 hours at $150/hr). This would make the credit a real line item that reduces the invoice total in QBO.
- **Option B:** Exclude it from the QBO CSV entirely — it's informational and doesn't affect the dollar total.
- **Option C:** Keep it as a $0 line mapped to `Support Credits` — visible but no financial impact.

**If Option A:** Should the credit amount vary based on the rate mix? (e.g., if 5 free hours were emergency-tier, the credit would be 5 × $250 = $1,250 instead of 5 × $150 = $750)

---

## Question 3: Hosting — Consolidated vs Per-Site Lines

Our system currently consolidates hosting into **one line item**:
> "Turbo Hosting - 8 sites (March 2026) [1 free credit, 2 prorated]"
> Qty: 1, Amount: $693.00 (net after credits/proration)

But QBO has separate products for each hosting scenario:

| Scenario | QBO Product |
|---|---|
| Full-month site | PeakOne Website Hosting - Turbo (T2) - Per Site |
| New site (mid-month) | PeakOne Website Hosting - Turbo (T2) - Per Site - Prorated Start |
| Removed site (mid-month) | PeakOne Website Hosting - Turbo (T2) - Per Site - Prorated End |
| Volume discount | PeakOne Website Hosting - Turbo (T2) - Volume Discount |
| Credit/refund | PeakOne Website Hosting - Turbo (T2) - Per Site - CREDIT |

**Should the QBO export break hosting into per-site line items?**

- **Option A:** One line per site, each mapped to the appropriate QBO product based on its billing type. Credits and discounts as separate negative-amount lines.
- **Option B:** Keep the single consolidated line mapped to `PeakOne Website Hosting - Turbo (T2) - Per Site`. Simpler but loses per-site detail in QBO.

**Note:** Our system already stores per-site detail in a `hosting_detail_snapshot` JSON field on each invoice, so the data is available for Option A.

---

## Question 4: Project Items — Category-to-Product Mapping

Project line items have a `category` field. Here's our proposed mapping to QBO products:

| Our Category | QBO Product |
|---|---|
| Landing_Page | Landing Page Development |
| Multi_Form | Multi-Step Lead Form Implementation |
| Basic_Form | Basic Lead Form Implementation |
| Migration | Website Migration Services |
| *(no category / other)* | Custom Development |

**Is this mapping correct? Are there categories or QBO products we're missing?**

Additional QBO products that might apply to projects:
- Website Development - Per Page
- Website Development - Custom Quote
- Website Infrastructure Upgrade
- Data Mapping & Information Architecture (IA)
- API/Integration Setup
- User Experience Enhancements
- Conversion Rate Optimization (CRO) Services

---

## Question 5: Free Project Credits

Our billing policy includes monthly free credits (Landing Pages, Multi Forms, Basic Forms). When a project uses a free credit, we currently generate a line like:
> "Homepage Redesign (Free Credit)" — Qty: 1, Amount: $0.00

**Should free project credits in the QBO export:**

- **Option A:** Map to the corresponding credit product (e.g., `Landing Page - Credit`, `Multi-Step Lead Form - Credit`, `Basic Lead Form - Credit`) with a negative amount offsetting the development charge?
- **Option B:** Be excluded from the QBO CSV entirely?
- **Option C:** Stay as a $0 line item?

QBO has these credit products available:
| QBO Product | Price |
|---|---|
| Landing Page - Credit | (negative) |
| Multi-Step Lead Form - Credit | (negative) |
| Basic Lead Form - Credit | -$250 |

---

## Question 6: Required CSV Columns

Based on QBO documentation, the import expects these columns:

| Column | Our Current Export | Status |
|---|---|---|
| InvoiceNo | InvoiceNo | Has it |
| Customer | Customer | Has it |
| InvoiceDate | InvoiceDate (MM/DD/YYYY) | Has it |
| DueDate | DueDate (MM/DD/YYYY) | Has it |
| **Item(Product/Service)** | **Missing** | **Needs to be added** |
| ItemDescription | ItemDescription | Has it |
| ItemQuantity | ItemQuantity | Has it |
| ItemRate | ItemRate | Has it |
| ItemAmount | ItemAmount | Has it |

**Are there any other columns QBO expects or that would be useful?** Possible additions:
- `Terms` (e.g., "Net 30")
- `ServiceDate` (date the service was performed)
- `Memo` (invoice-level notes)
- `TaxCode` or `Taxable` (all our services are non-taxable)

---

## Summary of Decisions Needed

1. **Support tiers:** Tier-specific products (p1/p2/p3) or generic (p1-p3)?
2. **Support credits:** Real negative amount, $0 line, or exclude?
3. **Hosting:** Per-site breakdown or single consolidated line?
4. **Project mapping:** Is the category-to-product table correct?
5. **Free project credits:** Negative credit lines, $0 lines, or exclude?
6. **Additional columns:** Any beyond the core 9 we already have?
