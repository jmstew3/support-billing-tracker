import pool from '../db/config.js';

/**
 * QBO Item Mapping Repository
 * Maps internal invoice line item types/categories to QBO Service Item IDs.
 *
 * Matching priority (findQBOItemId):
 *   1. Exact match on (item_type, category, description)
 *   2. Match on (item_type, category, NULL description)
 *   3. Match on (item_type, NULL category, NULL description) — fallback
 */
export default class QBOItemMappingRepository {
  /**
   * Find QBO Item ID for a given internal line item.
   * Uses 3-level fallback matching.
   * @param {string} itemType - 'support', 'project', 'hosting', 'credit', 'other'
   * @param {string|null} category
   * @param {string|null} description
   * @param {import('mysql2/promise').Pool} connection
   * @returns {Promise<{qbo_item_id: string, qbo_item_name: string}|null>}
   */
  static async findQBOItemId(itemType, category = null, description = null, connection = pool) {
    // Level 1: Exact match (type + category + description)
    if (description) {
      const [rows] = await connection.query(
        `SELECT qbo_item_id, qbo_item_name FROM qbo_item_mappings
         WHERE internal_item_type = ? AND internal_category <=> ? AND internal_description = ?
         AND is_active = TRUE LIMIT 1`,
        [itemType, category, description]
      );
      if (rows[0]) return rows[0];
    }

    // Level 2: Type + category (NULL description)
    if (category) {
      const [rows] = await connection.query(
        `SELECT qbo_item_id, qbo_item_name FROM qbo_item_mappings
         WHERE internal_item_type = ? AND internal_category = ? AND internal_description IS NULL
         AND is_active = TRUE LIMIT 1`,
        [itemType, category]
      );
      if (rows[0]) return rows[0];
    }

    // Level 3: Type only (NULL category, NULL description) — fallback
    const [rows] = await connection.query(
      `SELECT qbo_item_id, qbo_item_name FROM qbo_item_mappings
       WHERE internal_item_type = ? AND internal_category IS NULL AND internal_description IS NULL
       AND is_active = TRUE LIMIT 1`,
      [itemType]
    );
    return rows[0] || null;
  }

  /**
   * Upsert a mapping (used during Item sync).
   * @param {Object} mapping
   * @param {string} mapping.internalItemType
   * @param {string|null} mapping.internalCategory
   * @param {string|null} mapping.internalDescription
   * @param {string} mapping.qboItemId
   * @param {string} mapping.qboItemName
   * @param {import('mysql2/promise').Pool} connection
   */
  static async upsertMapping(mapping, connection = pool) {
    const { internalItemType, internalCategory, internalDescription, qboItemId, qboItemName } = mapping;
    await connection.query(
      `INSERT INTO qbo_item_mappings
       (internal_item_type, internal_category, internal_description, qbo_item_id, qbo_item_name, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         qbo_item_id = VALUES(qbo_item_id),
         qbo_item_name = VALUES(qbo_item_name),
         is_active = TRUE`,
      [internalItemType, internalCategory || null, internalDescription || null, qboItemId, qboItemName]
    );
  }

  /**
   * Get all active mappings (for admin display / debugging).
   * @param {import('mysql2/promise').Pool} connection
   * @returns {Promise<Array>}
   */
  static async getAllMappings(connection = pool) {
    const [rows] = await connection.query(
      'SELECT * FROM qbo_item_mappings WHERE is_active = TRUE ORDER BY internal_item_type, internal_category'
    );
    return rows;
  }
}
