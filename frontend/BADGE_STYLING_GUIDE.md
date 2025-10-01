# Badge Styling Guide

## Overview
All badges in the application now use a centralized design system defined in `src/config/uiConstants.ts`.

## 📛 Badge Naming Convention & Terminology

### Visual Elements Reference
Based on the screenshot showing `53 Tickets` and `10h free`:

#### 1. **Count Badge**
Shows quantity/count (e.g., "53 Tickets", "5 Projects", "45 Sites")
- **Appearance**: Gray/slate background with ring border
- **Format**: `[number] [noun]`
- **Component**: `<CountBadge text="53 Tickets" />`
- **Style Constant**: `COUNT_BADGE_STYLE`

#### 2. **Credit Badge**
Shows free credits/benefits (e.g., "10h free", "1 Free Multi-Form", "2 free credits")
- **Appearance**: Light green background, no border, Zap (⚡) icon on left
- **Format**: `[number][unit] free` or `[number] Free [type]`
- **Component**: `<CreditBadge text="10h free" />`
- **Style Constant**: `CREDIT_BADGE_STYLE`

#### 3. **FREE Badge**
Compact indicator showing item is free (e.g., "FREE")
- **Appearance**: Light green background with Zap icon, very compact
- **Component**: `<FreeBadge />`
- **Style Constant**: `FREE_BADGE_STYLE`

#### 4. **Billing Type Badge**
Shows billing period (e.g., "Full Month", "Prorated Start", "Prorated End", "Inactive")
- **Appearance**: Colored backgrounds (green/blue/orange/slate) with ring border
- **Component**: `<BillingTypeBadge billingType="FULL" />`
- **Style Constant**: `BILLING_TYPE_BADGE_STYLES`

#### 5. **Status Badge** (Invoice Status)
Shows invoice status (e.g., "Ready", "Paid", "Invoiced", "Not Ready")
- **Appearance**: Colored backgrounds based on status with ring border
- **Component**: `<InvoiceStatusBadge status="READY" />`
- **Style Constant**: `INVOICE_STATUS_BADGE_STYLES`

#### 6. **Total Badge**
Prominent display for revenue totals (e.g., "$656.25")
- **Appearance**: Black background (white in dark mode), high contrast
- **Component**: Manual with `TOTAL_REVENUE_BADGE_STYLE` and `BADGE_BORDER_RADIUS`
- **Style Constant**: `TOTAL_REVENUE_BADGE_STYLE`

### Quick Reference Table

| Visual Example | Official Name | Component | Primary Use Case | Has Border? |
|----------------|---------------|-----------|------------------|-------------|
| `53 Tickets` | **Count Badge** | `CountBadge` | Showing quantities | Yes (ring) |
| `10h free` | **Credit Badge** | `CreditBadge` | Free hours/credits | No |
| `FREE` | **FREE Badge** | `FreeBadge` | Marking free items | No |
| `Full Month` | **Billing Type Badge** | `BillingTypeBadge` | Billing periods | Yes (ring) |
| `Ready` | **Status Badge** | `InvoiceStatusBadge` | Invoice status | Yes (ring) |
| `$656.25` | **Total Badge** | Manual | Revenue totals | No |

### When Communicating About Badges

**✅ Clear communication examples:**
- "Make the **count badges** squared off" → Refers to "53 Tickets", "5 Projects"
- "Change the **credit badges** to lighter green" → Refers to "10h free", "1 Free Multi-Form"
- "Update all **total badges** to use sharp edges" → Refers to "$656.25" revenue displays
- "The **FREE badge** needs more spacing" → Refers to small "FREE" indicators
- "Update **billing type badges**" → Refers to "Full Month", "Prorated Start"
- "Change **status badge** colors" → Refers to "Ready", "Paid", "Invoiced"

**❌ Ambiguous terms to avoid:**
- "The pills" (could mean any badge type)
- "The tags" (not specific enough)
- "The labels" (could mean text labels or badges)
- "The chips" (not used in this codebase)

### Icon Reference
- **Zap (⚡)**: Used in Credit Badges and FREE Badges to indicate benefits
- **Count icons**: Table/chart icons next to count badges (Ticket, FolderKanban, Server icons)

## Global Border Radius Control

