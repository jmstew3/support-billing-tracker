# Thad Chat Request Analysis Dashboard

## Overview

This is a comprehensive business intelligence dashboard that processes iMessage conversation data to extract, categorize, and analyze support requests. The application transforms raw chat messages into structured business insights through an ETL pipeline and provides an interactive React dashboard for data visualization and management.

## Architecture & Components

### 1. Data Processing Pipeline (ETL)

#### Raw Data Input
- **Source**: iMessage conversation exports from macOS Messages app
- **Format**: CSV files containing message data
- **Required CSV columns**:
  - `sender`: Message sender name
  - `message_text`: Raw message content
  - `message_date`: Message timestamp
  - Additional metadata columns as available

#### Stage 1: Data Preprocessing (`src/data_preprocessor.py`)
**Purpose**: Clean raw message text and remove iMessage artifacts

**Key Features**:
- Removes NSAttributedString artifacts (e.g., "streamtyped @ NSMutableAttributedString...")
- Removes iMessage reaction messages ("Emphasized", "Liked", "Disliked")
- Cleans malformed text prefixes (e.g., "AGood morning" → "Good morning")
- Handles Unicode artifacts and control characters
- Supports both old CSV format and new export_imessages.py format
- Automatically maps column names for compatibility

**How to Run**:
```bash
cd /Users/justinstewart/thad-chat/src
python3 data_preprocessor.py
```

**Configuration**:
- Input: `/Users/justinstewart/thad-chat/data/01_raw/thad_messages_export.csv`
- Output: `/Users/justinstewart/thad-chat/data/02_processed/thad_messages_cleaned.csv`

**Column Mapping**:
- `message` → `message_text`
- `sent_at` → `message_date`
- Preserves `phone` and `sender` columns

#### Stage 2: Request Extraction (`src/thad-request-extractor/`)
**Purpose**: Extract business requests from cleaned messages using pattern matching and NLP

**Key Components**:
- `main.py`: Entry point and summary reporting (uses absolute path to cleaned data)
- `request_extractor.py`: Core extraction logic (supports both "Thad Norman" and "Them" as sender)
- `request_patterns.py`: Pattern definitions and categorization rules

**Request Classification**:
- **Categories**: Support, Hosting, Forms, Billing, Email, Migration
- **Urgency Levels**: High, Medium, Low (based on keyword analysis)
- **Effort Estimation**: Small (0.25h), Medium (0.5h), Large (1.0h)
- **Request Types**: General Request, Site Migration, Backup Request, Form Removal, License Update, Email Routing, Form Integration

**How to Run**:
```bash
cd /Users/justinstewart/thad-chat/src/thad-request-extractor
python3 main.py
```

**Outputs**:
- `output/requests_by_month.csv`: Main structured dataset (without status column)
- `output/requests_detailed.xlsx`: Excel format with additional analytics
- `output/requests_summary.json`: Summary statistics

**Note**: The extractor handles both sender formats from iMessage exports ("Thad Norman" or "Them")

### 2. Frontend Dashboard (`frontend/`)

#### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts library
- **UI Components**: Custom shadcn/ui components

#### Design System & UI/UX Guidelines

##### Visual Design Principles
- **Monochrome Theme**: Pure grayscale base (0% saturation) with sharp edges
- **Border Radius**: 0rem (sharp, flat design) for all components
- **Shadows**: Minimal usage - only subtle header shadows (`0 1px 2px 0 rgba(0, 0, 0, 0.05)`)
- **Typography**: System font stack with clear hierarchy
- **Layout**: Consistent spacing using Tailwind's gap utilities (gap-4, gap-6, gap-8)

##### Color Scheme
- **Badge Colors**: Vibrant muted colors for category and status badges
  - **Green**: Full billing cycles, credits applied, paid status, "FREE" indicators
  - **Blue**: Standard billing types, ready to invoice status, support tickets
  - **Orange**: Prorated billing (start/end), invoiced status
  - **Purple**: Special categories (reserved for future use)
  - **Slate**: Inactive/disabled states
  - **Gray**: Not ready status, neutral states

##### Component Patterns

**Scorecards**
- Compact padding (16px / p-4)
- Clear metrics display with large numbers
- Icon in header for visual identification
- Muted foreground for labels
- Card component with minimal styling

**Tables**
- Nested collapsible sections for hierarchical data (ChevronUp/ChevronDown icons)
- Clickable column headers for sorting with arrow indicators (ArrowUp/ArrowDown)
- Hover states on interactive elements (`hover:bg-muted/30` or `hover:bg-muted/50`)
- Whole number Y-axis for count displays (`allowDecimals={false}`)
- Alternating row backgrounds for readability
- Full-width tables with responsive overflow (`overflow-auto`)

**Badges**
- Small text size (text-xs)
- Ring borders for subtle emphasis (`ring-1 ring-inset`)
- Contextual colors per badge type:
  - **"FREE" Badge**: Green with ring border (`bg-green-100 text-green-800 ring-green-200`)
  - **Billing Type Badges**: Green (Full), Blue (Prorated Start), Orange (Prorated End), Slate (Inactive)
  - **Status Badges**: Gray (Not Ready), Blue (Ready), Yellow (Invoiced), Green (Paid)
- Whitespace control (`whitespace-nowrap`) to prevent text wrapping

**Loading States**
- Unified skeleton animations with shimmer effects
- Page-specific variants (dashboard, projects, hosting, overview)
- Staggered animation delays for natural appearance
- Matching dimensions to actual components to prevent layout shift
- Pulse and shimmer keyframe animations

**Buttons & Interactive Elements**
- Consistent hover transitions (`transition-colors`)
- Icon-only buttons for compact actions
- Clear visual feedback on interaction states
- Disabled states with reduced opacity

