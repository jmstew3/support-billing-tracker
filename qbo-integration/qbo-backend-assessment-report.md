# Backend Environment Assessment Report

**Project:** Support Billing Tracker
**Assessment Date:** 2026-03-06
**Purpose:** Evaluate backend readiness for QuickBooks Online (QBO) API integration

---

## Project Structure Overview

```
support-billing-tracker/
├── backend/
│   ├── server.js                    # Express app entry point (ES modules)
│   ├── package.json                 # Backend dependencies (type: "module")
│   ├── Dockerfile                   # Docker build config
│   ├── db/
│   │   ├── config.js                # mysql2/promise connection pool
│   │   ├── schema.sql               # Base schema (requests table)
│   │   ├── migrations/              # 20+ SQL migrations (numbered)
│   │   ├── seed_*.sql               # Seed data scripts
│   │   └── add_*.sql                # Ad-hoc migration scripts
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication (Bearer token)
│   │   ├── clientAuth.js            # Client portal JWT auth
│   │   ├── conditionalAuth.js       # Hybrid BasicAuth/JWT middleware
│   │   ├── security.js              # Rate limiters, validators, sanitizers
│   │   ├── pagination.js            # Pagination helper
│   │   └── requestLogger.js         # HTTP request logging
│   ├── models/
│   │   ├── Request.js               # Request model (class-based, raw SQL)
│   │   ├── User.js                  # User model (class-based, raw SQL)
│   │   └── ClientUser.js            # Client portal user model
│   ├── repositories/
│   │   ├── AuditLogRepository.js    # Audit trail storage
│   │   ├── RefreshTokenRepository.js# JWT refresh token storage
│   │   ├── ClientRepository.js      # Client/customer data access
│   │   ├── RequestRepository.js     # Request data access
│   │   ├── FluentSyncStatusRepository.js # Sync status tracking
│   │   └── FluentTicketRepository.js# Fluent ticket data access
│   ├── routes/
│   │   ├── auth.js                  # Login, logout, refresh, change-password
│   │   ├── clientAuth.js            # Client portal auth routes
│   │   ├── client.js                # Client portal data routes
│   │   ├── adminClients.js          # Admin client management
│   │   ├── requests.js              # CRUD for support requests
│   │   ├── invoices.js              # Invoice CRUD, export (CSV, QBO CSV, JSON)
│   │   ├── fluent-sync.js           # FluentSupport sync endpoints
│   │   ├── twenty-sync.js           # Twenty CRM sync endpoints
│   │   └── twenty-proxy.js          # Twenty CRM proxy
│   ├── services/
│   │   ├── invoiceService.js        # Invoice generation, billing, QBO CSV/JSON export
│   │   ├── fluentSupportApi.js      # FluentSupport REST API client (axios)
│   │   ├── FluentSyncService.js     # Ticket sync orchestration
│   │   ├── RequestService.js        # Request business logic
│   │   ├── apiSchemas.js            # Joi validation for external API data
│   │   ├── scheduler.js             # Cron-based job scheduler (node-cron)
│   │   └── logger.js                # Winston structured logging
│   └── utils/
│       ├── csvParser.js             # CSV parsing utilities
│       ├── import-csv.js            # CSV import script
│       └── cookies.js               # Cookie configuration helpers
├── docker-compose.yml               # MySQL 8.4, backend, frontend, backup
├── .env / .env.example              # Environment configuration
└── qbo-integration/                 # (empty - target for new QBO code)
```

**Key Architecture Patterns:**
- ES modules throughout (`"type": "module"` in package.json)
- Layered architecture: routes -> services -> repositories/models -> db pool
- Raw SQL via `mysql2/promise` (no ORM)
- Class-based models and repositories with static methods
- Docker Compose deployment with Traefik reverse proxy

---

## Dependencies Inventory

### Already Installed (Relevant to QBO Integration)

| Package | Version | Relevance |
|---------|---------|-----------|
| `axios` | ^1.13.6 | HTTP client for external APIs (used for FluentSupport) |
| `express` | ^4.19.2 | Web framework |
| `mysql2` | ^3.11.0 | Database driver (promise-based pool) |
| `dotenv` | ^16.4.5 | Environment variable loading |
| `jsonwebtoken` | ^9.0.2 | JWT token handling (internal auth) |
| `joi` | ^18.0.2 | Schema validation for API responses |
| `helmet` | ^8.1.0 | Security headers |
| `cors` | ^2.8.5 | Cross-origin configuration |
| `express-rate-limit` | ^8.2.1 | Rate limiting |
| `cookie-parser` | ^1.4.7 | Cookie parsing (for refresh tokens) |
| `winston` | ^3.19.0 | Structured logging |
| `node-cron` | ^4.2.1 | Scheduled job execution |
| `compression` | ^1.8.1 | Response compression |
| `bcryptjs` | ^3.0.2 | Password hashing |

