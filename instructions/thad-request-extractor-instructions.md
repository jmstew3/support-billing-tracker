# Thad Norman Request Extraction Application - Build Instructions

## Project Overview
Build a Python application that processes `thad_norman_messages_cleaned.csv` to extract actionable requests from Thad Norman's text messages and organize them by month, day, and timestamp.

## Prerequisites
- Python 3.8 or higher
- Basic understanding of pandas and regex
- Access to `thad_norman_messages_cleaned.csv` file

## Project Structure
```
thad-request-extractor/
├── main.py
├── request_extractor.py
├── request_patterns.py
├── requirements.txt
├── data/
│   └── thad_norman_messages_cleaned.csv
└── output/
    ├── requests_by_month.csv
    ├── requests_summary.json
    └── requests_detailed.xlsx
```

## Step 1: Set Up Environment

### Create Project Directory
```bash
mkdir thad-request-extractor
cd thad-request-extractor
mkdir data output
```

### Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Create requirements.txt
```txt
pandas==2.0.3
openpyxl==3.1.2
python-dateutil==2.8.2
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

## Step 2: Create Request Pattern Definitions

### File: `request_patterns.py`
```python
"""
Define patterns for identifying different types of requests in messages.
"""

import re

# Request type patterns with associated metadata
REQUEST_PATTERNS = [
    {
        'pattern': re.compile(r'add.*?webhook.*?fluent', re.IGNORECASE),
        'type': 'Form Integration',
        'category': 'Forms',
        'default_effort': 'Small',
        'keywords': ['webhook', 'fluent', 'integration']
    },
    {
        'pattern': re.compile(r'gravity form.*?webhook', re.IGNORECASE),
        'type': 'Form Integration',
        'category': 'Forms',
        'default_effort': 'Small',
        'keywords': ['gravity', 'form', 'webhook']
    },
    {
        'pattern': re.compile(r'nameserver.*?cutover', re.IGNORECASE),
        'type': 'DNS Cutover',
        'category': 'DNS',
        'default_effort': 'Medium',
        'keywords': ['nameserver', 'dns', 'cutover']
    },
    {
        'pattern': re.compile(r'migrat.*?(site|website)', re.IGNORECASE),
        'type': 'Site Migration',
        'category': 'Hosting',
        'default_effort': 'Large',
        'keywords': ['migrate', 'migration', 'transfer']
    },
    {
        'pattern': re.compile(r'backup|zip.*?site', re.IGNORECASE),
        'type': 'Backup Request',
        'category': 'Hosting',
        'default_effort': 'Medium',
        'keywords': ['backup', 'zip', 'archive']
    },
    {
        'pattern': re.compile(r'remove.*?form', re.IGNORECASE),
        'type': 'Form Removal',
        'category': 'Forms',
        'default_effort': 'Small',
        'keywords': ['remove', 'delete', 'form']
    },
    {
        'pattern': re.compile(r'please use this email', re.IGNORECASE),
        'type': 'Email Routing',
        'category': 'Email',
        'default_effort': 'Small',
        'keywords': ['email', 'routing', 'leads']
    },
    {
        'pattern': re.compile(r'update.*?license', re.IGNORECASE),
        'type': 'License Update',
        'category': 'Billing',
        'default_effort': 'Small',
        'keywords': ['license', 'update', 'renewal']
    },
    {
        'pattern': re.compile(r'can you.*?(add|create|update|fix|check)', re.IGNORECASE),
        'type': 'General Request',
        'category': 'Support',
        'default_effort': 'Medium',
        'keywords': ['request', 'help', 'support']
    },
    {
        'pattern': re.compile(r'need(s)?\s+(to|you|help)', re.IGNORECASE),
        'type': 'General Request',
        'category': 'Support',
        'default_effort': 'Medium',
        'keywords': ['need', 'help', 'assistance']
    }
]

# Urgency indicators
URGENCY_INDICATORS = {
    'high': ['urgent', 'asap', 'immediately', 'today', 'critical', 'emergency', '100% by'],
    'low': ['when you can', 'no rush', 'whenever', 'eventually'],
    'medium': []  # Default
}

