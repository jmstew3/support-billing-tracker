import bcrypt from 'bcryptjs';
import pool from './config.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Seed admin user for the billing dashboard (and optionally client portal).
 *
 * CLI args:
 *   --email <email>     Override ADMIN_EMAIL env var
 *   --name <name>       Display name (default: parsed from email)
 *   --portal            Also create/update client portal user
 *   --company <name>    Company name for client portal (default: "PeakOne Digital")
 *   --help              Show usage
 *
 * Env vars:
 *   ADMIN_EMAIL          Default email (fallback: admin@peakonedigital.com)
 *   ADMIN_PASSWORD       Required — password to set
 *   ADMIN_NAME           Default display name
 */

function parseArgs(argv) {
  const args = { portal: false };
  let i = 2; // skip node + script path
  while (i < argv.length) {
    switch (argv[i]) {
      case '--email':
        args.email = argv[++i];
        break;
      case '--name':
        args.name = argv[++i];
        break;
      case '--portal':
        args.portal = true;
        break;
      case '--company':
        args.company = argv[++i];
        break;
      case '--help':
        args.help = true;
        break;
      default:
        console.error(`Unknown argument: ${argv[i]}`);
        process.exit(1);
    }
    i++;
  }
  return args;
}

function printUsage() {
  console.log(`Usage: node db/seed_admin_user.js [options]

Options:
  --email <email>     Email address (default: ADMIN_EMAIL or admin@peakonedigital.com)
  --name <name>       Display name (default: ADMIN_NAME or parsed from email)
  --portal            Also create/update client portal user
  --company <name>    Company name for portal (default: "PeakOne Digital")
  --help              Show this help message

Environment variables:
  ADMIN_EMAIL          Default email address
  ADMIN_PASSWORD       Required — password to hash and store
  ADMIN_NAME           Default display name

Examples:
  node db/seed_admin_user.js
  node db/seed_admin_user.js --email sarah@example.com --name Sarah
  node db/seed_admin_user.js --portal --company "PeakOne Digital"`);
}

async function seedAdminUser() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const email = args.email || process.env.ADMIN_EMAIL || 'admin@peakonedigital.com';
  const password = process.env.ADMIN_PASSWORD;
  const name = args.name || process.env.ADMIN_NAME || email.split('@')[0];
  const company = args.company || 'PeakOne Digital';

  if (!password) {
    console.error('Error: ADMIN_PASSWORD environment variable is required.');
    console.error('Set it in your .env file or pass it directly:');
    console.error('  ADMIN_PASSWORD=yourpassword node db/seed_admin_user.js');
    process.exit(1);
  }

  try {
    console.log(`Seeding admin user: ${email}...`);

    const password_hash = await bcrypt.hash(password, 10);

    // 1. Create or update admin user for billing dashboard
    const [existingAdmin] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists, updating password...');
      await pool.execute(
        'UPDATE users SET password_hash = ?, is_active = TRUE WHERE email = ?',
        [password_hash, email]
      );
    } else {
      await pool.execute(
        'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, ?)',
        [email, password_hash, 'admin', true]
      );
      console.log('Created admin user for billing dashboard');
    }

    // 2. Optionally create client portal user
    if (args.portal) {
      // Create or get client record
      const [existingClient] = await pool.execute(
        'SELECT id FROM clients WHERE company_name = ?',
        [company]
      );

      let clientId;
      if (existingClient.length > 0) {
        clientId = existingClient[0].id;
        console.log(`Using existing client: ${company}`);
      } else {
        const slugId = company.toLowerCase().replace(/\s+/g, '-');
        const [clientResult] = await pool.execute(
          `INSERT INTO clients (fluent_customer_id, company_name, contact_email, is_active)
           VALUES (?, ?, ?, ?)`,
          [`${slugId}-internal`, company, email, true]
        );
        clientId = clientResult.insertId;
        console.log(`Created client: ${company}`);
      }

      // Create or update client portal user
      const [existingClientUser] = await pool.execute(
        'SELECT id FROM client_users WHERE email = ?',
        [email]
      );

      if (existingClientUser.length > 0) {
        console.log('Client portal user already exists, updating...');
        await pool.execute(
          'UPDATE client_users SET password_hash = ?, client_id = ?, is_active = TRUE WHERE email = ?',
          [password_hash, clientId, email]
        );
      } else {
        await pool.execute(
          `INSERT INTO client_users (client_id, email, password_hash, name, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          [clientId, email, password_hash, name, true]
        );
        console.log('Created client portal user');
      }
    }

    console.log(`\nSuccess! ${email} can now log into the Billing Dashboard.`);
    if (args.portal) {
      console.log(`Client portal access also configured (${company}).`);
    }
  } catch (error) {
    console.error('Error seeding user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdminUser();
}

export default seedAdminUser;
