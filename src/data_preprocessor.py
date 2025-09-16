import csv
import re

def clean_message_text(text):
    """
    Cleans a raw message string by removing control characters, known artifacts,
    and fixing common malformed prefixes.
    """
    if not text:
        return ""

    # 0. Remove NSAttributedString artifacts from export_imessages.py output
    # Pattern: "streamtyped @ [any NS* classes] +"
    text = re.sub(r'^streamtyped\s+@\s+[^+]+\+', '', text)

    # 1. Remove specific non-printable or problematic characters
    text = text.replace('￼', '')  # Object replacement character
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', text)  # Control characters

    # 2. Remove iMessage/macOS specific artifacts like 'iI...NSDictionary'
    text = re.sub(r'iI.*(NSDictionary)?$', '', text)

    # 3. Remove leading '+' which seems to be a common artifact
    if text.startswith('+'):
        text = text[1:]

    # 4. Fix specific malformed prefixes using a dictionary for clarity.
    # This combines the logic from the various script versions.
    patterns = {
        'TGood': 'Good', 'GLmk': 'Lmk', 'GI have': 'I have', "JDon't": "Don't",
        'kAwesome': 'Awesome', "nThey're": "They're", '.Good': 'Good',
        '/Laughed': 'Laughed', 'lIt is': 'It is', 'lYeah': 'Yeah',
        'cI have': 'I have', 'oLiked': 'Liked', 'CLiked': 'Liked',
        'eSHIP': 'SHIP', '9Ooh': 'Ooh', '4Knew': 'Knew', 'qMaj': 'Maj',
        'KVery': 'Very', '*Nice': 'Nice', '7Yes': 'Yes', '7All': 'All',
        'LLove': 'Love', 'JDon': 'Don',
        # New patterns found in the data
        'iUp': 'Up', 'JBlueHost': 'BlueHost', '/They': 'They', '2They': 'They',
        'lI': 'I', 'oK': 'OK', 'jI': 'I', 'OCan': 'Can', 'kGood': 'Good',
        'SWe': 'We', 'rOperation': 'Operation', '0Phantom': 'Phantom',
        'QLiked': 'Liked', '0Emphasized': 'Emphasized', '%Emphasized': 'Emphasized',
        "'Got": 'Got', '.Dropping': 'Dropping',
        # Additional patterns from recent data
        'AGood': 'Good', 'JPlease': 'Please', 'AAll': 'All', 'JI': 'I',
        'AGot': 'Got', 'JThey': 'They', 'AThank': 'Thank', 'JThanks': 'Thanks',
        'AYeah': 'Yeah', 'JYes': 'Yes', 'ANice': 'Nice', 'JGood': 'Good',
        'ASounds': 'Sounds', 'JLet': 'Let', 'AWe': 'We', 'JWe': 'We'
    }
    for bad_start, good_start in patterns.items():
        if text.startswith(bad_start):
            text = good_start + text[len(bad_start):]
            break  # Assume only one such prefix needs fixing
    
    # 5. Handle single character prefixes - comprehensive iMessage artifact removal
    # More aggressive approach to catch all single character artifacts
    if len(text) > 1:
        first_char = text[0]
        rest_of_text = text[1:]
        
        # Check if this looks like a single character artifact
        # Criteria: first character is likely an artifact if:
        # 1. It's a single letter/number/symbol AND
        # 2. The rest starts with what looks like a real word/sentence
        
        is_likely_artifact = False
        
        # Pattern 1: Single char + uppercase letter (most common)
        # Examples: "BAlright", "LI think", "KI can't", "4I'm", etc.
        if rest_of_text and rest_of_text[0].isupper():
            # Single letter/digit/symbol + uppercase = likely artifact
            is_likely_artifact = (
                first_char.isalnum() or  # letter or number
                first_char in '.,[]{}()<>!@#$%^&*-+=|\\:;"\'`~_?/><'  # common symbols
            )
        
        # Pattern 2: Single char + punctuation + common word starters  
        # Examples: "K, I'm", "B. We", etc.
        if not is_likely_artifact and len(rest_of_text) > 3:
            if rest_of_text[0] in '.,;:!?' and rest_of_text[1] == ' ':
                # Check what follows the punctuation and space
                after_punct = rest_of_text[2:]
                common_starters = ['I\'', 'I ', 'The', 'They', 'This', 'That', 'We', 'You', 'He', 'She', 'It',
                                  'Can', 'Will', 'Could', 'Would', 'Should', 'Please', 'Let', 'All', 'Good',
                                  'Yes', 'No', 'OK', 'Alright', 'Sure', 'Thanks', 'Thank']
                
                for starter in common_starters:
                    if after_punct.startswith(starter):
                        is_likely_artifact = True
                        # For this case, we want to replace with "OK" not just remove
                        if first_char.upper() in 'K' and rest_of_text.startswith(', '):
                            text = 'OK' + rest_of_text
                        else:
                            text = rest_of_text
                        break
                        
        # Pattern 3: Single char + common word starters (no punctuation)
        # Examples: "]I'll", "#I'm", "_They", etc.
        if not is_likely_artifact and len(rest_of_text) > 2:
            common_starters = ['I\'', 'I ', 'The', 'They', 'This', 'That', 'We', 'You', 'He', 'She', 'It', 
                              'Can', 'Will', 'Could', 'Would', 'Should', 'Please', 'Let', 'All', 'Good', 
                              'Yes', 'No', 'OK', 'Alright', 'Sure', 'Thanks', 'Thank']
            
            for starter in common_starters:
                if rest_of_text.startswith(starter):
                    is_likely_artifact = True
                    break
        
        # Apply the fix if it looks like an artifact
        if is_likely_artifact:
            text = rest_of_text

    # 6. Remove iMessage reaction prefixes that should be filtered out entirely
    # Check for these patterns anywhere in the text, not just at the beginning
    if any(phrase in text for phrase in ['Emphasized "', 'Liked "', 'Disliked "']):
        return ""  # Return empty string for these reaction messages
    
    # Also check for these patterns with just space after (no quotes)
    reaction_patterns = [
        r'.*Emphasized\s+.*$',       # Matches 'Emphasized ' anywhere in text
        r'.*Liked\s+.*$',           # Matches 'Liked ' anywhere in text
        r'.*Disliked\s+.*$'         # Matches 'Disliked ' anywhere in text
    ]
    
    for pattern in reaction_patterns:
        if re.match(pattern, text):
            return ""  # Return empty string for these reaction messages
    
    # 7. Clean up doubled quotes, a common artifact from CSV exporting
    if text.startswith('""') and text.endswith('""'):
        text = text[1:-1]

    # 8. Final strip of any leading/trailing whitespace
    return text.strip()