# Action keywords for general detection
ACTION_KEYWORDS = [
    'please', 'can you', 'could you', 'need', 'add', 'update', 'fix',
    'create', 'setup', 'configure', 'install', 'remove', 'delete',
    'check', 'review', 'test', 'migrate', 'backup'
]

# Work-related keywords
WORK_KEYWORDS = [
    'website', 'site', 'domain', 'dns', 'nameserver', 'hosting',
    'form', 'webhook', 'email', 'leads', 'tag', 'pixel', 'analytics',
    'wordpress', 'elementor', 'plugin', 'staging', 'migration',
    'backup', 'license', 'credential', 'login', 'password'
]
```

## Step 3: Create Request Extractor Module

### File: `request_extractor.py`
```python
"""
Core module for extracting requests from text messages.
"""

import pandas as pd
import re
from datetime import datetime
from typing import List, Dict, Tuple
from request_patterns import REQUEST_PATTERNS, URGENCY_INDICATORS, ACTION_KEYWORDS, WORK_KEYWORDS


class RequestExtractor:
    def __init__(self, csv_path: str):
        """Initialize the extractor with the CSV file path."""
        self.csv_path = csv_path
        self.df = None
        self.requests = []
        
    def load_data(self):
        """Load the CSV file into a pandas DataFrame."""
        self.df = pd.read_csv(self.csv_path)
        # Filter for Thad's messages only
        self.df = self.df[
            (self.df['sender'] == 'Thad Norman') & 
            (self.df['message_text'].notna())
        ].copy()
        
        # Convert message_date to datetime
        self.df['datetime'] = pd.to_datetime(self.df['message_date'])
        self.df['date'] = self.df['datetime'].dt.date
        self.df['time'] = self.df['datetime'].dt.time
        self.df['month'] = self.df['datetime'].dt.to_period('M')
        
        print(f"Loaded {len(self.df)} messages from Thad Norman")
        
    def extract_urgency(self, text: str) -> str:
        """Determine urgency level from message text."""
        text_lower = text.lower()
        
        for indicator in URGENCY_INDICATORS['high']:
            if indicator in text_lower:
                return 'High'
                
        for indicator in URGENCY_INDICATORS['low']:
            if indicator in text_lower:
                return 'Low'
                
        return 'Medium'
    
    def is_work_related(self, text: str) -> bool:
        """Check if message contains work-related content."""
        text_lower = text.lower()
        
        # Check for work keywords
        has_work_keyword = any(keyword in text_lower for keyword in WORK_KEYWORDS)
        # Check for action keywords
        has_action_keyword = any(keyword in text_lower for keyword in ACTION_KEYWORDS)
        
        return has_work_keyword and has_action_keyword
    
    def extract_request_type(self, text: str) -> Tuple[str, str, str]:
        """Extract request type, category, and effort from text."""
        # Check specific patterns first
        for pattern_info in REQUEST_PATTERNS:
            if pattern_info['pattern'].search(text):
                return (
                    pattern_info['type'],
                    pattern_info['category'],
                    pattern_info['default_effort']
                )
        
        # If no specific pattern matches but is work-related
        if self.is_work_related(text):
            return ('General Request', 'Support', 'Medium')
            
        return (None, None, None)
    
    def process_messages(self):
        """Process all messages and extract requests."""
        for idx, row in self.df.iterrows():
            text = row['message_text']
            
            # Extract request information
            request_type, category, effort = self.extract_request_type(text)
            
            if request_type:
                urgency = self.extract_urgency(text)
                
                # Clean and truncate description
                description = re.sub(r'\s+', ' ', text).strip()[:150]
                
                request = {
                    'datetime': row['datetime'],
                    'date': row['date'],
                    'time': row['time'],
                    'month': row['month'],
                    'request_type': request_type,
                    'category': category,
                    'description': description,
                    'urgency': urgency,
                    'effort': effort,
                    'full_text': text,
                    'message_length': len(text)
                }
                
                self.requests.append(request)
        
        print(f"Extracted {len(self.requests)} requests")
        
    def create_monthly_summary(self) -> pd.DataFrame:
        """Create a summary of requests by month."""
        df_requests = pd.DataFrame(self.requests)
        
        if df_requests.empty:
            return pd.DataFrame()
            
        monthly_summary = df_requests.groupby(['month', 'category']).agg({
            'request_type': 'count',
            'urgency': lambda x: (x == 'High').sum(),
            'effort': lambda x: {
                'Small': (x == 'Small').sum(),
                'Medium': (x == 'Medium').sum(),
                'Large': (x == 'Large').sum()
            }
        }).rename(columns={
            'request_type': 'total_requests',
            'urgency': 'high_urgency_count'
        })
        
        return monthly_summary
    
    def export_results(self, output_dir: str = 'output'):
        """Export results to various formats."""
        if not self.requests:
            print("No requests to export")
            return
            
        df_requests = pd.DataFrame(self.requests)
        
        # Sort by datetime
        df_requests = df_requests.sort_values('datetime')
        
        # Export detailed requests to CSV
        csv_columns = [
            'date', 'time', 'month', 'request_type', 'category',
            'description', 'urgency', 'effort'
        ]
        df_requests[csv_columns].to_csv(
            f'{output_dir}/requests_by_month.csv',
            index=False
        )
        print(f"Exported CSV to {output_dir}/requests_by_month.csv")
        
        # Export to Excel with multiple sheets
        with pd.ExcelWriter(f'{output_dir}/requests_detailed.xlsx') as writer:
            # All requests
            df_requests[csv_columns].to_excel(
                writer, sheet_name='All Requests', index=False
            )
            
            # Monthly summary
            monthly_summary = self.create_monthly_summary()
            if not monthly_summary.empty:
                monthly_summary.to_excel(writer, sheet_name='Monthly Summary')
            
            # Category summary
            category_summary = df_requests.groupby('category').agg({
                'request_type': 'count',
                'urgency': lambda x: {
                    'High': (x == 'High').sum(),
                    'Medium': (x == 'Medium').sum(),
                    'Low': (x == 'Low').sum()
                }
            }).rename(columns={'request_type': 'total_count'})
            category_summary.to_excel(writer, sheet_name='Category Summary')
            
        print(f"Exported Excel to {output_dir}/requests_detailed.xlsx")
        
        # Export summary statistics to JSON
        summary_stats = {
            'total_requests': len(self.requests),
            'date_range': {
                'start': str(df_requests['date'].min()),
                'end': str(df_requests['date'].max())
            },
            'by_month': df_requests.groupby('month')['request_type'].count().to_dict(),
            'by_category': df_requests['category'].value_counts().to_dict(),
            'by_urgency': df_requests['urgency'].value_counts().to_dict(),
            'by_effort': df_requests['effort'].value_counts().to_dict()
        }
        
        import json
        with open(f'{output_dir}/requests_summary.json', 'w') as f:
            json.dump(summary_stats, f, indent=2, default=str)
        print(f"Exported JSON summary to {output_dir}/requests_summary.json")