##### Layout Standards
- **Sticky Headers**: Navigation controls remain visible while scrolling (`sticky top-0 z-10`)
- **Full-Width Borders**: Edge-to-edge separator lines extending to browser edges
- **Responsive Spacing**: Consistent padding (p-4, p-6, p-8) and gaps
- **Filter Controls**: Top-right positioning with clear labels and dropdowns
- **Sidebar Navigation**: Fixed left sidebar with icon + label navigation items
- **Main Content Area**: Flex-1 with overflow-auto for independent scrolling

##### Interaction Patterns

**Sorting**
- Click column headers to toggle ascending/descending
- Arrow indicators show current sort direction and column
- Initial state: ascending on first click
- Toggle direction on subsequent clicks of same column

**Filtering**
- Dropdown selects with "All" options as default
- Multiple filter types can be combined
- Clear visual indication of active filters
- Month/date selectors for temporal filtering

**Collapsible Sections**
- Chevron icons (ChevronUp/ChevronDown) indicate expand/collapse state
- Click entire header row to toggle
- Smooth transitions for expand/collapse animations
- Nested levels for hierarchical data (e.g., month > revenue source > line items)

**Month Navigation**
- Arrow buttons for quick month traversal (ChevronLeft/ChevronRight)
- Skip months without data automatically
- Tooltips show target month on hover
- Month selector dropdown for direct access

**Search & Text Input**
- Real-time filtering as user types
- Clear button (X icon) to reset search
- Placeholder text for guidance
- Case-insensitive matching

##### Dark Mode Support
- All components support dark mode with `dark:` prefixes
- Badge colors maintain vibrant muted appearance in both themes
- Background transparency adjustments for dark mode (e.g., `dark:bg-green-900/30 dark:text-green-300`)
- Border colors adapt to theme (e.g., `dark:border-green-800`)
- Text colors use semantic tokens (`text-foreground`, `text-muted-foreground`)
- Chart colors remain consistent across themes for data continuity

##### Accessibility Considerations
- Semantic HTML structure
- Proper heading hierarchy
- Icon buttons include tooltips for screen readers
- Sufficient color contrast ratios
- Keyboard navigation support for interactive elements
- ARIA labels where appropriate

#### Key Features

##### Data Loading
- Loads CSV data from `/frontend/public/thad_requests_table.csv`
- Automatic parsing and type conversion
- Real-time data updates when CSV is replaced

##### Time-Based Filtering
- **All View**: Shows all requests across entire date range
- **Month View**: Filters by specific year/month combination
- **Day View**: Shows hourly breakdown for selected date
- Automatic view mode switching based on filter selection

##### Interactive Charts
- **Request Bar Chart**: Daily/hourly request counts by priority level
- **Category Pie Chart**: Modern circular chart with hover effects and animated transitions
- **Category Radar Chart**: Multidimensional visualization showing request volume, urgency distribution, and effort metrics per category
- **Whole Number Y-Axis**: Ensures request counts display as integers

##### Data Management
- **Status-Based System**: Requests marked as `active`, `deleted`, or `ignored` instead of permanent removal
- **Editable Fields**: Click to edit Category and Urgency in individual table cells
- **Bulk Selection**: Checkbox column for selecting multiple requests
- **Select All/None**: Master checkbox in header to toggle all selections
- **Bulk Actions Toolbar**: When requests are selected, a toolbar appears with:
  - **Bulk Status Change**: Move multiple requests to deleted status (recoverable)
  - **Bulk Category Change**: Change category for all selected requests via dropdown
  - **Bulk Urgency Change**: Change urgency for all selected requests via dropdown
  - **Clear Selection**: Deselect all currently selected requests
- **Recovery Interface**: Restore deleted requests with one click (status change)
- **Permanent Cleanup**: Option to permanently remove deleted requests from dataset
- **Auto-Save**: Changes persist to `data/03_final/` directory with versioning

##### Advanced Features
- **Sorting**: Click column headers to sort by any field
- **Pagination**: Configurable page sizes (20, 50, 100, All)
- **Search Functionality**: Real-time text search across request summaries
- **Cost Calculation**:
  - **Tiered Pricing**: $200 (Regular), $250 (Same Day), $300 (Emergency)
  - **Flat Rate**: $125/hour for all requests
  - **Automatic Savings**: Shows amount and percentage saved with flat rate
- **Summary Cards**: Real-time KPIs and statistics with enhanced Total Cost display

#### How to Run Frontend

