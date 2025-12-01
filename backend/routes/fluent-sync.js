import express from 'express';
import FluentSyncService from '../services/FluentSyncService.js';

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
 * Get the last sync status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const status = await FluentSyncService.getStatus();
    res.json(status);

  } catch (error) {
    console.error('[FluentSync] Failed to get status:', error.message);
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

    const tickets = await FluentSyncService.getTickets({
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(tickets);

  } catch (error) {
    console.error('[FluentSync] Failed to get tickets:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
