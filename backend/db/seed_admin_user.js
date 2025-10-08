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
 * Seed initial admin user
 * Uses ADMIN_EMAIL and ADMIN_PASSWORD from environment variables
 */
async function seedAdminUser() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@peakonedigital.com';
    const password = process.env.ADMIN_PASSWORD || '***REMOVED***';

    // Check if admin user already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.log('✅ Admin user already exists:', email);
      return;
    }

    // Hash password with bcrypt (10 salt rounds)
    const password_hash = await bcrypt.hash(password, 10);

    // Insert admin user
    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, ?)',
      [email, password_hash, 'admin', true]
    );

    console.log('✅ Admin user created successfully');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   User ID:', result.insertId);
    console.log('\n⚠️  Please change the default password after first login!');
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
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
