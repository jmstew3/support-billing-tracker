'''
Main application entry point for Thad Norman request extraction.
'''

import os
import sys
from datetime import datetime
from request_extractor import RequestExtractor


def print_summary(extractor):
    '''Print a summary of extracted requests.'''
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
    '''Main application function.'''
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