# Support Billing Tracker

A comprehensive business intelligence dashboard that processes iMessage conversation data to extract, categorize, and analyze support requests. The application transforms raw chat messages into structured business insights through an ETL pipeline and provides an interactive React dashboard for data visualization and management.

## 🚀 Quick Start

### Using Docker with MySQL Backend (Recommended)

1. **Set up environment variables**:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your preferred passwords
# (Default passwords are provided for local development)

# For Twenty CRM integration, add:
# VITE_TWENTY_API_URL=https://your-twenty.com/rest/supportTickets
# VITE_TWENTY_API_TOKEN=your-bearer-token
# VITE_TWENTY_USE_MOCK=false
```

2. **Start all services with Docker**:
```bash
docker-compose up -d
```

Docker Compose automatically loads the `.env` file from the project root.

3. **Import existing data** (if you have CSV data):
```bash
./docker-import.sh data/03_final/requests_table.csv
```

4. **Access the dashboard**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3011/api
- MySQL: localhost:3307 (user: thaduser, password: from .env)

See [DOCKER.md](./DOCKER.md) for detailed Docker instructions.

### Manual Setup (Without Docker)

1. **Export messages from iMessage database**:
```bash
python3 export_imessages.py chat-backup.db 2251 2025-05-01 2025-09-15 data/01_raw/messages_export.csv
```

2. **Clean and preprocess messages**:
```bash
cd src
python3 data_preprocessor.py
```

3. **Extract business requests**:
```bash
cd request-extractor
python3 main.py
```

4. **Start the dashboard**:
```bash
cd frontend
npm install
npm run dev
```

## 🔒 Security & Authentication

### Current Implementation: BasicAuth (Phase 1)

The application is protected by HTTP Basic Authentication at the Traefik reverse proxy level. When accessing the production URL, users will be prompted for credentials.

#### Default Credentials
- **Username:** `admin`
- **Password:** `PeakonBilling2025`
- **Production URL:** `https://velocity.peakonedigital.com/billing-overview`

#### Changing Authentication Credentials

To update the username and password:

1. **Generate new credentials hash**:
```bash
docker run --rm httpd:2.4-alpine htpasswd -nb typeanewusername typeanewpassword
```

This will output something like:
```
newusername:$apr1$xyz123$hashedpasswordhere
```

2. **Update `.env` file**:
```bash
# Edit the BASIC_AUTH_USERS variable
# IMPORTANT: Escape $ as $$ for docker-compose
BASIC_AUTH_USERS=newusername:$$apr1$$xyz123$$hashedpasswordhere
```

3. **Restart the application**:
```bash
docker-compose up -d
```

4. **Verify the change**:
- Access the production URL
- Browser should prompt for new credentials
- Enter the new username and password

#### Logging Out

To log out and test new credentials:
1. Click the **Log Out** button in the sidebar (red button below Theme toggle)
2. Frontend sends request to logout endpoint which returns 401
3. Browser clears cached credentials and prompts for re-authentication
4. Enter username and password to log back in

**How it works:**
- Backend provides `/api/auth/logout` endpoint that returns `401 Unauthorized`
- Logout endpoint is **not protected** by BasicAuth (accessed via higher-priority Traefik route)
- Browser receives 401 response and clears its credential cache
- Works reliably in Chrome, Firefox, and Safari

**Note:** Only works in production (velocity.peakonedigital.com). On localhost, BasicAuth is bypassed.

#### Security Notes
- ✅ Credentials are hashed using Apache APR1 (bcrypt variant)
- ✅ Works over HTTPS for secure transmission
- ✅ Protects both frontend and backend API
- ✅ Logout button available in sidebar for re-authentication
- ⚠️ Single shared credential for all users
- 📝 For per-user authentication, see `docs/authentication-plan.md` (Phase 2)

#### Local Development
Local access (localhost:5173, localhost:3011) bypasses authentication. Only production access via Traefik requires credentials.

---

## 🔄 FluentSupport Ticket Sync

The application automatically syncs support tickets from FluentSupport (WordPress plugin) into the database. This allows you to view both iMessage SMS requests and FluentSupport tickets in a unified dashboard.

### Quick Sync (One Command)

To sync tickets from the last 7 days:

```bash
# Update date filter (change date as needed)
sed -i 's/VITE_FLUENT_DATE_FILTER=.*/VITE_FLUENT_DATE_FILTER=2025-10-17/' .env

# Restart backend and trigger sync
docker-compose restart backend && sleep 3 && \
TOKEN=$(curl -s -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@peakonedigital.com","password":"PeakonBilling2025"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4) && \
curl -X POST http://localhost:3011/api/fluent/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"dateFilter":"2025-10-17"}'
```

**Replace `2025-10-17` with your desired start date in YYYY-MM-DD format**

### Step-by-Step Sync Process

#### 1. Update Date Filter

Edit `.env` and change the `VITE_FLUENT_DATE_FILTER` variable:

```bash
# Only sync tickets created after this date (YYYY-MM-DD)
VITE_FLUENT_DATE_FILTER=2025-10-17
```

#### 2. Restart Backend

Apply the new configuration:

```bash
docker-compose restart backend
sleep 3  # Wait for backend to start
```

#### 3. Authenticate

Get a JWT token for API access:

```bash
curl -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@peakonedigital.com","password":"PeakonBilling2025"}'
```

Copy the `accessToken` value from the response.

#### 4. Trigger Sync

Run the sync with your token:

```bash
curl -X POST http://localhost:3011/api/fluent/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"dateFilter":"2025-10-17"}'
```

#### 5. Verify Results

Check the sync status:

```bash
# View sync summary
curl -s http://localhost:3011/api/fluent/status | python3 -m json.tool

# Check database
docker exec support-billing-tracker-mysql mysql -u thaduser -pthadpassword support_billing_tracker \
  -e "SELECT COUNT(*) as total, MIN(date) as earliest, MAX(date) as latest FROM requests WHERE date >= '2025-10-17';"
```

### Sync Behavior

**Deduplication:**
- Each FluentSupport ticket has a unique `fluent_id`
- System automatically detects existing tickets by ID
- **New tickets** → Creates new database records
- **Existing tickets** → Updates records with latest data
- **Safe to re-run** → No duplicate tickets created

**What Gets Synced:**
- Ticket description and subject
- Priority level → Urgency mapping
- Product/website information
- Customer details and timestamps
- All FluentSupport metadata

**What's Preserved:**
- Dashboard edits (hours, categories)
- Status flags (active/deleted/ignored)
- Manual adjustments and notes

### Recommended Sync Schedule

- **Weekly Updates**: Sync from 7 days ago every week
- **After Gaps**: Sync from last known good date
- **Historical Import**: Sync from earliest desired date (e.g., 2025-01-01)

### Troubleshooting

**"Access token required" error:**
- JWT token is missing or invalid
- Solution: Login again to get fresh token

**"Token expired" error:**
- Tokens expire after 1 hour
- Solution: Re-authenticate to get new token

**Sync returns 0 tickets:**
- Date filter may be too recent
- Solution: Adjust date to go back further

**Backend not reachable:**
- Container may not be running
- Solution: `docker-compose ps` to check, `docker-compose restart backend` to fix

