# Application Structure - Component Hierarchy

This document provides a visual breakdown of the 4 main pages in the Thad Chat Request Analysis Dashboard and their component dependencies.

## Navigation Mapping

| Route ID | Component File | Sidebar Label | Icon | Purpose |
|----------|---------------|---------------|------|---------|
| `'overview'` | `Dashboard.tsx` | Dashboard | BarChart3 | Billing Overview (Main Landing Page) |
| `'home'` | `SupportTickets.tsx` | Support | Ticket | Support Ticket Tracking |
| `'projects'` | `Projects.tsx` | Projects | FolderKanban | Project Revenue Tracking |
| `'billing'` | `TurboHosting.tsx` | Turbo Hosting | Zap | Hosting MRR Tracking |

---

## 📊 Dashboard (Billing Overview)

**File**: `frontend/src/components/Dashboard.tsx`
**Purpose**: Comprehensive billing rollup combining all revenue sources

```
Dashboard.tsx
├── PageHeader.tsx
│   ├── PeriodSelector.tsx
│   └── ViewModeToggle.tsx (optional)
├── ui/Scorecard.tsx (×4)
│   └── Total Revenue, Support Tickets, Projects, Hosting MRR
├── ui/LoadingState.tsx (conditional)
├── Recharts (BarChart)
│   ├── Bar
│   ├── XAxis
│   ├── YAxis
│   ├── CartesianGrid
│   ├── Tooltip
│   ├── Legend
│   ├── ResponsiveContainer
│   └── LabelList
├── Recharts (PieChart)
│   ├── Pie
│   └── Cell
└── Monthly Breakdown Tables (nested, collapsible)
    ├── Support Tickets Section
    │   ├── ui/BillingBadge.tsx (CountBadge)
    │   └── ui/BillingBadge.tsx (CreditBadge)
    ├── Projects Section
    │   ├── ui/SiteFavicon.tsx
    │   ├── ui/BillingBadge.tsx (CountBadge)
    │   └── ui/BillingBadge.tsx (CreditBadge)
    └── Hosting Section
        ├── ui/SiteFavicon.tsx
        ├── ui/BillingBadge.tsx (BillingTypeBadge)
        └── ui/BillingBadge.tsx (CountBadge)
```

**Services Used**: `billingApi.ts` → `generateComprehensiveBilling()`

---

## 🎫 SupportTickets (Support)

**File**: `frontend/src/components/SupportTickets.tsx`
**Purpose**: Support ticket tracking and analysis from iMessage/Twenty CRM

```
SupportTickets.tsx
├── ui/card.tsx
│   ├── Card (×2 for Request Categories + Billable Requests table)
│   ├── CardHeader
│   ├── CardTitle
│   ├── CardDescription
│   └── CardContent
├── ui/Scorecard.tsx (×5)
│   └── Total Requests, Revenue, Hours, Avg Rate, Cost
├── ui/ThemeToggle.tsx
├── ui/LoadingState.tsx (conditional)
├── RequestCalendarHeatmap.tsx
├── CostTrackerCard.tsx (reusable cost tracker component)
│   ├── ui/card.tsx
│   ├── ui/toggle-group.tsx (Table/Chart toggle)
│   ├── Recharts (BarChart/ComposedChart)
│   │   ├── Bar
│   │   ├── XAxis
│   │   ├── YAxis
│   │   ├── CartesianGrid
│   │   ├── Tooltip
│   │   ├── Legend
│   │   ├── ResponsiveContainer
│   │   └── LabelList
│   └── formatCurrency utilities
├── CategoryRadarChart.tsx
├── CategoryPieChart.tsx
├── ui/toggle-group.tsx (Pie/Radar toggle)
├── DatePickerPopover.tsx
├── ui/table.tsx (for Billable Requests table only)
│   ├── Table
│   ├── TableHeader
│   ├── TableHead
│   ├── TableBody
│   ├── TableRow
│   └── TableCell
│       ├── EditableCell.tsx (for category/urgency)
│       └── EditableNumberCell.tsx (for hours)
├── ui/tooltip.tsx
│   ├── Tooltip
│   ├── TooltipTrigger
│   ├── TooltipProvider
│   └── TooltipContent
├── Pagination.tsx
└── ConfirmDialog.tsx
```

**Services Used**:
- `api.ts` → `fetchRequests()`, `updateRequest()`, `bulkUpdateRequests()`, `deleteRequest()`, `checkAPIHealth()`
- `dataProcessing.ts` → `processDailyRequests()`, `processCategoryData()`, `calculateCosts()`, `categorizeRequest()`

---

## 📁 Projects

**File**: `frontend/src/components/Projects.tsx`
**Purpose**: Project revenue tracking for QuickBooks reconciliation

