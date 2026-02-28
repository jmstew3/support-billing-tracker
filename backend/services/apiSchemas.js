import Joi from 'joi';
import logger from './logger.js';

/**
 * Schema validation for external API responses
 * Validates data from FluentSupport and Twenty CRM APIs
 * at integration boundaries to prevent malformed data from
 * causing unexpected behavior downstream.
 */

/**
 * FluentSupport ticket schema
 * Validates the essential fields we rely on from the FluentSupport API
 */
const fluentTicketSchema = Joi.object({
  id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  title: Joi.string().allow('', null).default(''),
  status: Joi.string().allow('', null).default(''),
  priority: Joi.string().allow('', null).default(null),
  created_at: Joi.string().allow('', null).default(null),
  resolved_at: Joi.string().allow('', null).default(null),
  updated_at: Joi.string().allow('', null).default(null),
  customer_message: Joi.string().allow('', null).default(''),
  content: Joi.string().allow('', null).default(''),
  message: Joi.string().allow('', null).default(''),
  customer_id: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null).default(null),
  customer: Joi.object({
    name: Joi.string().allow('', null).default(null),
    email: Joi.string().allow('', null).default(null),
  }).allow(null).default(null),
  agent_id: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null).default(null),
  agent: Joi.object({
    name: Joi.string().allow('', null).default(null),
  }).allow(null).default(null),
  product_id: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null).default(null),
  product: Joi.object({
    title: Joi.string().allow('', null).default(null),
  }).allow(null).default(null),
  mailbox_id: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null).default(null),
  ticket_hash: Joi.string().allow('', null).default(null),
  serial_number: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null).default(null),
}).options({ allowUnknown: true, stripUnknown: false });

/**
 * Validate a single FluentSupport ticket
 * @param {Object} ticket - Raw ticket from API
 * @returns {Object} Validated ticket (with defaults applied)
 */
export function validateFluentTicket(ticket) {
  const { error, value } = fluentTicketSchema.validate(ticket);
  if (error) {
    logger.warn('[apiSchemas] FluentSupport ticket validation failed', {
      ticketId: ticket?.id,
      error: error.message,
    });
    return null;
  }
  return value;
}

/**
 * Validate an array of FluentSupport tickets, filtering out invalid ones
 * @param {Array} tickets - Raw tickets array from API
 * @returns {Array} Array of validated tickets (invalid ones removed)
 */
export function validateFluentTickets(tickets) {
  if (!Array.isArray(tickets)) {
    logger.warn('[apiSchemas] Expected array of tickets, got', { type: typeof tickets });
    return [];
  }

  const validated = [];
  let skipped = 0;

  for (const ticket of tickets) {
    const result = validateFluentTicket(ticket);
    if (result) {
      validated.push(result);
    } else {
      skipped++;
    }
  }

  if (skipped > 0) {
    logger.warn(`[apiSchemas] Skipped ${skipped} invalid FluentSupport tickets out of ${tickets.length}`);
  }

  return validated;
}

export default {
  validateFluentTicket,
  validateFluentTickets,
};