### Single Source of Truth
```typescript
// src/config/uiConstants.ts
export const BADGE_BORDER_RADIUS = ''; // Empty string = sharp edges (0rem)
```

To change ALL badges to rounded pills, simply update this to:
```typescript
export const BADGE_BORDER_RADIUS = 'rounded-full';
```

## Badge Types

### 1. Standard Badges (via BillingBadge component)
These automatically use `BADGE_BORDER_RADIUS`:
- Billing type badges (Full Month, Prorated Start, etc.)
- Invoice status badges (Not Ready, Ready, Invoiced, Paid)
- Project category badges (Website, Landing Page, etc.)
- Credit badges (1 Free Multi-Form, X free hours, etc.)
- Count badges (5 sites, 3 tickets, etc.)
- FREE badges

**Usage**:
```tsx
import { BillingTypeBadge, CreditBadge, CountBadge } from './ui/BillingBadge';

<BillingTypeBadge billingType="FULL" />
<CreditBadge text="1 Free Multi-Form" />
<CountBadge text="5 sites" />
```

### 2. Total Revenue Badges
Use `TOTAL_REVENUE_BADGE_STYLE` and `BADGE_BORDER_RADIUS`:

```tsx
import { BADGE_BORDER_RADIUS, TOTAL_REVENUE_BADGE_STYLE } from '../config/uiConstants';

<span className={`inline-flex items-center px-3 py-1 text-sm font-medium ${BADGE_BORDER_RADIUS} ${TOTAL_REVENUE_BADGE_STYLE}`}>
  {formatCurrency(total)}
</span>
```

## Migration Checklist

### Migration Status

**✅ Completed:**
- [x] `src/components/BillingOverview.tsx` - All badges use centralized components
- [x] `src/components/MonthlyHostingCalculator.tsx` - All badges use centralized components
- [x] `src/components/HostingBilling.tsx` - Uses centralized formatting
- [x] `src/components/MonthlyRevenueTable.tsx` - Migrated to CountBadge, CreditBadge, FreeBadge, and TOTAL_REVENUE_BADGE_STYLE
- [x] `src/components/ProjectCard.tsx` - Migrated to InvoiceStatusBadge, ProjectCategoryBadge, and BADGE_BORDER_RADIUS

**⚠️ Remaining:**
- [ ] `src/components/Dashboard.tsx` (11 instances of rounded-full) - Support ticket dashboard badges

### How to Update

1. **Import the constants**:
```tsx
import { BADGE_BORDER_RADIUS, TOTAL_REVENUE_BADGE_STYLE } from '../config/uiConstants';
```

2. **Replace hardcoded rounded-full**:

**Before**:
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-black text-white">
  $656.25
</span>
```

**After**:
```tsx
<span className={`inline-flex items-center px-3 py-1 text-sm font-medium ${BADGE_BORDER_RADIUS} ${TOTAL_REVENUE_BADGE_STYLE}`}>
  $656.25
</span>
```

3. **For credit badges**:

**Before**:
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
  <Zap className="h-3 w-3 mr-1" />
  1 free credit
</span>
```

**After**:
```tsx
<CreditBadge text="1 free credit" size="xs" />
```

## Benefits

1. **Single Source of Truth**: Change border radius once, applies everywhere
2. **Consistency**: All badges look identical
3. **Maintainability**: Easy to update design system
4. **Type Safety**: Centralized constants prevent typos
5. **Scalability**: Add new badge styles in one place

## Current Design System

### Sharp Edges (Flat Design)
```typescript
BADGE_BORDER_RADIUS = ''; // or 'rounded-none'
```

### Rounded Pills (Material Design)
```typescript
BADGE_BORDER_RADIUS = 'rounded-full';
```

### Slightly Rounded (Hybrid)
```typescript
BADGE_BORDER_RADIUS = 'rounded-md'; // or 'rounded-lg'
```

## Testing

After updating files:
1. Run `npm run build` to check for TypeScript errors
2. Visually inspect all pages:
   - Dashboard (support tickets)
   - Projects
   - Hosting & Billing
   - Billing Overview
3. Test dark mode
4. Test responsive views

## Notes

- The `BillingBadge` component automatically applies `BADGE_BORDER_RADIUS`
- Credit and FREE badges don't use ring borders
- All other badges use `ring-1 ring-inset` for subtle borders
- Dark mode colors are automatically handled via Tailwind classes