```bash
cd /Users/justinstewart/thad-chat/frontend

# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

#### Dashboard Navigation

##### Filter Controls
Located in top-right header:
1. **Year Selector**: Choose from available years in data
2. **Month Selector**: Filter by specific month (or "All Months")
3. **Day Selector**: Available when month is selected (or "All Days")

##### View Mode Toggle
Three buttons control chart granularity:
- **All** (📊): Shows all data in daily aggregation
- **Month** (📅): Shows selected month's daily data
- **Day** (🕐): Shows hourly breakdown for selected day

##### Table Interactions
- **Search**: Type in search bar to filter requests by summary text
- **Sort**: Click any column header to sort ascending/descending
- **Select**: Use checkboxes to select individual requests or select all
- **Bulk Actions**: When requests are selected, options appear to:
  - Delete selected requests (move to deleted status)
  - Change category for all selected requests
  - Change urgency for all selected requests
- **Individual Edit**: Click Category or Urgency cells to modify single values
- **Delete**: Click trash icon to soft-delete individual requests
- **Pagination**: Use controls at bottom to navigate pages
- **Reset Filters**: Clear all active filters including search with one click

##### Status-Based Request Management
- **Active Requests**: Included in all calculations, charts, and KPIs
- **Deleted Requests**: Excluded from calculations but visible in collapsible section
- **Ignored Requests**: Marked as irrelevant, excluded from business metrics
- **Status Visibility**: Toggle show/hide for different status types
- **One-Click Recovery**: Change status from deleted/ignored back to active
- **Audit Trail**: Complete history of status changes preserved in backups

#### Application Pages

##### 1. Home (Dashboard)
**Purpose**: Support ticket tracking and analysis from iMessage/Twenty CRM

**Key Features**:
- Support ticket list with real-time filtering and search
- Interactive charts (bar chart, pie chart, radar chart, calendar heatmap)
- Cost calculation based on tiered pricing (Regular/Same Day/Emergency)
- Source tracking (SMS vs Ticket System)
- Editable fields for category, urgency, and hours
- Status-based management (active/deleted/ignored)

**Data Source**: Twenty CRM support tickets + iMessage CSV exports

##### 2. Projects
**Purpose**: Project revenue tracking for QuickBooks reconciliation

**Key Features**:
- Displays ONLY "Ready" invoice status projects (ready to invoice)
- Monthly revenue breakdown organized by `projectCompletionDate`
- Cumulative billing chart showing revenue growth
- Filter by hosting status and project category
- Search functionality across project names
- Color-coded status badges (Gray/Blue/Yellow/Green)

**Data Source**: Twenty CRM projects API (`/rest/projects`)

##### 3. Billing Overview (NEW)
**Purpose**: Comprehensive billing rollup combining all revenue sources

**Key Features**:
- **Unified Revenue View**: Combines tickets, projects, and hosting in single dashboard
- **Monthly Breakdown**: Nested collapsible table structure
  - Month header row with total revenue
  - Support Tickets subsection (billable hours from Dashboard)
  - Projects subsection (ready to invoice from Projects page)
  - Hosting subsection (monthly recurring from Hosting & Billing page)
- **Summary Scorecards**:
  - Total Revenue (combined)
  - Support Tickets Revenue (blue)
  - Project Revenue (yellow)
  - Hosting MRR (green)
- **Month Filtering**: View specific month or all months combined
- **Drill-Down Capability**: Expand/collapse each revenue source for line-item details
- **Export Ready**: Structured for QuickBooks reconciliation

**Data Sources**:
- Tickets: `fetchRequests()` from Twenty CRM + CSV (billable only)
- Projects: `fetchProjects()` from Twenty CRM (READY status only)
- Hosting: `fetchWebsiteProperties()` with proration logic

**Navigation**: Accessible via Sidebar → "Billing Overview" (BarChart3 icon)

##### 4. Hosting & Billing
**Purpose**: Website hosting monthly recurring revenue (MRR) tracking

**Key Features**:
- Proration calculations for partial-month hosting
- Free credit system (1 free site per 20 paid sites)
- "FREE" badge for sites receiving credits
- Month-by-month breakdown (June 2025 - present)
- Nested collapsible table with site details
- Billing type badges (Green=Full, Blue=Prorated Start, Orange=Prorated End)
- Filter by billing type
- Sortable columns (all 8 columns clickable)

**Data Source**: Twenty CRM website properties API (`/rest/websiteProperties`)

**Proration Rules**:
- Start Date: `(daysInMonth - startDay + 1) / daysInMonth × $99`
- End Date: `endDay / daysInMonth × $99`
- Free Credits: `floor(activeSites / 21)`

## Billing Policies

### Free Landing Page Policy (Starting June 2025)

**Policy**: Client receives 1 free landing page project per month

**Implementation Details**:
- **Effective Date**: June 2025 (`FREE_LANDING_PAGE_START_DATE = '2025-06'`)
- **Credit Amount**: 1 landing page per month (`FREE_LANDING_PAGES_PER_MONTH = 1`)
- **Eligibility**: Only applies to projects with category `LANDING_PAGE`
- **Application Logic**: Credit is applied to the **first** landing page project completed in each month
- **Categories Excluded**: `MIGRATION` and `WEBSITE` projects do not receive this credit

**Configuration Location**: `frontend/src/config/pricing.ts`

**How It Works**:
1. When generating billing summaries (`billingApi.ts`), the system identifies all landing page projects per month
2. The first landing page in each eligible month (June 2025+) receives a free credit
3. Original amount is stored in `originalAmount` field for display purposes
4. Project `amount` is set to $0.00 and `isFreeCredit` flag is set to `true`
5. Month summary tracks `projectsLandingPageCredit` (0-1) and `projectsLandingPageSavings` (dollar amount)

**Visual Indicators**:
- **Billing Overview Page**:
  - Project shows green "FREE" badge next to name
  - Revenue column displays strikethrough original price
  - Net amount shown as $0.00 in green
  - Projects section header shows "1 free landing page credit" badge
- **Projects Page**: Shows full revenue amounts (credit applied only in Billing Overview for accounting)

**Revenue Calculation**:
- `projectsGrossRevenue`: Total before free landing page credit
- `projectsRevenue`: Net revenue after credit (`grossRevenue - landingPageSavings`)
- `projectsLandingPageCredit`: Number of credits applied (0 or 1)
- `projectsLandingPageSavings`: Dollar amount saved from free credit

**Files Modified**:
- `frontend/src/config/pricing.ts` - Policy constants
- `frontend/src/types/billing.ts` - Type definitions
- `frontend/src/services/billingApi.ts` - Credit application logic
- `frontend/src/components/BillingOverview.tsx` - Visual display

### Free Support Hours Policy (Starting June 2025)

**Policy**: Client receives 10 free support hours per month

**Effective Date**: June 2025 (`FREE_HOURS_START_DATE = '2025-06'`)
**Credit Amount**: 10 hours per month (`FREE_HOURS_PER_MONTH = 10`)

**Application Logic**: Hours are applied to billable support tickets, prioritizing lowest hourly rates first to maximize dollar savings

**Configuration Location**: `frontend/src/config/pricing.ts`

## Data Flow Architecture

```
iMessage DB → Export Script → Data Preprocessor → Request Extractor → Frontend Dashboard
   (Stage 0)     (Stage 1)        (Stage 2)          (Stage 3)           (Stage 4)