For detailed sync documentation, see [CLAUDE.md](./CLAUDE.md#fluentsupport-sync-operations).

---

## 📁 Project Structure

```
support-billing-tracker/
├── backend/                # Express.js API server
│   ├── db/                        # Database configuration
│   │   └── schema.sql             # MySQL schema definition
│   ├── routes/                    # API endpoints
│   │   └── requests.js            # CRUD operations for requests
│   ├── models/                    # Data models
│   └── utils/                     # Utilities
│       └── import-csv.js          # CSV to MySQL importer
├── frontend/               # React dashboard
│   ├── src/
│   │   ├── components/            # UI components
│   │   │   ├── base/              # Base components (DataTrackerCard)
│   │   │   ├── shared/            # Shared components (Sidebar, PageHeader, etc.)
│   │   │   ├── charts/            # Chart components (Bar, Pie, Radar, Heatmap)
│   │   │   ├── dashboard/         # Dashboard page (Billing Overview - main landing)
│   │   │   ├── support/           # Support page (SupportTickets)
│   │   │   ├── projects/          # Projects page components
│   │   │   ├── hosting/           # Turbo Hosting page components
│   │   │   └── ui/                # Primitive UI components (shadcn/ui)
│   │   ├── services/              # API services (Twenty CRM, billing, projects, hosting)
│   │   ├── utils/                 # Utilities (csvExport, dataProcessing, etc.)
│   │   │   └── api.ts             # API client for backend
│   │   └── types/                 # TypeScript interfaces
│   └── public/                    # Static assets
├── src/                    # Python ETL pipeline
│   ├── data_preprocessor.py       # Data cleaning
│   └── request-extractor/         # Request extraction
├── data/                   # Data pipeline directories
│   ├── 01_raw/                    # Raw iMessage exports
│   ├── 02_processed/              # Cleaned messages
│   └── 03_final/                  # Production data
├── archive/                # Historical scripts and tools
│   ├── migrations/                # Completed one-time migration scripts
│   ├── diagnostics/               # Debugging and diagnostic tools
│   └── legacy/                    # Obsolete or deprecated scripts
├── instructions/           # Documentation and guides
│   └── *.md                       # Various documentation files
├── docker-compose.yml      # Docker orchestration
├── docker-import.sh        # Data import script
└── CLAUDE.md              # Comprehensive documentation
```

## 📂 Archive Folder Structure

The `archive/` directory contains historical scripts and tools that are no longer actively used but are preserved for reference. This helps keep the project root clean while maintaining access to potentially useful code and documentation.

### Archive Subdirectories

#### `/archive/migrations/`
**Purpose**: Completed one-time migration scripts that have already been executed

**Current Contents**:
- `migrate-invoice-status-data.py` - Migrated Twenty CRM invoice statuses (completed Sept 30, 2025)
- `update-invoice-status-enum.py` - Updated Twenty CRM field metadata (completed Sept 30, 2025)

**When to Archive Here**: Place migration scripts here after they've been successfully run in production and are no longer needed for regular operations.

#### `/archive/diagnostics/`
**Purpose**: Debugging and diagnostic tools used to investigate or fix issues

**Current Contents**:
- `test_truncation.py` - Diagnostic script that identified text truncation bug in CSV output

**When to Archive Here**: Move diagnostic scripts here after the issue has been resolved but the script might be useful for similar future debugging.

#### `/archive/legacy/`
**Purpose**: Obsolete or deprecated scripts that have been replaced by newer implementations

**Current Contents**: Currently empty (obsolete files were deleted rather than archived)

**When to Archive Here**: Place old versions of scripts here when they've been completely replaced by new implementations but you want to keep them for historical reference.

### Archive Usage Guidelines

1. **Before Archiving**: Ensure the script is truly no longer needed for active operations
2. **Documentation**: Add comments to archived scripts explaining why they were archived and when
3. **Recovery**: Scripts can be moved back to active directories if needed in the future
4. **Security**: Review archived scripts for hardcoded credentials before committing

## 📚 Instructions Folder

The `instructions/` directory contains all technical documentation and guides that were previously scattered throughout the project root. This centralized approach keeps the root directory clean while making documentation easy to find.

**Contents Include**:
- Technical setup guides (Docker, MySQL, migration)
- Integration documentation (Twenty CRM, FluentSupport, n8n)
- Development plans and progress tracking
- Architecture and refactoring documentation
- Mobile optimization and UI/UX guides
- Testing checklists and debugging instructions

**Key Files**:
- `DOCKER.md` - Docker setup and configuration
- `MYSQL_SETUP.md` - Database configuration guide
- `TWENTY_INTEGRATION.md` - Twenty CRM API integration details
- `authentication-plan.md` - Future authentication implementation roadmap
- `mobile-optimization.md` - Mobile responsiveness documentation

**Note**: The main project documentation remains in the root:
- `README.md` (this file) - Project overview and quick start
- `CLAUDE.md` - Comprehensive technical documentation

## 🔧 Features

### Data Processing Pipeline
- **iMessage Export**: Extract messages from macOS Messages database
- **Twenty CRM Integration**: Fetch support tickets from Twenty CRM REST API
- **NSAttributedString Cleaning**: Removes `streamtyped @ NS*` artifacts
- **Smart Cleaning**: Removes iMessage reactions, control characters, malformed prefixes
- **Request Extraction**: Pattern-based identification of actionable requests
- **Categorization**: Support (88.4%), Hosting (8.4%), Forms (2.3%), Billing (0.7%), Email (0.2%)
- **Urgency Detection**: High (6.7%), Medium (90.7%), Low (2.6%)
- **Multi-Source Support**: Unified view of SMS and ticket system requests

### Analysis & Reports
- **CSV Export**: Detailed request data with timestamps
- **Monthly Breakdown CSV Export**: Comprehensive billing export with totals for tickets, projects, and hosting
- **Excel Workbook**: Multiple sheets with summaries
- **JSON Summary**: Statistics for API/frontend consumption
- **Interactive Dashboard**: Multi-page React application with 4 main views

### Dashboard Features

#### Billing Overview (Main Landing Page)
- 💰 Unified revenue view combining tickets, projects, and hosting
- 📊 Monthly breakdown with nested collapsible sections
- 📈 Average cost calculations per category
- 🎁 Total discounts tracking across all free credit policies
- 💾 CSV export with detailed monthly breakdown
- 📉 RevenueTrackerCard with visual breakdown by categories

#### Support Tickets Page
- 📊 Request volume trends (daily/hourly views)
- 🥧 Enhanced category distribution with modern pie chart
- 🎯 Category performance radar chart visualization
- 💰 Tiered cost calculation with interactive urgency filtering
- 🎫 CostTrackerCard showing costs by urgency levels

#### Projects Page
- 📁 Project revenue tracking with monthly breakdown
- 📊 Cumulative billing chart
- 🥧 Project category distribution pie chart
- 💼 Status-based filtering (Not Ready, Ready, Invoiced, Paid)

#### Turbo Hosting Page
- ⚡ Monthly recurring revenue (MRR) tracking
- 📊 Proration calculations for partial-month hosting
- 🎁 Free hosting credits system
- 📈 Cumulative MRR growth chart
- 📊 Billing type distribution chart

#### Shared Features Across All Pages
- 📋 Real-time searchable tables
- ✅ Status-based management (active/deleted/ignored)
- 🔄 Bulk selection and editing
- ⏱️ Hours tracking with enforced 0.25 increments
- 💾 Real-time database persistence
- 📈 Time-based filtering (All/Month/Day views)
- 📅 Modern calendar date picker with month selection capability
- 📱 Source indicators to distinguish Text vs Ticket System requests
- 🎫 Twenty CRM integration for live ticket data
- 🎨 Responsive design with mobile hamburger menu

### Database Persistence & CRUD Operations

#### Real-Time Data Persistence
All edits in the dashboard are **automatically saved to the MySQL database** in real-time:

1. **Inline Editing**: Click any Category or Urgency cell to edit
   - Changes are saved instantly to the database
   - No manual save button needed
   - Visual feedback confirms the update

2. **Bulk Operations**: Select multiple requests using checkboxes
   - Change category for all selected items
   - Update urgency levels in bulk
   - Mark requests as deleted (soft delete)

3. **Status Management**:
   - **Active**: Normal requests included in all calculations
   - **Deleted**: Excluded from metrics but recoverable
   - **Ignored**: Marked as non-billable or irrelevant

#### How CRUD Operations Work

**CREATE** - Add new requests:
```javascript
POST /api/requests
{
  "date": "2025-09-16",
  "time": "10:30:00",
  "category": "Support",
  "description": "Help with website",
  "urgency": "MEDIUM"
}
```

**READ** - Fetch requests with filtering:
```javascript
GET /api/requests?status=active&category=Support
```

**UPDATE** - Edit existing requests:
```javascript
PUT /api/requests/123
{
  "category": "Hosting",
  "urgency": "HIGH"
}
```

**DELETE** - Soft delete (change status):
```javascript
DELETE /api/requests/123  // Soft delete
DELETE /api/requests/123?permanent=true  // Permanent delete
```

#### Database Schema
The MySQL database stores all request data with:
- Auto-generated IDs
- Timestamps for creation and updates
- Calculated fields for estimated hours
- Indexes for fast querying
- Status field for soft deletes

## 📊 Output Files

```
output/
├── requests_by_month.csv    # Detailed CSV data
├── requests_detailed.xlsx   # Excel workbook
└── requests_summary.json    # Summary statistics
```

## 🎨 Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Application Structure

The application is a multi-page React dashboard with 4 main views accessible via sidebar navigation:

1. **Dashboard (Billing Overview)** - Main landing page
   - Route: `'overview'`
   - Component: `dashboard/Dashboard.tsx`
   - Purpose: Comprehensive billing rollup combining all revenue sources

2. **Support (Support Tickets)**
   - Route: `'home'`
   - Component: `support/SupportTickets.tsx`
   - Purpose: Support ticket tracking and analysis

3. **Projects**
   - Route: `'projects'`
   - Component: `projects/Projects.tsx`
   - Purpose: Project revenue tracking and management

4. **Turbo Hosting**
   - Route: `'billing'`
   - Component: `hosting/TurboHosting.tsx`
   - Purpose: Website hosting MRR tracking with proration

### Navigation
- **Sidebar**: Fixed left navigation with collapsible functionality
- **Mobile**: Hamburger menu for responsive mobile navigation
- **Default View**: Dashboard (Billing Overview)

## 📈 Current Statistics

Combined data sources provide:
- **Total Requests**: 490+ (430 SMS + 60 Twenty CRM tickets)
- **SMS Messages**: 430 business requests extracted from 6,156 messages
- **Twenty CRM Tickets**: 60 support tickets from live API
- **Date Range**: May 2025 - January 2025
- **Monthly Distribution** (SMS):
  - May: 88 (20.5%)
  - June: 142 (33.0%)
  - July: 106 (24.7%)
  - August: 82 (19.1%)
  - September: 12 (2.8%)
- **Categories**: Support, Hosting, Forms, Billing, Email, Migration
- **Effort Estimates**: Small (0.25h), Medium (0.5h), Large (1.0h)
- **Source Distribution**: ~88% SMS, ~12% Tickets

## 🔍 Request Detection

Uses sophisticated pattern matching to identify:
- Direct requests ("can you...", "please...")
- Work-related actions (fix, update, migrate)
- Technical keywords (webhook, DNS, backup)
- Urgency indicators (urgent, ASAP, critical)

## 🗄️ Data Management

### Accessing the Database

**Via TablePlus or Other GUI Client**:
```
Host: 127.0.0.1 or localhost
Port: 3307 (not 3306)
User: thaduser
Password: [from .env]
Database: support_billing_tracker
```

**Via MySQL Command Line**:
```bash
mysql -h localhost -P 3307 -u thaduser -p
# Enter password from .env
USE support_billing_tracker;
SELECT * FROM requests WHERE status = 'active' LIMIT 10;
```

**Via API Endpoints**:
- View all requests: http://localhost:3011/api/requests
- Get statistics: http://localhost:3011/api/statistics
- Export to CSV: http://localhost:3011/api/export-csv

### Data Import/Export

**Import CSV to Database**:
```bash
./docker-import.sh data/03_final/requests_table.csv
```

**Export Database to CSV**:
```bash
curl http://localhost:3011/api/export-csv > export.csv
```

### Backup and Recovery

**Backup Database**:
```bash
docker exec support-billing-tracker-mysql mysqldump -u root -prootpassword support_billing_tracker > backup.sql
```

**Restore Database**:
```bash
docker exec -i support-billing-tracker-mysql mysql -u root -prootpassword support_billing_tracker < backup.sql
```

## 🔧 Troubleshooting

### Common Issue: API Error 500 After Restart

**Problem**: After running `docker-compose down` and `docker-compose up`, you see:
- "Error Loading Data - API error: 500" on Dashboard
- "No projects available. Check your Twenty CRM connection" on Projects page

**Root Cause**: Two common issues:
1. **Backend Port Mismatch**: `backend/.env` file overrides Docker environment variables
2. **Vite Cache**: Frontend serves cached JavaScript with old API URLs

**Quick Fix**:
```bash
# 1. Remove conflicting backend .env file
mv backend/.env backend/.env.local.example

# 2. Clear Vite cache and rebuild
docker-compose down
rm -rf frontend/node_modules/.vite
docker-compose build --no-cache frontend
docker-compose up -d

# 3. Verify it's working
curl http://localhost:3011/api/health
# Should return: {"status":"ok","database":"connected"}
```

**Why This Happens**:
- Docker Compose passes `PORT=3011` from `.env.docker`
- BUT `backend/.env` has `PORT=3001`, which overwrites the Docker value
- Backend starts on port 3001, but Docker mapped port 3011 → Connection fails
- Vite caches compiled environment variables, serving stale API URLs after restart

**Prevention**:
- ✅ Use `.env` as single source of truth
- ✅ Delete `backend/.env` to avoid conflicts (Docker provides all env vars)
- ✅ Always clear Vite cache when making environment changes
- ✅ Always use: `docker-compose up -d`

**Verification After Restart**:
```bash
# Check backend is on correct port
docker exec support-billing-tracker-backend printenv | grep PORT
# Expected: PORT=3011

# Check frontend has correct API URL
docker exec support-billing-tracker-frontend printenv | grep VITE_API_URL
# Expected: VITE_API_URL=http://localhost:3011/api

# Test API health
curl http://localhost:3011/api/health
# Expected: {"status":"ok","database":"connected"}
```

For detailed troubleshooting, see the "API Error 500 & Environment Variable Conflicts" section in [CLAUDE.md](./CLAUDE.md#api-error-500--environment-variable-conflicts-october-2025).

## 💻 Requirements

### For Docker Setup (Recommended)
- Docker Desktop
- 4GB+ RAM available for Docker

### For Manual Setup
- Python 3.7+
- pandas
- sqlite3
- plistlib (for NSAttributedString handling)
- Node.js 16+ (for frontend)
- MySQL 5.7+ or 8.0+
- React 18
- Vite
- Tailwind CSS
- Recharts

## 🎯 Use Cases

- **Client Communication Analysis**: Understand request patterns and frequency
- **Resource Planning**: Estimate hours and costs with flat rate comparison
- **Service Optimization**: Identify common request types (88.4% support requests)
- **Business Intelligence**: Track support metrics over time with status management
- **Workflow Management**: Bulk operations for efficient request processing

## 📝 Recent Updates

### October 3, 2025 - Enhanced Billing Export & Analytics
- **Monthly Breakdown CSV Export**: Comprehensive export functionality with detailed sections
  - Totals row showing combined revenue from tickets, projects, and hosting
  - Item counts for each category (e.g., "5 tickets", "3 projects", "12 sites")
  - Detailed line items with credit labels and billing types
  - Section headers for clear organization
  - Ready for QuickBooks import and reconciliation
- **Average Cost Calculations**: New scorecards displaying average costs per category
  - Average cost per ticket across all urgency levels
  - Average project revenue by category
  - Average hosting MRR per site
- **Total Discounts Tracking**: Comprehensive savings display
  - Combined total from all free credit policies
  - Breakdown by credit type (landing pages, forms, support hours, hosting)
  - Visual representation of total savings impact

### October 2, 2025 - Component Architecture Refactoring & Mobile Responsiveness
- **Base Component Pattern**: Introduced DataTrackerCard as single source of truth
  - Render props pattern for maximum reusability
  - Shared TABLE_STYLES and CHART_STYLES constants
  - Zero style duplication across tracker components
- **New Specialized Trackers**:
  - **RevenueTrackerCard**: Visual revenue breakdown by categories (Tickets, Projects, Hosting)
  - **CostTrackerCard**: Cost tracking by urgency levels (Promotion, Low, Medium, High)
- **Mobile Responsiveness Enhancements**:
  - Hamburger menu navigation for mobile devices
  - Responsive grid layouts across all components
  - Touch-friendly tap targets (44px minimum)
  - Optimized spacing and typography for small screens
  - Collapsible sidebar with mobile overlay
- **Folder Structure Reorganization**: Improved semantic organization
  - `components/base/` - Reusable base components
  - `components/shared/` - Cross-page shared components (Sidebar, PageHeader, etc.)
  - `components/charts/` - All visualization components
  - `components/dashboard/` - Dashboard/Billing Overview page
  - `components/support/` - Support Tickets page
  - `components/projects/` - Projects page
  - `components/hosting/` - Turbo Hosting page
- **Component Renaming for Clarity**:
  - Dashboard.tsx now refers to Billing Overview (main landing page)
  - SupportTickets.tsx for Support page
  - TurboHosting.tsx for Turbo Hosting page

### January 23, 2025 - Twenty CRM Integration
- **Twenty CRM API Integration**: Connected to live Twenty CRM instance for real-time ticket data
  - Configured REST API endpoint with Bearer token authentication
  - Successfully fetching 60+ support tickets from production system
  - Created `twentyApi.ts` service for API communication
  - Built `ticketTransform.ts` utility for data transformation
  - Handles GraphQL-style nested response structure
- **Unified Request View**: Seamlessly merge SMS and ticket system requests
  - Tickets appear with 🎫 icon in source column
  - SMS requests show with 💬 icon
  - Source filtering allows viewing by channel
  - All requests use consistent data format
- **Docker Configuration**: Added Twenty API environment variables to docker-compose.yml
  - `VITE_TWENTY_API_URL`: API endpoint configuration
  - `VITE_TWENTY_API_TOKEN`: Secure token storage
  - `VITE_TWENTY_USE_MOCK`: Toggle for testing without API
- **Data Transformation**: Intelligent mapping of Twenty ticket fields
  - Priority mapping: CRITICAL→HIGH, MEDIUM→MEDIUM, NORMAL→LOW
  - Category mapping: BRAND_WEBSITE_TICKET→Support, LANDING_PAGE_TICKET→Forms
  - Request summary concatenates subject and description
  - Default time set to 8:00 AM for all tickets

### September 23, 2025 - Source Indicators & UI Improvements
- **Source Identification System**: Added visual indicators to distinguish between SMS/Text and Ticket System requests
  - New dedicated "Source" column with intuitive icons (💬 Text, 🎫 Ticket, 📧 Email, 📞 Phone)
  - Interactive tooltips showing data source ("Via Text", "Via Ticket System", etc.)
  - Source filtering with checkbox dropdown for multiple selections
  - Total Requests scorecard shows source breakdown (e.g., "189 Text, 52 Ticket")
  - Ready for future integration with ticket system and other communication channels
- **Column Width Optimizations**: Improved table layout for better Date column visibility
  - Request Summary narrowed to 200px min width
  - Actions column fixed to 80px
  - Date column given 110px minimum width
  - Day column reduced to 80px
- **Hours Column Validation**: Enforced 0.25 hour (15-minute) increments
  - Automatic rounding to nearest quarter hour (0.26→0.25, 0.38→0.50)
  - Arrow controls increment by exactly 0.25
  - All hour estimates align to standard billing increments
- **Interactive Cost Calculation Filtering**: Added clickable legend for urgency-based filtering
  - Click any urgency level (Promotion, Low, Medium, High) to toggle visibility
  - Deselected items fade to grey but remain visible for easy re-enabling
  - Reset button appears when filters are modified from default
  - Chart maintains visual continuity with grayed out bars instead of removing them

### September 17, 2025 - Modern Calendar Date Picker
- **Calendar Dropdown**: Replaced three separate select boxes (Year/Month/Day) with a modern calendar popover
- **Month Selection**: Click the month name in the calendar to select an entire month at once
- **Visual Calendar**: Interactive calendar grid with hover effects and visual feedback
- **Quick Presets**: Added "Today", "This Month", "This Year", and "All Time" quick select options
- **Improved UX**: Single-click interface reduces clicks needed to select dates
- **Visual Indicators**: Selected dates/months highlighted, with clear visual feedback for selections

### September 16, 2025 - Header & Navigation Improvements
- **Sticky Header**: Period and View controls stay visible while scrolling, with full-width separator
- **CORS Configuration**: Fixed API connectivity for multiple localhost ports (5173, 5174, etc.)
- **Clean UI Design**: Removed emoji icons from view toggles, applied flat design principles
- **Smart Status Messages**: "Manual save required" hidden when connected to database
- **Improved Layout**: Title left-aligned with controls right-aligned in sticky header

### September 2025 (Latest)
- **MySQL Database Integration**: Migrated from CSV to MySQL backend for real-time persistence
- **RESTful API**: Full CRUD operations via Express.js backend
- **Docker Orchestration**: Complete containerized setup with MySQL, Backend, and Frontend
- **Real-Time Persistence**: All edits automatically saved to database
- **API-First Architecture**: Frontend uses API with CSV fallback for reliability

### September 2025 - UI/UX Enhancements
- **Bulk Actions with Apply Pattern**: Implemented two-stage bulk editing with Apply button for safer batch operations
- **Enhanced Pie Chart Labels**: Added callout lines with optimized positioning for better label readability
- **Complete Category Support**: Added all 9 categories (including Non-billable, Advisory, General) to charts
- **API Health Endpoint**: Added `/api/health` endpoint for proper API mode detection and automatic save handling
- **NSAttributedString Cleaning**: Enhanced regex pattern to remove all `streamtyped @ NS*` artifacts
- **iMessage Export Integration**: Direct export from macOS Messages database
- **Expanded Data Range**: Now processing May-September 2025 (430 requests from 6,156 messages)
- **Sender Format Support**: Handles both "Thad Norman" and "Them" sender formats
- **Enhanced Visualizations**: Added radar chart for category performance and modernized pie chart with improved UX

### July 2025
- **Status-Based Management**: Replaced deletion with status fields (active/deleted/ignored)
- **Bulk Operations**: Added multi-select with bulk edit capabilities
- **Flat Rate Pricing**: Added comparison showing $125/hour savings visualization

## 🔗 Related Documentation

For comprehensive documentation, see [CLAUDE.md](./CLAUDE.md)