```
Projects.tsx
├── ui/Scorecard.tsx (×3)
│   └── Total Revenue, Project Count, Average Revenue
├── ui/LoadingState.tsx (conditional)
├── MonthlyRevenueTable.tsx
│   ├── ui/SiteFavicon.tsx
│   ├── ui/BillingBadge.tsx
│   │   ├── CountBadge
│   │   └── CreditBadge
│   └── Collapsible UI (ChevronDown/Up icons)
├── CumulativeBillingChart.tsx
│   └── Recharts (Line Chart)
└── ProjectCategoryPieChart.tsx
    └── Recharts (Pie Chart)
```

**Services Used**: `projectsApi.ts` → `fetchProjects()`, `formatCurrency()`, `convertMicrosToDollars()`

---

## ⚡ TurboHosting (Turbo Hosting)

**File**: `frontend/src/components/TurboHosting.tsx`
**Purpose**: Website hosting monthly recurring revenue (MRR) tracking

```
TurboHosting.tsx
├── ui/Scorecard.tsx (×3)
│   └── Active Sites, Gross MRR, Net MRR
├── ui/LoadingState.tsx (conditional)
├── MonthlyHostingCalculator.tsx
│   ├── ui/SiteFavicon.tsx
│   ├── ui/BillingBadge.tsx
│   │   ├── BillingTypeBadge
│   │   ├── CountBadge
│   │   └── CreditBadge
│   └── Collapsible UI (ChevronDown/Up icons)
├── CumulativeBillingChart.tsx
│   └── Recharts (Line Chart for MRR growth)
└── HostingTypeChart.tsx
    └── Recharts (Pie Chart for site types)
```

**Services Used**: `hostingApi.ts` → `fetchWebsiteProperties()`, `generateMonthlyBreakdown()`, `calculateCreditProgress()`

---

## Shared Components Matrix

| Component File | Dashboard | Support | Projects | Turbo Hosting |
|---|:---:|:---:|:---:|:---:|
| `ui/Scorecard.tsx` | ✅ | ✅ | ✅ | ✅ |
| `ui/LoadingState.tsx` | ✅ | ✅ | ✅ | ✅ |
| `ui/SiteFavicon.tsx` | ✅ | ❌ | ✅ | ✅ |
| `ui/BillingBadge.tsx` | ✅ | ❌ | ✅ | ✅ |
| `CumulativeBillingChart.tsx` | ❌ | ❌ | ✅ | ✅ |
| Recharts Library | ✅ | ✅ | ✅ | ✅ |
| `PageHeader.tsx` | ✅ | ❌ | ❌ | ❌ |
| `ui/card.tsx` | ❌ | ✅ | ❌ | ❌ |
| `ui/table.tsx` | ❌ | ✅ | ❌ | ❌ |

---

## Component Categories by Location

### Core Page Components
**Location**: `frontend/src/components/`

- `Dashboard.tsx` - Billing Overview (main landing page)
- `SupportTickets.tsx` - Support ticket tracking
- `Projects.tsx` - Project revenue tracking
- `TurboHosting.tsx` - Turbo Hosting MRR tracking

### Layout Components
**Location**: `frontend/src/components/`

- `PageHeader.tsx` - Page header with title and controls
- `PeriodSelector.tsx` - Month/year selection dropdown
- `ViewModeToggle.tsx` - View mode toggle buttons
- `Sidebar.tsx` - App-level navigation sidebar

### Chart Components
**Location**: `frontend/src/components/`

- `RequestCalendarHeatmap.tsx` - Calendar heatmap for requests
- `CategoryRadarChart.tsx` - Multi-dimensional category analysis
- `CategoryPieChart.tsx` - Category distribution pie chart
- `CumulativeBillingChart.tsx` - Revenue growth line chart
- `HostingTypeChart.tsx` - Hosting type distribution pie chart
- `ProjectCategoryPieChart.tsx` - Project category pie chart

### Table Components
**Location**: `frontend/src/components/`

- `CostTrackerCard.tsx` - Reusable support ticket cost tracker with table/chart toggle
- `MonthlyRevenueTable.tsx` - Projects monthly breakdown table
- `MonthlyHostingCalculator.tsx` - Hosting monthly breakdown table

### Interactive Components
**Location**: `frontend/src/components/`

- `EditableCell.tsx` - In-line cell editing (text)
- `EditableNumberCell.tsx` - In-line cell editing (numbers)
- `DatePickerPopover.tsx` - Date selection popover
- `ConfirmDialog.tsx` - Confirmation dialog for bulk actions
- `Pagination.tsx` - Table pagination controls

### UI Components
**Location**: `frontend/src/components/ui/`