```

0. **Stage 0**: Export messages from iMessage database using `export_imessages.py`
1. **Stage 1**: Clean NSAttributedString artifacts, reactions, and normalize text
2. **Stage 2**: Extract structured requests using pattern matching
3. **Stage 3**: Generate final CSV with status column for frontend consumption
4. **Stage 4**: Interactive dashboard with status-based management

### Status-Based Data Management

**Core Concept**: Instead of deleting data, requests are marked with status fields:
- `active` - Counted in all calculations and charts
- `deleted` - Excluded from calculations but recoverable
- `ignored` - Excluded from calculations, marked as irrelevant

**CSV Format** (Enhanced):
```csv
date,time,month,request_type,category,description,urgency,effort,status
2025-07-15,09:30 AM,2025-07,General Request,Support,"Website help",MEDIUM,Medium,active
2025-07-14,03:45 PM,2025-07,General Request,Hosting,"Server issue",HIGH,Large,deleted
```

**Persistence Strategy**:
- **Single Dataset**: All requests in one array with status differentiation
- **File Integration**: Saves to `data/03_final/` with versioning
- **Recovery Path**: Complete audit trail from raw → processed → final
- **Backup Strategy**: Timestamped snapshots for point-in-time recovery

## File Structure

```
thad-chat/
├── CLAUDE.md                          # This documentation file
├── data/
│   ├── 01_raw/                        # Raw iMessage exports
│   ├── 02_processed/                  # Cleaned message data
│   └── 03_final/                      # Final structured data with status
│       ├── thad_requests_table.csv    # Main dataset (all statuses)
│       ├── deleted_requests.csv       # Backup of deleted requests
│       └── backups/                   # Timestamped snapshots
│           └── thad_requests_backup_*.csv
├── src/
│   ├── data_preprocessor.py           # Stage 1: Message cleaning
│   └── thad-request-extractor/        # Stage 2: Request extraction
│       ├── main.py
│       ├── request_extractor.py
│       └── request_patterns.py
└── frontend/                          # Stage 3: React dashboard
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.tsx          # Main dashboard component (support tickets)
    │   │   ├── Projects.tsx           # Projects page (ready to invoice)
    │   │   ├── HostingBilling.tsx     # Hosting & billing page
    │   │   ├── BillingOverview.tsx    # Comprehensive billing rollup (NEW)
    │   │   ├── RequestBarChart.tsx    # Time-series chart
    │   │   ├── CategoryPieChart.tsx   # Modern pie chart with animations
    │   │   ├── CategoryRadarChart.tsx # Radar chart for category metrics
    │   │   ├── MonthlyHostingCalculator.tsx # Hosting breakdown table
    │   │   ├── MonthlyRevenueTable.tsx      # Projects monthly table
    │   │   ├── Sidebar.tsx            # Navigation sidebar
    │   │   └── EditableCell.tsx       # In-line editing
    │   ├── services/
    │   │   ├── twentyApi.ts           # Twenty CRM API integration
    │   │   ├── projectsApi.ts         # Projects API service
    │   │   ├── hostingApi.ts          # Hosting API service
    │   │   └── billingApi.ts          # Comprehensive billing aggregation (NEW)
    │   ├── utils/
    │   │   ├── dataProcessing.ts      # Data transformation
    │   │   ├── csvExport.ts           # Save functionality
    │   │   ├── ticketTransform.ts     # Twenty ticket to request conversion
    │   │   └── api.ts                 # API utilities
    │   └── types/
    │       ├── request.ts             # TypeScript interfaces for requests
    │       ├── project.ts             # TypeScript interfaces for projects
    │       ├── websiteProperty.ts     # TypeScript interfaces for hosting
    │       └── billing.ts             # TypeScript interfaces for billing (NEW)
    └── public/
        └── thad_requests_table.csv    # Data source for dashboard
