# Invoicing System Reference

How the Support Billing Tracker invoice system aligns with QuickBooks Online workflows.

## System Comparison

| Aspect | Support Billing Tracker | QuickBooks Online |
|--------|------------------------|-------------------|
| **Purpose** | Generate invoices from support tickets | Accounting, payments, taxes |
| **Data Source** | FluentSupport tickets, iMessages | Manual entry or imports |
| **Billing Calculation** | Auto-calculates hours, free credits, rates | Manual line items |
| **Customer Payments** | Tracking only (status) | Actual payment processing |
| **Financial Reports** | Billing summary | P&L, Balance Sheet, Tax reports |

## Workflow Comparison

### Before (Manual Process)
```
1. Review FluentSupport tickets manually
2. Calculate hours in spreadsheet
3. Apply free credits (10h/month)
4. Create invoice in QBO from scratch
5. Send from QBO
```

### With This System
```
1. Tickets auto-sync from FluentSupport
2. Click "Generate Invoice" → auto-calculates everything
3. Export CSV/JSON
4. Import to QBO (or manually create with data)
5. Send from QBO (payments, reminders, etc.)
```

## Responsibilities by System

### What Stays in QuickBooks Online
- **Payment processing** - Customer pays through QBO
- **Bank reconciliation** - Match deposits
- **Tax reporting** - Sales tax, 1099s
- **Accounting** - Chart of accounts, P&L
- **Official invoices** - The "legal" invoice sent to customer

### What Support Billing Tracker Handles
- **Ticket-to-invoice conversion** - The hard part
- **Free credit calculation** - 10h Turbo Support automatically applied
- **Rate application** - Regular $150, Same Day $175, Emergency $250
- **Audit trail** - Which tickets are on which invoice
- **Draft review** - Before committing to QBO

## Invoice Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Draft  │ ──► │  Sent   │ ──► │  Paid   │
└─────────┘     └─────────┘     └─────────┘
     │               │               │
     │               │               │
  Review &      Export to        Mark paid
  Edit items    QBO / Send       when QBO
                                 confirms
```

### Status Definitions
- **Draft** - Invoice generated, can edit/delete
- **Sent** - Marked as sent to customer, cannot delete
- **Paid** - Payment recorded, balance = $0
- **Overdue** - Past due date, unpaid (future: auto-detect)
- **Cancelled** - Voided invoice

## Billing Rates

| Rate Type | Hourly Rate | Trigger |
|-----------|-------------|---------|
| Regular | $150/hr | Standard support |
| Same Day | $175/hr | Same-day requests |
| Emergency | $250/hr | HIGH urgency tickets |

## Free Credits (Turbo Support)

Applied automatically each billing period:
- **10 hours** free support per month
- **1 free landing page** per month
- **1 free multi-form** per month
- **5 free basic forms** per month

Free hours are deducted before billable hours are calculated.

## Export Options

### CSV Export
Best for manual QBO import or spreadsheet review.

```csv
Description,Quantity,Rate,Amount
Emergency Support Hours,1.50,250.00,375.00
```

### JSON Export
Best for automation or API integration.

```json
{
  "invoice_number": "VEL-2026-001",
  "customer": "Velocity",
  "total": "375.00",
  "items": [...]
}
```

## QuickBooks Online Integration

### Current State (Export-Ready)
- CSV/JSON export available
- Manual creation in QBO with pre-calculated data
- Status tracking in Support Billing Tracker

### Database Fields (Ready for API)
```sql
qbo_customer_id VARCHAR(100)   -- Link to QBO customer
qbo_invoice_id VARCHAR(100)    -- Link to QBO invoice
qbo_sync_status ENUM('pending', 'synced', 'error', 'not_applicable')
qbo_sync_date TIMESTAMP
qbo_sync_error TEXT
```

### Future Integration (Planned)
1. OAuth2 connection to QBO
2. "Sync to QuickBooks" button
3. Auto-create invoice in QBO
4. Payment status syncs back
5. Customer matching/creation

## Invoice Number Format

```
VEL-YYYY-NNN

VEL     = Customer prefix (Velocity)
YYYY    = Year
NNN     = Sequential number (001, 002, etc.)

Example: VEL-2026-001
```

## Linked Requests

Each invoice links to the source support requests:
- Request ID
- Date and time
- Description
- Category
- Urgency level
- Hours estimated

This provides a full audit trail from ticket to invoice.

## Quick Reference

### Generate Invoice
1. Navigate to **Invoices** page
2. Click **Generate Invoice**
3. Select customer and billing period
4. Review billing summary
5. Click **Generate Invoice**

### Mark as Sent
1. From invoice list, click **Mark as sent** icon
2. Or from detail view, click **Mark as Sent** button
3. Confirm in dialog

### Record Payment
1. Open invoice detail (must be in Sent status)
2. Click **Record Payment**
3. Enter amount (pre-filled with balance)
4. Select payment date
5. Click **Submit Payment**

### Export Invoice
1. Open invoice detail
2. Click **CSV** or **JSON** button
3. File downloads automatically
