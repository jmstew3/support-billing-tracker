import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../db/config.js';
import Request from '../models/Request.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function parseCSV(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      // Handle quoted fields properly
      const matches = lines[i].match(/(".*?"|[^,]+)/g);
      if (!matches) continue;

      const values = matches.map(value => {
        // Remove surrounding quotes and unescape internal quotes
        return value.replace(/^"|"$/g, '').replace(/""/g, '"');
      });

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

async function importCSV(filePath, clearExisting = false) {
  try {
    // Parse CSV file
    const data = await parseCSV(filePath);

    // Clear existing data if requested
    if (clearExisting) {
      await pool.execute('DELETE FROM requests');
    }

    // Import each row
    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const row of data) {
      try {
        const request = new Request({
          date: row.date,
          time: row.time,
          request_type: row.request_type || 'General Request',
          category: row.category || 'Support',
          description: row.description || row.Request_Summary,
          urgency: row.urgency || 'MEDIUM',
          effort: row.effort || 'Medium',
          status: row.status || 'active'
        });

        await request.save();
        imported++;

        // Show progress
        if (imported % 10 === 0) {
          process.stdout.write(`\r✅ Imported: ${imported}/${data.length}`);
        }
      } catch (error) {
        failed++;
        errors.push({
          row: row.date + ' ' + row.time,
          error: error.message
        });
      }
    }

    return { imported, failed, errors };
  } catch (error) {
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  // Default CSV path
  let csvPath = join(__dirname, '../../data/03_final/thad_requests_table.csv');
  let clearExisting = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      csvPath = args[i + 1];
      i++;
    } else if (args[i] === '--clear') {
      clearExisting = true;
    } else if (args[i] === '--help') {
      process.exit(0);
    }
  }

  try {
    // Test database connection
    const connection = await pool.getConnection();
    connection.release();

    // Check if file exists
    await fs.access(csvPath);

    // Run import
    await importCSV(csvPath, clearExisting);

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parseCSV, importCSV };