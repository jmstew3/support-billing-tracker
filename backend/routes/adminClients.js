import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import ClientRepository from '../repositories/ClientRepository.js';
import ClientUser from '../models/ClientUser.js';
import crypto from 'crypto';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/clients
 * List all clients with summary data
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0, includeInactive = false } = req.query;

    const result = await ClientRepository.getAllClients({
      limit: Math.min(parseInt(limit) || 100, 500),
      offset: parseInt(offset) || 0,
      includeInactive: includeInactive === 'true'
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * GET /api/admin/clients/:id
 * Get detailed client information
 */
router.get('/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const client = await ClientRepository.getClientById(clientId);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

/**
 * POST /api/admin/clients
 * Create a new client
 */
router.post('/', async (req, res) => {
  try {
    const {
      companyName,
      contactEmail,
      contactPhone,
      fluentCustomerId,
      twentyBrandId,
      notes
    } = req.body;

    // Validate required fields
    if (!companyName || !contactEmail) {
      return res.status(400).json({ error: 'Company name and contact email are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const client = await ClientRepository.createClient({
      companyName,
      contactEmail,
      contactPhone: contactPhone || null,
      fluentCustomerId: fluentCustomerId || null,
      twentyBrandId: twentyBrandId || null,
      notes: notes || null
    });

    res.status(201).json(client);
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

/**
 * PUT /api/admin/clients/:id
 * Update client information
 */
router.put('/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    // Check client exists
    const existingClient = await ClientRepository.getClientById(clientId);
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Validate email if provided
    if (req.body.contactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.contactEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    await ClientRepository.updateClient(clientId, req.body);

    // Fetch updated client
    const updatedClient = await ClientRepository.getClientById(clientId);

    res.json(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

/**
 * DELETE /api/admin/clients/:id
 * Deactivate a client (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    // Check client exists
    const existingClient = await ClientRepository.getClientById(clientId);
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Soft delete by setting is_active = false
    await ClientRepository.updateClient(clientId, { isActive: false });

    res.json({ message: 'Client deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating client:', error);
    res.status(500).json({ error: 'Failed to deactivate client' });
  }
});

/**
 * POST /api/admin/clients/:id/reactivate
 * Reactivate a deactivated client
 */
router.post('/:id/reactivate', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    await ClientRepository.updateClient(clientId, { isActive: true });

    const client = await ClientRepository.getClientById(clientId);

    res.json(client);
  } catch (error) {
    console.error('Error reactivating client:', error);
    res.status(500).json({ error: 'Failed to reactivate client' });
  }
});

// ============================================
// Client User Management
// ============================================

/**
 * GET /api/admin/clients/:id/users
 * Get all users for a client
 */
router.get('/:id/users', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const users = await ClientUser.findByClientId(clientId);

    res.json({ users });
  } catch (error) {
    console.error('Error fetching client users:', error);
    res.status(500).json({ error: 'Failed to fetch client users' });
  }
});

/**
 * POST /api/admin/clients/:id/users
 * Create a new user for a client
 */
router.post('/:id/users', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const { email, name, password } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check client exists
    const client = await ClientRepository.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Generate temporary password if not provided
    const userPassword = password || crypto.randomBytes(12).toString('base64url');

    const user = await ClientUser.create({
      clientId,
      email,
      name: name || null,
      password: userPassword
    });

    // Return user with temporary password (only time it's visible)
    res.status(201).json({
      ...user,
      temporaryPassword: password ? undefined : userPassword,
      message: password ? 'User created successfully' : 'User created with temporary password'
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error creating client user:', error);
    res.status(500).json({ error: 'Failed to create client user' });
  }
});

/**
 * PUT /api/admin/clients/:clientId/users/:userId
 * Update a client user
 */
router.put('/:clientId/users/:userId', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const userId = parseInt(req.params.userId);

    if (isNaN(clientId) || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid client or user ID' });
    }

    const { name, email } = req.body;

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    await ClientUser.update(userId, { name, email });

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    if (error.message.includes('already in use')) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error updating client user:', error);
    res.status(500).json({ error: 'Failed to update client user' });
  }
});

/**
 * DELETE /api/admin/clients/:clientId/users/:userId
 * Deactivate a client user
 */
router.delete('/:clientId/users/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    await ClientUser.deactivate(userId);

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating client user:', error);
    res.status(500).json({ error: 'Failed to deactivate client user' });
  }
});

/**
 * POST /api/admin/clients/:clientId/users/:userId/reset-password
 * Generate a new temporary password for a client user
 */
router.post('/:clientId/users/:userId/reset-password', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Generate new temporary password
    const newPassword = crypto.randomBytes(12).toString('base64url');

    await ClientUser.updatePassword(userId, newPassword);

    res.json({
      message: 'Password reset successfully',
      temporaryPassword: newPassword
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
