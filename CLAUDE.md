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
    │   │   ├── Dashboard.tsx          # Main dashboard component
    │   │   ├── RequestBarChart.tsx    # Time-series chart
    │   │   ├── CategoryPieChart.tsx   # Modern pie chart with animations
    │   │   ├── CategoryRadarChart.tsx # Radar chart for category metrics
    │   │   └── EditableCell.tsx       # In-line editing
    │   ├── utils/
    │   │   ├── dataProcessing.ts      # Data transformation
    │   │   └── csvExport.ts           # Save functionality
    │   └── types/
    │       └── request.ts             # TypeScript interfaces
    └── public/
        └── thad_requests_table.csv    # Data source for dashboard
```

## Development History & Updates

### Recent Major Updates

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
- **Total Requests**: 430 (extracted from 6,156 messages)
- **Active Requests**: Dynamic based on user management
- **Date Range**: May 2025 - September 2025
- **Monthly Distribution**:
  - May: 88 requests (20.5%)
  - June: 142 requests (33.0%)
  - July: 106 requests (24.7%)
  - August: 82 requests (19.1%)
  - September: 12 requests (2.8%)
- **Categories**: Support (88.4%), Hosting (8.4%), Forms (2.3%), Billing (0.7%), Email (0.2%)
- **Urgency**: Medium (90.7%), High (6.7%), Low (2.6%)
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
4. Add status column and deploy to frontend:
   ```bash
   python3 -c "import csv; [add status column script]"
   ```
5. Start frontend: `cd frontend && npm run dev`

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