/**
 * Invoice Service
 * Handles invoice generation, CRUD operations, and exports
 */

import pool from '../db/config.js';

// Pricing configuration (matches frontend config/pricing.ts)
const PRICING = {
  rates: {
    regular: 150,
    sameDay: 175,
    emergency: 250
  },
  freeCredits: {
    supportHours: 10,
    effectiveDate: '2025-06-01'
  }
};

/**
 * Generate next invoice number
 * Format: VEL-YYYY-NNN (e.g., VEL-2026-001)
 */
async function generateInvoiceNumber(customerId) {
  const connection = await pool.getConnection();
  try {
    const year = new Date().getFullYear();
    const prefix = 'VEL';

    // Get the highest invoice number for this year
    const [rows] = await connection.query(
      `SELECT invoice_number FROM invoices
       WHERE invoice_number LIKE ?
       ORDER BY invoice_number DESC LIMIT 1`,
      [`${prefix}-${year}-%`]
    );

    let nextNum = 1;
    if (rows.length > 0) {
      const lastNum = parseInt(rows[0].invoice_number.split('-')[2], 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}-${year}-${String(nextNum).padStart(3, '0')}`;
  } finally {
    connection.release();
  }
}

/**
 * Calculate billing for a set of requests
 */
function calculateBilling(requests, periodStart) {
  const effectiveDate = new Date(PRICING.freeCredits.effectiveDate);
  const periodDate = new Date(periodStart);
  const hasFreeCredits = periodDate >= effectiveDate;

  let totalHours = 0;
  let emergencyHours = 0;
  let regularHours = 0;

  requests.forEach(req => {
    const hours = parseFloat(req.estimated_hours) || 0;
    totalHours += hours;

    if (req.urgency === 'HIGH') {
      emergencyHours += hours;
    } else {
      regularHours += hours;
    }
  });

  // Apply free credits if applicable
  let billableHours = totalHours;
  let freeHoursApplied = 0;

  if (hasFreeCredits) {
    freeHoursApplied = Math.min(totalHours, PRICING.freeCredits.supportHours);
    billableHours = Math.max(0, totalHours - PRICING.freeCredits.supportHours);
  }

  // Calculate amounts
  const emergencyAmount = emergencyHours * PRICING.rates.emergency;
  const regularAmount = Math.max(0, billableHours - emergencyHours) * PRICING.rates.regular;
  const subtotal = emergencyAmount + regularAmount;

  return {
    totalHours,
    billableHours,
    freeHoursApplied,
    emergencyHours,
    regularHours,
    emergencyAmount,
    regularAmount,
    subtotal
  };
}

/**
 * Get billing summary for a customer and period
 */
export async function getBillingSummary(customerId, periodStart, periodEnd) {
  const connection = await pool.getConnection();
  try {
    // Get unbilled requests for the period
    const [requests] = await connection.query(
      `SELECT * FROM requests
       WHERE customer_id = ?
       AND date >= ? AND date <= ?
       AND status = 'active'
       AND invoice_id IS NULL
       AND category NOT IN ('Non-billable', 'Migration')
       ORDER BY date, time`,
      [customerId, periodStart, periodEnd]
    );

    const billing = calculateBilling(requests, periodStart);

    return {
      customerId,
      periodStart,
      periodEnd,
      requestCount: requests.length,
      requests,
      ...billing
    };
  } finally {
    connection.release();
  }
}

/**
 * Generate an invoice from billing summary
 */
export async function generateInvoice(customerId, periodStart, periodEnd, options = {}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get customer info
    const [customers] = await connection.query(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );

    if (customers.length === 0) {
      throw new Error('Customer not found');
    }

    const customer = customers[0];

    // Get billing summary
    const summary = await getBillingSummary(customerId, periodStart, periodEnd);

    if (summary.requestCount === 0) {
      throw new Error('No billable requests found for this period');
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(customerId);

    // Calculate dates
    const invoiceDate = options.invoiceDate || new Date().toISOString().split('T')[0];
    const dueDate = options.dueDate || new Date(
      Date.now() + (customer.payment_terms * 24 * 60 * 60 * 1000)
    ).toISOString().split('T')[0];

    // Calculate tax (default 0)
    const taxRate = options.taxRate || 0;
    const taxAmount = summary.subtotal * taxRate;
    const total = summary.subtotal + taxAmount;

    // Create invoice
    const [invoiceResult] = await connection.query(
      `INSERT INTO invoices
       (customer_id, invoice_number, period_start, period_end, invoice_date, due_date,
        status, subtotal, tax_rate, tax_amount, total, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
      [customerId, invoiceNumber, periodStart, periodEnd, invoiceDate, dueDate,
       summary.subtotal, taxRate, taxAmount, total, options.notes || null]
    );

    const invoiceId = invoiceResult.insertId;

    // Create line items
    const lineItems = [];

    // Support hours line item
    if (summary.billableHours > 0 || summary.freeHoursApplied > 0) {
      // Emergency hours
      if (summary.emergencyHours > 0) {
        const [itemResult] = await connection.query(
          `INSERT INTO invoice_items
           (invoice_id, item_type, description, quantity, unit_price, amount, sort_order, request_ids)
           VALUES (?, 'support', ?, ?, ?, ?, 1, ?)`,
          [invoiceId, 'Emergency Support Hours', summary.emergencyHours,
           PRICING.rates.emergency, summary.emergencyAmount,
           JSON.stringify(summary.requests.filter(r => r.urgency === 'HIGH').map(r => r.id))]
        );
        lineItems.push({ id: itemResult.insertId, type: 'emergency' });
      }

      // Regular hours (billable portion)
      const billableRegularHours = Math.max(0, summary.billableHours - summary.emergencyHours);
      if (billableRegularHours > 0) {
        const [itemResult] = await connection.query(
          `INSERT INTO invoice_items
           (invoice_id, item_type, description, quantity, unit_price, amount, sort_order, request_ids)
           VALUES (?, 'support', ?, ?, ?, ?, 2, ?)`,
          [invoiceId, 'Regular Support Hours', billableRegularHours,
           PRICING.rates.regular, summary.regularAmount,
           JSON.stringify(summary.requests.filter(r => r.urgency !== 'HIGH').map(r => r.id))]
        );
        lineItems.push({ id: itemResult.insertId, type: 'regular' });
      }

      // Free credits applied (as a note, not a line item with negative amount)
      if (summary.freeHoursApplied > 0) {
        await connection.query(
          `INSERT INTO invoice_items
           (invoice_id, item_type, description, quantity, unit_price, amount, sort_order)
           VALUES (?, 'other', ?, ?, 0, 0, 99)`,
          [invoiceId, `Turbo Support Credit Applied (${summary.freeHoursApplied}h free)`,
           summary.freeHoursApplied]
        );
      }
    }

    // Link requests to invoice
    const requestIds = summary.requests.map(r => r.id);
    if (requestIds.length > 0) {
      await connection.query(
        `UPDATE requests SET invoice_id = ? WHERE id IN (?)`,
        [invoiceId, requestIds]
      );
    }

    await connection.commit();

    // Return the created invoice
    return getInvoice(invoiceId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get invoice by ID with items and customer info
 */
export async function getInvoice(invoiceId) {
  const connection = await pool.getConnection();
  try {
    const [invoices] = await connection.query(
      `SELECT i.*, c.name as customer_name, c.email as customer_email,
              c.address_line1, c.address_line2, c.city, c.state, c.postal_code
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.id = ?`,
      [invoiceId]
    );

    if (invoices.length === 0) {
      return null;
    }

    const invoice = invoices[0];

    // Get line items
    const [items] = await connection.query(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id`,
      [invoiceId]
    );

    // Get linked requests
    const [requests] = await connection.query(
      `SELECT id, date, time, description, category, urgency, estimated_hours
       FROM requests WHERE invoice_id = ?
       ORDER BY date, time`,
      [invoiceId]
    );

    return {
      ...invoice,
      items,
      requests
    };
  } finally {
    connection.release();
  }
}

/**
 * List invoices with filters
 */
export async function listInvoices(filters = {}) {
  const connection = await pool.getConnection();
  try {
    let query = `
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.customerId) {
      query += ' AND i.customer_id = ?';
      params.push(filters.customerId);
    }

    if (filters.status) {
      query += ' AND i.status = ?';
      params.push(filters.status);
    }

    if (filters.startDate) {
      query += ' AND i.invoice_date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND i.invoice_date <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY i.invoice_date DESC, i.id DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit, 10));
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(parseInt(filters.offset, 10));
    }

    const [invoices] = await connection.query(query, params);

    // Get total count
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total FROM invoices i WHERE 1=1
       ${filters.customerId ? 'AND i.customer_id = ?' : ''}
       ${filters.status ? 'AND i.status = ?' : ''}`,
      params.slice(0, (filters.customerId ? 1 : 0) + (filters.status ? 1 : 0))
    );

    return {
      invoices,
      total: countResult[0].total
    };
  } finally {
    connection.release();
  }
}

/**
 * Update invoice
 */
export async function updateInvoice(invoiceId, updates) {
  const connection = await pool.getConnection();
  try {
    const allowedFields = ['status', 'notes', 'internal_notes', 'amount_paid', 'payment_date'];
    const updateFields = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return getInvoice(invoiceId);
    }

    params.push(invoiceId);

    await connection.query(
      `UPDATE invoices SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    return getInvoice(invoiceId);
  } finally {
    connection.release();
  }
}

/**
 * Delete invoice (only drafts)
 */
export async function deleteInvoice(invoiceId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check invoice status
    const [invoices] = await connection.query(
      'SELECT status FROM invoices WHERE id = ?',
      [invoiceId]
    );

    if (invoices.length === 0) {
      throw new Error('Invoice not found');
    }

    if (invoices[0].status !== 'draft') {
      throw new Error('Only draft invoices can be deleted');
    }

    // Unlink requests
    await connection.query(
      'UPDATE requests SET invoice_id = NULL WHERE invoice_id = ?',
      [invoiceId]
    );

    // Delete invoice (cascade deletes items)
    await connection.query('DELETE FROM invoices WHERE id = ?', [invoiceId]);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Export invoice to CSV format
 */
export async function exportInvoiceCSV(invoiceId) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const lines = [];

  // Header
  lines.push('Invoice Export');
  lines.push(`Invoice Number,${invoice.invoice_number}`);
  lines.push(`Customer,${invoice.customer_name}`);
  lines.push(`Invoice Date,${invoice.invoice_date}`);
  lines.push(`Due Date,${invoice.due_date}`);
  lines.push(`Period,${invoice.period_start} to ${invoice.period_end}`);
  lines.push('');

  // Line items
  lines.push('Description,Quantity,Unit Price,Amount');
  invoice.items.forEach(item => {
    if (item.amount > 0) {
      lines.push(`"${item.description}",${item.quantity},${item.unit_price},${item.amount}`);
    }
  });
  lines.push('');

  // Totals
  lines.push(`Subtotal,,,$${parseFloat(invoice.subtotal).toFixed(2)}`);
  if (parseFloat(invoice.tax_amount) > 0) {
    lines.push(`Tax (${(parseFloat(invoice.tax_rate) * 100).toFixed(2)}%),,,$${parseFloat(invoice.tax_amount).toFixed(2)}`);
  }
  lines.push(`Total,,,$${parseFloat(invoice.total).toFixed(2)}`);

  return lines.join('\n');
}

/**
 * Export invoice to JSON format (for QuickBooks import)
 */
export async function exportInvoiceJSON(invoiceId) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  return {
    invoiceNumber: invoice.invoice_number,
    customer: {
      name: invoice.customer_name,
      email: invoice.customer_email
    },
    dates: {
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end
    },
    lineItems: invoice.items
      .filter(item => item.amount > 0)
      .map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unit_price),
        amount: parseFloat(item.amount),
        type: item.item_type
      })),
    totals: {
      subtotal: parseFloat(invoice.subtotal),
      taxRate: parseFloat(invoice.tax_rate),
      taxAmount: parseFloat(invoice.tax_amount),
      total: parseFloat(invoice.total)
    },
    status: invoice.status,
    notes: invoice.notes
  };
}

/**
 * List customers
 */
export async function listCustomers(activeOnly = true) {
  const connection = await pool.getConnection();
  try {
    const [customers] = await connection.query(
      `SELECT * FROM customers ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY name`
    );
    return customers;
  } finally {
    connection.release();
  }
}

/**
 * Get customer by ID
 */
export async function getCustomer(customerId) {
  const connection = await pool.getConnection();
  try {
    const [customers] = await connection.query(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );
    return customers[0] || null;
  } finally {
    connection.release();
  }
}

export default {
  generateInvoiceNumber,
  getBillingSummary,
  generateInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  deleteInvoice,
  exportInvoiceCSV,
  exportInvoiceJSON,
  listCustomers,
  getCustomer
};
