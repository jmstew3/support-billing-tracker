#!/usr/bin/env python3
"""
Unified CLI tool for Thad-Norman chat analysis
Combines data cleaning, request extraction, and export functionality
"""

import argparse
import json
import os
import sys
import pandas as pd
from datetime import datetime
from pathlib import Path

# Import our modules
sys.path.append('src')
sys.path.append('src/thad-request-extractor')
from data_preprocessor import clean_message_text, process_csv
from request_extractor import RequestExtractor


def setup_directories():
    """Create necessary directories if they don't exist."""
    directories = [
        'data/01_raw', 'data/02_processed', 'data/03_final',
        'data/01_raw/archive', 'data/02_processed/archive',
        'output'
    ]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True, parents=True)


def clean_data(input_file: str, output_file: str) -> bool:
    """Clean the raw message data."""
    print("🧹 Cleaning message data...")
    
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        return False
    
    try:
        process_csv(input_file, output_file)
        print(f"✅ Data cleaned and saved to: {output_file}")
        return True
    except Exception as e:
        print(f"❌ Error cleaning data: {e}")
        return False


def extract_requests(csv_file: str, output_dir: str) -> bool:
    """Extract requests from cleaned message data."""
    print("🔍 Extracting requests...")
    
    if not os.path.exists(csv_file):
        print(f"❌ Cleaned CSV file not found: {csv_file}")
        return False
    
    try:
        extractor = RequestExtractor(csv_file)
        extractor.load_data()
        extractor.process_messages()
        
        if not extractor.requests:
            print("⚠️  No requests found in the data")
            return False
        
        extractor.export_results(output_dir)
        return True
    except Exception as e:
        print(f"❌ Error extracting requests: {e}")
        return False


def generate_summary(output_dir: str):
    """Generate and print a summary of the results."""
    summary_file = os.path.join(output_dir, 'requests_summary.json')
    
    if not os.path.exists(summary_file):
        print("⚠️  Summary file not found")
        return
    
    with open(summary_file, 'r') as f:
        summary = json.load(f)
    
    print("\n" + "="*60)
    print("📊 ANALYSIS SUMMARY")
    print("="*60)
    
    print(f"\n📈 Total Requests: {summary['total_requests']}")
    print(f"📅 Date Range: {summary['date_range']['start']} to {summary['date_range']['end']}")
    
    print("\n📊 Requests by Category:")
    for category, count in sorted(summary['by_category'].items(), key=lambda x: x[1], reverse=True):
        percentage = (count / summary['total_requests']) * 100
        print(f"  {category}: {count} ({percentage:.1f}%)")
    
    print("\n🔥 Urgency Distribution:")
    for urgency, count in summary['by_urgency'].items():
        percentage = (count / summary['total_requests']) * 100
        print(f"  {urgency}: {count} ({percentage:.1f}%)")
    
    print("\n💪 Effort Distribution:")
    for effort, count in summary['by_effort'].items():
        percentage = (count / summary['total_requests']) * 100
        print(f"  {effort}: {count} ({percentage:.1f}%)")
    
    print("\n📅 Monthly Breakdown:")
    for month, count in sorted(summary['by_month'].items()):
        percentage = (count / summary['total_requests']) * 100
        print(f"  {month}: {count} ({percentage:.1f}%)")
    
    print("\n" + "="*60)
    print(f"📁 Results saved in: {output_dir}/")
    print("  - requests_by_month.csv (detailed data)")
    print("  - requests_detailed.xlsx (Excel workbook)")  
    print("  - requests_summary.json (summary stats)")


def prepare_frontend_data(output_dir: str, frontend_dir: str):
    """Prepare data for frontend consumption."""
    print("🎨 Preparing data for frontend...")
    
    summary_file = os.path.join(output_dir, 'requests_summary.json')
    csv_file = os.path.join(output_dir, 'requests_by_month.csv')
    
    if not os.path.exists(summary_file) or not os.path.exists(csv_file):
        print("⚠️  Required data files not found")
        return
    
    import shutil
    
    # Copy to data/03_final/ directory
    final_data_dir = 'data/03_final'
    Path(final_data_dir).mkdir(exist_ok=True, parents=True)
    final_csv = os.path.join(final_data_dir, 'thad_requests_table.csv')
    shutil.copy2(csv_file, final_csv)
    print(f"✅ Data saved to: {final_csv}")
    
    # Also copy to frontend public directory for backwards compatibility
    frontend_public = os.path.join(frontend_dir, 'public')
    if os.path.exists(frontend_public):
        shutil.copy2(csv_file, os.path.join(frontend_public, 'thad_requests_table.csv'))
        print(f"✅ Data copied to frontend: {frontend_public}/thad_requests_table.csv")


def main():
    parser = argparse.ArgumentParser(description="Thad-Norman Chat Analysis Tool")
    parser.add_argument('--input', '-i', 
                       default='data/01_raw/thad_norman_messages_complete.csv',
                       help='Input CSV file path (default: golden master)')
    parser.add_argument('--clean', '-c', action='store_true',
                       help='Clean the input data only')
    parser.add_argument('--extract', '-e', action='store_true', 
                       help='Extract requests only (requires cleaned data)')
    parser.add_argument('--frontend', '-f', action='store_true',
                       help='Prepare data for frontend')
    parser.add_argument('--output-dir', '-o', default='output',
                       help='Output directory for results')
    
    args = parser.parse_args()
    
    # Setup directories
    setup_directories()
    
    # Define file paths using new organized structure
    input_file = args.input
    cleaned_file = 'data/02_processed/thad_norman_messages_cleaned.csv'
    output_dir = args.output_dir
    
    # Ensure output directory exists
    Path(output_dir).mkdir(exist_ok=True)
    
    success = True
    
    # Process based on arguments
    if args.clean:
        # Clean data only
        success = clean_data(input_file, cleaned_file)
    elif args.extract:
        # Extract requests only
        success = extract_requests(cleaned_file, output_dir)
    elif args.frontend:
        # Prepare for frontend
        prepare_frontend_data(output_dir, 'frontend')
    else:
        # Full pipeline
        print("🚀 Running full analysis pipeline...")
        
        # Step 1: Clean data
        success = clean_data(input_file, cleaned_file)
        
        if success:
            # Step 2: Extract requests
            success = extract_requests(cleaned_file, output_dir)
        
        if success:
            # Step 3: Generate summary
            generate_summary(output_dir)
            
            # Step 4: Prepare frontend data
            if os.path.exists('frontend'):
                prepare_frontend_data(output_dir, 'frontend')
    
    if success:
        print(f"\n✅ Analysis completed successfully!")
        if not (args.clean or args.extract or args.frontend):
            print(f"📁 Results saved to:")
            print(f"   - {output_dir}/ (detailed analysis)")
            print(f"   - data/03_final/ (application data)")
            print(f"   - frontend/public/ (symlinked for React app)")
    else:
        print(f"\n❌ Analysis failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()