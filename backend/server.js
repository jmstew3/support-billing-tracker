import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool, { testConnection, initializeDatabase } from './db/config.js';
import requestRoutes from './routes/requests.js';
import twentySyncRoutes from './routes/twenty-sync.js';
import fluentSyncRoutes from './routes/fluent-sync.js';
import twentyProxyRoutes from './routes/twenty-proxy.js';
import authRoutes from './routes/auth.js';
import invoiceRoutes from './routes/invoices.js';
import clientAuthRoutes from './routes/clientAuth.js';
import clientRoutes from './routes/client.js';
import adminClientsRoutes from './routes/adminClients.js';
import { authenticateToken } from './middleware/auth.js';
import { conditionalAuth } from './middleware/conditionalAuth.js';
import { sanitizeErrorMessage } from './middleware/security.js';
import logger from './services/logger.js';
import requestLogger from './middleware/requestLogger.js';
import scheduler from './services/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers middleware - protects against common web vulnerabilities
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for UI frameworks
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://velocity.peakonedigital.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Request timeout middleware - protects against slow HTTP attacks (Slowloris)
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds request timeout
  res.setTimeout(30000); // 30 seconds response timeout
  next();
});

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3011',
      'https://velocity.peakonedigital.com',
      'https://portal.peakonedigital.com',
      'http://portal.peakonedigital.com' // Local dev before HTTPS
      // SECURITY: HTTP removed for production - production must use HTTPS only
    ];
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Request body size limits - prevent DoS attacks via large payloads
// 2MB for JSON (CSV imports may be large but 1000 row limit in route handles this)
// 1MB for URL-encoded form data
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use(requestLogger);

// Routes
// Auth routes MUST come first and are NOT protected (to allow login)
// IMPORTANT: More specific routes must come before less specific ones
app.use('/api/auth/client', clientAuthRoutes); // Client portal auth (more specific, must be first)
app.use('/api/auth', authRoutes); // Internal auth (less specific)

// Client Portal routes (use JWT auth via clientAuth middleware)
// These routes handle their own authentication and scoping
app.use('/api/client', clientRoutes);

// Admin routes for client management (requires internal auth + admin role)
app.use('/api/admin/clients', conditionalAuth, adminClientsRoutes);

// All other API routes use conditional authentication
// (BasicAuth in production via Traefik, JWT for direct API access)
app.use('/api', conditionalAuth, requestRoutes);
app.use('/api/twenty', conditionalAuth, twentySyncRoutes);
app.use('/api/fluent', conditionalAuth, fluentSyncRoutes);
app.use('/api/twenty-proxy', conditionalAuth, twentyProxyRoutes);
app.use('/api/invoices', conditionalAuth, invoiceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware - sanitizes error messages to prevent info leakage
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  const status = err.status || 500;

  // Structured logging for all errors
  logger.error('Application error', {
    error: err.message,
    stack: err.stack,
    status,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
  });

  // Sanitize error message to prevent exposing sensitive details
  const message = status >= 500
    ? sanitizeErrorMessage(err, isDev)
    : (err.message || 'An error occurred');

  res.status(status).json({
    error: {
      message,
      status
    }
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error('Failed to connect to database', {
        message: 'Please check your MySQL configuration',
        hint: 'Make sure MySQL is running and the database exists',
        command: 'mysql -u root -p < db/schema.sql'
      });
      process.exit(1);
    }

    // Initialize database schema
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Start listening with server-level timeout configuration
    const server = app.listen(PORT, () => {
      logger.info('Server started', {
        port: PORT,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
        environment: process.env.NODE_ENV,
        security: 'Helmet enabled, request timeout 30s',
        message: `🚀 Server running on http://localhost:${PORT}`
      });

      // Initialize scheduler for automated sync jobs
      // Only in production or when explicitly enabled
      if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
        scheduler.initialize();
        logger.info('Scheduler initialized for automated sync');
      } else {
        logger.info('Scheduler disabled in development mode (set ENABLE_SCHEDULER=true to enable)');
      }
    });

    // Server-level timeouts for protection against slow HTTP attacks
    server.timeout = 30000; // 30 seconds - max time for request/response
    server.keepAliveTimeout = 65000; // 65 seconds - slightly longer than typical proxy timeouts
    server.headersTimeout = 66000; // Must be larger than keepAliveTimeout
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

startServer();