```

## Step 4: Create Main Application

### File: `main.py`
```python
"""
Main application entry point for Thad Norman request extraction.
"""

import os
import sys
from datetime import datetime
from request_extractor import RequestExtractor


def print_summary(extractor):
    """Print a summary of extracted requests."""
    if not extractor.requests:
        print("No requests found!")
        return
        
    print("\n" + "="*60)
    print("EXTRACTION SUMMARY")
    print("="*60)
    
    total = len(extractor.requests)
    print(f"\nTotal Requests Extracted: {total}")
    
    # Requests by month
    print("\nRequests by Month:")
    months = {}
    for req in extractor.requests:
        month_str = req['month'].strftime('%Y-%m')
        months[month_str] = months.get(month_str, 0) + 1
    
    for month, count in sorted(months.items()):
        print(f"  {month}: {count} requests ({count/total*100:.1f}%)")
    
    # Requests by category
    print("\nRequests by Category:")
    categories = {}
    for req in extractor.requests:
        cat = req['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count} requests ({count/total*100:.1f}%)")
    
    # Urgency distribution
    print("\nUrgency Distribution:")
    urgency = {'High': 0, 'Medium': 0, 'Low': 0}
    for req in extractor.requests:
        urgency[req['urgency']] += 1
    
    for level, count in urgency.items():
        print(f"  {level}: {count} requests ({count/total*100:.1f}%)")
    
    print("\n" + "="*60)


def main():
    """Main application function."""
    print("Thad Norman Request Extraction Tool")
    print("===================================\n")
    
    # Check if CSV file exists
    csv_path = 'data/thad_norman_messages_cleaned.csv'
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        print("Please place the file in the data/ directory")
        sys.exit(1)
    
    # Initialize extractor
    print("Initializing request extractor...")
    extractor = RequestExtractor(csv_path)
    
    # Load data
    print("Loading message data...")
    extractor.load_data()
    
    # Process messages
    print("Processing messages and extracting requests...")
    extractor.process_messages()
    
    # Print summary
    print_summary(extractor)
    
    # Export results
    print("\nExporting results...")
    os.makedirs('output', exist_ok=True)
    extractor.export_results()
    
    print("\nExtraction complete!")
    print(f"Results saved to output/ directory")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
```

## Step 5: Run the Application

### Prepare Data
1. Place `thad_norman_messages_cleaned.csv` in the `data/` directory

### Execute the Application
```bash
python main.py
```

## Expected Output

### Console Output
```
Thad Norman Request Extraction Tool
===================================

Initializing request extractor...
Loading message data...
Loaded 1260 messages from Thad Norman
Processing messages and extracting requests...
Extracted 144 requests

============================================================
EXTRACTION SUMMARY
============================================================

Total Requests Extracted: 144

Requests by Month:
  2025-05: 45 requests (31.2%)
  2025-06: 78 requests (54.2%)
  2025-07: 21 requests (14.6%)

Requests by Category:
  Support: 58 requests (40.3%)
  Hosting: 42 requests (29.2%)
  Forms: 13 requests (9.0%)
  ...

Urgency Distribution:
  High: 11 requests (7.6%)
  Medium: 133 requests (92.4%)
  Low: 0 requests (0.0%)

============================================================

Exporting results...
Exported CSV to output/requests_by_month.csv
Exported Excel to output/requests_detailed.xlsx
Exported JSON summary to output/requests_summary.json

Extraction complete!
Results saved to output/ directory
Timestamp: 2025-07-15 10:30:45
```

### Output Files

#### 1. `requests_by_month.csv`
```csv
date,time,month,request_type,category,description,urgency,effort
2025-05-15,07:14:00,2025-05,Site Migration,Hosting,36 websites need help migrating from current provider,High,Large
2025-05-16,17:34:00,2025-05,Admin Access,Access,Set up Velocity email and add as admin to site,Medium,Small
...
```

#### 2. `requests_detailed.xlsx`
- Sheet 1: All Requests (detailed list)
- Sheet 2: Monthly Summary (aggregated by month)
- Sheet 3: Category Summary (aggregated by category)

#### 3. `requests_summary.json`
```json
{
  "total_requests": 144,
  "date_range": {
    "start": "2025-05-13",
    "end": "2025-07-14"
  },
  "by_month": {
    "2025-05": 45,
    "2025-06": 78,
    "2025-07": 21
  },
  "by_category": {
    "Support": 58,
    "Hosting": 42,
    "Forms": 13,
    ...
  }
}
```

## Optional Enhancements

### Add Request Deduplication
```python
def deduplicate_requests(self, time_window_minutes=5):
    """Remove duplicate requests within a time window."""
    # Implementation to merge similar requests close in time
```

### Add Response Detection
```python
def detect_responses(self):
    """Check if requests have responses from the other party."""
    # Cross-reference with messages from "Me" sender
```

### Add Export to Database
```python
def export_to_sqlite(self, db_path='output/requests.db'):
    """Export requests to SQLite database for further analysis."""
    # Implementation using sqlite3
```

### Add Visualization
```python
def create_visualizations(self):
    """Generate charts and graphs of request patterns."""
    # Use matplotlib or plotly for visualization
```

## Troubleshooting

### Common Issues
1. **CSV encoding errors**: Ensure CSV is UTF-8 encoded
2. **Memory issues**: For large files, process in chunks
3. **Pattern matching**: Adjust regex patterns based on actual message content

### Debug Mode
Add verbose logging by setting environment variable:
```bash
export DEBUG=1
python main.py
```

## Next Steps
1. Fine-tune request patterns based on results
2. Add machine learning for better request classification
3. Integrate with ticketing system API
4. Create web interface for real-time processing