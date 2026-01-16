import express from 'express';
import FluentSyncService from '../services/FluentSyncService.js';
import scheduler from '../services/scheduler.js';

const router = express.Router();

/**
 * POST /api/fluent/sync
 * Sync tickets from FluentSupport API to database
 * Only imports tickets created after the configured date filter
 */
router.post('/sync', async (req, res) => {
  try {
    // Get date filter from request or use default from environment
    const dateFilter = req.body.dateFilter || process.env.VITE_FLUENT_DATE_FILTER || '2025-09-20';

    // Use the service to handle sync logic
    const result = await FluentSyncService.syncTickets(dateFilter);

    res.json(result);

  } catch (error) {
    console.error('[FluentSync] Sync failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fluent/status
 * Get the last sync status, statistics, and scheduler info
 */
router.get('/status', async (req, res) => {
  try {
    const syncStatus = await FluentSyncService.getStatus();
    const schedulerStatus = scheduler.getStatus();

    res.json({
      ...syncStatus,
      scheduler: schedulerStatus
    });

  } catch (error) {
    console.error('[FluentSync] Failed to get status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/fluent/scheduler
 * Get scheduler status and next run times
 */
router.get('/scheduler', async (req, res) => {
  try {
    const status = scheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('[FluentSync] Failed to get scheduler status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/fluent/tickets
 * Get all FluentSupport tickets from database
 */
router.get('/tickets', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    // Validate and sanitize limit and offset parameters
    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);

    // Enforce reasonable limits to prevent resource exhaustion
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      return res.status(400).json({ error: 'Invalid limit parameter (must be 1-1000)' });
    }
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({ error: 'Invalid offset parameter (must be >= 0)' });
    }

    const tickets = await FluentSyncService.getTickets({
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json(tickets);

  } catch (error) {
    console.error('[FluentSync] Failed to get tickets:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
