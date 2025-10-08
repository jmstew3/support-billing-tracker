import bcrypt from 'bcryptjs';
import pool from '../db/config.js';

/**
 * User model for authentication
 * Handles user CRUD operations and password management
 */
class User {
  /**
   * Find user by email
   * @param {string} email - User email address
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByEmail(email) {
    try {
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
        [email]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findById(id) {
    try {
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
        [id]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @param {string} userData.email - Email address
   * @param {string} userData.password - Plain text password (will be hashed)
   * @param {string} userData.role - User role ('admin' or 'viewer')
   * @returns {Promise<Object>} Created user object (without password_hash)
   */
  static async create({ email, password, role = 'viewer' }) {
    try {
      // Hash password with bcrypt (10 salt rounds)
      const password_hash = await bcrypt.hash(password, 10);

      const [result] = await pool.execute(
        'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, ?)',
        [email, password_hash, role, true]
      );

      // Return created user without password
      return {
        id: result.insertId,
        email,
        role,
        is_active: true,
        created_at: new Date()
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('User with this email already exists');
      }
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Verify password against stored hash
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Stored password hash
   * @returns {Promise<boolean>} True if password matches
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async updateLastLogin(userId) {
    try {
      await pool.execute(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Update user password
   * @param {number} userId - User ID
   * @param {string} newPassword - New plain text password (will be hashed)
   * @returns {Promise<void>}
   */
  static async updatePassword(userId, newPassword) {
    try {
      const password_hash = await bcrypt.hash(newPassword, 10);
      await pool.execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [password_hash, userId]
      );
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async deactivate(userId) {
    try {
      await pool.execute(
        'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Get all active users
   * @returns {Promise<Array>} Array of user objects (without password_hash)
   */
  static async findAll() {
    try {
      const [users] = await pool.execute(
        'SELECT id, email, role, is_active, created_at, updated_at, last_login_at FROM users WHERE is_active = TRUE ORDER BY created_at DESC'
      );
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }
}

export default User;