### Missing Packages Needed for QBO

| Package | Purpose | Priority |
|---------|---------|----------|
| `intuit-oauth` | Official Intuit OAuth 2.0 client library for token management | **Required** |
| `node-quickbooks` | QBO API SDK (CRUD operations for invoices, customers, items) | **Recommended** (or use axios directly) |

**Note:** The project already uses `axios` extensively for external API calls, so direct QBO REST API calls via axios are also viable without `node-quickbooks`. The `intuit-oauth` package is strongly recommended for handling the OAuth 2.0 authorization code flow, token refresh, and token revocation correctly.

---

## Auth & Middleware Patterns

### Current Authentication Architecture

The backend implements a **dual-authentication** system:

1. **JWT Authentication** (`middleware/auth.js`)
   - Bearer token in `Authorization` header
   - Access tokens (1h TTL) + Refresh tokens (7d TTL, stored in DB and HttpOnly cookies)
   - `authenticateToken` middleware verifies JWT and attaches `req.user`
   - `requireRole` / `requireAdmin` for role-based access control
   - Refresh tokens stored in `refresh_tokens` table with device tracking

2. **Conditional Authentication** (`middleware/conditionalAuth.js`)
   - Production: Trusts Traefik BasicAuth (reverse proxy), looks up admin user from DB
   - Development: Falls back to standard JWT verification
   - Used for all `/api/*` routes except auth and client portal

3. **Client Portal Authentication** (`middleware/clientAuth.js`)
   - Separate JWT authentication for client-facing portal
   - Scoped access to client-specific data

### Middleware to Follow for QBO

For QBO OAuth callback and API routes, the pattern to follow is:
- Create a new route file (e.g., `routes/qbo.js`)
- Use `conditionalAuth` middleware for admin-only QBO management endpoints
- The OAuth callback endpoint (`/api/qbo/callback`) should be **unprotected** (Intuit redirects the browser there)
- The OAuth initiation endpoint (`/api/qbo/connect`) should require `conditionalAuth` + `requireAdmin`

### Security Middleware Available

- **Rate limiters** in `middleware/security.js`: `bulkOperationLimiter`, `dataTransferLimiter`, `destructiveOperationLimiter`
- **Input validation**: `validateId`, `validateDate`, `validatePagination`, etc.
- **Error sanitization**: `sanitizeErrorMessage` strips sensitive data from error responses
- **Audit logging**: `AuditLogRepository` tracks auth events with IP, user agent, action details

---

## External API Integration Patterns

### Pattern 1: FluentSupport API (Primary Reference)

**File:** `services/fluentSupportApi.js`

This is the closest analog to what QBO integration will look like:

```javascript
// 1. Configuration from environment variables
const FLUENT_API_URL = process.env.VITE_FLUENT_API_URL || '';
const FLUENT_USERNAME = process.env.VITE_FLUENT_API_USERNAME || '';

// 2. HTTP client: axios with auth headers
const authString = Buffer.from(`${FLUENT_USERNAME}:${FLUENT_PASSWORD}`).toString('base64');
const headers = { 'Authorization': `Basic ${authString}` };

// 3. Retry with exponential backoff (retries on 5xx, not 4xx)
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 1000) { ... }

// 4. Pagination handling (loop until no more pages)
while (hasMore) {
  const response = await withRetry(() => axios.get(url, { headers, timeout: 30000 }));
  // ... process response
}

// 5. Response validation via Joi schemas (apiSchemas.js)
return validateFluentTickets(allTickets);

// 6. Structured error logging via Winston
logger.error('[FluentSupport] API request failed', { status, message, url });
```

### Pattern 2: Twenty CRM Proxy

**File:** `routes/twenty-proxy.js` - Proxies requests to Twenty CRM with token injection.

### Patterns to Replicate for QBO

| Pattern | Location | Apply to QBO |
|---------|----------|--------------|
| Retry with backoff | `fluentSupportApi.js` | Token refresh calls, invoice push |
| Joi schema validation | `apiSchemas.js` | Validate QBO API responses |
| Winston structured logging | All services | QBO sync events, errors |
| Scheduler integration | `scheduler.js` | Periodic token refresh, batch sync |
| Transaction support | `FluentSyncService.js` | Multi-step QBO operations |
| Sync status tracking | `FluentSyncStatusRepository.js` | QBO sync status per invoice |

---

## Database Layer

### Technology
- **Driver:** `mysql2/promise` (connection pool)
- **ORM:** None - raw SQL with parameterized queries
- **Connection:** Pool with 20 connections, keepAlive enabled
- **Transactions:** Manual via `pool.getConnection()` + `beginTransaction()`

