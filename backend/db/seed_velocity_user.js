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
 * Seed Velocity client portal user
 * Uses VELOCITY_PASSWORD from environment variables
 * Requires the Velocity client record to exist (created by 013_seed_velocity_client.sql)
 */
async function seedVelocityUser() {
  const email = 'thad@velocity-seo.com';
  const password = process.env.VELOCITY_PASSWORD;
  const name = 'Velocity Admin';

  if (!password) {
    console.error('Error: VELOCITY_PASSWORD environment variable is required.');
    console.error('Set it in your .env file or pass it directly:');
    console.error('  VELOCITY_PASSWORD=yourpassword node backend/db/seed_velocity_user.js');
    process.exit(1);
  }

  try {
    console.log(`Seeding ${email}...`);

    // Verify Velocity client exists
    const [clients] = await pool.execute(
      "SELECT id FROM clients WHERE company_name = 'Velocity'"
    );

    if (clients.length === 0) {
      console.error('Error: Velocity client record not found.');
      console.error('Run migration 013_seed_velocity_client.sql first.');
      process.exit(1);
    }

    const clientId = clients[0].id;

    // Hash password with bcrypt (10 salt rounds)
    const password_hash = await bcrypt.hash(password, 10);

    // Create or update client portal user
    const [existing] = await pool.execute(
      'SELECT id FROM client_users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.log('Client portal user already exists, updating password...');
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

    console.log(`\nSuccess! ${email} can now log into the client portal.`);

  } catch (error) {
    console.error('Error seeding user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
seedVelocityUser();