def process_csv(input_file, output_file):
    """Reads a CSV, cleans the 'message_text' or 'message' column, and writes to a new CSV."""
    try:
        with open(input_file, 'r', encoding='utf-8') as infile, \
             open(output_file, 'w', encoding='utf-8', newline='') as outfile:

            reader = csv.DictReader(infile)
            if not reader.fieldnames:
                print(f"Error: Input file '{input_file}' is empty or has no header.")
                return

            # Map the new format to expected format for downstream processing
            output_fieldnames = reader.fieldnames.copy()

            # If we have the new export format, rename columns for compatibility
            if 'message' in reader.fieldnames and 'message_text' not in reader.fieldnames:
                output_fieldnames = [
                    'message_text' if col == 'message' else
                    'message_date' if col == 'sent_at' else
                    col for col in output_fieldnames
                ]

            writer = csv.DictWriter(outfile, fieldnames=output_fieldnames)
            writer.writeheader()

            row_count = 0
            for row in reader:
                # Handle both old and new column names
                if 'message' in row:
                    cleaned_text = clean_message_text(row.get('message'))
                    row['message'] = cleaned_text
                    # Map to expected column names
                    if 'sent_at' in row:
                        row['message_date'] = row.pop('sent_at')
                    row['message_text'] = row.pop('message')
                elif 'message_text' in row:
                    row['message_text'] = clean_message_text(row.get('message_text'))

                writer.writerow(row)
                row_count += 1

        print(f"Processed {row_count} rows. Cleaned data saved to: {output_file}")
    except FileNotFoundError:
        print(f"Error: Input file not found at '{input_file}'")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    # Process the new export from export_imessages.py
    input_csv_path = "/Users/justinstewart/thad-chat/data/01_raw/thad_messages_export.csv"
    output_csv_path = "/Users/justinstewart/thad-chat/data/02_processed/thad_messages_cleaned.csv"
    process_csv(input_csv_path, output_csv_path)