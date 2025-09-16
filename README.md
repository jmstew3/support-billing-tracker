# Thad-Chat Request Analysis Dashboard

A comprehensive business intelligence dashboard that processes iMessage conversation data to extract, categorize, and analyze support requests. The application transforms raw chat messages into structured business insights through an ETL pipeline and provides an interactive React dashboard for data visualization and management.

## 🚀 Quick Start

### Using Docker with MySQL Backend (Recommended)

1. **Set up environment variables**:
```bash
# Copy the example environment file
cp .env.docker.example .env.docker

# Edit .env.docker with your preferred passwords
# (Default passwords are provided for local development)
```

2. **Start all services with Docker**:
```bash
docker-compose up -d
```

3. **Import existing data** (if you have CSV data):
```bash
./docker-import.sh data/03_final/thad_requests_table.csv
```

4. **Access the dashboard**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- MySQL: localhost:3307 (user: ***REMOVED***, password: from .env.docker)

See [DOCKER.md](./DOCKER.md) for detailed Docker instructions.

### Manual Setup (Without Docker)

1. **Export messages from iMessage database**:
```bash
python3 export_imessages.py chat-backup.db 2251 2025-05-01 2025-09-15 data/01_raw/thad_messages_export.csv
```

2. **Clean and preprocess messages**:
```bash
cd src
python3 data_preprocessor.py
```

3. **Extract business requests**:
```bash
cd thad-request-extractor
python3 main.py
```

4. **Start the dashboard**:
```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
thad-chat/
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
│   │   │   └── Dashboard.tsx      # Main dashboard with API integration
│   │   └── utils/
│   │       └── api.ts             # API client for backend
│   └── public/                    # Static assets
├── src/                    # Python ETL pipeline
│   ├── data_preprocessor.py       # Data cleaning
│   └── thad-request-extractor/    # Request extraction
├── data/                   # Data pipeline directories
│   ├── 01_raw/                    # Raw iMessage exports
│   ├── 02_processed/              # Cleaned messages
│   └── 03_final/                  # Production data
├── docker-compose.yml      # Docker orchestration
├── docker-import.sh        # Data import script
└── CLAUDE.md              # Comprehensive documentation
```

## 🔧 Features

### Data Processing Pipeline
- **iMessage Export**: Extract messages from macOS Messages database
- **NSAttributedString Cleaning**: Removes `streamtyped @ NS*` artifacts
- **Smart Cleaning**: Removes iMessage reactions, control characters, malformed prefixes
- **Request Extraction**: Pattern-based identification of actionable requests
- **Categorization**: Support (88.4%), Hosting (8.4%), Forms (2.3%), Billing (0.7%), Email (0.2%)
- **Urgency Detection**: High (6.7%), Medium (90.7%), Low (2.6%)

### Analysis & Reports
- **CSV Export**: Detailed request data with timestamps
- **Excel Workbook**: Multiple sheets with summaries
- **JSON Summary**: Statistics for API/frontend consumption
- **Interactive Dashboard**: React-based visualization

### Dashboard Features
- 📊 Request volume trends (daily/hourly views)
- 🥧 Enhanced category distribution with modern pie chart
- 🎯 Category performance radar chart visualization
- 💰 Tiered vs flat rate cost comparison
- 📋 Real-time searchable request table
- ✅ Status-based management (active/deleted/ignored)
- 🔄 Bulk selection and editing
- 💾 Real-time database persistence
- 📈 Time-based filtering (All/Month/Day views)

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

The frontend automatically loads data from `/public/thad_requests_table.csv`

## 📈 Current Statistics

Processing 6,156 messages yields:
- **Total Requests**: 430 business requests extracted
- **Date Range**: May 2025 - September 2025
- **Monthly Distribution**:
  - May: 88 (20.5%)
  - June: 142 (33.0%)
  - July: 106 (24.7%)
  - August: 82 (19.1%)
  - September: 12 (2.8%)
- **Categories**: Support, Hosting, Forms, Billing, Email, Migration
- **Effort Estimates**: Small (0.25h), Medium (0.5h), Large (1.0h)

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
User: ***REMOVED***
Password: [from .env.docker]
Database: thad_chat
```

**Via MySQL Command Line**:
```bash
mysql -h localhost -P 3307 -u ***REMOVED*** -p
# Enter password from .env.docker
USE thad_chat;
SELECT * FROM requests WHERE status = 'active' LIMIT 10;
```

**Via API Endpoints**:
- View all requests: http://localhost:3001/api/requests
- Get statistics: http://localhost:3001/api/statistics
- Export to CSV: http://localhost:3001/api/export-csv

### Data Import/Export

**Import CSV to Database**:
```bash
./docker-import.sh data/03_final/thad_requests_table.csv
```

**Export Database to CSV**:
```bash
curl http://localhost:3001/api/export-csv > export.csv
```

### Backup and Recovery

**Backup Database**:
```bash
docker exec thad-chat-mysql mysqldump -u root -prootpassword thad_chat > backup.sql
```

**Restore Database**:
```bash
docker exec -i thad-chat-mysql mysql -u root -prootpassword thad_chat < backup.sql
```

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

### September 2025 (Latest)
- **MySQL Database Integration**: Migrated from CSV to MySQL backend for real-time persistence
- **RESTful API**: Full CRUD operations via Express.js backend
- **Docker Orchestration**: Complete containerized setup with MySQL, Backend, and Frontend
- **Real-Time Persistence**: All edits automatically saved to database
- **API-First Architecture**: Frontend uses API with CSV fallback for reliability

### September 2025
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