```

## Development History & Updates

### Recent Major Updates

#### Invoice Status Enum Update (September 30, 2025) 💼
- **Updated Invoice Status Values for Twenty CRM Projects**:
  - Changed `UNPAID` → `NOT_READY` ("Not Ready")
  - Changed `DRAFTED` → `READY` ("Ready")
  - Changed `SENT` → `INVOICED` ("Invoiced")
  - Kept `PAID` → `PAID` ("Paid") unchanged
  - Files Modified: [types/project.ts](frontend/src/types/project.ts:24), [projectsApi.ts](frontend/src/services/projectsApi.ts:50), [Projects.tsx](frontend/src/components/Projects.tsx:64), [ProjectCard.tsx](frontend/src/components/ProjectCard.tsx:39)

- **Created Migration Scripts**:
  - `update-invoice-status-enum.py`: Updates field metadata in Twenty CRM via GraphQL API
  - `migrate-invoice-status-data.py`: Migrates existing project data to new enum values
  - Both scripts use Bearer token authentication from `.env.docker`

- **Updated Frontend Components**:
  - Filter dropdown now shows all 4 status options (Not Ready, Ready, Invoiced, Paid)
  - ProjectCard displays color-coded status badges:
    - Gray: Not Ready
    - Blue: Ready (ready to invoice)
    - Yellow: Invoiced
    - Green: Paid
  - Default view shows "READY" projects (previously showed "UNPAID")

- **Semantic Changes**:
  - `unpaidRevenue` now represents "ready to invoice" revenue
  - `unpaidInvoices` count now represents "ready to invoice" projects
  - Monthly breakdown's "unpaid" field semantically means "ready for billing"

#### Hours Column Validation (September 23, 2025) ⏱️
- **Quarter-Hour Increment Enforcement**:
  - Hours column now strictly accepts only 0.25 increments (15-minute intervals)
  - Automatic rounding to nearest quarter hour for manual entries
  - Number input arrows increment/decrement by exactly 0.25
  - Examples: 0.26→0.25, 0.38→0.50, 0.63→0.75, 0.88→1.00
  - Files Modified: `frontend/src/components/EditableNumberCell.tsx`

- **Implementation Details**:
  - Removed variable step logic that depended on urgency levels
  - Added `roundToQuarterHour` function for consistent rounding
  - Applied rounding to initial display, edit values, and saved values
  - Ensures time tracking consistency across all requests

#### Interactive Cost Calculation Filtering (September 23, 2025) 📊
- **Interactive Legend Filtering**:
  - Click on any urgency level (Promotion, Low, Medium, High) to toggle visibility
  - Deselected items fade to grey but remain visible for easy re-enabling
  - Visual feedback with reduced opacity for inactive legend items
  - Reset button appears when filters are modified from default state
  - Files Modified: `Dashboard.tsx` (lines 100-105, 2065-2175)

- **Enhanced Chart Interactivity**:
  - Stacked bar chart maintains visual continuity with grayed out bars
  - Service tier view also supports dynamic filtering
  - Smooth transitions when toggling visibility states
  - All bars remain visible but change color to #D1D5DB when deselected

- **User Experience Improvements**:
  - No jarring layout shifts when filtering data
  - Clear visual indication of active vs inactive urgency levels
  - One-click reset to restore all urgency levels to visible
  - Consistent behavior across both table and chart views

#### Pricing Model Simplification (September 18, 2025) 💰
- **Removed Flat Rate Comparison**:
  - Eliminated all flat rate pricing logic ($125/hr)
  - Removed savings calculations and displays
  - Simplified cost scorecard to show only tiered pricing
  - Cleaned up Cost Calculation table to focus on service tiers
  - Files Modified: `types/request.ts`, `config/pricing.ts`, `utils/dataProcessing.ts`, `Dashboard.tsx`

- **Centralized Pricing Configuration**:
  - Created single source of truth: `frontend/src/config/pricing.ts`
  - All pricing rates now managed in one location
  - Current rates: Regular $150/hr, Same Day $175/hr, Emergency $250/hr
  - Easy to update rates by modifying PRICING_CONFIG object

- **Monthly Cost Breakdown**:
  - When Period is set to "All", shows monthly cost breakdown
  - Displays Regular, Same Day, and Emergency costs per month
  - Includes total row summing all months
  - Dynamic description changes based on view mode

#### UI/UX Improvements (September 18, 2025) 🎨
- **Month Navigation Arrows**:
  - Added left/right arrow buttons for easy month navigation
  - Single-click month switching without opening date picker
  - Smart navigation that skips months without data
  - Tooltips show target month (e.g., "Go to August 2025")
  - Automatic year boundary handling
  - Files Modified: `Dashboard.tsx`

- **Simplified Request Count Display**:
  - Replaced verbose multi-count display with clear, concise format
  - When billable filter ON: "Showing **189** billable requests *(241 non-billable hidden)*"
  - When billable filter OFF: "Showing **430** total requests *(189 billable, 241 non-billable)*"
  - Emphasizes currently displayed count with context in parentheses

- **Reduced Scorecard Padding**:
  - Tightened whitespace in all scorecards
  - Reduced padding from 24px to 16px for cleaner appearance
  - Better visual density without sacrificing readability
  - Files Modified: `Scorecard.tsx`, `scorecard.ts`

### Recent Major Updates

#### Twenty CRM Integration (January 23, 2025) 🎫
- **Feature**: Integration with Twenty CRM API to fetch and display support tickets alongside SMS requests
- **API Connection**:
  - REST API endpoint: `https://twenny.peakonedigital.com/rest/supportTickets`
  - Bearer token authentication stored in `.env.docker`
  - Fetches 60+ support tickets from live Twenty CRM instance
  - GraphQL-style nested response structure handling
- **Data Transformation**:
  - Created `ticketTransform.ts` utility to convert Twenty ticket format to dashboard format
  - Maps ticket priority (CRITICAL→HIGH, MEDIUM→MEDIUM, NORMAL→LOW)
  - Maps ticket categories to dashboard categories (BRAND_WEBSITE_TICKET→Support, LANDING_PAGE_TICKET→Forms)
  - Concatenates subject and description for request summary
  - Default time set to 8:00 AM EDT for all tickets
- **Services Created**:
  - `frontend/src/services/twentyApi.ts` - Main API service with authentication and error handling
  - Includes mock data fallback for testing without API connection
  - Automatic retry logic with exponential backoff
- **Configuration**:
  - Environment variables: `VITE_TWENTY_API_URL`, `VITE_TWENTY_API_TOKEN`, `VITE_TWENTY_USE_MOCK`
  - Docker Compose integration with `.env.docker` for secure token storage
  - Added `.mcp.json` to `.gitignore` to prevent API key exposure
- **Dashboard Integration**:
  - Tickets appear with 🎫 icon in source column
  - Seamlessly merged with SMS requests in unified view
  - Real-time fetching on dashboard load
  - Source filtering allows viewing SMS-only, tickets-only, or both