### Data Access Patterns

Two patterns coexist:

1. **Class-based Models** (`models/Request.js`, `models/User.js`)
   - Static methods: `findById()`, `findAll()`, `create()`, `updateById()`
   - Constructor validates and normalizes input data
   - Direct `pool.execute()` calls

2. **Repository Pattern** (`repositories/` directory)
   - Newer, cleaner pattern used for FluentSync, AuditLog, RefreshToken, Client
   - Static methods with explicit connection parameter for transaction support
   - Better separation of concerns

### QBO Token Storage Plan

A new table `qbo_tokens` (or `qbo_oauth_tokens`) is needed. Based on the existing migration pattern:

**Migration file:** `backend/db/migrations/021_create_qbo_tokens_table.sql`

```sql
CREATE TABLE IF NOT EXISTS qbo_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  realm_id VARCHAR(100) NOT NULL UNIQUE,    -- QBO company ID
  access_token TEXT NOT NULL,               -- OAuth access token (encrypt at rest)
  refresh_token TEXT NOT NULL,              -- OAuth refresh token (encrypt at rest)
  token_type VARCHAR(50) DEFAULT 'Bearer',
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  company_name VARCHAR(255),               -- For display purposes
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_qbo_realm (realm_id),
  INDEX idx_qbo_active (is_active)
);
```

**Repository file:** `backend/repositories/QBOTokenRepository.js` (follows existing pattern)

### Existing QBO-Ready Columns

The database already has QBO integration fields:

- `customers.qbo_customer_id` - VARCHAR(100) for QuickBooks customer ID mapping
- `invoices.qbo_invoice_id` - VARCHAR(100) for QuickBooks invoice ID mapping
- `invoices.qbo_sync_status` - ENUM('pending', 'synced', 'error', 'not_applicable')
- `invoices.qbo_sync_date` - TIMESTAMP for last sync time
- `invoices.qbo_sync_error` - TEXT for error details

These columns are already in place from migration `008_create_invoice_tables.sql` and are ready to use.

---

## Existing Billing/Invoice Code

### What Already Exists

The invoice system is **mature and comprehensive**:

**Routes** (`routes/invoices.js` - 444 lines):
- `GET /api/invoices` - List with filters (customerId, status, date range)
- `GET /api/invoices/:id` - Get with items and linked requests
- `POST /api/invoices/generate` - Generate from billing summary
- `PUT /api/invoices/:id` - Update status, notes, payment info
- `DELETE /api/invoices/:id` - Delete draft invoices
- `PUT /api/invoices/:id/items/:itemId` - Edit line items
- `POST /api/invoices/:id/send` - Mark sent (snapshots data)
- `POST /api/invoices/:id/recalculate` - Recalculate draft
- `POST /api/invoices/:id/pay` - Mark as paid
- `GET /api/invoices/customers` - List customers
- **Export endpoints:**
  - `GET /api/invoices/:id/export/csv` - Standard CSV
  - `GET /api/invoices/:id/export/qbo-csv` - QBO-compatible flat CSV (already exists)
  - `GET /api/invoices/:id/export/hosting-csv` - Hosting detail CSV
  - `GET /api/invoices/:id/export/json` - JSON format (QuickBooks structure)

**Service** (`services/invoiceService.js` - ~1500 lines):
- Invoice generation with pricing logic ($150/hr regular, $175 same-day, $250 emergency)
- Free credits calculation (10 free support hours/month after June 2025)
- Multi-tier support line items grouped by priority
- Project and hosting line items
- QBO CSV export with product name mapping already defined:
  ```javascript
  const SUPPORT_PRODUCT_MAP = {
    'High Priority Support Hours':   'Professional Services:...p1 - Emergency Support',
    'Medium Priority Support Hours': 'Professional Services:...p2 - Urgent Support',
    'Low Priority Support Hours':    'Professional Services:...p3 - Standard Support',
  };
  const HOSTING_PRODUCT = 'Managed Services:Hosting Services:PeakOne Website Hosting...';
  const QBO_TERMS_MAP = { 0: 'Due on receipt', 15: 'Net 15', 30: 'Net 30', 60: 'Net 60' };
  ```
- `getQBOProductName(item)` helper already maps internal item types to QBO product names

### What Needs to Be Built

