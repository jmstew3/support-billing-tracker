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
 * Free credits are deducted from cheapest tier first (regular → sameDay → emergency)
 */
function calculateBilling(requests, periodStart) {
  const effectiveDate = new Date(PRICING.freeCredits.effectiveDate);
  const periodDate = new Date(periodStart);
  const hasFreeCredits = periodDate >= effectiveDate;

  let totalHours = 0;
  let emergencyHours = 0;
  let sameDayHours = 0;
  let regularHours = 0;

  requests.forEach(req => {
    const hours = parseFloat(req.estimated_hours) || 0;
    totalHours += hours;

    if (req.urgency === 'HIGH') {
      emergencyHours += hours;
    } else if (req.urgency === 'MEDIUM') {
      sameDayHours += hours;
    } else {
      regularHours += hours;
    }
  });

  // Apply free credits from cheapest tier first: regular → sameDay → emergency
  let freeHoursApplied = 0;
  let billableRegularHours = regularHours;
  let billableSameDayHours = sameDayHours;
  let billableEmergencyHours = emergencyHours;

  if (hasFreeCredits) {
    let remainingCredits = Math.min(totalHours, PRICING.freeCredits.supportHours);
    freeHoursApplied = remainingCredits;

    // Deduct from regular hours first (cheapest at $150/hr)
    const regularDeduction = Math.min(remainingCredits, regularHours);
    billableRegularHours = regularHours - regularDeduction;
    remainingCredits -= regularDeduction;

    // Then from same-day hours ($175/hr)
    const sameDayDeduction = Math.min(remainingCredits, sameDayHours);
    billableSameDayHours = sameDayHours - sameDayDeduction;
    remainingCredits -= sameDayDeduction;

    // Finally from emergency hours (most expensive at $250/hr)
    const emergencyDeduction = Math.min(remainingCredits, emergencyHours);
    billableEmergencyHours = emergencyHours - emergencyDeduction;
    remainingCredits -= emergencyDeduction;
  }

  const billableHours = billableRegularHours + billableSameDayHours + billableEmergencyHours;

  // Calculate amounts per tier
  const emergencyAmount = billableEmergencyHours * PRICING.rates.emergency;
  const sameDayAmount = billableSameDayHours * PRICING.rates.sameDay;
  const regularAmount = billableRegularHours * PRICING.rates.regular;
  const subtotal = emergencyAmount + sameDayAmount + regularAmount;

  return {
    totalHours,
    billableHours,
    freeHoursApplied,
    emergencyHours,
    sameDayHours,
    regularHours,
    billableEmergencyHours,
    billableSameDayHours,
    billableRegularHours,
    emergencyAmount,
    sameDayAmount,
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
       AND COALESCE(billing_date, date) >= ? AND COALESCE(billing_date, date) <= ?
       AND status = 'active'
       AND invoice_id IS NULL
       AND category NOT IN ('Non-billable', 'Migration')
       ORDER BY COALESCE(billing_date, date), time`,
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

    const includeSupport = options.includeSupport !== false;
    const additionalItems = Array.isArray(options.additionalItems) ? options.additionalItems : [];
    const hostingDetailSnapshot = options.hostingDetailSnapshot || null;

    // Get customer info
    const [customers] = await connection.query(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );

    if (customers.length === 0) {
      throw new Error('Customer not found');
    }

    const customer = customers[0];

    // Get billing summary (only if support is included)
    let summary;
    if (includeSupport) {
      const [summaryRequests] = await connection.query(
        `SELECT * FROM requests
         WHERE customer_id = ?
         AND COALESCE(billing_date, date) >= ? AND COALESCE(billing_date, date) <= ?
         AND status = 'active'
         AND invoice_id IS NULL
         AND category NOT IN ('Non-billable', 'Migration')
         ORDER BY COALESCE(billing_date, date), time`,
        [customerId, periodStart, periodEnd]
      );

      const billing = calculateBilling(summaryRequests, periodStart);
      summary = {
        customerId,
        periodStart,
        periodEnd,
        requestCount: summaryRequests.length,
        requests: summaryRequests,
        ...billing
      };
    } else {
      summary = {
        customerId, periodStart, periodEnd,
        requestCount: 0, requests: [],
        totalHours: 0, billableHours: 0, freeHoursApplied: 0,
        emergencyHours: 0, sameDayHours: 0, regularHours: 0,
        billableEmergencyHours: 0, billableSameDayHours: 0, billableRegularHours: 0,
        emergencyAmount: 0, sameDayAmount: 0, regularAmount: 0, subtotal: 0
      };
    }

    if (summary.requestCount === 0 && additionalItems.length === 0) {
      throw new Error('No billable items found for this period');
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(customerId);

    // Calculate dates
    const invoiceDate = options.invoiceDate || new Date().toISOString().split('T')[0];
    const dueDate = options.dueDate || new Date(
      Date.now() + (customer.payment_terms * 24 * 60 * 60 * 1000)
    ).toISOString().split('T')[0];

    // Calculate combined subtotal
    const additionalSubtotal = additionalItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const combinedSubtotal = summary.subtotal + additionalSubtotal;

    // Calculate tax (default 0)
    const taxRate = options.taxRate || 0;
    const taxAmount = combinedSubtotal * taxRate;
    const total = combinedSubtotal + taxAmount;

    // Create invoice
    const [invoiceResult] = await connection.query(
      `INSERT INTO invoices
       (customer_id, invoice_number, period_start, period_end, invoice_date, due_date,
        status, subtotal, tax_rate, tax_amount, total, notes, hosting_detail_snapshot)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      [customerId, invoiceNumber, periodStart, periodEnd, invoiceDate, dueDate,
       combinedSubtotal, taxRate, taxAmount, total, options.notes || null,
       hostingDetailSnapshot ? JSON.stringify(hostingDetailSnapshot) : null]
    );

    const invoiceId = invoiceResult.insertId;

    // Create line items
    const lineItems = [];
    let sortOrder = 1;

    // Support hours line items per tier (only if support included)
    if (includeSupport && (summary.billableHours > 0 || summary.freeHoursApplied > 0)) {
      // Emergency hours
      if (summary.billableEmergencyHours > 0) {
        const [itemResult] = await connection.query(
          `INSERT INTO invoice_items
           (invoice_id, item_type, description, quantity, unit_price, amount, sort_order, request_ids)
           VALUES (?, 'support', ?, ?, ?, ?, ?, ?)`,
          [invoiceId, 'Emergency Support Hours', summary.billableEmergencyHours,
           PRICING.rates.emergency, summary.emergencyAmount, sortOrder++,
           JSON.stringify(summary.requests.filter(r => r.urgency === 'HIGH').map(r => r.id))]
        );
        lineItems.push({ id: itemResult.insertId, type: 'emergency' });
      }

      // Same Day hours
      if (summary.billableSameDayHours > 0) {
        const [itemResult] = await connection.query(
          `INSERT INTO invoice_items
           (invoice_id, item_type, description, quantity, unit_price, amount, sort_order, request_ids)
           VALUES (?, 'support', ?, ?, ?, ?, ?, ?)`,
          [invoiceId, 'Same Day Support Hours', summary.billableSameDayHours,
           PRICING.rates.sameDay, summary.sameDayAmount, sortOrder++,
           JSON.stringify(summary.requests.filter(r => r.urgency === 'MEDIUM').map(r => r.id))]
        );
        lineItems.push({ id: itemResult.insertId, type: 'sameDay' });
      }

      // Regular hours
      if (summary.billableRegularHours > 0) {
        const [itemResult] = await connection.query(
          `INSERT INTO invoice_items
           (invoice_id, item_type, description, quantity, unit_price, amount, sort_order, request_ids)
           VALUES (?, 'support', ?, ?, ?, ?, ?, ?)`,
          [invoiceId, 'Regular Support Hours', summary.billableRegularHours,
           PRICING.rates.regular, summary.regularAmount, sortOrder++,
           JSON.stringify(summary.requests.filter(r => r.urgency !== 'HIGH' && r.urgency !== 'MEDIUM').map(r => r.id))]
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

    // Insert additional line items (projects, hosting)
    for (const item of additionalItems) {
      const itemSortOrder = item.sort_order || sortOrder++;
      await connection.query(
        `INSERT INTO invoice_items
         (invoice_id, item_type, description, quantity, unit_price, amount, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, item.item_type, item.description,
         item.quantity || 1, item.unit_price || item.amount, item.amount, itemSortOrder]
      );
    }

    // Link requests to invoice (only if support included)
    if (includeSupport) {
      const requestIds = summary.requests.map(r => r.id);
      if (requestIds.length > 0) {
        await connection.query(
          `UPDATE requests SET invoice_id = ? WHERE id IN (?)`,
          [invoiceId, requestIds]
        );
      }
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
      `SELECT id, date, time, description, category, urgency, estimated_hours, website_url
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
 * Mark sent invoices as overdue if past their due date
 */
export async function markOverdueInvoices() {
  const connection = await pool.getConnection();
  try {
    const today = new Date().toISOString().split('T')[0];
    const [result] = await connection.query(
      `UPDATE invoices SET status = 'overdue'
       WHERE status = 'sent' AND due_date < ?`,
      [today]
    );
    return result.affectedRows || 0;
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
    let whereClause = 'WHERE 1=1';
    const filterParams = [];

    if (filters.customerId) {
      whereClause += ' AND i.customer_id = ?';
      filterParams.push(filters.customerId);
    }

    if (filters.status) {
      whereClause += ' AND i.status = ?';
      filterParams.push(filters.status);
    }

    if (filters.startDate) {
      whereClause += ' AND i.invoice_date >= ?';
      filterParams.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ' AND i.invoice_date <= ?';
      filterParams.push(filters.endDate);
    }

    // Get total count (with same filters, without limit/offset)
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total FROM invoices i ${whereClause}`,
      filterParams
    );

    // Get paginated results
    let query = `
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      ${whereClause}
      ORDER BY i.invoice_date DESC, i.id DESC
    `;
    const queryParams = [...filterParams];

    const limit = parseInt(filters.limit, 10) || 20;
    const offset = parseInt(filters.offset, 10) || 0;
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [invoices] = await connection.query(query, queryParams);

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
    const allowedFields = ['status', 'notes', 'internal_notes', 'amount_paid', 'payment_date', 'period_start', 'period_end', 'hosting_detail_snapshot'];
    const updateFields = [];
    const params = [];

    // JSON-serialize hosting_detail_snapshot if present and not already a string
    if (updates.hosting_detail_snapshot !== undefined && typeof updates.hosting_detail_snapshot !== 'string') {
      updates.hosting_detail_snapshot = JSON.stringify(updates.hosting_detail_snapshot);
    }

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
 * Update a line item on a draft invoice and recalculate totals
 */
export async function updateInvoiceItem(invoiceId, itemId, updates) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify invoice is draft
    const [invoices] = await connection.query(
      'SELECT status FROM invoices WHERE id = ?', [invoiceId]
    );
    if (invoices.length === 0) throw new Error('Invoice not found');
    if (invoices[0].status !== 'draft') throw new Error('Only draft invoices can be edited');

    // Verify item belongs to this invoice
    const [items] = await connection.query(
      'SELECT * FROM invoice_items WHERE id = ? AND invoice_id = ?', [itemId, invoiceId]
    );
    if (items.length === 0) throw new Error('Invoice item not found');

    // Update allowed fields
    const allowedFields = ['description', 'quantity', 'unit_price'];
    const updateFields = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }

    // Recalculate amount if quantity or unit_price changed
    const newQty = updates.quantity !== undefined ? parseFloat(updates.quantity) : parseFloat(items[0].quantity);
    const newPrice = updates.unit_price !== undefined ? parseFloat(updates.unit_price) : parseFloat(items[0].unit_price);
    const newAmount = newQty * newPrice;
    updateFields.push('amount = ?');
    params.push(newAmount);

    params.push(itemId);
    await connection.query(
      `UPDATE invoice_items SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    // Recalculate invoice totals from all line items
    await recalculateInvoiceTotals(connection, invoiceId);

    await connection.commit();
    return getInvoice(invoiceId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Remove a request from a draft invoice and recalculate
 */
export async function unlinkRequest(invoiceId, requestId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify invoice is draft
    const [invoices] = await connection.query(
      'SELECT * FROM invoices WHERE id = ?', [invoiceId]
    );
    if (invoices.length === 0) throw new Error('Invoice not found');
    if (invoices[0].status !== 'draft') throw new Error('Only draft invoices can be edited');

    // Unlink the request
    const [result] = await connection.query(
      'UPDATE requests SET invoice_id = NULL WHERE id = ? AND invoice_id = ?',
      [requestId, invoiceId]
    );
    if (result.affectedRows === 0) throw new Error('Request not linked to this invoice');

    // Remove the request ID from any line item request_ids arrays
    const [items] = await connection.query(
      'SELECT id, request_ids FROM invoice_items WHERE invoice_id = ? AND request_ids IS NOT NULL',
      [invoiceId]
    );
    for (const item of items) {
      let ids = typeof item.request_ids === 'string' ? JSON.parse(item.request_ids) : item.request_ids;
      if (Array.isArray(ids) && ids.includes(requestId)) {
        ids = ids.filter(id => id !== requestId);
        await connection.query(
          'UPDATE invoice_items SET request_ids = ? WHERE id = ?',
          [JSON.stringify(ids), item.id]
        );
      }
    }

    await connection.commit();
    return getInvoice(invoiceId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Add an unbilled request to a draft invoice
 */
export async function linkRequest(invoiceId, requestId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify invoice is draft
    const [invoices] = await connection.query(
      'SELECT * FROM invoices WHERE id = ?', [invoiceId]
    );
    if (invoices.length === 0) throw new Error('Invoice not found');
    if (invoices[0].status !== 'draft') throw new Error('Only draft invoices can be edited');

    // Verify request is unbilled and belongs to same customer
    const [requests] = await connection.query(
      `SELECT * FROM requests WHERE id = ? AND customer_id = ? AND invoice_id IS NULL AND status = 'active'`,
      [requestId, invoices[0].customer_id]
    );
    if (requests.length === 0) throw new Error('Request not found or already billed');

    // Link the request
    await connection.query(
      'UPDATE requests SET invoice_id = ? WHERE id = ?',
      [invoiceId, requestId]
    );

    await connection.commit();
    return getInvoice(invoiceId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get unbilled requests for a customer within an invoice's period
 */
export async function getUnbilledRequests(invoiceId) {
  const connection = await pool.getConnection();
  try {
    const [invoices] = await connection.query(
      'SELECT customer_id, period_start, period_end FROM invoices WHERE id = ?',
      [invoiceId]
    );
    if (invoices.length === 0) throw new Error('Invoice not found');

    const inv = invoices[0];
    const [requests] = await connection.query(
      `SELECT id, date, time, description, category, urgency, estimated_hours
       FROM requests
       WHERE customer_id = ? AND COALESCE(billing_date, date) >= ? AND COALESCE(billing_date, date) <= ?
       AND status = 'active' AND invoice_id IS NULL
       AND category NOT IN ('Non-billable', 'Migration')
       ORDER BY COALESCE(billing_date, date), time`,
      [inv.customer_id, inv.period_start, inv.period_end]
    );
    return requests;
  } finally {
    connection.release();
  }
}

/**
 * Recalculate invoice subtotal/total from line items
 */
async function recalculateInvoiceTotals(connection, invoiceId) {
  const [items] = await connection.query(
    'SELECT SUM(amount) as subtotal FROM invoice_items WHERE invoice_id = ? AND amount > 0',
    [invoiceId]
  );
  const subtotal = parseFloat(items[0].subtotal) || 0;

  const [invoice] = await connection.query(
    'SELECT tax_rate FROM invoices WHERE id = ?', [invoiceId]
  );
  const taxRate = parseFloat(invoice[0].tax_rate) || 0;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  await connection.query(
    'UPDATE invoices SET subtotal = ?, tax_amount = ?, total = ? WHERE id = ?',
    [subtotal, taxAmount, total, invoiceId]
  );
}

/**
 * Export invoice to CSV format (accounting-style statement with category sections)
 */
export async function exportInvoiceCSV(invoiceId) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const urgencyMap = {
    'HIGH': { label: 'Emergency', rate: 250 },
    'MEDIUM': { label: 'Same Day', rate: 175 },
    'LOW': { label: 'Regular', rate: 150 }
  };

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const lines = [];
  const categorySubtotals = [];

  // --- Header ---
  lines.push('INVOICE STATEMENT');
  lines.push('========================================');
  lines.push(`Invoice Number,${invoice.invoice_number}`);
  lines.push(`Customer,${invoice.customer_name}`);
  lines.push(`Invoice Date,${fmtDate(invoice.invoice_date)}`);
  lines.push(`Due Date,${fmtDate(invoice.due_date)}`);
  lines.push(`Billing Period,${fmtDate(invoice.period_start)} to ${fmtDate(invoice.period_end)}`);

  // --- Support Section ---
  const supportItems = invoice.items.filter(i => i.item_type === 'support');
  const supportRequests = invoice.requests || [];
  const freeCreditItem = invoice.items.find(i => i.item_type === 'other' && i.sort_order === 99);

  if (supportRequests.length > 0 || supportItems.length > 0) {
    lines.push('');
    lines.push('========================================');
    lines.push('SUPPORT SERVICES');
    lines.push('========================================');
    lines.push('Date,Description,Website,Urgency,Hours,Rate,Amount');

    let totalHours = 0;

    for (const req of supportRequests) {
      const urgency = urgencyMap[req.urgency] || urgencyMap['LOW'];
      const hours = parseFloat(req.estimated_hours) || 0;
      const amount = hours * urgency.rate;
      totalHours += hours;

      const desc = `"${(req.description || '').replace(/"/g, '""')}"`;
      const website = req.website_url || '';
      lines.push(`${fmtDate(req.date)},${desc},${website},${urgency.label},${hours.toFixed(2)},$${urgency.rate.toFixed(2)},$${amount.toFixed(2)}`);
    }

    // Total hours row
    lines.push(`,,,Total Hours,${totalHours.toFixed(2)},,`);

    // Free credit row
    if (freeCreditItem) {
      const freeHours = parseFloat(freeCreditItem.quantity) || 0;
      const supportGross = supportRequests.reduce((sum, req) => {
        const u = urgencyMap[req.urgency] || urgencyMap['LOW'];
        return sum + (parseFloat(req.estimated_hours) || 0) * u.rate;
      }, 0);
      const supportNet = supportItems.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const creditAmount = supportGross - supportNet;
      lines.push(`,,,Free Credit Applied,-${freeHours.toFixed(2)},,-$${creditAmount.toFixed(2)}`);
    }

    const supportSubtotal = supportItems.reduce((sum, i) => sum + parseFloat(i.amount), 0);
    lines.push(`,,,SUPPORT SUBTOTAL,,,$${supportSubtotal.toFixed(2)}`);
    categorySubtotals.push({ label: 'Support Services', amount: supportSubtotal });
  }

  // --- Projects Section ---
  const projectItems = invoice.items.filter(i => i.item_type === 'project');

  if (projectItems.length > 0) {
    lines.push('');
    lines.push('========================================');
    lines.push('PROJECTS');
    lines.push('========================================');
    lines.push('Description,Quantity,Unit Price,Amount');

    for (const item of projectItems) {
      const desc = `"${(item.description || '').replace(/"/g, '""')}"`;
      const qty = parseFloat(item.quantity) || 1;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const amount = parseFloat(item.amount) || 0;
      lines.push(`${desc},${qty},$${unitPrice.toFixed(2)},$${amount.toFixed(2)}`);
    }

    lines.push(',,,');
    const projectSubtotal = projectItems.reduce((sum, i) => sum + parseFloat(i.amount), 0);
    lines.push(`,,PROJECTS SUBTOTAL,$${projectSubtotal.toFixed(2)}`);
    categorySubtotals.push({ label: 'Projects', amount: projectSubtotal });
  }

  // --- Hosting Section ---
  let hostingRendered = false;
  const hostingSnapshot = invoice.hosting_detail_snapshot;

  if (hostingSnapshot) {
    const details = typeof hostingSnapshot === 'string' ? JSON.parse(hostingSnapshot) : hostingSnapshot;
    if (details.length > 0) {
      lines.push('');
      lines.push('========================================');
      lines.push('HOSTING - TURBO HOSTING');
      lines.push('========================================');
      lines.push('Site Name,Website URL,Billing Type,Days Active,Days in Month,Gross Amount,Credit,Net Amount');

      let hostingSubtotal = 0;
      for (const site of details) {
        const name = `"${(site.siteName || '').replace(/"/g, '""')}"`;
        const url = site.websiteUrl || '';
        const billingLabel = (site.billingType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const gross = parseFloat(site.grossAmount) || 0;
        const net = parseFloat(site.netAmount) || 0;
        const credit = site.creditApplied ? 'Free Credit' : '';
        hostingSubtotal += net;

        lines.push(`${name},${url},${billingLabel},${site.daysActive},${site.daysInMonth},$${gross.toFixed(2)},${credit},$${net.toFixed(2)}`);
      }

      lines.push(',,,,,,');
      lines.push(`,,,,,HOSTING SUBTOTAL,,$${hostingSubtotal.toFixed(2)}`);
      categorySubtotals.push({ label: 'Hosting', amount: hostingSubtotal });
      hostingRendered = true;
    }
  }

  // Fallback: no snapshot but there's a hosting line item
  if (!hostingRendered) {
    const hostingItems = invoice.items.filter(i => i.item_type === 'hosting');
    if (hostingItems.length > 0) {
      lines.push('');
      lines.push('========================================');
      lines.push('HOSTING - TURBO HOSTING');
      lines.push('========================================');
      lines.push('Description,Quantity,Unit Price,Amount');

      for (const item of hostingItems) {
        const desc = `"${(item.description || '').replace(/"/g, '""')}"`;
        const amount = parseFloat(item.amount) || 0;
        lines.push(`${desc},${parseFloat(item.quantity) || 1},$${(parseFloat(item.unit_price) || 0).toFixed(2)},$${amount.toFixed(2)}`);
      }

      lines.push(',,,');
      const hostingSubtotal = hostingItems.reduce((sum, i) => sum + parseFloat(i.amount), 0);
      lines.push(`,,HOSTING SUBTOTAL,$${hostingSubtotal.toFixed(2)}`);
      categorySubtotals.push({ label: 'Hosting', amount: hostingSubtotal });
    }
  }

  // --- Totals Section ---
  lines.push('');
  lines.push('========================================');
  lines.push('INVOICE TOTAL');
  lines.push('========================================');

  for (const cat of categorySubtotals) {
    lines.push(`${cat.label},,,,,$${cat.amount.toFixed(2)}`);
  }

  const subtotal = parseFloat(invoice.subtotal) || 0;
  const taxAmount = parseFloat(invoice.tax_amount) || 0;
  const total = parseFloat(invoice.total) || 0;

  lines.push(`,,,,Subtotal,,$${subtotal.toFixed(2)}`);
  if (taxAmount > 0) {
    const taxRate = (parseFloat(invoice.tax_rate) * 100).toFixed(2);
    lines.push(`,,,,Tax (${taxRate}%),,$${taxAmount.toFixed(2)}`);
  }
  lines.push(`,,,,TOTAL,,$${total.toFixed(2)}`);

  return lines.join('\n');
}

/**
 * Export invoice as QBO-compatible flat CSV
 * Flat format with repeated invoice header per line — directly importable into QuickBooks Online
 */
export async function exportInvoiceQBOCSV(invoiceId) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Format dates as MM/DD/YYYY for QBO
  const fmtDate = (d) => {
    const [y, m, day] = d.split('T')[0].split('-');
    return `${m}/${day}/${y}`;
  };

  const invNo = invoice.invoice_number;
  const customer = invoice.customer_name;
  const invDate = fmtDate(invoice.invoice_date);
  const dueDate = fmtDate(invoice.due_date);

  const lines = [];
  lines.push('InvoiceNo,Customer,InvoiceDate,DueDate,ItemDescription,ItemQuantity,ItemRate,ItemAmount');

  const billableItems = (invoice.items || []).filter(item => parseFloat(item.amount) > 0);
  for (const item of billableItems) {
    const desc = `"${item.description.replace(/"/g, '""')}"`;
    const qty = parseFloat(item.quantity);
    const rate = parseFloat(item.unit_price).toFixed(2);
    const amt = parseFloat(item.amount).toFixed(2);
    lines.push(`${invNo},${customer},${invDate},${dueDate},${desc},${qty},${rate},${amt}`);
  }

  return lines.join('\n');
}

/**
 * Export hosting detail CSV from stored snapshot
 * Per-site breakdown for client transparency, sent as an attachment alongside the invoice
 */
export async function exportHostingDetailCSV(invoiceId) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT hosting_detail_snapshot, invoice_number FROM invoices WHERE id = ?',
      [invoiceId]
    );

    if (rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const snapshot = rows[0].hosting_detail_snapshot;
    if (!snapshot) {
      throw new Error('No hosting detail data stored for this invoice');
    }

    const details = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;

    const lines = [];
    lines.push('Site Name,Website URL,Billing Type,Days Active,Days in Month,Gross Amount,Credit Applied,Net Amount');

    let totalGross = 0;
    let totalNet = 0;
    let totalCredits = 0;
    let totalSites = 0;

    for (const site of details) {
      const name = `"${(site.siteName || '').replace(/"/g, '""')}"`;
      const url = site.websiteUrl || '';
      const billingLabel = (site.billingType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const gross = parseFloat(site.grossAmount) || 0;
      const net = parseFloat(site.netAmount) || 0;
      const credit = site.creditApplied ? 'Yes' : 'No';

      lines.push(`${name},${url},${billingLabel},${site.daysActive},${site.daysInMonth},$${gross.toFixed(2)},${credit},$${net.toFixed(2)}`);

      totalGross += gross;
      totalNet += net;
      if (site.creditApplied) totalCredits++;
      totalSites++;
    }

    // Summary row
    lines.push('');
    lines.push(`Total: ${totalSites} sites,,,,,$${totalGross.toFixed(2)},${totalCredits} credit${totalCredits !== 1 ? 's' : ''},$${totalNet.toFixed(2)}`);

    return lines.join('\n');
  } finally {
    connection.release();
  }
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
  markOverdueInvoices,
  updateInvoice,
  updateInvoiceItem,
  unlinkRequest,
  linkRequest,
  getUnbilledRequests,
  deleteInvoice,
  exportInvoiceCSV,
  exportInvoiceQBOCSV,
  exportHostingDetailCSV,
  exportInvoiceJSON,
  listCustomers,
  getCustomer
};
