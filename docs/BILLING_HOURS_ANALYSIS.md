# Billing Hours Tracking - Complete Analysis

## 1. Data Storage

In the `requests` table (`backend/db/schema.sql`):
- **`estimated_hours`** — `DECIMAL(5,2)`, default `0.50`
- **`urgency`** — `ENUM('LOW', 'MEDIUM', 'HIGH', 'PROMOTION')` determines the hourly rate
- **`date` / `time`** — used for chronological ordering (matters for free hour allocation)
- **`billing_date`** — optional override for which billing period a request falls into
- **`status`** — only `'active'` requests are billable (soft delete via `'deleted'`/`'ignored'`)
- **`category`** — `'Non-billable'` and `'Migration'` categories are excluded from cost calculations

## 2. Pricing Tiers (`frontend/src/config/pricing.ts`)

| Urgency | Rate | Use Case |
|---------|------|----------|
| PROMOTION | $125/hr | Special/promotional work |
| LOW | $150/hr | Standard turnaround |
| MEDIUM | $175/hr | Same-day service |
| HIGH | $250/hr | Emergency |

## 3. Free Hours Policy

Starting **June 2025**, 10 free support hours are credited per month. The allocation strategy:

1. Requests within a month are **sorted chronologically** (date, then time)
2. Free hours are consumed **from the earliest requests first**
3. Partial consumption is supported (a 3h request can use the last 1.5h of the free pool)
4. Savings are tracked **per urgency category** — so free hours applied to emergency work save more ($250/hr) than regular work ($150/hr)
5. The pool resets each month (no rollover)

### Free Hours Example

```
Month: June 2025, Free Hours Available: 10h

Request 1: June 1, 8:00 AM → 2h LOW urgency
  Free Hours Applied: 2h
  Cost: $0 (2h × $150 = $300 saved)

Request 2: June 1, 10:00 AM → 3h HIGH urgency
  Free Hours Applied: 3h
  Cost: $0 (3h × $250 = $750 saved)

Request 3: June 2, 9:00 AM → 5h MEDIUM urgency
  Free Hours Applied: 5h (2+3+5=10, pool exhausted)
  Cost: $0 (5h × $175 = $875 saved)

Request 4: June 2, 2:00 PM → 1h LOW urgency
  Free Hours Applied: 0h
  Cost: $150 (1h × $150)
```

## 4. Cost Calculation Flow (`frontend/src/utils/dataProcessing.ts` — `calculateCosts`)

```
1. Group active requests by urgency level
2. Sum hours per category → gross cost
3. If month >= June 2025:
   a. Sort requests chronologically
   b. Walk through requests, consuming from 10h free pool
   c. Track per-category free hours and savings
4. Return: gross cost, free hours applied, net cost (per-category and total)
```

### Output Structure

```typescript
{
  regularHours, sameDayHours, emergencyHours, promotionalHours,
  regularCost, sameDayCost, emergencyCost, promotionalCost,
  totalCost,          // gross (before free hours)
  netTotalCost,       // after free hours
  grossTotalCost,
  freeHoursApplied,
  freeHoursSavings,
  // Per-category net costs:
  regularNetCost, sameDayNetCost, emergencyNetCost, promotionalNetCost,
  // Per-category free hours:
  regularFreeHours, sameDayFreeHours, emergencyFreeHours, promotionalFreeHours
}
```

## 5. API & Data Flow

```
MySQL (requests table)
  → GET /api/requests (backend/routes/requests.js)
    → useSupportData hook (fetches & filters)
      → useSupportMetrics hook (calls calculateCosts, groups by month)
        → CostTrackerCard (renders table or chart)
```

### Key Backend Endpoints

- **`GET /api/requests`** — paginated request list
- **`PUT /api/requests/:id`** — edit hours, urgency, category, billing_date
- **`POST /api/requests/bulk-update`** — batch updates

### Validation Rules

- Hours must be numeric, >= 0, <= 99.99
- Urgency must be LOW, MEDIUM, HIGH, or PROMOTION
- Updates trigger immediate recalculation of costs

## 6. Frontend Display (`CostTrackerCard`)

Located in `frontend/src/features/support/components/CostTracker/`. It shows:

- **Table view**: Rows per urgency tier with rate, hours, and cost; a "Free Support Hours" deduction row; and a net total
- **Chart view**: Stacked bar chart by urgency across months, with dual Y-axes (cost + hours)
- **Free hours badge**: Shows when credits are in effect

### Single Period Table Example

```
Service Type | Rate    | Hours  | Cost
─────────────┼─────────┼────────┼──────
Promotion    | $125/hr | 1.00h  | $125
Low          | $150/hr | 2.50h  | $375
Medium       | $175/hr | 3.25h  | $569
High         | $250/hr | 1.50h  | $375
─────────────┼─────────┼────────┼──────
Free Support Hours | - | 8h     | -$1,344
─────────────┼─────────┼────────┼──────
Net Total    | -       | 8.25h  | $100
```

## 7. Invoicing Integration (`backend/services/invoiceService.js`)

The `calculateBilling` function mirrors the frontend logic for server-side invoice generation:

- Applies the same 10h/month free credit
- Groups line items by urgency for QuickBooks export
- Invoice format: `VEL-YYYY-NNN`

## 8. Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   iMessage DB   │───▶│  ETL Pipeline   │───▶│    MySQL DB     │
│  FluentSupport  │    │  (Python)       │    │  requests table │
└─────────────────┘    └─────────────────┘    └────────┬────────┘
                                                       │
                       ┌─────────────────┐    ┌────────▼────────┐
                       │  React Frontend │◀───│  Node.js API    │
                       │  CostTracker    │    │  /api/requests  │
                       └─────────────────┘    └─────────────────┘
```

## 9. Key Files Reference

| Layer | File | Purpose |
|-------|------|---------|
| Schema | `backend/db/schema.sql` | `requests` table with `estimated_hours`, `urgency` |
| Config | `frontend/src/config/pricing.ts` | Rates, free hours policy |
| Calculation | `frontend/src/utils/dataProcessing.ts` | `calculateCosts()` |
| Billing API | `frontend/src/services/billingApi.ts` | `generateComprehensiveBilling()` |
| Metrics | `frontend/src/features/support/hooks/useSupportMetrics.ts` | Monthly aggregation |
| Display | `frontend/src/features/support/components/CostTracker/` | Table + chart rendering |
| Invoicing | `backend/services/invoiceService.js` | Server-side billing + QBO export |

## 10. Design Principles

- **Hours are stored per-request** — each support request has its own `estimated_hours` value
- **Pricing is urgency-driven** — the urgency field determines which rate tier applies
- **Free credits are allocated chronologically** — earliest work each month gets credited first
- **Soft deletion** — requests use `active`/`deleted`/`ignored` status, never permanently removed
- **Dual calculation** — frontend (`dataProcessing.ts`) and backend (`invoiceService.js`) both implement cost calculation for display and invoicing respectively
