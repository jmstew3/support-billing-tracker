import QBOItemMappingRepository from '../repositories/QBOItemMappingRepository.js';
import logger from './logger.js';

/**
 * Invoice Mapper — Core Translation Layer
 *
 * Translates a local invoice + items into a QBO Invoice API payload.
 * Handles support/credit/project/hosting line mapping, amount rounding (D10),
 * credit line detection via startsWith (C2), and pre-validation.
 */

/**
 * Round a number to exactly 2 decimal places (D10).
 */
function roundTo2(value) {
  return Math.round(Number(value) * 100) / 100;
}

/**
 * Validate that Amount matches Qty * UnitPrice after rounding.
 * If mismatch, return the corrected amount.
 */
function validateLineAmount(qty, unitPrice, amount) {
  const expected = Math.round(qty * unitPrice * 100) / 100;
  const actual = roundTo2(amount);
  if (expected !== actual) {
    logger.warn('[InvoiceMapper] Rounding mismatch corrected', {
      qty, unitPrice, expected, actual
    });
    return expected;
  }
  return actual;
}

/**
 * Determine the QBO item mapping lookup key for an invoice line item.
 * Applies the C2 fix: strips parenthetical suffix from dynamic credit descriptions.
 *
 * @param {Object} item - invoice_items row
 * @returns {{ itemType: string, category: string|null, description: string|null }}
 */
function getItemLookupKey(item) {
  const desc = item.description || '';

  // Support credit line: item_type='other', description starts with 'Turbo Support Credit Applied'
  if (item.item_type === 'other' && desc.startsWith('Turbo Support Credit Applied')) {
    return { itemType: 'credit', category: null, description: 'Turbo Support Credit Applied' };
  }

  // Legacy support credit format
  if (item.item_type === 'other' && desc.startsWith('Free hours credit')) {
    return { itemType: 'credit', category: null, description: 'Turbo Support Credit Applied' };
  }

  // Hosting credit: item_type='other', category='HOSTING_CREDIT'
  if (item.item_type === 'other' && item.category === 'HOSTING_CREDIT') {
    return { itemType: 'credit', category: 'HOSTING_CREDIT', description: null };
  }

  // Hosting proration: item_type='other', category='HOSTING_PRORATED'
  if (item.item_type === 'other' && item.category === 'HOSTING_PRORATED') {
    return { itemType: 'credit', category: 'HOSTING_PRORATED', description: null };
  }

  // Support lines
  if (item.item_type === 'support') {
    return { itemType: 'support', category: null, description: desc };
  }

  // Project lines
  if (item.item_type === 'project') {
    return { itemType: 'project', category: item.category || null, description: null };
  }

  // Hosting lines
  if (item.item_type === 'hosting') {
    return { itemType: 'hosting', category: null, description: null };
  }

  // Fallback for any other 'other' type
  return { itemType: 'other', category: item.category || null, description: desc || null };
}

/**
 * Map a local invoice + items into a QBO Invoice creation payload.
 *
 * @param {Object} invoice - Invoice row from DB (with items[] array)
 * @param {Object} customer - Customer row from DB (must have qbo_customer_id)
 * @returns {Promise<Object>} QBO Invoice JSON payload
 * @throws {Error} On validation failure (unmapped items, negative total, etc.)
 */
export async function mapInvoiceToQBO(invoice, customer) {
  // ── Pre-validation ──
  if (!customer.qbo_customer_id) {
    throw new Error(`Customer "${customer.name}" is not mapped to QBO. Run customer sync first.`);
  }

  if (invoice.qbo_sync_status === 'synced') {
    throw new Error(`Invoice ${invoice.invoice_number} is already synced to QBO (ID: ${invoice.qbo_invoice_id}). To re-sync, void it in QBO and reset qbo_sync_status to "pending".`);
  }

  const items = invoice.items || [];
  if (items.length === 0) {
    throw new Error(`Invoice ${invoice.invoice_number} has no line items.`);
  }

  // ── Build QBO Line items ──
  const qboLines = [];
  const unmappedItems = [];

  for (const item of items) {
    // Skip $0 project lines (D5)
    if (item.item_type === 'project' && roundTo2(item.amount) === 0) {
      continue;
    }

    const lookupKey = getItemLookupKey(item);
    const mapping = await QBOItemMappingRepository.findQBOItemId(
      lookupKey.itemType, lookupKey.category, lookupKey.description
    );

    if (!mapping) {
      unmappedItems.push({
        itemType: lookupKey.itemType,
        category: lookupKey.category,
        description: lookupKey.description || item.description,
        originalItemType: item.item_type
      });
      continue;
    }

    const qty = roundTo2(item.quantity);
    const unitPrice = roundTo2(item.unit_price);
    const amount = validateLineAmount(qty, unitPrice, item.amount);

    qboLines.push({
      Amount: amount,
      DetailType: 'SalesItemLineDetail',
      Description: item.description,
      SalesItemLineDetail: {
        ItemRef: {
          value: mapping.qbo_item_id,
          name: mapping.qbo_item_name
        },
        UnitPrice: unitPrice,
        Qty: qty
      }
    });
  }

  if (unmappedItems.length > 0) {
    const details = unmappedItems.map(u =>
      `${u.originalItemType}/${u.itemType} category=${u.category || 'null'} desc="${u.description || 'null'}"`
    ).join(', ');
    throw new Error(`Unmapped line items found: ${details}. Run item sync or add mappings.`);
  }

  if (qboLines.length === 0) {
    throw new Error(`Invoice ${invoice.invoice_number} has no mappable line items after filtering.`);
  }

  // ── Validate invoice total ≥ $0 ──
  const calculatedTotal = roundTo2(qboLines.reduce((sum, line) => sum + line.Amount, 0));
  if (calculatedTotal < 0) {
    throw new Error(
      `Invoice total is negative ($${calculatedTotal.toFixed(2)}). ` +
      `QBO rejects invoices with negative totals. ` +
      `The free credit may exceed billable hours — review credit allocation.`
    );
  }

  // ── Build QBO Invoice payload ──
  const payload = {
    CustomerRef: {
      value: customer.qbo_customer_id
    },
    TxnDate: formatDate(invoice.invoice_date),
    DueDate: formatDate(invoice.due_date),
    DocNumber: invoice.invoice_number,
    Line: qboLines,
    GlobalTaxCalculation: 'NotApplicable'
  };

  // Optional fields
  if (invoice.internal_notes) {
    payload.PrivateNote = invoice.internal_notes;
  }
  if (invoice.notes) {
    payload.CustomerMemo = { value: invoice.notes };
  }
  if (customer.email) {
    payload.BillEmail = { Address: customer.email };
    payload.EmailStatus = 'NeedToSend';
  } else {
    payload.EmailStatus = 'NotSet';
  }

  return payload;
}

/**
 * Format a date value to YYYY-MM-DD string.
 * Handles Date objects, ISO strings, and YYYY-MM-DD strings.
 */
function formatDate(dateValue) {
  if (!dateValue) return undefined;
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  // Already a string — extract date portion
  return String(dateValue).split('T')[0];
}

/**
 * Parse QBO error response into human-readable string.
 */
export function parseQBOError(responseBody) {
  const fault = responseBody?.Fault;
  if (!fault) return 'Unknown QBO error';
  return fault.Error?.map(e => `${e.code}: ${e.Detail || e.Message}`).join('; ');
}
