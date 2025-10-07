import express from 'express';
import pool from '../db/config.js';
import Request from '../models/Request.js';

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const [rows] = await pool.execute('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// GET all requests
router.get('/requests', async (req, res) => {
  try {
    const { status = 'active', category, urgency, startDate, endDate } = req.query;

    let query = 'SELECT * FROM requests WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (urgency) {
      query += ' AND urgency = ?';
      params.push(urgency.toUpperCase());
    }

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC, time DESC';

    const [rows] = await pool.execute(query, params);

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

    res.json(transformedRows);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET single request
router.get('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const row = rows[0];
    const transformedRow = {
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
      CreatedAt: row.created_at,
      UpdatedAt: row.updated_at
    };

    res.json(transformedRow);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// POST create new request
router.post('/requests', async (req, res) => {
  try {
    const request = new Request(req.body);
    const result = await request.save();

    res.status(201).json({
      id: result.insertId,
      message: 'Request created successfully'
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// PUT update request
router.put('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = ['category', 'urgency', 'effort', 'status', 'description', 'request_type', 'estimated_hours'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        let value = updates[field];
        if (field === 'urgency') {
          value = updates[field].toUpperCase();
        } else if (field === 'estimated_hours') {
          value = parseFloat(value);
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

    updateValues.push(id); // Add ID for WHERE clause

    const query = `UPDATE requests SET ${updateFields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ message: 'Request updated successfully' });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// DELETE request (soft delete - update status)
router.delete('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    if (permanent === 'true') {
      // Permanent delete
      const [result] = await pool.execute('DELETE FROM requests WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

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

      res.json({ message: 'Request marked as deleted' });
    }
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// POST bulk update requests
router.post('/requests/bulk-update', async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request IDs' });
    }

    const allowedFields = ['category', 'urgency', 'status', 'estimated_hours'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        let value = updates[field];

        if (field === 'urgency') {
          value = updates[field].toUpperCase();
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

    res.json({
      message: 'Bulk update successful',
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('Error bulk updating requests:', error);
    res.status(500).json({ error: 'Failed to bulk update requests' });
  }
});

// GET request statistics
router.get('/statistics', async (req, res) => {
  try {
    // Get category distribution
    const [categories] = await pool.execute(
      `SELECT category, COUNT(*) as count, SUM(estimated_hours) as total_hours
       FROM requests WHERE status = 'active' GROUP BY category`
    );

    // Get urgency distribution
    const [urgencies] = await pool.execute(
      `SELECT urgency, COUNT(*) as count
       FROM requests WHERE status = 'active' GROUP BY urgency`
    );

    // Get monthly distribution
    const [monthly] = await pool.execute(
      `SELECT month, COUNT(*) as count
       FROM requests WHERE status = 'active' GROUP BY month ORDER BY month`
    );

    // Get total statistics
    const [[totals]] = await pool.execute(
      `SELECT
        COUNT(*) as total_requests,
        SUM(estimated_hours) as total_hours,
        COUNT(DISTINCT DATE(date)) as unique_days
       FROM requests WHERE status = 'active'`
    );

    res.json({
      categories,
      urgencies,
      monthly,
      totals
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST import CSV data
router.post('/import-csv', async (req, res) => {
  try {
    const { csvData } = req.body;

    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ error: 'Invalid CSV data' });
    }

    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const row of csvData) {
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
      } catch (error) {
        failed++;
        errors.push({ row, error: error.message });
      }
    }

    res.json({
      success: true,
      imported,
      failed,
      errors: errors.slice(0, 10) // Return first 10 errors only
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to import CSV data' });
  }
});

// GET export as CSV
router.get('/export-csv', async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    let query = 'SELECT * FROM requests';
    const params = [];

    if (status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY date DESC, time DESC';

    const [rows] = await pool.execute(query, params);

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
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Legacy endpoint for compatibility with existing frontend
router.post('/save-csv', async (req, res) => {
  try {
    const { csvContent } = req.body;

    // Parse CSV content
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');

    // Clear existing data and import new
    await pool.execute('DELETE FROM requests');

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = lines[i].match(/(".*?"|[^,]+)/g);
      if (!values) continue;

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.replace(/^"|"$/g, '').replace(/""/g, '"') || '';
      });

      const request = new Request({
        date: row.date,
        time: row.time,
        request_type: row.request_type || 'General Request',
        category: row.category || 'Support',
        description: row.description,
        urgency: row.urgency || 'MEDIUM',
        effort: row.effort || 'Medium',
        status: 'active'
      });

      await request.save();
      imported++;
    }

    res.json({
      success: true,
      filename: 'database',
      imported
    });
  } catch (error) {
    console.error('Error saving CSV:', error);
    res.status(500).json({ error: 'Failed to save CSV data' });
  }
});

export default router;