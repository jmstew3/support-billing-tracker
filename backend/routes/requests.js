/**
 * Request Routes (REFACTORED)
 *
 * Delegates business logic to RequestService layer.
 * Routes now focus on HTTP concerns: request/response handling, status codes, error formatting.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import pool from '../db/config.js';
<<<<<<< HEAD
import Request from '../models/Request.js';
import AuditLogRepository, { AuditActions } from '../repositories/AuditLogRepository.js';
import {
  bulkOperationLimiter,
  dataTransferLimiter,
  destructiveOperationLimiter,
  validateId,
  validateStatus,
  validateUrgency,
  validateCategory,
  validateDate,
  validatePagination,
  validateIdArray,
  sanitizeErrorMessage,
  escapeIdentifier
} from '../middleware/security.js';

const router = express.Router();

// Rate limiter for DELETE operations
const deleteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 delete requests per windowMs
  message: 'Too many delete requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check endpoint
=======
import RequestService, { ValidationError } from '../services/RequestService.js';

const router = express.Router();

/**
 * Error response helper
 */
function sendError(res, error) {
  if (error instanceof ValidationError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error('Request error:', error);
  return res.status(500).json({ error: error.message || 'Internal server error' });
}

// ============================================================
// HEALTH CHECK
// ============================================================

>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)
router.get('/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    // Don't expose internal error details in health check
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

<<<<<<< HEAD
// GET all requests with pagination support
router.get('/requests', async (req, res) => {
  try {
    const {
      status: rawStatus,
      category: rawCategory,
      urgency: rawUrgency,
      startDate: rawStartDate,
      endDate: rawEndDate,
      limit: rawLimit,
      offset: rawOffset,
      cursor: rawCursor
    } = req.query;

    // Validate inputs
    const status = validateStatus(rawStatus);
    const category = rawCategory ? validateCategory(rawCategory) : null;
    const urgency = rawUrgency ? validateUrgency(rawUrgency) : null;
    const startDate = rawStartDate ? validateDate(rawStartDate) : null;
    const endDate = rawEndDate ? validateDate(rawEndDate) : null;
    const { limit: parsedLimit, offset: parsedOffset } = validatePagination({ limit: rawLimit, offset: rawOffset });
    const cursor = rawCursor ? validateId(rawCursor) : null;

    // Check for invalid inputs
    if (rawCategory && !category) {
      return res.status(400).json({ error: 'Invalid category value' });
    }
    if (rawUrgency && !urgency) {
      return res.status(400).json({ error: 'Invalid urgency value' });
    }
    if (rawStartDate && !startDate) {
      return res.status(400).json({ error: 'Invalid start date format (use YYYY-MM-DD)' });
    }
    if (rawEndDate && !endDate) {
      return res.status(400).json({ error: 'Invalid end date format (use YYYY-MM-DD)' });
    }

    let query = 'SELECT * FROM requests WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM requests WHERE 1=1';
    const params = [];
    const countParams = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (category) {
      query += ' AND category = ?';
      countQuery += ' AND category = ?';
      params.push(category);
      countParams.push(category);
    }

    if (urgency) {
      query += ' AND urgency = ?';
      countQuery += ' AND urgency = ?';
      params.push(urgency);
      countParams.push(urgency);
    }

    if (startDate) {
      query += ' AND date >= ?';
      countQuery += ' AND date >= ?';
      params.push(startDate);
      countParams.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      countQuery += ' AND date <= ?';
      params.push(endDate);
      countParams.push(endDate);
    }

    // Cursor-based pagination (for infinite scroll / load more)
    if (cursor) {
      query += ' AND id < ?';
      params.push(cursor);
    }

    query += ' ORDER BY date DESC, time DESC, id DESC';

    // Apply limit if provided (pagination mode)
    // Note: Using query() instead of execute() because MySQL prepared statements
    // have issues with LIMIT/OFFSET placeholders in some configurations
    if (parsedLimit) {
      query += ` LIMIT ${parseInt(parsedLimit, 10)} OFFSET ${parseInt(parsedOffset, 10)}`;
    }

    const [rows] = await pool.query(query, params);

    // Transform data to match frontend format
    const transformedRows = rows.map(row => ({
      id: row.id,
      Date: row.date.toISOString().split('T')[0],
      Time: row.time,
      Month: row.month,
      Request_Type: row.request_type,
      Category: row.category,
      Request_Summary: row.description,
      Urgency: row.urgency,
      Effort: row.effort,
      EstimatedHours: parseFloat(row.estimated_hours),
      Status: row.status,
      source: row.source || 'sms', // Include source field with default
      website_url: row.website_url || null, // Include website URL from FluentSupport
      CreatedAt: row.created_at,
      UpdatedAt: row.updated_at
    }));

    // If pagination is enabled, return with metadata
    if (parsedLimit) {
      const [[{ total }]] = await pool.execute(countQuery, countParams);
      const lastItem = rows[rows.length - 1];

      res.json({
        data: transformedRows,
        pagination: {
          total: parseInt(total),
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + transformedRows.length < total,
          nextCursor: lastItem ? lastItem.id : null,
          currentPage: Math.floor(parsedOffset / parsedLimit) + 1,
          totalPages: Math.ceil(total / parsedLimit)
        }
      });
    } else {
      // Backward compatible: return array directly if no pagination params
      res.json(transformedRows);
    }
=======
// ============================================================
// CRUD OPERATIONS
// ============================================================

/**
 * GET /requests - List all requests with filters
 */
router.get('/requests', async (req, res) => {
  try {
    const { status, category, urgency, startDate, endDate } = req.query;

    const requests = await RequestService.findAll({
      status,
      category,
      urgency,
      startDate,
      endDate
    });

    res.json(requests);
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * GET /requests/:id - Get single request
 */
router.get('/requests/:id', async (req, res) => {
  try {
<<<<<<< HEAD
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const [rows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [id]);
=======
    const { id } = req.params;
    const request = await RequestService.findById(id);
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(request);
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * POST /requests - Create new request
 */
router.post('/requests', async (req, res) => {
  try {
    const result = await RequestService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * PUT /requests/:id - Update request
 */
router.put('/requests/:id', async (req, res) => {
  try {
<<<<<<< HEAD
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const updates = req.body;

    // Build dynamic update query with validation
    const allowedFields = ['category', 'urgency', 'effort', 'status', 'description', 'request_type', 'estimated_hours'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        let value = updates[field];

        // Validate specific fields
        if (field === 'urgency') {
          value = validateUrgency(updates[field]);
          if (!value) {
            return res.status(400).json({ error: 'Invalid urgency value (must be LOW, MEDIUM, or HIGH)' });
          }
        } else if (field === 'category') {
          value = validateCategory(updates[field]);
          if (!value) {
            return res.status(400).json({ error: 'Invalid category value' });
          }
        } else if (field === 'status') {
          value = validateStatus(updates[field]);
          if (!value) {
            return res.status(400).json({ error: 'Invalid status value' });
          }
        } else if (field === 'estimated_hours') {
          value = parseFloat(value);
          // Validate hours range - allow 0 but not negative values
          if (isNaN(value) || value < 0 || value > 99.99) {
            return res.status(400).json({ error: 'Estimated hours must be between 0 and 99.99' });
          }
        } else if (field === 'description' && typeof value === 'string') {
          // Limit description length
          if (value.length > 10000) {
            return res.status(400).json({ error: 'Description too long (max 10000 characters)' });
          }
        }

        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(id); // Add ID for WHERE clause

    const query = `UPDATE requests SET ${updateFields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(query, updateValues);

    if (result.affectedRows === 0) {
=======
    const { id } = req.params;
    const result = await RequestService.update(id, req.body);

    if (!result) {
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

<<<<<<< HEAD
// DELETE request (soft delete - update status)
router.delete('/requests/:id', deleteRateLimiter, async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    const { permanent = false } = req.query;
=======
/**
 * DELETE /requests/:id - Delete request (soft or permanent)
 */
router.delete('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = 'false' } = req.query;
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)

    const result = await RequestService.delete(id, permanent === 'true');

<<<<<<< HEAD
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      // Audit log permanent deletion
      await AuditLogRepository.logFromRequest(req, AuditActions.DATA_DELETE, {
        resourceType: 'request',
        resourceId: id,
        details: { permanent: true },
        status: 'success'
      });

      res.json({ message: 'Request permanently deleted' });
    } else {
      // Soft delete (update status)
      const [result] = await pool.execute(
        'UPDATE requests SET status = ? WHERE id = ?',
        ['deleted', id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      // Audit log soft deletion
      await AuditLogRepository.logFromRequest(req, AuditActions.DATA_DELETE, {
        resourceType: 'request',
        resourceId: id,
        details: { permanent: false, newStatus: 'deleted' },
        status: 'success'
      });

      res.json({ message: 'Request marked as deleted' });
=======
    if (!result) {
      return res.status(404).json({ error: 'Request not found' });
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)
    }

    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

<<<<<<< HEAD
// POST bulk update requests (rate limited)
router.post('/requests/bulk-update', bulkOperationLimiter, async (req, res) => {
  try {
    const { ids: rawIds, updates } = req.body;

    // Validate IDs array
    const ids = validateIdArray(rawIds);
    if (!ids) {
      return res.status(400).json({ error: 'Invalid request IDs (must be array of 1-100 valid IDs)' });
    }

    const allowedFields = ['category', 'urgency', 'status', 'estimated_hours'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        let value = updates[field];

        // Validate each field
        if (field === 'urgency') {
          value = validateUrgency(updates[field]);
          if (!value) {
            return res.status(400).json({ error: 'Invalid urgency value (must be LOW, MEDIUM, or HIGH)' });
          }
        } else if (field === 'category') {
          value = validateCategory(updates[field]);
          if (!value) {
            return res.status(400).json({ error: 'Invalid category value' });
          }
        } else if (field === 'status') {
          value = validateStatus(updates[field]);
          if (!value) {
            return res.status(400).json({ error: 'Invalid status value' });
          }
        } else if (field === 'estimated_hours') {
          value = parseFloat(updates[field]);
          // Validate hours range - allow 0 but not negative values
          if (isNaN(value) || value < 0 || value > 99.99) {
            return res.status(400).json({ error: 'Estimated hours must be between 0 and 99.99' });
          }
        }

        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const placeholders = ids.map(() => '?').join(', ');
    const query = `UPDATE requests SET ${updateFields.join(', ')} WHERE id IN (${placeholders})`;
    const [result] = await pool.execute(query, [...updateValues, ...ids]);

    // Audit log bulk update
    await AuditLogRepository.logFromRequest(req, AuditActions.DATA_BULK_UPDATE, {
      resourceType: 'request',
      details: {
        affectedIds: ids,
        fieldsUpdated: Object.keys(updates),
        affectedRows: result.affectedRows
      },
      status: 'success'
    });

    res.json({
      message: 'Bulk update successful',
      affectedRows: result.affectedRows
    });
=======
/**
 * POST /requests/bulk-update - Bulk update requests
 */
router.post('/requests/bulk-update', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    const result = await RequestService.bulkUpdate(ids, updates);
    res.json(result);
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)
  } catch (error) {
    sendError(res, error);
  }
});

// ============================================================
// STATISTICS
// ============================================================

/**
 * GET /statistics - Get request statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await RequestService.getStatistics();
    res.json(stats);
  } catch (error) {
    sendError(res, error);
  }
});

<<<<<<< HEAD
// POST import CSV data (rate limited)
router.post('/import-csv', dataTransferLimiter, async (req, res) => {
  try {
    const { csvData } = req.body;

    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ error: 'Invalid CSV data' });
    }

    // Limit number of rows to prevent DoS
    const MAX_IMPORT_ROWS = 1000;
    if (csvData.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({
        error: `Too many rows. Maximum ${MAX_IMPORT_ROWS} rows allowed per import.`
      });
    }

    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const row of csvData) {
      try {
        // Validate and sanitize row data
        const category = validateCategory(row.category) || 'Support';
        const urgency = validateUrgency(row.urgency) || 'MEDIUM';
        const status = validateStatus(row.status) || 'active';

        const request = new Request({
          date: row.date,
          time: row.time,
          request_type: row.request_type || 'General Request',
          category,
          description: (row.description || row.Request_Summary || '').slice(0, 10000), // Limit length
          urgency,
          effort: row.effort || 'Medium',
          status
        });

        await request.save();
        imported++;
      } catch (error) {
        failed++;
        // Don't expose internal error details
        errors.push({ row: imported + failed, error: 'Failed to import row' });
      }
    }

    res.json({
      success: true,
      imported,
      failed,
      errors: errors.slice(0, 10) // Return first 10 errors only
    });
=======
// ============================================================
// CSV OPERATIONS
// ============================================================

/**
 * POST /import-csv - Import CSV data
 */
router.post('/import-csv', async (req, res) => {
  try {
    const { csvData } = req.body;
    const result = await RequestService.importCSV(csvData);
    res.json(result);
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)
  } catch (error) {
    sendError(res, error);
  }
});

<<<<<<< HEAD
// GET export as CSV (rate limited)
router.get('/export-csv', dataTransferLimiter, async (req, res) => {
  try {
    const status = validateStatus(req.query.status);

    let query = 'SELECT * FROM requests';
    const params = [];

    if (status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY date DESC, time DESC';

    const [rows] = await pool.execute(query, params);
=======
/**
 * GET /export-csv - Export requests as CSV
 */
router.get('/export-csv', async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const rows = await RequestService.exportCSV(status);
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)

    // Convert to CSV format
    const headers = ['date', 'time', 'month', 'request_type', 'category', 'description', 'urgency', 'effort'];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      const csvRow = [
        row.date.toISOString().split('T')[0],
        row.time,
        row.month,
        row.request_type,
        row.category,
        `"${(row.description || '').replace(/"/g, '""')}"`,
        row.urgency,
        row.effort
      ];
      csvRows.push(csvRow.join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="thad_requests_export.csv"');
    res.send(csv);
  } catch (error) {
    sendError(res, error);
  }
});

/**
<<<<<<< HEAD
 * POST /api/requests/save-csv
 * Legacy endpoint for replacing all request data with CSV content
 *
 * WARNING: This endpoint DELETES ALL EXISTING DATA before importing!
 *
 * Security Requirements:
 * 1. Must include confirmDelete: "DELETE_ALL_DATA" in request body
 * 2. Creates automatic backup before deletion
 * 3. Uses transaction for atomic operation (all-or-nothing)
 *
 * Request body:
 * {
 *   "csvContent": "date,time,...\n2025-01-01,10:00,...",
 *   "confirmDelete": "DELETE_ALL_DATA"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "imported": 100,
 *   "backupTable": "requests_backup_1705234567890",
 *   "previousCount": 50
 * }
 */
router.post('/save-csv', destructiveOperationLimiter, async (req, res) => {
  let connection;

=======
 * POST /save-csv - Legacy CSV save endpoint (for backward compatibility)
 */
router.post('/save-csv', async (req, res) => {
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)
  try {
    const { csvContent, confirmDelete } = req.body;

    // SECURITY: Require explicit confirmation to prevent accidental data loss
    if (confirmDelete !== 'DELETE_ALL_DATA') {
      return res.status(400).json({
        error: 'This operation will DELETE ALL existing data.',
        message: 'To confirm, include { "confirmDelete": "DELETE_ALL_DATA" } in your request body.',
        hint: 'Consider using POST /api/import-csv instead, which adds data without deleting.'
      });
    }

    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ error: 'csvContent is required and must be a string' });
    }

    // Parse CSV content
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must have at least a header row and one data row' });
    }

<<<<<<< HEAD
    const headers = lines[0].split(',').map(h => h.trim());

    // Get connection for transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Count existing records
    const [[{ count: previousCount }]] = await connection.query(
      'SELECT COUNT(*) as count FROM requests'
    );

    // Create backup table with timestamp (escaped to prevent SQL injection)
    const backupTableName = `requests_backup_${Date.now()}`;
    const escapedBackupTable = escapeIdentifier(backupTableName);
    await connection.query(
      `CREATE TABLE ${escapedBackupTable} AS SELECT * FROM requests`
    );
    console.log(`[save-csv] Created backup table: ${backupTableName} with ${previousCount} records`);

    // Clear existing data
    await connection.query('DELETE FROM requests');

    // Import new data
    let imported = 0;
    let skipped = 0;
    const errors = [];

=======
    // Clear existing data
    await pool.execute('DELETE FROM requests');

    const csvData = [];
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      try {
        const values = lines[i].match(/(".*?"|[^,]+)/g);
        if (!values) {
          skipped++;
          continue;
        }

        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.replace(/^"|"$/g, '').replace(/""/g, '"') || '';
        });

<<<<<<< HEAD
        // Validate required fields
        if (!row.date || !row.time) {
          errors.push({ line: i + 1, error: 'Missing required date or time' });
          skipped++;
          continue;
        }

        const request = new Request({
          date: row.date,
          time: row.time,
          request_type: row.request_type || 'General Request',
          category: row.category || 'Support',
          description: row.description || '',
          urgency: row.urgency || 'MEDIUM',
          effort: row.effort || 'Medium',
          status: row.status || 'active'
        });

        await request.save();
        imported++;
      } catch (rowError) {
        errors.push({ line: i + 1, error: rowError.message });
        skipped++;
      }
    }

    // Commit transaction
    await connection.commit();

    console.log(`[save-csv] Import complete: ${imported} imported, ${skipped} skipped`);

    // Audit log the destructive data replacement
    await AuditLogRepository.logFromRequest(req, AuditActions.DATA_BACKUP, {
      resourceType: 'request',
      details: {
        operation: 'save-csv',
        previousCount: parseInt(previousCount),
        imported,
        skipped,
        backupTable
      },
      status: 'success'
    });

    res.json({
      success: true,
      imported,
      skipped,
      previousCount: parseInt(previousCount),
      backupTable,
      message: `Successfully replaced ${previousCount} records with ${imported} new records. Backup saved to table: ${backupTable}`,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Show first 10 errors
    });

  } catch (error) {
    // Rollback on error
    if (connection) {
      try {
        await connection.rollback();
        console.log('[save-csv] Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('[save-csv] Rollback failed:', rollbackError);
      }
    }

    console.error('Error saving CSV:', error);
    res.status(500).json({
      error: 'Failed to save CSV data. No changes were made.',
      details: sanitizeErrorMessage(error, process.env.NODE_ENV === 'development')
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/**
 * GET /api/requests/backups
 * List available backup tables created by save-csv operations
 * Useful for recovery and audit purposes
 */
router.get('/backups', async (req, res) => {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME, CREATE_TIME, TABLE_ROWS
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME LIKE 'requests_backup_%'
       ORDER BY CREATE_TIME DESC
       LIMIT 20`
    );

    res.json({
      backups: tables.map(t => ({
        name: t.TABLE_NAME,
        createdAt: t.CREATE_TIME,
        rowCount: t.TABLE_ROWS,
        // Extract timestamp from table name
        timestamp: parseInt(t.TABLE_NAME.replace('requests_backup_', ''))
      }))
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * POST /api/requests/restore-backup
 * Restore data from a backup table
 *
 * Request body:
 * {
 *   "backupTable": "requests_backup_1705234567890",
 *   "confirmRestore": "RESTORE_FROM_BACKUP"
 * }
 */
router.post('/restore-backup', destructiveOperationLimiter, async (req, res) => {
  let connection;

  try {
    const { backupTable, confirmRestore } = req.body;

    if (confirmRestore !== 'RESTORE_FROM_BACKUP') {
      return res.status(400).json({
        error: 'This operation will replace current data with backup.',
        message: 'To confirm, include { "confirmRestore": "RESTORE_FROM_BACKUP" } in your request body.'
      });
    }

    // Validate backup table name (prevent SQL injection)
    if (!/^requests_backup_\d+$/.test(backupTable)) {
      return res.status(400).json({ error: 'Invalid backup table name' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check backup table exists
    const [[{ count: backupExists }]] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [backupTable]
    );

    if (backupExists === 0) {
      return res.status(404).json({ error: `Backup table ${backupTable} not found` });
    }

    // Create a backup of current data before restore (escaped to prevent SQL injection)
    const preRestoreBackup = `requests_pre_restore_${Date.now()}`;
    const escapedPreRestoreBackup = escapeIdentifier(preRestoreBackup);
    await connection.query(
      `CREATE TABLE ${escapedPreRestoreBackup} AS SELECT * FROM requests`
    );

    // Clear current data and restore from backup (backupTable already validated via regex)
    const escapedBackupTable = escapeIdentifier(backupTable);
    await connection.query('DELETE FROM requests');
    await connection.query(
      `INSERT INTO requests SELECT * FROM ${escapedBackupTable}`
    );

    const [[{ count: restoredCount }]] = await connection.query(
      'SELECT COUNT(*) as count FROM requests'
    );

    await connection.commit();

    // Audit log the restore operation
    await AuditLogRepository.logFromRequest(req, AuditActions.DATA_RESTORE, {
      resourceType: 'request',
      details: {
        sourceBackup: backupTable,
        restoredCount: parseInt(restoredCount),
        preRestoreBackup
      },
      status: 'success'
    });

    res.json({
      success: true,
      restoredCount: parseInt(restoredCount),
      preRestoreBackup,
      message: `Restored ${restoredCount} records from ${backupTable}. Pre-restore backup: ${preRestoreBackup}`
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
        console.log('[restore-backup] Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('[restore-backup] Rollback failed:', rollbackError);
      }
    }
    console.error('Error restoring backup:', error);
    res.status(500).json({
      error: 'Failed to restore backup. No changes were made.',
      details: sanitizeErrorMessage(error, process.env.NODE_ENV === 'development')
    });

  } finally {
    if (connection) {
      connection.release();
    }
=======
      csvData.push(row);
    }

    const result = await RequestService.importCSV(csvData);

    res.json({
      success: true,
      filename: 'database',
      imported: result.imported
    });
  } catch (error) {
    sendError(res, error);
>>>>>>> d236e87 (refactor: Implement architectural improvements with service layer abstraction)
  }
});

export default router;
