# Application Structure - Component Hierarchy

This document provides a visual breakdown of the 4 main pages in the Thad Chat Request Analysis Dashboard and their component dependencies.

## Navigation Mapping

| Route ID | Component File | Sidebar Label | Icon | Purpose |
|----------|---------------|---------------|------|---------|
| `'overview'` | `dashboard/Dashboard.tsx` | Dashboard | BarChart3 | Billing Overview (Main Landing Page) |
| `'home'` | `support/SupportTickets.tsx` | Support | Ticket | Support Ticket Tracking |
| `'projects'` | `projects/Projects.tsx` | Projects | FolderKanban | Project Revenue Tracking |
| `'billing'` | `hosting/TurboHosting.tsx` | Turbo Hosting | Zap | Hosting MRR Tracking |

---

## 📊 Dashboard (Billing Overview)

**File**: `frontend/src/components/dashboard/Dashboard.tsx`
**Purpose**: Comprehensive billing rollup combining all revenue sources

```
dashboard/Dashboard.tsx
├── shared/PageHeader.tsx
│   ├── shared/PeriodSelector.tsx
│   └── ViewModeToggle.tsx (optional)
├── shared/Scorecard.tsx (×4)
│   └── Total Revenue, Support Tickets, Projects, Hosting MRR
├── shared/LoadingState.tsx (conditional)
├── dashboard/RevenueTrackerCard.tsx (NEW - revenue tracking by category)
│   └── base/DataTrackerCard.tsx (base component with render props)
│       ├── ui/card.tsx
│       ├── ui/toggle-group.tsx (Table/Chart toggle)
│       └── Recharts (BarChart/ComposedChart)
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

**File**: `frontend/src/components/support/SupportTickets.tsx`
**Purpose**: Support ticket tracking and analysis from iMessage/Twenty CRM

```
support/SupportTickets.tsx
├── ui/card.tsx
│   ├── Card (×2 for Request Categories + Billable Requests table)
│   ├── CardHeader
│   ├── CardTitle
│   ├── CardDescription
│   └── CardContent
├── shared/Scorecard.tsx (×5)
│   └── Total Requests, Revenue, Hours, Avg Rate, Cost
├── ui/ThemeToggle.tsx
├── shared/LoadingState.tsx (conditional)
├── charts/RequestCalendarHeatmap.tsx
├── support/CostTrackerCard.tsx (REFACTORED - cost tracking by urgency)
│   └── base/DataTrackerCard.tsx (base component with render props)
│       ├── ui/card.tsx
│       ├── ui/toggle-group.tsx (Table/Chart toggle)
│       ├── Recharts (BarChart/ComposedChart)
│       │   ├── Bar
│       │   ├── XAxis
│       │   ├── YAxis
│       │   ├── CartesianGrid
│       │   ├── Tooltip
│       │   ├── Legend
│       │   ├── ResponsiveContainer
│       │   └── LabelList
│       └── formatCurrency utilities
├── charts/CategoryRadarChart.tsx
├── charts/CategoryPieChart.tsx
├── ui/toggle-group.tsx (Pie/Radar toggle)
├── shared/DatePickerPopover.tsx
├── ui/table.tsx (for Billable Requests table only)
│   ├── Table
│   ├── TableHeader
│   ├── TableHead
│   ├── TableBody
│   ├── TableRow
│   └── TableCell
│       ├── shared/EditableCell.tsx (for category/urgency)
│       └── shared/EditableNumberCell.tsx (for hours)
├── ui/tooltip.tsx
│   ├── Tooltip
│   ├── TooltipTrigger
│   ├── TooltipProvider
│   └── TooltipContent
├── shared/Pagination.tsx
└── shared/ConfirmDialog.tsx
```

**Services Used**:
- `api.ts` → `fetchRequests()`, `updateRequest()`, `bulkUpdateRequests()`, `deleteRequest()`, `checkAPIHealth()`
- `dataProcessing.ts` → `processDailyRequests()`, `processCategoryData()`, `calculateCosts()`, `categorizeRequest()`

---

## 📁 Projects

**File**: `frontend/src/components/projects/Projects.tsx`
**Purpose**: Project revenue tracking for QuickBooks reconciliation

```
projects/Projects.tsx
├── shared/Scorecard.tsx (×3)
│   └── Total Revenue, Project Count, Average Revenue
├── shared/LoadingState.tsx (conditional)
├── projects/MonthlyRevenueTable.tsx
│   ├── projects/ProjectCard.tsx
│   ├── ui/SiteFavicon.tsx
│   ├── ui/BillingBadge.tsx
│   │   ├── CountBadge
│   │   └── CreditBadge
│   └── Collapsible UI (ChevronDown/Up icons)
├── charts/CumulativeBillingChart.tsx
│   └── Recharts (Line Chart)
└── charts/ProjectCategoryPieChart.tsx
    └── Recharts (Pie Chart)
