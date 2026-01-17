import bcrypt from 'bcryptjs';
import pool from '../db/config.js';

/**
 * ClientUser model for client portal authentication
 * Handles client user CRUD operations and password management
 * Separate from internal User model for security isolation
 */
class ClientUser {
  /**
   * Find client user by email
   * @param {string} email - User email address
   * @returns {Promise<Object|null>} Client user object or null if not found
   */
  static async findByEmail(email) {
    try {
      const [users] = await pool.execute(
        `SELECT cu.*, c.company_name, c.logo_url, c.fluent_customer_id, c.twenty_brand_id
         FROM client_users cu
         JOIN clients c ON cu.client_id = c.id
         WHERE cu.email = ? AND cu.is_active = TRUE AND c.is_active = TRUE`,
        [email]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding client user by email:', error);
      throw error;
    }
  }

  /**
   * Find client user by ID
   * @param {number} id - Client user ID
   * @returns {Promise<Object|null>} Client user object or null if not found
   */
  static async findById(id) {
    try {
      const [users] = await pool.execute(
        `SELECT cu.*, c.company_name, c.logo_url, c.fluent_customer_id, c.twenty_brand_id
         FROM client_users cu
         JOIN clients c ON cu.client_id = c.id
         WHERE cu.id = ? AND cu.is_active = TRUE AND c.is_active = TRUE`,
        [id]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding client user by ID:', error);
      throw error;
    }
  }

  /**
   * Find all users for a specific client
   * @param {number} clientId - Client ID
   * @returns {Promise<Array>} Array of client user objects (without password_hash)
   */
  static async findByClientId(clientId) {
    try {
      const [users] = await pool.execute(
        `SELECT id, client_id, email, name, is_active, last_login_at, created_at, updated_at
         FROM client_users
         WHERE client_id = ? AND is_active = TRUE
         ORDER BY created_at DESC`,
        [clientId]
      );
      return users;
    } catch (error) {
      console.error('Error finding client users by client ID:', error);
      throw error;
    }
  }

  /**
   * Create new client user (admin-created only)
   * @param {Object} userData - User data
   * @param {number} userData.clientId - Client ID
   * @param {string} userData.email - Email address
   * @param {string} userData.password - Plain text password (will be hashed)
   * @param {string} [userData.name] - User's display name
   * @returns {Promise<Object>} Created user object (without password_hash)
   */
  static async create({ clientId, email, password, name = null }) {
    try {
      // Hash password with bcrypt (10 salt rounds)
      const password_hash = await bcrypt.hash(password, 10);

      const [result] = await pool.execute(
        `INSERT INTO client_users (client_id, email, password_hash, name, is_active)
         VALUES (?, ?, ?, ?, TRUE)`,
        [clientId, email, password_hash, name]
      );

      // Return created user without password
      return {
        id: result.insertId,
        client_id: clientId,
        email,
        name,
        is_active: true,
        created_at: new Date()
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Client user with this email already exists');
      }
      console.error('Error creating client user:', error);
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
   * Update client user's last login timestamp
   * @param {number} userId - Client user ID
   * @returns {Promise<void>}
   */
  static async updateLastLogin(userId) {
    try {
      await pool.execute(
        'UPDATE client_users SET last_login_at = NOW() WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Update client user password
   * @param {number} userId - Client user ID
   * @param {string} newPassword - New plain text password (will be hashed)
   * @returns {Promise<void>}
   */
  static async updatePassword(userId, newPassword) {
    try {
      const password_hash = await bcrypt.hash(newPassword, 10);
      await pool.execute(
        `UPDATE client_users
         SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
         WHERE id = ?`,
        [password_hash, userId]
      );
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Set password reset token
   * @param {number} userId - Client user ID
   * @param {string} token - Reset token
   * @param {Date} expiresAt - Token expiration date
   * @returns {Promise<void>}
   */
  static async setPasswordResetToken(userId, token, expiresAt) {
    try {
      await pool.execute(
        `UPDATE client_users
         SET password_reset_token = ?, password_reset_expires = ?, updated_at = NOW()
         WHERE id = ?`,
        [token, expiresAt, userId]
      );
    } catch (error) {
      console.error('Error setting password reset token:', error);
      throw error;
    }
  }

  /**
   * Find user by password reset token
   * @param {string} token - Reset token
   * @returns {Promise<Object|null>} Client user object or null if not found/expired
   */
  static async findByPasswordResetToken(token) {
    try {
      const [users] = await pool.execute(
        `SELECT cu.*, c.company_name
         FROM client_users cu
         JOIN clients c ON cu.client_id = c.id
         WHERE cu.password_reset_token = ?
           AND cu.password_reset_expires > NOW()
           AND cu.is_active = TRUE
           AND c.is_active = TRUE`,
        [token]
      );
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error finding user by reset token:', error);
      throw error;
    }
  }

  /**
   * Deactivate client user account
   * @param {number} userId - Client user ID
   * @returns {Promise<void>}
   */
  static async deactivate(userId) {
    try {
      await pool.execute(
        'UPDATE client_users SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error deactivating client user:', error);
      throw error;
    }
  }

  /**
   * Reactivate client user account
   * @param {number} userId - Client user ID
   * @returns {Promise<void>}
   */
  static async reactivate(userId) {
    try {
      await pool.execute(
        'UPDATE client_users SET is_active = TRUE, updated_at = NOW() WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error reactivating client user:', error);
      throw error;
    }
  }

  /**
   * Update client user details
   * @param {number} userId - Client user ID
   * @param {Object} updates - Fields to update
   * @param {string} [updates.name] - Display name
   * @param {string} [updates.email] - Email address
   * @returns {Promise<void>}
   */
  static async update(userId, { name, email }) {
    try {
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email);
      }

      if (updates.length === 0) return;

      updates.push('updated_at = NOW()');
      values.push(userId);

      await pool.execute(
        `UPDATE client_users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Email already in use');
      }
      console.error('Error updating client user:', error);
      throw error;
    }
  }
}

export default ClientUser;
