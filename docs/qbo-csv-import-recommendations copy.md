# QBO CSV Import — Recommendations

**Date:** 2026-03-05
**Context:** Mapping our billing tracker CSV export to QuickBooks Online invoice import format.

---

## Question 1: Support Hours — Use Tier-Specific Products (p1 / p2 / p3)

**Recommendation: Tier-specific products.**

The rates are different across tiers ($250 / $175 / $150), so mapping everything to the generic `p1-p3 - Support Hours` at $150 would produce incorrect amounts for emergency and urgent lines. QBO validates `ItemRate` against the product's default price — mismatches won't fail the import, but they'll show as overrides which can be confusing during reconciliation.

| Our Line Item | QBO Product | Rate |
|---|---|---|
| Emergency Support Hours | p1 - Emergency Support | $250/hr |
| Same Day Support Hours | p2 - Urgent Support | $175/hr |
| Regular Support Hours | p3 - Standard Support | $150/hr |

This also gives you tier-level revenue reporting in QBO for free — you can pull a Sales by Product report and see exactly how much revenue comes from each urgency level without any manual tagging.

**Devil's advocate:** The generic product *would* work if you overrode the rate on each line — QBO allows it. But then you'd have a product called "p1-p3 - Support Hours" priced at $150 showing up with $250 line items, which is messy for anyone reviewing the books. Tier-specific is cleaner.

---

## Question 2: Support Credits — Option A, But Watch the Negative Amount Constraint

**Recommendation: Option A (real negative line item) — but test the import first.**

Showing the credit as an actual `-$1,500` line mapped to `Support Credits` makes the invoice math transparent: the client sees the full value of work done *and* the credit offsetting it. This is the correct accounting treatment — recognizing the credit as a contractual discount rather than just hiding 10 hours of work.

**However, there's a QBO import constraint:** QBO's native CSV import does not officially support negative `ItemAmount` values. The import may reject rows with negative amounts. There is a community-reported workaround — using positive `ItemQuantity` and `ItemRate` but a negative `ItemAmount` — but it's not officially supported and could break in future QBO updates.

**Practical approach:**

1. Try importing a test invoice with a negative `ItemAmount` for the `Support Credits` product.
2. If it works → use Option A.
3. If QBO rejects it → fall back to **Option C** ($0 informational line) in the CSV, and have the bookkeeper manually add the credit line in QBO post-import. Or consider a third-party import tool like SaasAnt which handles negative amounts.

**On the rate-mix question:** Keep the credit at a flat $1,500 (10 × $150 standard rate) regardless of actual tier usage. The credit is a contractual benefit ("10 free hours"), not a reimbursement. Varying it by tier mix introduces complexity with no real upside — the credit amount is fixed in the contract, so it should be fixed on the invoice.

---

## Question 3: Hosting — Option A (Per-Site Breakdown)

**Recommendation: Per-site line items mapped to the appropriate QBO product.**

You already have the data in `hosting_detail_snapshot`, and QBO already has the products set up for each scenario. A consolidated single line throws away information that you went to the trouble of creating products for. Per-site lines give you:

- Accurate revenue recognition per site (especially for prorated starts/ends)
- Clean audit trail when a client questions a hosting charge
- Volume discount visibility as its own negative line
- Per-site reporting in QBO's Sales by Product reports

**Proposed line structure for one invoice:**

| Line | QBO Product | Qty | Rate | Amount |
|---|---|---|---|---|
| Site: ap3-ppf.com (full month) | PeakOne Website Hosting - Turbo (T2) - Per Site | 1 | $99 | $99 |
| Site: ae-ppf.com (full month) | PeakOne Website Hosting - Turbo (T2) - Per Site | 1 | $99 | $99 |
| Site: freedomk9academy.com (started 2/15) | PeakOne Website Hosting - Turbo (T2) - Per Site - Prorated Start | 1 | $49.50 | $49.50 |
| Site: oldsite.com (removed 2/10) | PeakOne Website Hosting - Turbo (T2) - Per Site - Prorated End | 1 | $33.00 | $33.00 |
| Volume discount (1 free per 20 sites) | PeakOne Website Hosting - Turbo (T2) - Volume Discount | 1 | -$99 | -$99 |

**Same negative-amount caveat from Q2 applies** to the Volume Discount and CREDIT products. Test the import with negative lines first.

**Devil's advocate:** Per-site lines will increase row count significantly. If a client has 20 sites, that's 20+ rows on one invoice. QBO has a 1,000 row limit per CSV import file. For most months this won't be an issue, but keep it in mind if you're batching many invoices in one import. Also, clients will see a longer invoice — confirm that's acceptable from a client-facing perspective, or use the `ItemDescription` to keep each line concise.

---

## Question 4: Project Mapping — Mostly Correct, But Tighten the Fallback

**Recommendation: The proposed mapping is correct for those 4 categories. Refine the fallback.**

| Our Category | QBO Product | ✓/✗ |
|---|---|---|
| Landing_Page | Landing Page Development | ✓ |
| Multi_Form | Multi-Step Lead Form Implementation | ✓ |
| Basic_Form | Basic Lead Form Implementation | ✓ |
| Migration | Website Migration Services | ✓ |
| *(no category / other)* | Custom Development | ⚠️ see below |

**The "Custom Development" fallback is too broad.** If you're dumping everything uncategorized into one product, you lose the ability to report on what those projects actually were. Consider adding mappings for the additional QBO products you listed:

| Our Category (proposed) | QBO Product |
|---|---|
| Page_Build | Website Development - Per Page |
| Custom_Quote | Website Development - Custom Quote |
| Infrastructure | Website Infrastructure Upgrade |
| IA_Data_Mapping | Data Mapping & Information Architecture (IA) |
| API_Integration | API/Integration Setup |
| UX_Enhancement | User Experience Enhancements |
| CRO | Conversion Rate Optimization (CRO) Services |

If you don't want to add those categories to your billing tracker right now, at least use `Custom Development` as the fallback *and* log which invoices use it, so you can periodically review whether new categories need to be created.

**Missing categories to consider:** Does your billing tracker handle one-off consulting, training, or audit-type projects? If so, those might need their own QBO products eventually.

---

## Question 5: Free Project Credits — Option A (Negative Credit Lines)

**Recommendation: Option A — show the development charge at full price, then a separate credit line at negative amount.**

This is the same reasoning as Q2. The client should see: "We built your landing page ($1,200), and here's your monthly free credit offsetting it (-$1,200)." This makes the value of the free credit visible, which is good for client retention messaging and accurate for revenue reporting.

**Example:**

| Line | QBO Product | Qty | Rate | Amount |
|---|---|---|---|---|
| Homepage Redesign | Landing Page Development | 1 | $1,200 | $1,200 |
| Free Landing Page Credit (March) | Landing Page - Credit | 1 | -$1,200 | -$1,200 |

**Same QBO negative-amount import caveat.** If QBO's native CSV import rejects negative `ItemAmount`, fall back to Option C ($0 line) with a descriptive `ItemDescription`, and handle the credit manually or via third-party tool.

**Devil's advocate on Option B (exclude entirely):** Excluding free credits makes invoices simpler but clients never see the value they're getting for free. If the goal is retention and demonstrating value, showing the credit is worth the extra line.

---

## Question 6: CSV Columns — Add Terms, ServiceDate, and Taxable

**Recommendation: Add 3 optional columns.**

Here's the complete column list for your export:

| Column | Required? | Your Status | Notes |
|---|---|---|---|
| InvoiceNo | Yes | ✅ Has it | |
| Customer | Yes | ✅ Has it | Must match QBO customer name exactly |
| InvoiceDate | Yes | ✅ Has it | MM/DD/YYYY format |
| DueDate | Yes | ✅ Has it | MM/DD/YYYY format |
| Terms | Optional | ⬜ **Add** | e.g., "Net 30" — avoids having to set it manually post-import |
| Item(Product/Service) | Yes | ⬜ **Add** | Must match QBO product name exactly |
| ItemDescription | Optional | ✅ Has it | Free-text description per line |
| ItemQuantity | Yes | ✅ Has it | |
| ItemRate | Yes | ✅ Has it | |
| ItemAmount | Yes | ✅ Has it | Qty × Rate; QBO may validate this |
| ServiceDate | Optional | ⬜ **Add** | Useful for support hours — the month the service was performed |
| Taxable | Optional | ⬜ **Add** | Set to "N" or "No" for all lines since your services are non-taxable. Prevents QBO from applying default tax rules. |

**On `Memo`:** Only add it if you want invoice-level notes visible to the client or in QBO's records. It's not critical for import accuracy.

**On `ServiceDate`:** This is particularly useful for your use case. Support hours and hosting are recurring services — stamping each line with the service month (e.g., "03/01/2026") helps with accrual-basis reporting and makes it easy to filter in QBO by service period vs. invoice date.

**Important import constraints to keep in mind:**
- Max 100 invoices per import, 1,000 rows per CSV file
- Customer names must match QBO records exactly (including punctuation, spacing, suffixes)
- Product/Service names must match existing QBO products exactly
- Dates must be MM/DD/YYYY

---

## Summary of Recommendations

| # | Decision | Recommendation |
|---|---|---|
| 1 | Support tiers | **Tier-specific** (p1/p2/p3) — rates differ, reporting is better |
| 2 | Support credits | **Real negative amount (Option A)** — but test QBO import first; fall back to $0 line if negatives are rejected |
| 3 | Hosting | **Per-site breakdown (Option A)** — data already exists, use it |
| 4 | Project mapping | **Proposed mapping is correct** — tighten the fallback, consider adding more categories |
| 5 | Free project credits | **Negative credit lines (Option A)** — same caveat as Q2 on negative amounts |
| 6 | Additional columns | **Add Terms, ServiceDate, and Taxable** |

### Critical Action Item: Test Negative Amounts First

Questions 2, 3 (volume discount), and 5 all depend on QBO accepting negative `ItemAmount` values in CSV imports. **QBO's native importer does not officially support negative line items.** Before building out the full export logic:

1. Create a test CSV with 1 invoice containing a negative line
2. Try importing it through QBO's native import (Gear → Import Data → Invoices)
3. If it fails, decide whether to: use a third-party tool (SaasAnt, etc.), handle credits manually post-import, or use $0 informational lines as fallback

This one test will determine the approach for roughly half of the design decisions above.

---

## Sources

- [QuickBooks Community: Importing CSV invoices format](https://quickbooks.intuit.com/learn-support/en-us/other-questions/importing-csv-invoices-format-of/00/1504441)
- [QuickBooks Community: How to import invoices with negative values](https://quickbooks.intuit.com/learn-support/en-us/do-more-with-quickbooks/how-to-import-invoices-with-negative-values-in-the-line-items/00/981519)
- [QuickBooks Community: Negative line items on invoices](https://quickbooks.intuit.com/learn-support/en-us/reports-and-accounting/is-it-fine-to-add-a-negative-line-item-to-a-new-invoice-for-a/00/727091)
- [Coefficient: Import invoices into QuickBooks step-by-step](https://coefficient.io/import-invoices-into-quickbooks)