| Component | Status | Notes |
|-----------|--------|-------|
| Invoice data model | Done | Full schema with QBO sync fields |
| Invoice CRUD API | Done | All endpoints implemented |
| QBO CSV export | Done | Product mapping, terms mapping complete |
| QBO JSON export | Done | Basic QuickBooks JSON structure |
| Customer model | Done | Has `qbo_customer_id` field |
| OAuth 2.0 flow | **Not started** | Need connect/callback/disconnect endpoints |
| Token management | **Not started** | Need storage, refresh, encryption |
| QBO API push | **Not started** | Need service to create/update invoices in QBO |
| QBO customer sync | **Not started** | Need to match/create customers in QBO |
| QBO webhook handling | **Not started** | Optional: receive QBO status updates |
| QBO sync status UI | **Not started** | Frontend sync indicators |

---

## Environment Config

### Existing Environment Keys

**Database:**
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`

**Application:**
- `NODE_ENV`
- `FRONTEND_URL`
- `BACKEND_PORT`
- `PORT`
- `ENABLE_SCHEDULER`
- `LOG_LEVEL`

**Authentication:**
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

**External APIs:**
- `VITE_API_URL`
- `VITE_PORT`
- `FRONTEND_PORT`
- `VITE_TWENTY_API_URL`
- `VITE_TWENTY_API_TOKEN`
- `VITE_TWENTY_USE_MOCK`
- `VITE_FLUENT_API_URL`
- `VITE_FLUENT_API_USERNAME`
- `VITE_FLUENT_API_PASSWORD`
- `VITE_FLUENT_DATE_FILTER`
- `VITE_FLUENT_MAILBOX_ID`

### New Keys Needed for QBO

```bash
# QuickBooks Online OAuth 2.0
QBO_CLIENT_ID=                    # From Intuit Developer portal
QBO_CLIENT_SECRET=                # From Intuit Developer portal
QBO_REDIRECT_URI=                 # e.g., https://billing.peakonedigital.com/api/qbo/callback
QBO_ENVIRONMENT=sandbox           # 'sandbox' or 'production'
QBO_TOKEN_ENCRYPTION_KEY=         # AES-256 key for encrypting stored tokens

# Optional QBO Configuration
QBO_WEBHOOK_VERIFIER_TOKEN=       # For webhook signature verification (if using webhooks)
QBO_AUTO_SYNC=false               # Enable automatic invoice sync on status change
QBO_MINOR_VERSION=75              # QBO API minor version
```

**Docker Compose Update Required:** Add QBO environment variables to the `backend` service in `docker-compose.yml`.

---

## Integration Readiness Score

### Summary Assessment

| Area | Readiness | Score |
|------|-----------|-------|
| Express app structure | Ready | 10/10 |
| Database schema (invoice tables) | Ready | 9/10 |
| QBO fields on invoices/customers | Ready | 9/10 |
| External API integration patterns | Ready to replicate | 9/10 |
| Auth middleware for new routes | Ready to apply | 9/10 |
| QBO product name mapping | Already done | 10/10 |
| QBO CSV/JSON export | Already done | 10/10 |
| Structured logging | Ready | 10/10 |
| Scheduler for automated sync | Ready to extend | 9/10 |
| Joi validation patterns | Ready to replicate | 9/10 |
| OAuth 2.0 token management | Not started | 0/10 |
| QBO API service layer | Not started | 0/10 |
| Token encryption at rest | Not started | 0/10 |

**Overall Readiness: 7.5/10**

### What Is Ready

- The invoice system is fully built with QBO sync fields already in the database schema
- QBO product name mapping and export formats (CSV, JSON) are implemented
- External API integration patterns (axios, retry, validation, logging) are well-established
- The project has a clear layered architecture to follow: routes -> services -> repositories -> db
- Authentication middleware supports adding protected QBO management routes
- The scheduler can be extended to add periodic QBO token refresh and batch sync jobs

### What Is Missing

1. **OAuth 2.0 Implementation** (highest priority)
   - Authorization code flow endpoints (connect, callback, disconnect)
   - Token storage with encryption at rest
   - Automatic token refresh before expiry
   - Token revocation on disconnect

2. **QBO API Service** (core functionality)
   - A new service file (e.g., `services/qboService.js`) following the FluentSupport pattern
   - Customer matching/creation in QBO
   - Invoice creation/update in QBO using existing product mappings
   - Error handling and sync status updates

3. **Token Security**
   - AES-256 encryption for stored access/refresh tokens
   - Secure key management via environment variables

### What Needs Refactoring

Nothing requires refactoring. The existing architecture cleanly supports adding QBO integration as a new vertical alongside the existing FluentSupport and Twenty CRM integrations. The recommended approach is:

- New route: `backend/routes/qbo.js`
- New service: `backend/services/qboService.js`
- New repository: `backend/repositories/QBOTokenRepository.js`
- New migration: `backend/db/migrations/021_create_qbo_tokens_table.sql`
- Update: `backend/server.js` to register QBO routes
- Update: `docker-compose.yml` to pass QBO environment variables
- Update: `.env` / `.env.example` with QBO keys
