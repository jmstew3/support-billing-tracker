# Badge Quick Reference Guide

## 📛 Six Badge Types

### 1. Count Badge
```
┌─────────────────┐
│  53 Tickets     │  ← Gray background, ring border
└─────────────────┘
```
- **Name**: Count Badge
- **Component**: `<CountBadge text="53 Tickets" />`
- **Style**: `COUNT_BADGE_STYLE`

---

### 2. Credit Badge
```
┌─────────────────┐
│ ⚡ 10h free     │  ← Light green, no border, has Zap icon
└─────────────────┘
```
- **Name**: Credit Badge
- **Component**: `<CreditBadge text="10h free" />`
- **Style**: `CREDIT_BADGE_STYLE`

---

### 3. FREE Badge
```
┌──────────┐
│ ⚡ FREE  │  ← Compact green badge with Zap icon
└──────────┘
```
- **Name**: FREE Badge
- **Component**: `<FreeBadge />`
- **Style**: `FREE_BADGE_STYLE`

---

### 4. Billing Type Badge
```
┌─────────────────────┐
│  Prorated Start     │  ← Blue background, ring border
└─────────────────────┘

┌─────────────────────┐
│  Full Month         │  ← Green background, ring border
└─────────────────────┘
```
- **Name**: Billing Type Badge
- **Component**: `<BillingTypeBadge billingType="FULL" />`
- **Style**: `BILLING_TYPE_BADGE_STYLES`
- **Values**: FULL, PRORATED_START, PRORATED_END, INACTIVE

---

### 5. Status Badge (Invoice Status)
```
┌────────────┐
│   Ready    │  ← Blue background, ring border
└────────────┘

┌────────────┐
│   Paid     │  ← Green background, ring border
└────────────┘
```
- **Name**: Status Badge
- **Component**: `<InvoiceStatusBadge status="READY" />`
- **Style**: `INVOICE_STATUS_BADGE_STYLES`
- **Values**: NOT_READY, READY, INVOICED, PAID

---

### 6. Total Badge
```
┌────────────┐
│  $656.25   │  ← Black background, white text (inverted in dark mode)
└────────────┘
```
- **Name**: Total Badge
- **Component**: Manual (use `TOTAL_REVENUE_BADGE_STYLE` + `BADGE_BORDER_RADIUS`)
- **Style**: `TOTAL_REVENUE_BADGE_STYLE`

---

## 🎨 Design System

All badges respect the global `BADGE_BORDER_RADIUS` setting:

| Setting | Appearance | Use Case |
|---------|------------|----------|
| `''` (empty) | Sharp, squared-off edges | Flat design (current) |
| `'rounded-md'` | Slightly rounded corners | Hybrid design |
| `'rounded-full'` | Pill-shaped | Material design |

**Change once, applies everywhere!**

---

## 🗣️ Communication Guide

When requesting changes, use these exact terms:

| Your Request | What It Means |
|--------------|---------------|
| "Update the **count badges**" | "53 Tickets", "5 Projects" |
| "Style the **credit badges**" | "10h free", "1 Free Multi-Form" |
| "Change the **FREE badge**" | Small "FREE" indicators |
| "Fix **billing type badges**" | "Full Month", "Prorated Start" |
| "Update **status badges**" | "Ready", "Paid", "Invoiced" |
| "Modify **total badges**" | "$656.25" revenue displays |

---

## 📂 File Locations

- **Config**: `src/config/uiConstants.ts`
- **Component**: `src/components/ui/BillingBadge.tsx`
- **Documentation**: `BADGE_STYLING_GUIDE.md` (detailed guide)