- **Files Modified**:
  - Created: `twentyApi.ts`, `ticketTransform.ts`
  - Modified: `Dashboard.tsx`, `docker-compose.yml`, `.env.docker`, `.gitignore`
- **Benefits**: Unified view of all support requests regardless of source channel

#### Source Indicators Implementation (September 23, 2025) 📱
- **SMS vs Ticket System Identification**:
  - Added `source` field to ChatRequest interface supporting 'sms', 'ticket', 'email', 'phone'
  - New dedicated "Source" column in table with intuitive icons:
    - 💬 Text (formerly SMS): Blue message circle icon
    - 🎫 Ticket: Green ticket icon
    - 📧 Email: Purple mail icon (future)
    - 📞 Phone: Orange phone icon (future)
  - Interactive tooltips showing "Via Text", "Via Ticket System", etc.
  - Source filtering with checkbox dropdown for multiple selections
  - Total Requests scorecard now shows source breakdown (e.g., "189 Text, 52 Ticket")
  - Files Modified: `Dashboard.tsx`, `request.ts`, `ui/tooltip.tsx`

- **Column Width Optimizations**:
  - Request Summary column: Narrowed from 300px to 200px minimum width
  - Actions column: Fixed to 80px width (w-20)
  - Date column: Added minimum width of 110px for better visibility
  - Day column: Reduced to 80px width (w-20)
  - Result: Better balanced table layout with improved Date column readability
  - Files Modified: `Dashboard.tsx`

#### Header & Navigation Improvements (September 16, 2025) 🎨
- **Sticky Header Implementation**:
  - Created sticky navigation bar with Period and View controls
  - Title "Request Analysis Dashboard" remains visible while scrolling
  - Full-width border separator extends edge-to-edge in browser
  - Clean flat design with no box shadows
  - Files Modified: `Dashboard.tsx` (lines 883-978)

- **CORS Configuration Fix**:
  - Fixed API connection issues for multiple localhost ports
  - Added support for ports 5173, 5174, and any localhost port
  - Enables proper database connectivity from different dev server instances
  - Files Modified: `backend/server.js` (lines 19-37)

- **UI Refinements**:
  - Removed emoji icons from View toggle buttons (All/Month/Day)
  - Conditional display of "Manual save required" message (hidden in API mode)
  - Improved layout with left-aligned title and right-aligned controls
  - Files Modified: `Dashboard.tsx`, `api.ts`

#### UI/UX Enhancements (September 16, 2025) 🎨
- **Bulk Actions with Apply Pattern**:
  - Implemented two-stage confirmation pattern for bulk operations
  - Added staged changes with Apply/Cancel buttons
  - Automatic selection clearing after successful application
  - Prevents accidental bulk changes with explicit user confirmation
  - Files Modified: `Dashboard.tsx` (lines 105-106, 670-733, 1266-1323)

- **Enhanced Pie Chart Labels**:
  - Added callout lines connecting slices to labels
  - Optimized label positioning with dynamic text anchoring
  - Smart label hiding for small slices (<1%) to prevent overlap
  - Improved tooltip formatting with request counts
  - Files Modified: `CategoryPieChart.tsx` (complete refactor)

- **Complete Category Support**:
  - Added all 9 categories to both radar and pie charts
  - Categories: Support, Hosting, Forms, Billing, Email, Migration, Non-billable, Advisory, General
  - Consistent color mapping across all visualizations
  - Files Modified: `CategoryRadarChart.tsx`, `CategoryPieChart.tsx`

- **API Health Endpoint**:
  - Added `/api/health` endpoint for proper API mode detection
  - Includes database connectivity check
  - Enables automatic save without manual button in API mode
  - Files Modified: `backend/routes/requests.js` (lines 7-26)

#### Enhanced Data Visualizations (September 2025) 📊
- **Feature**: Added radar chart and modernized pie chart for better data insights
- **Components**:
  - Radar chart showing volume, urgency, and effort metrics per category
  - Modern pie chart with animated transitions and improved hover effects
  - Color-coordinated charts with consistent theming
  - Enhanced interactivity with smooth animations
- **Files Added**: `CategoryRadarChart.tsx`
- **Files Modified**: `CategoryPieChart.tsx`, `Dashboard.tsx`
- **Benefits**: Multi-dimensional data analysis and improved visual appeal

#### Flat Rate Pricing Feature (December 2024) 💰
- **Feature**: Added flat rate pricing comparison showing value proposition
- **Components**:
  - Flat rate calculation at $125/hour for all requests
  - Automatic savings calculation (amount and percentage)
  - Enhanced Total Cost card with strikethrough tiered pricing
  - Green-highlighted savings display in cost breakdown
- **Files Modified**: `Dashboard.tsx`, `dataProcessing.ts`, `request.ts`
- **Benefits**: Clear demonstration of value to clients through savings visualization

#### Search Functionality (December 2024) 🔍
- **Feature**: Real-time text search across request summaries
- **Components**:
  - Search bar with icon in table header
  - Clear button for quick reset
  - Case-insensitive substring matching
  - Integration with existing filters and pagination
- **Files Modified**: `Dashboard.tsx`
- **User Experience**: Instantly filter hundreds of requests by typing keywords

#### Status-Based Deletion System (July 2025) 🎯
- **Revolutionary Change**: Replaced separate deleted arrays with single dataset using status fields
- **Status Types**: `active`, `deleted`, `ignored` - no permanent data loss
- **Benefits**: 
  - Single source of truth for all data
  - Portable - status travels with CSV exports
  - Reversible - toggle between states freely
  - Persistent across sessions and deployments
