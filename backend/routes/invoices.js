/**
 * Invoice Routes
 * API endpoints for invoice management
 */

import express from 'express';
import {
  getBillingSummary,
  generateInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  updateInvoiceItem,
  unlinkRequest,
  linkRequest,
  getUnbilledRequests,
  deleteInvoice,
  exportInvoiceCSV,
  exportInvoiceJSON,
  listCustomers,
  getCustomer,
  markOverdueInvoices
} from '../services/invoiceService.js';

const router = express.Router();

// =====================================================
// CUSTOMER ENDPOINTS
// =====================================================

/**
 * GET /api/invoices/customers
 * List all customers
 */
router.get('/customers', async (req, res) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const customers = await listCustomers(activeOnly);
    res.json({ customers });
  } catch (error) {
    console.error('Error listing customers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/invoices/customers/:id
 * Get customer by ID
 */
router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    console.error('Error getting customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// BILLING SUMMARY ENDPOINTS
// =====================================================

/**
 * GET /api/invoices/billing-summary
 * Get billing summary for a customer and period
 * Query params: customerId, periodStart, periodEnd
 */
router.get('/billing-summary', async (req, res) => {
  try {
    const { customerId, periodStart, periodEnd } = req.query;

    if (!customerId || !periodStart || !periodEnd) {
      return res.status(400).json({
        error: 'Missing required parameters: customerId, periodStart, periodEnd'
      });
    }

    const summary = await getBillingSummary(customerId, periodStart, periodEnd);
    res.json(summary);
  } catch (error) {
    console.error('Error getting billing summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// INVOICE CRUD ENDPOINTS
// =====================================================

/**
 * GET /api/invoices
 * List invoices with optional filters
 * Query params: customerId, status, startDate, endDate, limit, offset
 */
router.get('/', async (req, res) => {
  try {
    // Auto-detect overdue invoices on each list load
    await markOverdueInvoices().catch(err =>
      console.error('Error marking overdue invoices:', err)
    );

    const filters = {
      customerId: req.query.customerId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };

    const result = await listInvoices(filters);
    res.json(result);
  } catch (error) {
    console.error('Error listing invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/invoices/:id
 * Get invoice by ID with items and linked requests
 */
router.get('/:id', async (req, res) => {
  try {
    const invoice = await getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error getting invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invoices/generate
 * Generate a new invoice from billing summary
 * Body: { customerId, periodStart, periodEnd, invoiceDate?, dueDate?, taxRate?, notes? }
 */
router.post('/generate', async (req, res) => {
  try {
    const { customerId, periodStart, periodEnd, ...options } = req.body;

    if (!customerId || !periodStart || !periodEnd) {
      return res.status(400).json({
        error: 'Missing required fields: customerId, periodStart, periodEnd'
      });
    }

    const invoice = await generateInvoice(customerId, periodStart, periodEnd, options);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/invoices/:id
 * Update invoice (status, notes, payment info)
 * Body: { status?, notes?, internal_notes?, amount_paid?, payment_date? }
 */
router.put('/:id', async (req, res) => {
  try {
    const invoice = await updateInvoice(req.params.id, req.body);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/invoices/:id
 * Delete a draft invoice
 */
router.delete('/:id', async (req, res) => {
  try {
    await deleteInvoice(req.params.id);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(400).json({ error: error.message });
  }
});

// =====================================================
// INVOICE EDITING ENDPOINTS (draft only)
// =====================================================

/**
 * PUT /api/invoices/:id/items/:itemId
 * Update a line item on a draft invoice
 * Body: { description?, quantity?, unit_price? }
 */
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const invoice = await updateInvoiceItem(req.params.id, req.params.itemId, req.body);
    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice item:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/invoices/:id/requests/:requestId
 * Remove a request from a draft invoice
 */
router.delete('/:id/requests/:requestId', async (req, res) => {
  try {
    const invoice = await unlinkRequest(
      parseInt(req.params.id),
      parseInt(req.params.requestId)
    );
    res.json(invoice);
  } catch (error) {
    console.error('Error unlinking request:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/invoices/:id/requests/:requestId
 * Add an unbilled request to a draft invoice
 */
router.post('/:id/requests/:requestId', async (req, res) => {
  try {
    const invoice = await linkRequest(
      parseInt(req.params.id),
      parseInt(req.params.requestId)
    );
    res.json(invoice);
  } catch (error) {
    console.error('Error linking request:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/invoices/:id/unbilled-requests
 * Get unbilled requests for the invoice's customer and period
 */
router.get('/:id/unbilled-requests', async (req, res) => {
  try {
    const requests = await getUnbilledRequests(parseInt(req.params.id));
    res.json({ requests });
  } catch (error) {
    console.error('Error getting unbilled requests:', error);
    res.status(400).json({ error: error.message });
  }
});

// =====================================================
// EXPORT ENDPOINTS
// =====================================================

/**
 * GET /api/invoices/:id/export/csv
 * Export invoice as CSV
 */
router.get('/:id/export/csv', async (req, res) => {
  try {
    const csv = await exportInvoiceCSV(req.params.id);
    const invoice = await getInvoice(req.params.id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoice_number}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/invoices/:id/export/json
 * Export invoice as JSON (QuickBooks format)
 */
router.get('/:id/export/json', async (req, res) => {
  try {
    const json = await exportInvoiceJSON(req.params.id);
    const invoice = await getInvoice(req.params.id);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoice_number}.json"`
    );
    res.json(json);
  } catch (error) {
    console.error('Error exporting JSON:', error);
    res.status(400).json({ error: error.message });
  }
});

// =====================================================
// STATUS TRANSITIONS
// =====================================================

/**
 * POST /api/invoices/:id/send
 * Mark invoice as sent
 */
router.post('/:id/send', async (req, res) => {
  try {
    const invoice = await updateInvoice(req.params.id, { status: 'sent' });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/invoices/:id/pay
 * Mark invoice as paid
 * Body: { amount_paid, payment_date? }
 */
router.post('/:id/pay', async (req, res) => {
  try {
    const { amount_paid, payment_date } = req.body;

    if (!amount_paid) {
      return res.status(400).json({ error: 'amount_paid is required' });
    }

    const invoice = await updateInvoice(req.params.id, {
      status: 'paid',
      amount_paid,
      payment_date: payment_date || new Date().toISOString().split('T')[0]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error marking invoice paid:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
