/**
 * Safe CSV Parser Utility
 *
 * Provides ReDoS-safe CSV parsing without vulnerable regex patterns.
 * Uses state machine approach for reliable parsing.
 */

/**
 * Parse a single CSV line into an array of values
 * Handles:
 * - Quoted fields (including fields with commas inside quotes)
 * - Escaped quotes (double quotes "" become single ")
 * - Empty fields
 * - Whitespace trimming
 *
 * @param {string} line - A single CSV line to parse
 * @param {string} delimiter - Field delimiter (default: ',')
 * @returns {string[]} Array of field values
 */
export function parseCSVLine(line, delimiter = ',') {
  const values = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
        continue;
      }
      if (char === delimiter) {
        // End of field
        values.push(current.trim());
        current = '';
        i++;
        continue;
      }
      current += char;
      i++;
    }
  }

  // Don't forget the last field
  values.push(current.trim());

  return values;
}

/**
 * Parse complete CSV content into an array of row objects
 * First row is treated as header row
 *
 * @param {string} csvContent - Complete CSV content
 * @param {Object} options - Parsing options
 * @param {string} options.delimiter - Field delimiter (default: ',')
 * @param {number} options.maxRows - Maximum rows to parse (default: 10000)
 * @param {number} options.maxLineLength - Maximum line length (default: 10000)
 * @returns {{ headers: string[], rows: Object[], errors: Array<{line: number, error: string}> }}
 */
export function parseCSV(csvContent, options = {}) {
  const {
    delimiter = ',',
    maxRows = 10000,
    maxLineLength = 10000
  } = options;

  const result = {
    headers: [],
    rows: [],
    errors: []
  };

  if (!csvContent || typeof csvContent !== 'string') {
    result.errors.push({ line: 0, error: 'Invalid CSV content' });
    return result;
  }

  // Split into lines, handling both \n and \r\n
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

  if (lines.length < 1) {
    result.errors.push({ line: 0, error: 'CSV is empty' });
    return result;
  }

  // Parse header row
  result.headers = parseCSVLine(lines[0], delimiter);

  // Parse data rows
  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) continue;

    // Check line length to prevent DoS
    if (line.length > maxLineLength) {
      result.errors.push({
        line: i + 1,
        error: `Line exceeds maximum length of ${maxLineLength} characters`
      });
      continue;
    }

    try {
      const values = parseCSVLine(line, delimiter);
      const row = {};

      result.headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      result.rows.push(row);
    } catch (err) {
      result.errors.push({ line: i + 1, error: err.message });
    }
  }

  // Warn if rows were truncated
  if (lines.length > maxRows + 1) {
    result.errors.push({
      line: maxRows + 1,
      error: `CSV truncated: only first ${maxRows} rows processed`
    });
  }

  return result;
}

export default {
  parseCSVLine,
  parseCSV
};
