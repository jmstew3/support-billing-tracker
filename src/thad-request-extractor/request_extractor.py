"""
Core module for extracting requests from text messages.
"""

import pandas as pd
import re
from datetime import datetime
from typing import List, Dict, Tuple
from request_patterns import REQUEST_PATTERNS, URGENCY_INDICATORS, ACTION_KEYWORDS, WORK_KEYWORDS, EXCLUSION_PATTERNS, NON_REQUEST_PHRASES


class RequestExtractor:
    def __init__(self, csv_path: str):
        """Initialize the extractor with the CSV file path."""
        self.csv_path = csv_path
        self.df = None
        self.requests = []
        
    def load_data(self):
        """Load the CSV file into a pandas DataFrame."""
        self.df = pd.read_csv(self.csv_path)
        # Filter for Thad's messages only (handle both 'Thad Norman' and 'Them' formats)
        self.df = self.df[
            ((self.df['sender'] == 'Thad Norman') | (self.df['sender'] == 'Them')) &
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
    
    def is_excluded_message(self, text: str) -> bool:
        """Check if message should be excluded (conversational, not a request)."""
        text_lower = text.lower().strip()
        
        # Exclude iMessage reactions - these should never be considered requests
        if any(phrase in text for phrase in ['Emphasized "', 'Liked "', 'Disliked "']):
            return True
        
        # Also check for these patterns anywhere in the text (broader catch)
        if any(keyword in text_lower for keyword in ['emphasized ', 'liked ', 'disliked ']):
            return True
        
        # Check exclusion patterns
        for pattern in EXCLUSION_PATTERNS:
            if pattern.search(text):
                return True
        
        # Check for standalone conversational phrases
        for phrase in NON_REQUEST_PHRASES:
            if text_lower.startswith(phrase.lower()):
                return True
        
        # Exclude very short messages (likely conversational)
        if len(text_lower.split()) <= 2 and text_lower not in ['please help', 'need help']:
            return True
            
        return False
    
    def is_work_related(self, text: str) -> bool:
        """Check if message contains work-related content."""
        text_lower = text.lower()
        
        # First check if it should be excluded
        if self.is_excluded_message(text):
            return False
        
        # Check for work keywords
        has_work_keyword = any(keyword in text_lower for keyword in WORK_KEYWORDS)
        # Check for action keywords
        has_action_keyword = any(keyword in text_lower for keyword in ACTION_KEYWORDS)
        
        return has_work_keyword and has_action_keyword
    
    def extract_request_type(self, text: str) -> Tuple[str, str, str]:
        """Extract request type, category, and effort from text."""
        # Check exclusions FIRST (conservative filtering)
        if self.is_excluded_message(text):
            return (None, None, None)
            
        # Check specific patterns
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
                
                # Clean description (no truncation)
                description = re.sub(r'\s+', ' ', text).strip()
                
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
        
        # Convert month to string for JSON compatibility
        df_requests['month_str'] = df_requests['month'].astype(str)

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
            'by_month': df_requests.groupby('month_str')['request_type'].count().to_dict(),
            'by_category': df_requests['category'].value_counts().to_dict(),
            'by_urgency': df_requests['urgency'].value_counts().to_dict(),
            'by_effort': df_requests['effort'].value_counts().to_dict()
        }
        
        import json
        with open(f'{output_dir}/requests_summary.json', 'w') as f:
            json.dump(summary_stats, f, indent=2, default=str)
        print(f"Exported JSON summary to {output_dir}/requests_summary.json")