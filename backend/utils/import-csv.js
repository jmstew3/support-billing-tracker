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
    console.error('Error parsing CSV:', error);
    throw error;
  }
}

async function importCSV(filePath, clearExisting = false) {
  console.log(`📂 Importing CSV from: ${filePath}`);

  try {
    // Parse CSV file
    const data = await parseCSV(filePath);
    console.log(`📊 Found ${data.length} rows to import`);

    // Clear existing data if requested
    if (clearExisting) {
      console.log('🗑️ Clearing existing data...');
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

    console.log('\n');
    console.log('📊 Import Summary:');
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n⚠️ First 10 errors:');
      errors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.row}: ${err.error}`);
      });
    }

    return { imported, failed, errors };
  } catch (error) {
    console.error('❌ Import failed:', error.message);
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
      console.log(`
CSV Import Script for Thad Chat Dashboard

Usage:
  npm run import [options]

Options:
  --file <path>   Path to CSV file (default: data/03_final/thad_requests_table.csv)
  --clear         Clear existing data before import
  --help          Show this help message

Examples:
  npm run import                            # Import default CSV
  npm run import --clear                    # Clear data and import
  npm run import --file custom.csv          # Import custom CSV
  npm run import --file custom.csv --clear  # Clear and import custom CSV
      `);
      process.exit(0);
    }
  }

  try {
    // Test database connection
    const connection = await pool.getConnection();
    console.log('✅ Database connected');
    connection.release();

    // Check if file exists
    await fs.access(csvPath);

    // Run import
    await importCSV(csvPath, clearExisting);

    // Show final statistics
    const [result] = await pool.execute('SELECT COUNT(*) as count FROM requests WHERE status = "active"');
    console.log(`\n📊 Total active requests in database: ${result[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    if (error.code === 'ENOENT') {
      console.error(`File not found: ${csvPath}`);
      console.log('Make sure the CSV file exists at the specified path.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Cannot connect to MySQL. Make sure MySQL is running.');
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parseCSV, importCSV };