- **Files Modified**: `Dashboard.tsx`, `csvExport.ts`, `request.ts`
- **Data Persistence**: Status column added to CSV format for complete state preservation

#### Enhanced Data Persistence (July 2025)
- **Feature**: Integration with `data/03_final/` directory structure
- **Components**:
  - Main table: `thad_requests_table.csv` (active requests)
  - Deleted backup: `deleted_requests.csv` (recoverable data)
  - Timestamped backups: `backups/thad_requests_backup_YYYY-MM-DDTHH-mm-ss.csv`
  - Original preservation: `thad_original_backup.csv`
- **Workflow**: Auto-save to file system with localStorage fallback
- **Recovery**: Complete audit trail from raw data through final state

#### Bulk Actions Implementation (July 2025)
- **Feature**: Added comprehensive bulk selection and editing capabilities
- **Components**: 
  - Checkbox column for individual and bulk selection
  - Bulk actions toolbar with delete, category change, and urgency change
  - Smart selection clearing on filter/pagination changes
- **Files Modified**: `Dashboard.tsx`
- **Benefits**: Significantly improved workflow efficiency for managing multiple requests

#### Week View Removal (July 2025)
- **Issue**: Week view was overcomplicating the dashboard interface
- **Solution**: Simplified to 3-mode system (All/Month/Day)
- **Files Modified**: `Dashboard.tsx`, removed week-related functions and UI elements
- **Result**: Cleaner, more intuitive interface

#### Y-Axis Display Fix
- **Issue**: Request counts showing as decimals (1.5, 2.5, etc.)
- **Solution**: Added `allowDecimals={false}` to Recharts YAxis component
- **File**: `RequestBarChart.tsx:47`

#### iMessage Reaction Filtering
- **Issue**: "Emphasized", "Liked", "Disliked" messages cluttering data
- **Solution**: Dual-layer filtering in both preprocessor and extractor
- **Impact**: Reduced dataset from 211 → 188 requests (23 reactions removed)
- **Files**: `data_preprocessor.py`, `request_extractor.py`

### Current Data Statistics
- **Total Requests**: 490+ (430 SMS + 60 Twenty CRM tickets)
- **SMS Requests**: 430 (extracted from 6,156 messages)
- **Twenty CRM Tickets**: 60 (fetched from live API)
- **Active Requests**: Dynamic based on user management
- **Date Range**: May 2025 - January 2025
- **Monthly Distribution** (SMS only):
  - May: 88 requests (20.5%)
  - June: 142 requests (33.0%)
  - July: 106 requests (24.7%)
  - August: 82 requests (19.1%)
  - September: 12 requests (2.8%)
- **Categories**: Support (88.4%), Hosting (8.4%), Forms (2.3%), Billing (0.7%), Email (0.2%)
- **Urgency**: Medium (90.7%), High (6.7%), Low (2.6%)
- **Source Distribution**: ~88% SMS, ~12% Tickets
- **Status Distribution**: Tracked in real-time via dashboard

## Troubleshooting & Maintenance

### Common Issues

#### Data Not Loading in Dashboard
1. Verify CSV exists at `/frontend/public/thad_requests_table.csv`
2. Check CSV format matches expected columns
3. Ensure no malformed CSV data (quotes, commas in content)

#### Request Extraction Issues
1. Verify cleaned data exists in preprocessor output directory
2. Check pattern matching rules in `request_patterns.py`
3. Review exclusion patterns if legitimate requests are filtered

#### Build Errors
1. Run `npm install` to ensure dependencies are current
2. Check TypeScript errors with `npm run build`
3. Verify all imports and file paths are correct

#### API 404 Error When Accessing from Production Domain (January 2025)
**Issue**: Frontend shows 404 error for API requests when accessed from `velocity.peakonedigital.com`

**Cause**: The frontend's `api.ts` file was using an incorrect API path for production. When accessed from the production domain, it was trying to reach `/billing-overview-api/requests` but the backend expects `/api/requests` after Traefik strips the path prefix.

**Solution**:
1. Edit `frontend/src/utils/api.ts`
2. Change the production API URL from:
   ```javascript
   const API_BASE_URL = window.location.hostname === 'velocity.peakonedigital.com'
     ? 'https://velocity.peakonedigital.com/billing-overview-api'
     : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
   ```
   To:
   ```javascript
   const API_BASE_URL = window.location.hostname === 'velocity.peakonedigital.com'
     ? 'https://velocity.peakonedigital.com/billing-overview-api/api'
     : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
   ```
3. Restart the frontend container: `docker-compose restart frontend`

**Prevention**: Always ensure API paths align with backend routing structure and Traefik path stripping configuration

#### MySQL Data Directory - Security Warning (January 2025)
**CRITICAL**: Never commit `mysql_data/` directory to Git!

**Why This is Dangerous**:
1. **Security Risk**: Contains actual database content including potentially sensitive data
2. **Repository Bloat**: Binary files (binlog, InnoDB files) will massively increase repo size
3. **Merge Conflicts**: Binary database files cannot be merged
4. **Platform Incompatibility**: Database files are platform-specific
5. **Constant Changes**: Files like binlog change with every database operation

**Proper Database Management**:
- ✅ **DO commit**: Schema files (`backend/db/schema.sql`), migration scripts
- ❌ **NEVER commit**: `mysql_data/`, `*.ibd`, `binlog.*`, `ibdata*` files
- **Backups**: Use `mysqldump` for SQL backups, not raw database files
- **Local Development**: Use Docker volumes or bind mounts (already configured)
- **Production**: Use proper database backup solutions (automated dumps, replication)

**If you see mysql_data in git status**:
1. Ensure `.gitignore` includes `mysql_data/`
2. Run `git status` to verify it's ignored
3. Never use `git add .` without checking what's being added

