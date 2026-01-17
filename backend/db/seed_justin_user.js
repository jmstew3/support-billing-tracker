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
 * Seed justin@peakonedigital.com user for both:
 * - Main billing dashboard (users table)
 * - Client portal (client_users table)
 */
async function seedJustinUser() {
  const email = 'justin@peakonedigital.com';
  const password = 'P3ak1digit@l2o26$';
  const name = 'Justin';

  try {
    console.log('Seeding justin@peakonedigital.com...');

    // Hash password with bcrypt (10 salt rounds)
    const password_hash = await bcrypt.hash(password, 10);

    // 1. Create admin user for main billing dashboard
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

    // 2. Create or get PeakOne Digital client for portal
    const [existingClient] = await pool.execute(
      "SELECT id FROM clients WHERE company_name = 'PeakOne Digital'"
    );

    let clientId;
    if (existingClient.length > 0) {
      clientId = existingClient[0].id;
      console.log('Using existing PeakOne Digital client');
    } else {
      const [clientResult] = await pool.execute(
        `INSERT INTO clients (fluent_customer_id, company_name, contact_email, is_active)
         VALUES (?, ?, ?, ?)`,
        ['peakone-internal', 'PeakOne Digital', email, true]
      );
      clientId = clientResult.insertId;
      console.log('Created PeakOne Digital client');
    }

    // 3. Create client portal user
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

    console.log('\nSuccess! justin@peakonedigital.com can now log into:');
    console.log('  - Billing Dashboard: https://billing.peakonedigital.com');
    console.log('  - Client Portal: https://portal.peakonedigital.com');
    console.log('  - Password: P3ak1digit@l2o26$');

  } catch (error) {
    console.error('Error seeding user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
seedJustinUser();
