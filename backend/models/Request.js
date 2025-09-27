import pool from '../db/config.js';

class Request {
  constructor(data) {
    this.date = data.date;
    this.time = data.time;
    this.request_type = data.request_type || 'General Request';
    this.category = data.category || 'Support';
    this.description = data.description || data.Request_Summary || '';
    this.urgency = (data.urgency || 'MEDIUM').toUpperCase();
    this.effort = data.effort || 'Medium';
    this.status = data.status || 'active';

    // Handle estimated_hours - can be provided or default based on effort
    if (data.estimated_hours !== undefined) {
      this.estimated_hours = parseFloat(data.estimated_hours);
    } else {
      // Default based on effort
      this.estimated_hours = this.effort === 'Small' ? 0.25 :
                            this.effort === 'Large' ? 1.00 : 0.50;
    }

    // Validate urgency
    if (!['LOW', 'MEDIUM', 'HIGH', 'PROMOTION'].includes(this.urgency)) {
      this.urgency = 'MEDIUM';
    }

    // Validate effort
    if (!['Small', 'Medium', 'Large'].includes(this.effort)) {
      this.effort = 'Medium';
    }

    // Validate status
    if (!['active', 'deleted', 'ignored'].includes(this.status)) {
      this.status = 'active';
    }

    // Validate estimated_hours - allow 0 but not negative values
    if (isNaN(this.estimated_hours) || this.estimated_hours < 0 || this.estimated_hours > 99.99) {
      this.estimated_hours = 0.50;
    }
  }

  async save() {
    try {
      const query = `
        INSERT INTO requests (date, time, request_type, category, description, urgency, effort, status, estimated_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        this.date,
        this.time,
        this.request_type,
        this.category,
        this.description,
        this.urgency,
        this.effort,
        this.status,
        this.estimated_hours
      ];

      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      console.error('Error saving request:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error finding request:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = 'SELECT * FROM requests WHERE 1=1';
      const params = [];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.urgency) {
        query += ' AND urgency = ?';
        params.push(filters.urgency.toUpperCase());
      }

      query += ' ORDER BY date DESC, time DESC';

      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error finding requests:', error);
      throw error;
    }
  }

  static async updateById(id, updates) {
    try {
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
            value = parseFloat(updates[field]);
            // Validate hours range - allow 0 but not negative values
            if (isNaN(value) || value < 0 || value > 99.99) {
              throw new Error('Estimated hours must be between 0 and 99.99');
            }
          }
          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateValues.push(id);

      const query = `UPDATE requests SET ${updateFields.join(', ')} WHERE id = ?`;
      const [result] = await pool.execute(query, updateValues);

      return result;
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  }

  static async deleteById(id, permanent = false) {
    try {
      if (permanent) {
        const [result] = await pool.execute('DELETE FROM requests WHERE id = ?', [id]);
        return result;
      } else {
        const [result] = await pool.execute('UPDATE requests SET status = ? WHERE id = ?', ['deleted', id]);
        return result;
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      throw error;
    }
  }

  static async bulkUpdate(ids, updates) {
    try {
      if (!ids || ids.length === 0) {
        throw new Error('No IDs provided');
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
              throw new Error('Estimated hours must be between 0 and 99.99');
            }
          }

          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const placeholders = ids.map(() => '?').join(', ');
      const query = `UPDATE requests SET ${updateFields.join(', ')} WHERE id IN (${placeholders})`;
      const [result] = await pool.execute(query, [...updateValues, ...ids]);

      return result;
    } catch (error) {
      console.error('Error bulk updating requests:', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const [categories] = await pool.execute(
        `SELECT category, COUNT(*) as count, SUM(estimated_hours) as total_hours
         FROM requests WHERE status = 'active' GROUP BY category`
      );

      const [urgencies] = await pool.execute(
        `SELECT urgency, COUNT(*) as count
         FROM requests WHERE status = 'active' GROUP BY urgency`
      );

      const [monthly] = await pool.execute(
        `SELECT month, COUNT(*) as count
         FROM requests WHERE status = 'active' GROUP BY month ORDER BY month`
      );

      const [[totals]] = await pool.execute(
        `SELECT
          COUNT(*) as total_requests,
          SUM(estimated_hours) as total_hours,
          COUNT(DISTINCT DATE(date)) as unique_days
         FROM requests WHERE status = 'active'`
      );

      return {
        categories,
        urgencies,
        monthly,
        totals
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }
}

export default Request;