```

**Services Used**: `projectsApi.ts` → `fetchProjects()`, `formatCurrency()`, `convertMicrosToDollars()`

---

## ⚡ TurboHosting (Turbo Hosting)

**File**: `frontend/src/components/hosting/TurboHosting.tsx`
**Purpose**: Website hosting monthly recurring revenue (MRR) tracking

```
hosting/TurboHosting.tsx
├── shared/Scorecard.tsx (×3)
│   └── Active Sites, Gross MRR, Net MRR
├── shared/LoadingState.tsx (conditional)
├── hosting/MonthlyHostingCalculator.tsx
│   ├── ui/SiteFavicon.tsx
│   ├── ui/BillingBadge.tsx
│   │   ├── BillingTypeBadge
│   │   ├── CountBadge
│   │   └── CreditBadge
│   └── Collapsible UI (ChevronDown/Up icons)
├── charts/CumulativeBillingChart.tsx
│   └── Recharts (Line Chart for MRR growth)
└── charts/HostingTypeChart.tsx
    └── Recharts (Pie Chart for site types)
```

**Services Used**: `hostingApi.ts` → `fetchWebsiteProperties()`, `generateMonthlyBreakdown()`, `calculateCreditProgress()`

---

## Shared Components Matrix

| Component File | Dashboard | Support | Projects | Turbo Hosting |
|---|:---:|:---:|:---:|:---:|
| `shared/Scorecard.tsx` | ✅ | ✅ | ✅ | ✅ |
| `shared/LoadingState.tsx` | ✅ | ✅ | ✅ | ✅ |
| `ui/SiteFavicon.tsx` | ✅ | ❌ | ✅ | ✅ |
| `ui/BillingBadge.tsx` | ✅ | ❌ | ✅ | ✅ |
| `charts/CumulativeBillingChart.tsx` | ❌ | ❌ | ✅ | ✅ |
| Recharts Library | ✅ | ✅ | ✅ | ✅ |
| `shared/PageHeader.tsx` | ✅ | ❌ | ❌ | ❌ |
| `ui/card.tsx` | ✅ | ✅ | ❌ | ❌ |
| `ui/table.tsx` | ❌ | ✅ | ❌ | ❌ |
| `base/DataTrackerCard.tsx` | ✅ | ✅ | ❌ | ❌ |

---

## Component Categories by Location

### Base Components (Reusable Architecture)
**Location**: `frontend/src/components/base/`

- `DataTrackerCard.tsx` - Base component for tracker cards with render props pattern
  - Exports `TABLE_STYLES` and `CHART_STYLES` constants
  - Single source of truth for all tracker styling
  - Used by CostTrackerCard and RevenueTrackerCard

### Core Page Components
**Location**: `frontend/src/components/[page-name]/`

- `dashboard/Dashboard.tsx` - Billing Overview (main landing page)
- `support/SupportTickets.tsx` - Support ticket tracking
- `projects/Projects.tsx` - Project revenue tracking
- `hosting/TurboHosting.tsx` - Turbo Hosting MRR tracking

### Shared Components (Cross-Page)
**Location**: `frontend/src/components/shared/`

- `PageHeader.tsx` - Page header with title and controls
- `PeriodSelector.tsx` - Month/year selection dropdown
- `ViewModeToggle.tsx` - View mode toggle buttons
- `Sidebar.tsx` - App-level navigation sidebar
- `Scorecard.tsx` - Metric display card
- `LoadingState.tsx` - Skeleton loading animations
- `EditableCell.tsx` - In-line cell editing (text)
- `EditableNumberCell.tsx` - In-line cell editing (numbers)
- `DatePickerPopover.tsx` - Date selection popover
- `ConfirmDialog.tsx` - Confirmation dialog for bulk actions
- `Pagination.tsx` - Table pagination controls

### Chart Components
**Location**: `frontend/src/components/charts/`

- `RequestCalendarHeatmap.tsx` - Calendar heatmap for requests
- `CategoryRadarChart.tsx` - Multi-dimensional category analysis
- `CategoryPieChart.tsx` - Category distribution pie chart
- `CumulativeBillingChart.tsx` - Revenue growth line chart
- `HostingTypeChart.tsx` - Hosting type distribution pie chart
- `ProjectCategoryPieChart.tsx` - Project category pie chart

### Page-Specific Components

#### Support Components
**Location**: `frontend/src/components/support/`

- `CostTrackerCard.tsx` - Cost tracking by urgency levels (uses DataTrackerCard base)

#### Dashboard Components
**Location**: `frontend/src/components/dashboard/`

- `RevenueTrackerCard.tsx` - Revenue tracking by categories (uses DataTrackerCard base)

#### Projects Components
**Location**: `frontend/src/components/projects/`

- `MonthlyRevenueTable.tsx` - Projects monthly breakdown table
- `ProjectCard.tsx` - Individual project card

#### Hosting Components
**Location**: `frontend/src/components/hosting/`

- `MonthlyHostingCalculator.tsx` - Hosting monthly breakdown table

### UI Components (Primitives)
**Location**: `frontend/src/components/ui/`

- `SiteFavicon.tsx` - Website favicon display
- `BillingBadge.tsx` - Badge components (Count, Credit, BillingType)
- `ThemeToggle.tsx` - Dark/light mode toggle
- `card.tsx` - Card container components
- `table.tsx` - Table primitive components
- `tooltip.tsx` - Tooltip components
- `toggle-group.tsx` - Toggle group component
- `button.tsx`, `calendar.tsx`, etc. - Other shadcn/ui primitives

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
├── base/                            # Reusable base components
│   └── DataTrackerCard.tsx         # Base tracker with render props pattern
├── shared/                          # Cross-page shared components
│   ├── PageHeader.tsx              # Page header with title and controls
│   ├── PeriodSelector.tsx          # Month/year selector
│   ├── ViewModeToggle.tsx          # View mode toggle
│   ├── Sidebar.tsx                 # App navigation
│   ├── Scorecard.tsx               # Metric display cards
│   ├── LoadingState.tsx            # Skeleton loading animations
│   ├── EditableCell.tsx            # Text editing
│   ├── EditableNumberCell.tsx      # Number editing
│   ├── DatePickerPopover.tsx       # Date picker
│   ├── ConfirmDialog.tsx           # Confirmation dialog
│   └── Pagination.tsx              # Table pagination
├── charts/                          # Visualization components
│   ├── RequestCalendarHeatmap.tsx  # Calendar heatmap chart
│   ├── CategoryRadarChart.tsx      # Radar chart
│   ├── CategoryPieChart.tsx        # Pie chart (categories)
│   ├── CumulativeBillingChart.tsx  # Line chart (revenue growth)
│   ├── HostingTypeChart.tsx        # Pie chart (hosting types)
│   └── ProjectCategoryPieChart.tsx # Pie chart (project categories)
├── support/                         # Support page components
│   ├── SupportTickets.tsx          # Support ticket tracking page
│   └── CostTrackerCard.tsx         # Cost tracking by urgency (uses base)
├── dashboard/                       # Dashboard page components
│   ├── Dashboard.tsx               # Main billing overview page
│   └── RevenueTrackerCard.tsx      # Revenue tracking by category (uses base)
├── projects/                        # Projects page components
│   ├── Projects.tsx                # Project revenue page
│   ├── MonthlyRevenueTable.tsx     # Projects monthly breakdown
│   └── ProjectCard.tsx             # Individual project card
├── hosting/                         # Hosting page components
│   ├── TurboHosting.tsx            # Turbo Hosting MRR page
│   └── MonthlyHostingCalculator.tsx # Hosting monthly breakdown
└── ui/                              # Primitive UI components (shadcn/ui)
    ├── SiteFavicon.tsx             # Favicon display
    ├── BillingBadge.tsx            # Badge components
    ├── ThemeToggle.tsx             # Theme toggle
    ├── card.tsx                    # Card primitives
    ├── table.tsx                   # Table primitives
    ├── tooltip.tsx                 # Tooltip primitives
    ├── toggle-group.tsx            # Toggle group
    ├── button.tsx                  # Button primitives
    ├── calendar.tsx                # Calendar primitives
    └── ...                         # Other shadcn/ui components
```
