# Thad-Chat Analysis Application

A comprehensive tool for analyzing chat messages to extract, categorize, and visualize actionable requests.

## 🚀 Quick Start

### Run Full Analysis Pipeline
```bash
python process.py --input data/thad_norman_messages_complete.csv
```

### Individual Commands
```bash
# Clean data only
python process.py --clean --input data/thad_norman_messages_complete.csv

# Extract requests only (requires cleaned data)
python process.py --extract

# Prepare data for frontend
python process.py --frontend
```

## 📁 Project Structure

```
thad-chat/
├── process.py              # Unified CLI tool
├── src/                    # Python source code
│   ├── data_preprocessor.py        # Data cleaning
│   └── thad-request-extractor/     # Request extraction
├── frontend/               # React dashboard
├── data/                   # Input/output data files
├── output/                 # Generated reports
└── docs/                   # Documentation
```

## 🔧 Features

### Data Processing
- **Smart Cleaning**: Removes control characters, iMessage artifacts, malformed prefixes
- **Request Extraction**: Pattern-based identification of actionable requests
- **Categorization**: Automated classification (Support, Forms, DNS, etc.)
- **Urgency Detection**: High/Medium/Low priority assignment

### Analysis & Reports
- **CSV Export**: Detailed request data with timestamps
- **Excel Workbook**: Multiple sheets with summaries
- **JSON Summary**: Statistics for API/frontend consumption
- **Interactive Dashboard**: React-based visualization

### Dashboard Features
- 📊 Request volume trends
- 🥧 Category distribution charts
- 💰 Cost calculations by urgency
- 📋 Searchable request table

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

## 📈 Analysis Results

The application processes chat messages to identify:
- **Total Requests**: Extracted actionable items
- **Time Patterns**: Request frequency by date/time
- **Categories**: Forms, DNS, Migration, Support, etc.
- **Urgency Levels**: Cost-impacting priority tiers
- **Effort Estimates**: Small/Medium/Large complexity

## 🔍 Request Detection

Uses sophisticated pattern matching to identify:
- Direct requests ("can you...", "please...")
- Work-related actions (fix, update, migrate)
- Technical keywords (webhook, DNS, backup)
- Urgency indicators (urgent, ASAP, critical)

## 💻 Requirements

- Python 3.7+
- pandas
- Node.js 16+ (for frontend)

## 🎯 Use Cases

- **Client Communication Analysis**: Understand request patterns
- **Resource Planning**: Estimate hours and costs
- **Service Optimization**: Identify common request types
- **Business Intelligence**: Track support metrics over time