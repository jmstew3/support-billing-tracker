# Thad-Chat Request Analysis Dashboard

A comprehensive business intelligence dashboard that processes iMessage conversation data to extract, categorize, and analyze support requests. The application transforms raw chat messages into structured business insights through an ETL pipeline and provides an interactive React dashboard for data visualization and management.

## 🚀 Quick Start

### Complete Data Processing Pipeline

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
├── export_imessages.py     # iMessage database export utility
├── src/                    # Python source code
│   ├── data_preprocessor.py        # Data cleaning (NSAttributedString removal)
│   └── thad-request-extractor/     # Request extraction
│       ├── main.py                  # Entry point
│       ├── request_extractor.py     # Core extraction logic
│       └── request_patterns.py      # Pattern definitions
├── frontend/               # React dashboard
│   ├── src/components/             # UI components
│   └── public/                     # Static assets
├── data/                   # Data pipeline directories
│   ├── 01_raw/                    # Raw iMessage exports
│   ├── 02_processed/              # Cleaned messages
│   └── 03_final/                  # Production data with status
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
- 💾 Auto-save with versioned backups
- 📈 Time-based filtering (All/Month/Day views)

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

## 💻 Requirements

- Python 3.7+
- pandas
- sqlite3
- plistlib (for NSAttributedString handling)
- Node.js 16+ (for frontend)
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