### Performance Notes
- Dashboard handles up to ~1000 requests efficiently
- Large datasets may require pagination adjustments
- Chart rendering performance depends on date range selection

## Future Enhancement Opportunities

1. **Additional Request Categories**: Expand beyond current 6 categories
2. **Advanced Analytics**: Trend analysis, seasonal patterns, response time tracking
3. **Export Functionality**: PDF reports, custom date range exports
4. **Integration**: Connect to external project management tools
5. **Real-time Updates**: Live data refresh from message sources
6. **Mobile Responsiveness**: Optimize dashboard for mobile devices

## Quick Start Workflow

### For New Data Processing:
1. Export messages from iMessage database:
   ```bash
   python3 export_imessages.py chat-backup.db [chat_id] [start_date] [end_date] data/01_raw/thad_messages_export.csv
   ```
2. Clean the exported messages:
   ```bash
   cd src && python3 data_preprocessor.py
   ```
3. Extract requests from cleaned data:
   ```bash
   cd thad-request-extractor && python3 main.py
   ```
4. Configure Twenty CRM API (if using):
   ```bash
   # Edit .env.docker and add:
   VITE_TWENTY_API_URL=https://your-twenty-instance.com/rest/supportTickets
   VITE_TWENTY_API_TOKEN=your-bearer-token-here
   VITE_TWENTY_USE_MOCK=false
   ```
5. Start with Docker Compose:
   ```bash
   docker-compose --env-file .env.docker up -d
   ```
   Or without Docker: `cd frontend && npm run dev`

### For Dashboard Development:
1. Modify React components in `frontend/src/components/`
2. Test with: `npm run dev` (builds to http://localhost:5173 or next available port)
3. Monitor console for errors and verify all features work
4. Build for production: `npm run build`
5. Update this documentation for significant changes

### For Data Management:
1. **Delete Requests**: Use trash icon or bulk delete (sets status to 'deleted')
2. **Restore Requests**: Use rotate icon in deleted section (sets status to 'active')
3. **Save Changes**: Use save button to persist to `data/03_final/` directory
4. **Backup Recovery**: Access timestamped backups in `data/03_final/backups/`
5. **Complete Reset**: Reload from `data/01_raw/` through full ETL pipeline

## Development Best Practices

### Post-Update Testing
- It is important after any updates you test the application to make sure it runs and then monitor the console log so that you can make any changes

This application provides a complete solution for transforming conversational data into actionable business intelligence with enterprise-grade data management, comprehensive audit trails, and a focus on data safety through status-based operations rather than permanent deletions.

## Critical Implementation Notes

### Status-Based Architecture Benefits
1. **Data Safety**: No accidental permanent data loss - everything is recoverable
2. **Audit Trail**: Complete history of all changes through timestamped backups
3. **Portability**: Status field travels with data in all CSV exports
4. **Flexibility**: Easy to add new status types (e.g., 'pending', 'archived') in the future
5. **Business Intelligence**: Clean separation between active business data and historical records

### File System Integration
- **Production Ready**: Saves directly to structured data directory (`data/03_final/`)
- **Version Control**: Timestamped backups prevent any data loss scenarios
- **ETL Compatible**: Works seamlessly with existing data processing pipeline
- **Recovery Options**: Multiple restoration paths from any point in the process

### Performance & Scalability
- **Efficient Filtering**: Active/deleted separation optimizes dashboard performance
- **Batch Operations**: Bulk actions process multiple requests efficiently
- **Memory Management**: Status-based filtering reduces memory usage for large datasets
- **Real-Time Updates**: Immediate UI feedback with persistent background saves

## Date and Time Handling (Critical) #memorize

### Database Storage
- **MySQL TIME field**: Stores times in 24-hour format (e.g., `08:47:07`)
- **MySQL DATE field**: Stores dates as `YYYY-MM-DD` format
- **Timezone**: Times are stored in EDT (Eastern Daylight Time, UTC-4)
- **Conversion**: When importing from iMessage exports (which are in UTC), we subtract 4 hours using `SUBTIME(time, '04:00:00')`
- **Midnight Crossings**: Handled by adjusting both date and time when conversion crosses day boundary

### Frontend Display
- **Date Parsing Issue**: JavaScript's `new Date("2025-06-23")` interprets as UTC midnight, causing timezone shift
- **Solution**: Parse date components manually to avoid timezone issues:
  ```javascript
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  ```
- **Time Format**: Display as 12-hour with AM/PM (e.g., "8:47 AM")
- **Chart Data**: Uses the same manual parsing to ensure consistency

### Request Extractor (Python)
- **Timezone Conversion**: Treats incoming timestamps as UTC and converts to EDT:
  ```python
  self.df['datetime'] = pd.to_datetime(self.df['message_date'], utc=True)
  self.df['datetime'] = self.df['datetime'].dt.tz_convert('America/New_York')
  ```
- **Time Formatting**: Outputs as 12-hour format: `strftime('%I:%M %p').str.lstrip('0')`
- **Date Output**: Maintains `YYYY-MM-DD` format for consistency

### Known Issues & Solutions
1. **Problem**: Scorecard showing wrong date (e.g., Jun 22 instead of Jun 23)
   - **Cause**: `new Date()` timezone conversion
   - **Fix**: Manual date component parsing

2. **Problem**: Times off by 4 hours
   - **Cause**: iMessage exports in UTC, displayed in EDT
   - **Fix**: Timezone conversion in request extractor and database update

3. **Problem**: Archived requests not sorted chronologically
   - **Cause**: Missing sort logic
   - **Fix**: Added date/time sorting using `parseTimeToMinutes` helper