import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'thad_chat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database schema
export async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    // Check if the requests table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'requests'"
    );

    if (tables.length === 0) {
      console.log('📋 Creating database schema...');
      // Note: In production, you'd run the schema.sql file
      console.log('Please run the schema.sql file to create the database tables');
      console.log('mysql -u root -p < db/schema.sql');
    } else {
      console.log('✅ Database schema already exists');
    }

    connection.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export default pool;