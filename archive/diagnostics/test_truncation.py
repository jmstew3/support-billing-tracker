#!/usr/bin/env python3
"""
Smoke test to verify text truncation in the request extraction pipeline
"""

import pandas as pd
import sys

def check_truncation():
    """Check for truncated text in the CSV output"""

    # Read the CSV file
    csv_file = '/Users/justinstewart/thad-chat/frontend/public/thad_requests_table.csv'
    df = pd.read_csv(csv_file)

    print("=== Text Truncation Analysis ===\n")

    # Check for common truncation patterns
    truncation_indicators = [
        ' t$',  # ends with single letter after space
        ' th$',  # ends mid-word
        ' the$',  # ends on common word
        '\.\.\.$',  # ends with ellipsis
        '[a-z],$',  # ends with lowercase letter and comma
        '[a-z]\.$',  # ends with lowercase letter and period
    ]

    truncated_count = 0
    total_count = len(df)

    print(f"Total requests: {total_count}")
    print(f"\nChecking for truncated descriptions...\n")

    # Check each description
    for idx, row in df.iterrows():
        desc = str(row['description'])
        desc_len = len(desc)

        # Check if length is exactly 150 (the truncation limit in request_extractor.py)
        if desc_len == 150:
            truncated_count += 1
            print(f"Row {idx + 1}: TRUNCATED at exactly 150 chars")
            print(f"  Date: {row['date']}")
            print(f"  Text: ...{desc[-30:]}")
            print()
        elif desc_len > 145 and desc[-1] not in '.!?"':
            # Check if it ends suspiciously (near limit without proper ending)
            truncated_count += 1
            print(f"Row {idx + 1}: LIKELY TRUNCATED (length: {desc_len})")
            print(f"  Date: {row['date']}")
            print(f"  Text: ...{desc[-30:]}")
            print()

    print(f"\n=== Summary ===")
    print(f"Found {truncated_count} truncated descriptions out of {total_count} total")
    print(f"Truncation rate: {(truncated_count/total_count)*100:.1f}%")

    # Show the specific example mentioned
    print(f"\n=== Specific Example Check ===")
    google_ads = df[df['description'].str.contains('Google Ads tag', na=False)]
    if not google_ads.empty:
        for idx, row in google_ads.iterrows():
            print(f"Google Ads request:")
            print(f"  Date: {row['date']}")
            print(f"  Length: {len(row['description'])} chars")
            print(f"  Full text: {row['description']}")
            print(f"  Ends at: '{row['description'][-20:]}'")

    print("\n=== Root Cause ===")
    print("The truncation is happening in:")
    print("  File: /Users/justinstewart/thad-chat/src/thad-request-extractor/request_extractor.py")
    print("  Line 126: description = re.sub(r'\\s+', ' ', text).strip()[:150]")
    print("\nThe [:150] slice is limiting all descriptions to 150 characters maximum.")

    print("\n=== Solution ===")
    print("To fix this, you need to:")
    print("1. Remove or increase the [:150] limit in request_extractor.py")
    print("2. Re-run the request extractor to regenerate the CSV with full text")
    print("3. Copy the new CSV to frontend/public/thad_requests_table.csv")

if __name__ == "__main__":
    check_truncation()