- `Scorecard.tsx` - Metric display card
- `LoadingState.tsx` - Skeleton loading animations
- `SiteFavicon.tsx` - Website favicon display
- `BillingBadge.tsx` - Badge components (Count, Credit, BillingType)
- `ThemeToggle.tsx` - Dark/light mode toggle
- `card.tsx` - Card container components
- `table.tsx` - Table primitive components
- `tooltip.tsx` - Tooltip components
- `toggle-group.tsx` - Toggle group component

### External Libraries

**Recharts** (Data Visualization):
- `BarChart`, `Bar`
- `PieChart`, `Pie`, `Cell`
- `ComposedChart`, `Line`
- `XAxis`, `YAxis`
- `CartesianGrid`
- `Tooltip`, `Legend`
- `ResponsiveContainer`
- `LabelList`

**Lucide React** (Icons):
- `DollarSign`, `Clock`, `AlertCircle`
- `Download`, `ChevronDown`, `ChevronUp`, `ChevronLeft`, `ChevronRight`
- `ArrowUpDown`, `ArrowUp`, `ArrowDown`
- `Filter`, `Search`, `X`
- `Trash2`, `RotateCcw`, `Archive`
- `Calendar`, `TrendingUp`, `BarChart3`, `Tag`
- `MessageCircle`, `Ticket`, `Mail`, `Phone`
- `Server`, `Gift`, `Zap`
- `FolderKanban`, `Menu`, `Info`, `Eye`, `EyeOff`

---

## Data Flow Overview

### Dashboard (Billing Overview)
- **Service**: `billingApi.ts`
- **Main Function**: `generateComprehensiveBilling()`
- **Data Sources**:
  - Support tickets from Twenty CRM + CSV
  - Projects from Twenty CRM (READY status)
  - Hosting from Twenty CRM website properties
- **Type**: `billing.ts` → `BillingSummary`, `MonthlyBillingSummary`

### SupportTickets (Support)
- **Services**: `api.ts`, `dataProcessing.ts`
- **Main Functions**:
  - `fetchRequests()` - Fetch tickets from API/CSV
  - `updateRequest()` - Update single request
  - `bulkUpdateRequests()` - Update multiple requests
  - `processDailyRequests()` - Daily aggregation
  - `processCategoryData()` - Category analysis
  - `calculateCosts()` - Cost calculations
- **Type**: `request.ts` → `ChatRequest`

### Projects
- **Service**: `projectsApi.ts`
- **Main Functions**:
  - `fetchProjects()` - Fetch from Twenty CRM
  - `formatCurrency()` - Currency formatting
  - `convertMicrosToDollars()` - Currency conversion
- **Type**: `project.ts` → `Project`, `ProjectFilters`

### TurboHosting (Turbo Hosting)
- **Service**: `hostingApi.ts`
- **Main Functions**:
  - `fetchWebsiteProperties()` - Fetch from Twenty CRM
  - `generateMonthlyBreakdown()` - Calculate monthly MRR
  - `calculateCreditProgress()` - Free credit calculation
- **Type**: `websiteProperty.ts` → `WebsiteProperty`, `MonthlyHostingSummary`

---

## File Structure Summary

```
frontend/src/components/
├── Dashboard.tsx                    # Main billing overview page
├── SupportTickets.tsx              # Support ticket tracking page
├── Projects.tsx                     # Project revenue page
├── TurboHosting.tsx                # Turbo Hosting MRR page
├── PageHeader.tsx                   # Shared page header
├── PeriodSelector.tsx              # Month/year selector
├── ViewModeToggle.tsx              # View mode toggle
├── Sidebar.tsx                      # App navigation
├── RequestCalendarHeatmap.tsx      # Calendar heatmap chart
├── CategoryRadarChart.tsx          # Radar chart
├── CategoryPieChart.tsx            # Pie chart
├── CumulativeBillingChart.tsx      # Line chart (revenue growth)
├── HostingTypeChart.tsx            # Pie chart (hosting types)
├── ProjectCategoryPieChart.tsx     # Pie chart (project categories)
├── CostTrackerCard.tsx             # Reusable cost tracker (table + chart)
├── MonthlyRevenueTable.tsx         # Projects table
├── MonthlyHostingCalculator.tsx    # Hosting table
├── EditableCell.tsx                # Text editing
├── EditableNumberCell.tsx          # Number editing
├── DatePickerPopover.tsx           # Date picker
├── ConfirmDialog.tsx               # Confirmation dialog
├── Pagination.tsx                   # Table pagination
└── ui/
    ├── Scorecard.tsx               # Metric cards
    ├── LoadingState.tsx            # Loading skeletons
    ├── SiteFavicon.tsx             # Favicon display
    ├── BillingBadge.tsx            # Badge components
    ├── ThemeToggle.tsx             # Theme toggle
    ├── card.tsx                    # Card primitives
    ├── table.tsx                   # Table primitives
    ├── tooltip.tsx                 # Tooltip primitives
    └── toggle-group.tsx            # Toggle group
```
