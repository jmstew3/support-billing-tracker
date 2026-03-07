# QBO API Integration — Implementation Plan

**Project:** Support Billing Tracker → QuickBooks Online Invoice Sync
**Date:** 2026-03-06
**Author:** Justin Stewart / Claude
**Purpose:** Automatically export monthly invoices into QBO via the REST API, including negative line items for credits, discounts, and prorated items — which the current CSV export deliberately excludes.

---

## Table of Contents

1. [Business Context & Problem Statement](#1-business-context--problem-statement)
2. [Architecture Overview](#2-architecture-overview)
3. [Decisions Log](#3-decisions-log)
4. [Phase 0: QBO Developer Portal Setup](#4-phase-0-qbo-developer-portal-setup)
5. [Phase 1: OAuth 2.0 & Token Infrastructure](#5-phase-1-oauth-20--token-infrastructure)
6. [Phase 2: Customer & Item Sync](#6-phase-2-customer--item-sync)
7. [Phase 3: Invoice Mapper & Sync Endpoint](#7-phase-3-invoice-mapper--sync-endpoint)
8. [Phase 4: Frontend — Sync UI](#8-phase-4-frontend--sync-ui)
9. [Phase 5: Scheduler & Automation](#9-phase-5-scheduler--automation)
10. [Phase 6: Testing & Validation](#10-phase-6-testing--validation)
11. [Phase 7: Production Cutover](#11-phase-7-production-cutover)
12. [Risk Register](#12-risk-register)
13. [Open Questions (Resolved)](#13-open-questions-resolved)
14. [Appendix A: QBO API Reference](#14-appendix-a-qbo-api-reference)
15. [Appendix B: File Inventory](#15-appendix-b-file-inventory)
16. [Appendix C: Negative Line Item Examples](#16-appendix-c-negative-line-item-examples)

---

## 1. Business Context & Problem Statement

### Current State

The Support Billing Tracker generates monthly invoices for Velocity Business Automation, LLC covering three revenue streams: support hours (tiered at $250/$175/$150 per hour by urgency), projects (landing pages, forms, migrations, custom dev), and hosting ($99/month per site). The system applies a 10-hour free support credit each month (effective June 2025+), allocated chronologically by ticket `resolvedAt` date, plus hosting credits for free sites and prorated adjustments.

The existing QBO CSV export (`exportInvoiceQBOCSV()` in `backend/services/invoiceService.js`, lines 1302–1426) **deliberately excludes all credit/discount lines** (`item_type: 'other'` and `$0` project lines). This means QBO invoice totals are always higher than internal invoice totals. Credits and adjustments are managed outside QBO manually.

### Target State

Push invoices to QBO via the REST API with **full line-item fidelity**, including:

- Gross support hours per tier (positive lines showing the value of work performed)
- Free support credit as a **paired negative line** (same hours, same blended rate, negative amount — nets to $0 for the free portion)
- Hosting gross amount (positive line)
- Hosting credits and prorated adjustments (negative lines)
- Project lines at their actual amounts
- Free-credited projects excluded ($0 lines add no value in QBO)

The QBO invoice total will match the internal invoice total exactly.

### Why the API Instead of CSV

The QBO CSV import format does not support negative line amounts. Attempting to import a row with a negative `ItemAmount` either errors or is silently dropped. The API's `SalesItemLineDetail` supports negative `Amount` values on individual lines, provided the invoice total remains ≥ $0. This is the entire reason for building the API integration.

---

## 2. Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────┐
│                 Support Billing Tracker                   │
│                                                           │
│  ┌─────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ React   │──▶│ Express API  │──▶│    MySQL DB       │  │
│  │ Frontend│   │ (port 3011)  │   │ (velocity_billing)│  │
│  │ (5173)  │   │              │   │                   │  │
│  └─────────┘   └──────┬───────┘   └──────────────────┘  │
│                        │                                  │
│                        │ NEW: QBO API calls               │
│                        ▼                                  │
│               ┌────────────────┐                         │
│               │  QBO Client    │                         │
│               │  Service       │                         │
│               └────────┬───────┘                         │
└────────────────────────┼─────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  QuickBooks Online   │
              │  REST API            │
              │  (Intuit Cloud)      │
              └──────────────────────┘
```

### New Backend Components

| Component | File | Pattern Follows |
|-----------|------|-----------------|
| QBO Routes | `backend/routes/qbo.js` | `routes/fluent-sync.js` |
| QBO Client Service | `backend/services/qboClient.js` | `services/fluentSupportApi.js` |
| Invoice Mapper | `backend/services/invoiceMapper.js` | New (translation layer) |
| Token Repository | `backend/repositories/QBOTokenRepository.js` | `repositories/RefreshTokenRepository.js` |
| Item Mapping Repository | `backend/repositories/QBOItemMappingRepository.js` | `repositories/ClientRepository.js` |
| Encryption Utility | `backend/utils/encryption.js` | New (AES-256-GCM) |
| Token Migration | `backend/db/migrations/021_create_qbo_tokens_table.sql` | Existing migration pattern |
| Item Mapping Migration | `backend/db/migrations/022_create_qbo_item_mappings_table.sql` | Existing migration pattern |
| SyncToken Migration | `backend/db/migrations/023_add_qbo_sync_token.sql` | Existing migration pattern |

### New Frontend Components

| Component | File | Changes |
|-----------|------|---------|
| QBO Status Hook | `frontend/src/hooks/useQBOStatus.ts` | New custom hook |
| QBO API Functions | `frontend/src/services/invoiceApi.ts` | Add 4 new functions |
| Invoice Detail | `frontend/src/features/invoices/components/InvoiceDetail.tsx` | Add sync button + status badge |
| Invoice List | `frontend/src/features/invoices/components/InvoiceList.tsx` | Add sync status column |
| Invoices Page | `frontend/src/features/invoices/components/Invoices.tsx` | Add QBO connection state |

---

## 3. Decisions Log

These decisions were made during analysis and confirmed by the project owner. They are binding for the implementation.

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Include negative credit lines in QBO invoices** | Core purpose of the integration. QBO totals must match internal totals. |
| D2 | **Use `intuit-oauth` only (no `node-quickbooks`)** | Need precise control over invoice payloads for complex negative line items. `makeApiCall()` + raw payloads gives us full control. Add `node-quickbooks` later if boilerplate becomes excessive. |
| D3 | **Free support credit: paired positive + negative lines** | Show the full value of work performed. E.g., 8.5 free hours → Line 1: 8.5h at blended rate = $X (positive), Line 2: -8.5h at same rate = -$X (negative). Nets to $0. Both lines use same qty and blended unit_price so amounts cancel exactly. |
| D4 | **Cap credit at gross billable amount (total ≥ $0)** | Credits never exceed billable amounts. The 10 free hours are an allotment for the first 10 hours by `resolvedAt` date. If ≤10 hours worked in a month, credit equals billable → total = $0. QBO rejects negative totals. |
| D5 | **Exclude free-credited projects ($0 lines)** | No financial impact, reduces noise in QBO. |
| D6 | **Start with manual sync (`QBO_AUTO_SYNC=false`)** | Eyeball the first several months before trusting auto-sync. |
| D7 | **Omit `SalesTermRef`** | Let QBO use customer's default payment terms. Only one customer; resolving Terms IDs adds complexity for no benefit. |
| D8 | **Add `qbo_sync_token` column now** | Low cost (one ALTER TABLE), needed the moment we want to update a synced invoice. |
| D9 | **Merge `feat/fluent-category-mapping` first** | Category changes affect billing summaries → line items. Must be stable before testing QBO sync. |
| D10 | **Use `Number(amount).toFixed(2)` on all QBO numeric fields** | QBO uses 2 decimal place precision. Validate `Amount === Math.round(Qty * UnitPrice * 100) / 100` after rounding to catch rounding mismatches. |
| D11 | **Free credit allocation happens before mapper** | The billing summary / line-item generation phase (in `calculateBilling()`) determines which hours are free. The mapper receives pre-computed line items. |

---

## 4. Phase 0: QBO Developer Portal Setup

> **Prerequisite:** Complete before writing any code.
> **Owner:** Justin (manual portal actions)
> **Estimated time:** 30–60 minutes

### 4.1 Developer Account & App

- [ ] Create or log into Intuit Developer account at [developer.intuit.com](https://developer.intuit.com)
- [ ] Create a sandbox company: Dashboard → Sandbox → Add Sandbox (US company type)
- [ ] Note the **Sandbox Company ID** (Realm ID) — visible in sandbox settings
- [ ] Create a QBO app: Dashboard → My Apps → Create an App → "QuickBooks Online and Payments"
- [ ] Select scope: **`com.intuit.quickbooks.accounting`**
- [ ] Copy **Client ID** and **Client Secret** for both sandbox and production keys

### 4.2 Redirect URIs

Configure in the app's "Keys & credentials" section:

| Environment | Redirect URI |
|-------------|-------------|
| Development | `http://localhost:3011/api/qbo/callback` |
| Production | `https://billing.peakonedigital.com/api/qbo/callback` |

### 4.3 Create Service Items in Sandbox QBO

Create these Items in the sandbox QBO company under Products and Services. The names must match exactly — they are used for `ItemRef` lookup during Item sync.

| Item Name | Type | Rate | Category Path |
|-----------|------|------|---------------|
| `p1 - Emergency Support` | Service | $250/hr | Professional Services → Support Services |
| `p2 - Urgent Support` | Service | $175/hr | Professional Services → Support Services |
| `p3 - Standard Support` | Service | $150/hr | Professional Services → Support Services |
| `Free Support Hours Credit` | Service | $0 | (for negative credit lines) |
| `PeakOne Website Hosting` | Service | $99/month | Managed Services → Hosting Services |
| `Landing Page Development` | Service | — | Professional Services → Lead Capture Assets |
| `Multi-Step Lead Form Implementation` | Service | — | Professional Services → Lead Capture Assets |
| `Basic Lead Form Implementation` | Service | — | Professional Services → Lead Capture Assets |
| `Website Migration Services` | Service | — | Professional Services |
| `Custom Development` | Service | — | Professional Services |
| `Free Hosting Credit` | Service | $0 | (for hosting discount lines) |

- [ ] Note the QBO **Item ID** for each service item created
- [ ] **Create** a Customer entity in the sandbox company named "Velocity Business Automation, LLC" (must exist before customer sync can match)

### 4.4 Disable Auto-Numbering (Important)

In QBO sandbox: Settings → Account and Settings → Sales → Custom transaction numbers → **ON**

This prevents QBO from auto-generating invoice numbers that conflict with our `VEL-YYYY-NNN` format passed via `DocNumber`.

### 4.5 Validate Sandbox Credentials

Test with a basic CompanyInfo API call:
```
GET https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}/companyinfo/{realmId}
Authorization: Bearer {access_token}
```

---

## 5. Phase 1: OAuth 2.0 & Token Infrastructure

> **Estimated time:** 1–2 days
> **Dependencies:** Phase 0 complete
> **Files created:** 6 new, 3 modified

### 5.1 Install Dependencies

```bash
cd backend && npm install intuit-oauth
```

**No other packages needed.** The project already has `axios`, `joi`, `winston`, `dotenv`, `node-cron`, `mysql2`, `jsonwebtoken`, and Node.js built-in `crypto`.

> **Note:** `intuit-oauth` writes to `logs/oAuthClient-log.log` by default. Ensure the `logs/` directory exists in the Docker container or configure/suppress the SDK's internal logger during `OAuthClient` initialization to prevent silent write errors.

### 5.2 Environment Configuration

**Add to `.env` and `.env.example`:**

```bash
# ── QuickBooks Online OAuth 2.0 ──
QBO_CLIENT_ID=                          # From Intuit Developer portal
QBO_CLIENT_SECRET=                      # From Intuit Developer portal
QBO_REDIRECT_URI=http://localhost:3011/api/qbo/callback
QBO_ENVIRONMENT=sandbox                 # 'sandbox' or 'production'
QBO_REALM_ID=                           # Informational only; DB is authoritative (see Note below)
QBO_TOKEN_ENCRYPTION_KEY=               # Generate with: openssl rand -hex 32
QBO_MINOR_VERSION=75                    # Pin API minor version for predictability
QBO_AUTO_SYNC=false                     # Manual sync only (Decision D6)
FRONTEND_URL=http://localhost:5173      # For OAuth callback redirect (production: https://billing.peakonedigital.com)
```

> **Note on `QBO_REALM_ID`:** The env var is set during initial setup as a convenience reference. The **authoritative** `realm_id` is always read from the `qbo_tokens` table (the active row). After a re-auth to a different company, the DB row updates automatically via `upsertToken()`. `qboClient.js` must read realm_id from the token record, never from `process.env`.

**Add to `docker-compose.yml`** under `backend` service `environment`:

```yaml
- QBO_CLIENT_ID=${QBO_CLIENT_ID}
- QBO_CLIENT_SECRET=${QBO_CLIENT_SECRET}
- QBO_REDIRECT_URI=${QBO_REDIRECT_URI}
- QBO_ENVIRONMENT=${QBO_ENVIRONMENT}
- QBO_REALM_ID=${QBO_REALM_ID}
- QBO_TOKEN_ENCRYPTION_KEY=${QBO_TOKEN_ENCRYPTION_KEY}
- QBO_MINOR_VERSION=${QBO_MINOR_VERSION}
- QBO_AUTO_SYNC=${QBO_AUTO_SYNC}
- FRONTEND_URL=${FRONTEND_URL}
```

### 5.3 Database Migration — Token Storage

**New file:** `backend/db/migrations/021_create_qbo_tokens_table.sql`

```sql
CREATE TABLE IF NOT EXISTS qbo_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  realm_id VARCHAR(100) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,              -- AES-256-GCM encrypted
  refresh_token TEXT NOT NULL,             -- AES-256-GCM encrypted
  token_type VARCHAR(50) DEFAULT 'Bearer',
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  last_refreshed_at TIMESTAMP DEFAULT NULL,  -- Tracks last successful token rotation (for monitoring)
  company_name VARCHAR(255) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_qbo_realm (realm_id),
  INDEX idx_qbo_active (is_active)
);
```

**Why encrypted at rest:** Refresh tokens are long-lived (up to 5 years per Intuit docs) and grant full accounting API access. Storing them in plaintext in the DB would be a critical security risk. AES-256-GCM with a key from the environment provides encryption at rest without requiring an external secrets manager.

### 5.4 Encryption Utility

**New file:** `backend/utils/encryption.js`

Uses Node.js built-in `crypto` module. AES-256-GCM with random IV per encryption. Storage format: `iv:ciphertext:authTag` (all hex-encoded) in the TEXT column.

```javascript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY = Buffer.from(process.env.QBO_TOKEN_ENCRYPTION_KEY, 'hex'); // 32 bytes

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decrypt(ciphertext) {
  const [ivHex, encryptedHex, authTagHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Key rotation procedure (document for future):** Decrypt all `qbo_tokens` rows with old key → re-encrypt with new key → update all rows in a single transaction → update `.env` with new key → restart backend.

### 5.5 Token Repository

**New file:** `backend/repositories/QBOTokenRepository.js`

Follows the static-method pattern established by `ClientRepository.js` and `AuditLogRepository.js` (the codebase has both patterns — some repositories use instance methods with singleton exports like `RefreshTokenRepository.js`, others use static methods and export the class directly; we use the static pattern here since the repository has no instance state, and it allows passing an explicit `connection` parameter for transaction support).

```javascript
import pool from '../db/config.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export default class QBOTokenRepository {
  /**
   * Get the active QBO token record (only one active connection at a time)
   */
  static async getActiveToken(connection = pool) {
    const [rows] = await connection.query(
      'SELECT * FROM qbo_tokens WHERE is_active = TRUE LIMIT 1'
    );
    return rows[0] || null;
  }

  /**
   * Upsert token data after OAuth callback or token refresh
   * Uses INSERT ... ON DUPLICATE KEY UPDATE keyed on realm_id
   */
  static async upsertToken(realmId, tokenData, connection = pool) {
    const { accessToken, refreshToken, expiresIn, xRefreshTokenExpiresIn, companyName } = tokenData;
    const accessExpiry = new Date(Date.now() + expiresIn * 1000);
    const refreshExpiry = new Date(Date.now() + xRefreshTokenExpiresIn * 1000);

    await connection.query(
      `INSERT INTO qbo_tokens
       (realm_id, access_token, refresh_token, access_token_expires_at,
        refresh_token_expires_at, company_name, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         access_token = VALUES(access_token),
         refresh_token = VALUES(refresh_token),
         access_token_expires_at = VALUES(access_token_expires_at),
         refresh_token_expires_at = VALUES(refresh_token_expires_at),
         company_name = COALESCE(VALUES(company_name), company_name),
         is_active = TRUE`,
      [realmId, encrypt(accessToken), encrypt(refreshToken),
       accessExpiry, refreshExpiry, companyName || null]
    );
  }

  /**
   * Update tokens after a refresh (CRITICAL: must persist new refresh token immediately)
   */
  static async updateTokens(realmId, encryptedAccessToken, encryptedRefreshToken, accessExpiresAt, connection = pool) {
    await connection.query(
      `UPDATE qbo_tokens
       SET access_token = ?, refresh_token = ?, access_token_expires_at = ?
       WHERE realm_id = ? AND is_active = TRUE`,
      [encryptedAccessToken, encryptedRefreshToken, accessExpiresAt, realmId]
    );
  }

  /**
   * Deactivate tokens (on disconnect/revoke)
   */
  static async deactivate(realmId, connection = pool) {
    await connection.query(
      'UPDATE qbo_tokens SET is_active = FALSE WHERE realm_id = ?',
      [realmId]
    );
  }
}
```

### 5.6 QBO Client Service

**New file:** `backend/services/qboClient.js`

This is the foundational service — all QBO API calls go through it. Manages the `OAuthClient` instance, automatic token refresh, and the `makeApiCall` wrapper.

**Key implementation details:**

1. **Constructor:** Instantiates `OAuthClient` from `intuit-oauth` with env credentials. Also initializes `this._refreshPromise = null` for the concurrency guard.
2. **`getAuthenticatedClient()`:** Loads tokens from DB, decrypts, sets on `oauthClient`, checks if access token expires within 5 minutes, auto-refreshes if needed.
3. **`refreshTokens(realmId)` — Concurrency-safe, transactional:**
   - **Concurrency guard:** If `this._refreshPromise` is non-null, return the existing promise (prevents parallel refresh calls from racing — see C4 fix below).
   - Sets `this._refreshPromise = this._doRefreshTokens(realmId)` with a `.finally(() => this._refreshPromise = null)`.
   - **`_doRefreshTokens(realmId)` (private):**
     1. Acquire a dedicated DB connection from pool
     2. Call `oauthClient.refresh()` — this **immediately invalidates** the old refresh token on Intuit's side
     3. **Immediately** persist the new tokens via `QBOTokenRepository.updateTokens()` using the same DB connection
     4. Update `last_refreshed_at = NOW()` on the same row
     5. On success: commit, log old/new token hashes (SHA-256, not plaintext) for audit trail
     6. **On DB write failure:** Log an EMERGENCY alert with the new tokens (encrypted with `QBO_TOKEN_ENCRYPTION_KEY`) for manual recovery — at this point the new tokens exist only in memory and the old ones are dead
     7. Release connection in `finally` block
4. **`makeApiCall(method, endpoint, body)`:** Constructs the full URL (`sandbox` or `production` base), appends `?minorversion=75`, sets `Content-Type: application/json`, delegates to `oauthClient.makeApiCall()`.
5. **Error handling:** Follows the `withRetry()` pattern from `fluentSupportApi.js`:
   - 401 → Refresh token and retry once
   - 400 → Parse `Fault.Error[].Detail`, do NOT retry (validation error)
   - 403 → Log, require re-authorization
   - 429 → Retry with exponential backoff (intuit-oauth handles 3 retries automatically)
   - 500–504 → Retry with backoff (up to 3 attempts)

**Concurrency guard pattern (C4 fix):**
```javascript
// In qboClient.js singleton
let _refreshPromise = null;

async refreshTokens(realmId) {
  if (_refreshPromise) {
    logger.info('Token refresh already in flight, awaiting existing promise');
    return _refreshPromise;
  }
  _refreshPromise = this._doRefreshTokens(realmId).finally(() => {
    _refreshPromise = null;
  });
  return _refreshPromise;
}
```

**QBO API base URLs:**

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://sandbox-quickbooks.api.intuit.com` |
| Production | `https://quickbooks.api.intuit.com` |

**`makeApiCall` body parameter:** The `intuit-oauth` library's `makeApiCall()` accepts a `body` parameter as a JavaScript object. The library serializes it to JSON internally. Per the [intuit-oauth README](https://github.com/intuit/oauth-jsclient/blob/master/README.md), the options object accepts `{ url, method, headers, body }`.

### 5.7 OAuth Routes

**New file:** `backend/routes/qbo.js`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/qbo/connect` | `conditionalAuth` | Generate Intuit auth URL, return `{ authUrl }` |
| `GET` | `/api/qbo/callback` | **NONE** (Intuit redirects here) | Exchange code for tokens, store encrypted, redirect to frontend |
| `GET` | `/api/qbo/status` | `conditionalAuth` | Return connection status: `{ connected, realmId, companyName, tokenExpiresAt }` |
| `POST` | `/api/qbo/disconnect` | `conditionalAuth` | Revoke tokens via `oauthClient.revoke()`, set `is_active = false` |
| `POST` | `/api/qbo/refresh` | `conditionalAuth` | Force manual token refresh (debugging) |

**OAuth flow detail:**

1. **`GET /api/qbo/connect`:**
   - Generate CSRF state as a **signed JWT** (self-validating, no server-side storage needed):
     ```javascript
     import crypto from 'crypto';
     const csrfPayload = { nonce: crypto.randomBytes(16).toString('hex'), exp: Date.now() + 10 * 60 * 1000 }; // 10-min expiry
     const state = jwt.sign(csrfPayload, process.env.JWT_SECRET || process.env.QBO_CLIENT_SECRET);
     ```
   - Call `oauthClient.authorizeUri({ scope: ['com.intuit.quickbooks.accounting'], state })`
   - Return `{ authUrl }` — frontend opens this URL in a new tab or redirects

2. **`GET /api/qbo/callback`:**
   - Validate CSRF state by verifying JWT signature and checking `exp` hasn't passed. Reject if invalid or expired.
   - Call `oauthClient.createToken(req.url)` — exchanges authorization code for tokens
   - Extract from response: `access_token`, `refresh_token`, `expires_in`, `x_refresh_token_expires_in`, `realmId`
   - Upsert into `qbo_tokens` via `QBOTokenRepository.upsertToken()`
   - Optionally fetch `CompanyInfo` to store `companyName`
   - Redirect browser to `${process.env.FRONTEND_URL}/invoices?qbo=connected`

3. **`POST /api/qbo/disconnect`:**
   - Load active tokens from DB
   - Call `oauthClient.revoke({ access_token, refresh_token })`
   - Call `QBOTokenRepository.deactivate(realmId)`
   - Return `{ disconnected: true }`

**Route registration in `server.js`** (add after line 145):

```javascript
import qboRoutes from './routes/qbo.js';
// QBO routes: callback is unprotected, management routes use conditionalAuth
app.use('/api/qbo', qboRoutes);
```

**IMPORTANT:** The callback route (`GET /api/qbo/callback`) must NOT be behind `conditionalAuth` because Intuit redirects the browser there directly after authorization. The route file itself must selectively apply `conditionalAuth` to management endpoints only.

### 5.8 CORS Update

**In `server.js`**, add the Intuit authorization domain to CORS if needed. Since the callback is a browser redirect (not an XHR), CORS does not apply to the callback itself. However, the frontend will call `/api/qbo/connect` and `/api/qbo/status` via `fetch`, which is already covered by the existing CORS config (same-origin to `localhost:3011` or `billing.peakonedigital.com`).

No CORS changes needed.

### 5.9 CSP Update

The OAuth flow opens `appcenter.intuit.com` in the browser. Since this is a full-page redirect (not an iframe or XHR), the existing CSP does not need modification.

No CSP changes needed.

---

## 6. Phase 2: Customer & Item Sync

> **Estimated time:** 0.5–1 day
> **Dependencies:** Phase 1 complete (OAuth working)
> **Files created:** 2 new, 0 modified

### 6.1 Item Mapping Table

**New file:** `backend/db/migrations/022_create_qbo_item_mappings_table.sql`

```sql
CREATE TABLE IF NOT EXISTS qbo_item_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  internal_item_type ENUM('support', 'project', 'hosting', 'credit', 'other') NOT NULL,
  internal_category VARCHAR(100) DEFAULT NULL,
  internal_description VARCHAR(255) DEFAULT NULL,
  qbo_item_id VARCHAR(100) NOT NULL,
  qbo_item_name VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_internal_mapping (internal_item_type, internal_category, internal_description),
  INDEX idx_qbo_item (qbo_item_id)
);
```

### 6.2 Expected Mapping Data

After running the Item sync endpoint, this table should contain:

| internal_item_type | internal_category | internal_description | qbo_item_name | Notes |
|----|----|----|-----|-------|
| `support` | NULL | `High Priority Support Hours` | `p1 - Emergency Support` | $250/hr tier |
| `support` | NULL | `Medium Priority Support Hours` | `p2 - Urgent Support` | $175/hr tier |
| `support` | NULL | `Low Priority Support Hours` | `p3 - Standard Support` | $150/hr tier |
| `credit` | NULL | `Turbo Support Credit Applied` | `Free Support Hours Credit` | Negative line for free hours |
| `project` | `LANDING_PAGE` | NULL | `Landing Page Development` | |
| `project` | `MULTI_FORM` | NULL | `Multi-Step Lead Form Implementation` | |
| `project` | `BASIC_FORM` | NULL | `Basic Lead Form Implementation` | |
| `project` | `MIGRATION` | NULL | `Website Migration Services` | |
| `project` | NULL | NULL | `Custom Development` | Default project type |
| `hosting` | NULL | NULL | `PeakOne Website Hosting` | $99/mo per site |
| `credit` | `HOSTING_CREDIT` | NULL | `Free Hosting Credit` | Negative line for free hosting |
| `credit` | `HOSTING_PRORATED` | NULL | `Free Hosting Credit` | Same QBO item for proration (intentional — both are hosting adjustments; `Description` field distinguishes them in QBO) |

### 6.3 Item Mapping Repository

**New file:** `backend/repositories/QBOItemMappingRepository.js`

```javascript
export default class QBOItemMappingRepository {
  /**
   * Find QBO Item ID for a given internal line item
   * Matching priority:
   *   1. Exact match on (item_type, category, description)
   *   2. Match on (item_type, category, NULL description)
   *   3. Match on (item_type, NULL category, NULL description) — fallback
   */
  static async findQBOItemId(itemType, category, description, connection = pool) { ... }

  /**
   * Upsert a mapping (used during Item sync)
   */
  static async upsertMapping(mapping, connection = pool) { ... }

  /**
   * Get all active mappings (for admin display)
   */
  static async getAllMappings(connection = pool) { ... }
}
```

### 6.4 Sync Endpoints

**Add to `backend/routes/qbo.js`:**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/qbo/sync/customers` | Match local customers to QBO customers by `DisplayName`, store `qbo_customer_id` |
| `GET` | `/api/qbo/sync/items` | Fetch all QBO Service items, match by name to internal mappings, populate `qbo_item_mappings` |

**Customer sync logic:**

Accepts optional `?dryRun=true` query parameter (default: `false`).

1. Fetch all active customers from local `customers` table
2. For each without a `qbo_customer_id`:
   - Query QBO: `SELECT * FROM Customer WHERE DisplayName = '{customer.name}'`
   - If found: store `Customer.Id` in `customers.qbo_customer_id` (skip store in dry-run)
   - If not found **and not dry-run**: Create customer in QBO, store returned `Id`
   - If not found **and dry-run**: Report as `unmatched` — require explicit confirmation before creating
3. Return `{ matched: N, created: N, unmatched: N, failed: N, dryRun: boolean }`

> **Why dry-run:** Customer name matching is exact (`DisplayName`). Trailing spaces, `LLC` vs `L.L.C.`, or casing differences will cause a miss and silently create a duplicate customer in QBO. Always run in dry-run mode first, verify the match, then re-run without `dryRun`.

**Item sync logic:**

1. Query QBO: `SELECT * FROM Item WHERE Type = 'Service'`
2. For each QBO Item, match against the expected mapping table (Section 6.2)
3. Upsert into `qbo_item_mappings` with the QBO `Item.Id`
4. Log warnings for any expected mappings not found in QBO
5. Return `{ mapped: N, missing: N, details: [...] }`

**Note:** There is currently only one customer ("Velocity Business Automation, LLC", id=1). Customer sync is a one-time manual step. The API endpoint exists for future multi-customer support.

---

## 7. Phase 3: Invoice Mapper & Sync Endpoint

> **Estimated time:** 2–3 days
> **Dependencies:** Phase 2 complete (customer + items mapped)
> **Files created:** 2 new, 2 modified

### 7.1 SyncToken Column

**New file:** `backend/db/migrations/023_add_qbo_sync_token.sql`

```sql
ALTER TABLE invoices ADD COLUMN qbo_sync_token VARCHAR(50) DEFAULT NULL AFTER qbo_sync_error;
```

This stores QBO's optimistic locking token, needed if we ever update a synced invoice in QBO.

### 7.2 Invoice Mapper — Core Translation Layer

**New file:** `backend/services/invoiceMapper.js`

This is the most critical file in the integration. It translates a local invoice + items into the QBO API payload format.

#### 7.2.1 Entry Point: `mapInvoiceToQBO(invoice, customer)`

**Input:** Local `invoice` object (with `items[]`) and `customer` object (with `qbo_customer_id`).
**Output:** QBO Invoice JSON payload ready for `POST /v3/company/{realmId}/invoice`.

#### 7.2.2 Line Item Mapping Rules

For each `invoice.items[]` entry, apply these rules:

| Local `item_type` | Local `category` | Action | QBO `ItemRef` lookup key |
|----|----|----|-----|
| `support` | — | Map as positive `SalesItemLineDetail` | `(support, NULL, description)` |
| `other` | — (no HOSTING_ prefix) | Map as negative `SalesItemLineDetail` (support credit). **Note:** description in DB is dynamic (`"Turbo Support Credit Applied (Xh free)"`); mapper must strip parenthetical suffix via `startsWith('Turbo Support Credit Applied')` before lookup. | `(credit, NULL, 'Turbo Support Credit Applied')` |
| `project` | `LANDING_PAGE` etc. | Map as positive `SalesItemLineDetail` | `(project, category, NULL)` |
| `project` | any, `amount === 0` | **SKIP** (Decision D5) | — |
| `hosting` | — | Map as positive `SalesItemLineDetail` | `(hosting, NULL, NULL)` |
| `other` | `HOSTING_CREDIT` | Map as negative `SalesItemLineDetail` (hosting credit) | `(credit, 'HOSTING_CREDIT', NULL)` |
| `other` | `HOSTING_PRORATED` | Map as negative `SalesItemLineDetail` (proration) | `(credit, 'HOSTING_PRORATED', NULL)` |

#### 7.2.3 Amount Precision (Decision D10)

**Every numeric value sent to QBO must be rounded to 2 decimal places.**

```javascript
function roundTo2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function validateLineAmount(qty, unitPrice, amount) {
  const expected = Math.round(qty * unitPrice * 100) / 100;
  const actual = roundTo2(amount);
  if (expected !== actual) {
    // Adjust amount to match Qty * UnitPrice after rounding
    return expected;
  }
  return actual;
}
```

Apply to every line:
- `Amount` = `roundTo2(item.amount)`
- `UnitPrice` = `roundTo2(item.unit_price)`
- `Qty` = `roundTo2(item.quantity)`
- Then validate: `Amount === roundTo2(Qty * UnitPrice)`
- If mismatch after rounding, use `roundTo2(Qty * UnitPrice)` as `Amount`

**CRITICAL for paired credit lines (Decision D3):** The positive and negative lines for free hours must have the exact same absolute `Amount`, `Qty`, and `UnitPrice`. Calculate the blended rate once, round it, compute the amount from the rounded values, and use those same rounded values for both lines. This ensures the net is exactly $0.00, not $0.01 off due to rounding.

#### 7.2.4 Free Support Credit Line Mapping (Decision D3)

The existing `calculateBilling()` function (lines 83–140 of `invoiceService.js`) already creates the credit line with:
- `item_type: 'other'`
- `description: 'Turbo Support Credit Applied (Xh free)'`
- `quantity: freeHoursApplied`
- `unit_price: -(creditValue / freeHoursApplied)` (negative blended rate)
- `amount: -creditValue`

The existing gross support lines (positive) already show the total hours including free hours.

**The mapper's job for the credit line:**
1. **Detect credit lines** by `item_type === 'other'` and `description.startsWith('Turbo Support Credit Applied')`. The actual DB description is dynamic (e.g., `"Turbo Support Credit Applied (10h free)"`), so the mapper must normalize before lookup — use the static key `'Turbo Support Credit Applied'` for the `QBOItemMappingRepository.findQBOItemId('credit', null, 'Turbo Support Credit Applied')` call. **Do NOT use SQL LIKE** — keep matching deterministic in the mapper layer.
2. Round `Qty`, `UnitPrice`, `Amount` per Decision D10
3. Validate that `Amount` (negative) + the sum of support line `Amounts` ≥ $0

This means the invoice generation backend already produces the correct paired lines. The mapper just translates them to QBO format.

#### 7.2.5 Pre-Validation

Before building the payload, validate:

1. `customer.qbo_customer_id` exists — fail with clear message if unmapped
2. Every line item resolves to a QBO `ItemRef` — fail listing the unmapped item
3. Invoice total ≥ $0 — fail with: `"Invoice total is negative ($X.XX). QBO rejects invoices with negative totals. The free credit may exceed billable hours — review credit allocation."`
4. `invoice.qbo_sync_status !== 'synced'` — prevent double-push (allow retry from `error`)

#### 7.2.6 Full QBO Payload Structure

```javascript
{
  CustomerRef: {
    value: customer.qbo_customer_id     // Required. Numeric string.
  },
  TxnDate: invoice.invoice_date,        // "YYYY-MM-DD"
  DueDate: invoice.due_date,            // "YYYY-MM-DD"
  DocNumber: invoice.invoice_number,    // "VEL-2026-001"
  Line: [
    // One entry per mapped line item (see 7.2.2)
    {
      Amount: 1500.00,                  // Positive for billable, negative for credits
      DetailType: "SalesItemLineDetail",
      Description: "High Priority Support Hours",
      SalesItemLineDetail: {
        ItemRef: {
          value: "42",                  // QBO Item ID from qbo_item_mappings
          name: "p1 - Emergency Support"  // Optional but helpful for readability
        },
        UnitPrice: 250.00,
        Qty: 6.0
      }
    },
    // ... more lines including negative credit lines
  ],
  PrivateNote: invoice.internal_notes || undefined,
  CustomerMemo: invoice.notes
    ? { value: invoice.notes }
    : undefined,
  BillEmail: customer.email
    ? { Address: customer.email }
    : undefined,
  EmailStatus: customer.email
    ? "NeedToSend"
    : "NotSet",
  GlobalTaxCalculation: "NotApplicable"   // Tax always 0 in current system
}
```

**Fields deliberately omitted (with reasoning):**

| Field | Reason |
|-------|--------|
| `SalesTermRef` | Decision D7 — let QBO use customer default |
| `TxnTaxDetail` | Tax rate is always 0; `GlobalTaxCalculation: "NotApplicable"` is sufficient |
| `Id` / `SyncToken` | Omit for creation; include for updates only |
| `DiscountLineDetail` | Using negative `SalesItemLineDetail` instead (simpler, no discount account needed) |

### 7.3 Sync Endpoint

**Add to:** `backend/routes/invoices.js` (alongside existing invoice endpoints)

```
POST /api/invoices/:id/sync-qbo
```

**Auth:** `conditionalAuth` (already applied to all `/api/invoices` routes)

**Logic:**

1. Load invoice with items from DB (reuse `getInvoice(invoiceId)`)
2. Load customer from DB (reuse existing customer lookup)
3. Validate: `qbo_sync_status !== 'synced'` (allow `pending`, `error`, `not_applicable`)
4. Call `mapInvoiceToQBO(invoice, customer)` to build payload
5. Call `qboClient.makeApiCall('POST', 'invoice', payload)`
6. On success (HTTP 200–201):
   - **Validate response** via Joi schema (consistent with existing `apiSchemas.js` pattern):
     ```javascript
     const qboInvoiceResponseSchema = Joi.object({
       Invoice: Joi.object({
         Id: Joi.string().required(),
         SyncToken: Joi.string().required(),
         DocNumber: Joi.string().optional(),
         TotalAmt: Joi.number().optional()
       }).required()
     }).unknown(true);
     ```
   - Parse `response.Invoice.Id` → store as `qbo_invoice_id`
   - Parse `response.Invoice.SyncToken` → store as `qbo_sync_token`
   - Set `qbo_sync_status = 'synced'`, `qbo_sync_date = NOW()`
   - Clear `qbo_sync_error = NULL`
7. On failure:
   - Parse error via `parseQBOError(response)` (extracts `Fault.Error[].Detail`)
   - Set `qbo_sync_status = 'error'`, `qbo_sync_error = errorMessage`
8. Return updated invoice

**Error parsing helper:**

```javascript
function parseQBOError(responseBody) {
  const fault = responseBody?.Fault;
  if (!fault) return 'Unknown QBO error';
  return fault.Error?.map(e => `${e.code}: ${e.Detail || e.Message}`).join('; ');
}
```

**HTTP status handling:**

| QBO HTTP Status | Meaning | Action |
|-----------------|---------|--------|
| 200–201 | Success | Store `Invoice.Id`, set `synced` |
| 400 | Validation error | Parse `Fault.Error`, store in `qbo_sync_error`, do NOT retry |
| 401 | Token expired | Refresh token, retry once |
| 403 | Insufficient scope | Log, set error, require re-authorization |
| 429 | Rate limited | intuit-oauth auto-retries (3 attempts with backoff) |
| 500–504 | Server error | Retry with backoff (up to 3 attempts) |

### 7.4 Bulk Sync Endpoint (Lower Priority)

**Add to:** `backend/routes/invoices.js`

```
POST /api/invoices/bulk-sync-qbo
```

**Logic:**
1. Query all invoices with `status IN ('sent', 'paid')` and `qbo_sync_status IN ('pending', 'error')`
2. For each, call the single-invoice sync logic with a 1-second delay between calls
3. Rate limit: max 5 invoices per minute (QBO limit is 500 req/min, but each sync involves multiple API calls)
4. Return `{ synced: N, failed: N, errors: [...] }`

---

## 8. Phase 4: Frontend — Sync UI

> **Estimated time:** 1 day
> **Dependencies:** Phase 3 complete (sync endpoint working)
> **Files modified:** 4

### 8.1 New API Functions

**Add to:** `frontend/src/services/invoiceApi.ts`

```typescript
// ── QBO Connection ──

export interface QBOStatus {
  connected: boolean;
  realmId?: string;
  companyName?: string;
  tokenExpiresAt?: string;
  lastRefreshed?: string;
}

export async function getQBOStatus(): Promise<QBOStatus> {
  const response = await authenticatedFetch(`${API_CONFIG.BASE_URL}/qbo/status`);
  if (!response.ok) throw new Error('Failed to get QBO status');
  return response.json();
}

export async function connectQBO(): Promise<{ authUrl: string }> {
  const response = await authenticatedFetch(`${API_CONFIG.BASE_URL}/qbo/connect`);
  if (!response.ok) throw new Error('Failed to initiate QBO connection');
  return response.json();
}

export async function disconnectQBO(): Promise<void> {
  const response = await authenticatedFetch(`${API_CONFIG.BASE_URL}/qbo/disconnect`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to disconnect QBO');
}

// ── QBO Invoice Sync ──

export async function syncInvoiceToQBO(invoiceId: number): Promise<Invoice> {
  const response = await authenticatedFetch(
    `${API_CONFIG.BASE_URL}/invoices/${invoiceId}/sync-qbo`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync invoice to QBO');
  }
  return response.json();
}
```

### 8.2 InvoiceDetail.tsx Changes

**Location:** `frontend/src/features/invoices/components/InvoiceDetail.tsx`

**Add:**

1. **QBO Sync Status Badge** — in the header area (near invoice number and status badge):
   - `pending` → gray badge "QBO: Pending"
   - `synced` → green badge "QBO: Synced" with `qbo_sync_date` tooltip
   - `error` → red badge "QBO: Error" with `qbo_sync_error` tooltip
   - `not_applicable` → hidden (no badge)

2. **"Sync to QBO" Button** — in the header action bar (near export buttons):
   - Visible when: `invoice.status` is `sent` or `paid`, QBO is connected, `qbo_sync_status !== 'synced'`
   - Disabled during sync (loading spinner)
   - Calls `syncInvoiceToQBO(invoice.id)`
   - On success: re-fetch invoice via `loadInvoice()` to update all `qbo_*` fields
   - On error: show toast with `qbo_sync_error`

3. **Sync Error Display** — below header when `qbo_sync_status === 'error'`:
   - Red alert box showing `qbo_sync_error` text
   - "Retry Sync" button

4. **New state:**
   ```typescript
   const [syncingToQBO, setSyncingToQBO] = useState(false);
   const [qboConnected, setQboConnected] = useState(false);
   ```

### 8.3 InvoiceList.tsx Changes

**Location:** `frontend/src/features/invoices/components/InvoiceList.tsx`

**Add:**

1. **QBO Sync Status Column** — new column after "Balance Due":
   - Small colored dot or icon: gray (pending), green (synced), red (error)
   - Tooltip showing status text

2. **QBO Sync Action** — in the row actions dropdown (optional):
   - "Sync to QBO" action for non-synced, non-draft invoices

### 8.4 Invoices.tsx Changes

**Location:** `frontend/src/features/invoices/components/Invoices.tsx`

**Add:**

1. **QBO Connection Status** — fetch `getQBOStatus()` on mount
2. **Pass `qboConnected` as prop** to `InvoiceList` and `InvoiceDetail`
3. **Handle `?qbo=connected` query param** — show success toast after OAuth callback redirect

### 8.5 No State Management Migration Needed

The existing `useState`/`useEffect` pattern is sufficient. `qbo_sync_status` and related fields are already on the `Invoice` TypeScript interface. No Redux, Zustand, or React Query migration is needed.

---

## 9. Phase 5: Scheduler & Automation

> **Estimated time:** 0.5 day
> **Dependencies:** Phase 1 complete (token infrastructure)
> **Files modified:** 1

### 9.1 Proactive Token Refresh

**Modify:** `backend/services/scheduler.js`

Add a new cron job that refreshes the QBO access token every 50 minutes. The access token lifetime is 60 minutes; refreshing at 50 prevents stale tokens during batch operations.

```javascript
// Add to scheduleConfig in constructor:
qboTokenRefresh: {
  schedules: [
    { expression: '*/50 * * * *', description: 'Every 50 minutes' }
  ],
  timezone: 'America/New_York',
  enabled: true
}
```

**Logic:**
1. Load active token from `qbo_tokens`
2. If no active token: skip (QBO not connected)
3. If access token expires within 10 minutes: call `qboClient.refreshTokens()`
4. Log success or failure

**CRITICAL:** The scheduler must not fail the entire startup if QBO is not connected. Guard with a try/catch that logs and continues.

### 9.2 Future: Auto-Sync on Send (Scaffolded, Not Active)

When `QBO_AUTO_SYNC=true` in `.env`, the `POST /api/invoices/:id/send` endpoint could automatically call the QBO sync endpoint after marking the invoice as sent. This is scaffolded via the env variable but **disabled by default** (Decision D6).

---

## 10. Phase 6: Testing & Validation

> **Estimated time:** 1–2 days
> **Dependencies:** Phases 1–5 complete

### 10.1 Sandbox End-to-End Checklist

#### OAuth Flow
- [ ] Clicking "Connect to QBO" from frontend → redirects to Intuit authorization page
- [ ] Authorizing on Intuit → redirects to callback URL → tokens stored in DB (encrypted)
- [ ] `GET /api/qbo/status` returns `{ connected: true, realmId, companyName }`
- [ ] Token refresh works: wait 60+ minutes (or manually expire), then make API call → auto-refresh fires
- [ ] Proactive 50-minute scheduler refresh fires without error (check logs)
- [ ] Disconnect: `POST /api/qbo/disconnect` → tokens revoked, `is_active = false`
- [ ] Re-connect after disconnect works (new OAuth flow, new tokens)

#### Customer & Item Sync
- [ ] `GET /api/qbo/sync/customers` matches "Velocity Business Automation, LLC" → stores `qbo_customer_id`
- [ ] `GET /api/qbo/sync/items` populates all 12 rows in `qbo_item_mappings`
- [ ] Missing items in QBO are reported clearly (not a silent failure)

#### Invoice Sync — Positive Cases
- [ ] **Basic support-only invoice** (all positive lines, no credits) → syncs to QBO ✓
- [ ] **Support + free credit** (e.g., 15 hours total, 10 free) → paired positive/negative lines ✓
  - Verify: positive support lines show gross hours at tier rates
  - Verify: negative credit line shows free hours at blended rate
  - Verify: credit line amount equals exactly the sum of free-hour values
  - Verify: invoice total in QBO matches internal total
- [ ] **Support ≤ 10 hours** (all free) → total = $0.00, positive and negative lines cancel exactly ✓
- [ ] **Hosting + hosting credit** → positive hosting line + negative hosting credit ✓
- [ ] **Hosting + proration** → positive hosting + negative proration line ✓
- [ ] **Projects** (non-free) → positive project lines at correct rates ✓
- [ ] **Mixed invoice** (support + projects + hosting + credits) → all line types correct ✓
- [ ] **`DocNumber` (`VEL-YYYY-NNN`)** appears correctly in QBO, no conflict with auto-numbering ✓
- [ ] **Invoice dates** (`TxnDate`, `DueDate`) match internal dates ✓
- [ ] **Customer on QBO invoice** matches "Velocity Business Automation, LLC" ✓
- [ ] **`qbo_invoice_id`** stored on local invoice after sync ✓
- [ ] **`qbo_sync_status`** transitions: `pending` → `synced` ✓
- [ ] **`qbo_sync_token`** stored for future update capability ✓

#### Invoice Sync — Edge Cases
- [ ] **Invoice total exactly $0.00** (all hours free, no projects/hosting) → syncs successfully ✓
- [ ] **Rounding validation** → amounts rounded to 2 decimal places, `Amount === roundTo2(Qty * UnitPrice)` ✓
- [ ] **Credit blended rate with odd decimals** (e.g., $1,575 / 8.5h = $185.294...) → rounds to $185.29, both lines match ✓
- [ ] **Multi-tier blended rate rounding** — free hours spanning 3 priority tiers (e.g., 2h emergency + 4h urgent + 4h standard = $1,800 / 10h = $180.00) → verify paired lines net exactly $0.00 with no $0.01 rounding drift ✓
- [ ] **Historical invoice sync** — sync at least one pre-`feat/fluent-category-mapping` invoice to verify old category/description values still match `qbo_item_mappings` fallback chain ✓
- [ ] **Retry from `error` state** → re-sync after fixing issue works ✓
- [ ] **Double-push prevention** → attempting to sync an already-synced invoice returns error, not duplicate ✓
- [ ] **Unmapped item** → clear error message listing the unmapped item type/category ✓
- [ ] **Unmapped customer** → clear error "Customer not mapped to QBO" ✓
- [ ] **`EmailStatus` without email** → correctly set to `"NotSet"` when customer has no email ✓

#### Invoice Sync — Negative Cases
- [ ] **Invoice total < $0** → rejected with clear message before API call (should not happen with correct credit capping, but safety net) ✓
- [ ] **QBO connection expired** → meaningful error, prompts reconnection ✓
- [ ] **QBO rate limit (429)** → auto-retry with backoff ✓
- [ ] **QBO validation error (400)** → error stored in `qbo_sync_error`, displayed in UI ✓

#### Frontend UI
- [ ] QBO connection status indicator shows connected/disconnected state ✓
- [ ] "Sync to QBO" button visible on sent/paid invoices when QBO connected ✓
- [ ] Button hidden on draft invoices and already-synced invoices ✓
- [ ] Sync error displayed with retry option ✓
- [ ] Sync status badge renders correctly in detail and list views ✓
- [ ] After successful sync, invoice data refreshes with updated `qbo_*` fields ✓

### 10.2 Manual QBO Verification

After each test sync, verify in the sandbox QBO UI at `app.sandbox.qbo.intuit.com`:

1. Navigate to Sales → Invoices
2. Find the synced invoice by `DocNumber`
3. Verify: customer, dates, line items, amounts all match
4. Verify: negative credit lines display correctly with negative amounts
5. Verify: invoice total matches the internal total

---

## 11. Phase 7: Production Cutover

> **Estimated time:** 0.5 day
> **Dependencies:** Phase 6 complete (all sandbox tests passing)

### 11.1 Environment Switch

| Setting | Sandbox Value | Production Value |
|---------|--------------|-----------------|
| `QBO_ENVIRONMENT` | `sandbox` | `production` |
| `QBO_CLIENT_ID` | Sandbox key | Production key |
| `QBO_CLIENT_SECRET` | Sandbox key | Production key |
| `QBO_REDIRECT_URI` | `http://localhost:3011/api/qbo/callback` | `https://billing.peakonedigital.com/api/qbo/callback` |

### 11.2 Pre-Cutover Checklist

- [ ] Production redirect URI registered in Intuit Developer portal
- [ ] Production Items exist in real QBO company (same names as sandbox)
- [ ] Production Customer "Velocity Business Automation, LLC" exists in QBO
- [ ] Custom transaction numbers enabled in production QBO
- [ ] **DocNumber collision check:** Query QBO for existing invoices with `DocNumber LIKE 'VEL-%'` to verify no previously CSV-imported invoices will conflict. If found, void or rename them before API sync.
- [ ] `QBO_TOKEN_ENCRYPTION_KEY` is a fresh random key (not the sandbox key)
- [ ] `.env` updated with production credentials (including `FRONTEND_URL`)
- [ ] `docker-compose.yml` environment variables verified

### 11.3 Post-Cutover Verification

- [ ] Run OAuth connect flow against production QBO
- [ ] Run customer sync → verify match
- [ ] Run item sync → verify all 12 mappings
- [ ] Create one test invoice (or sync an existing sent invoice) → verify in QBO
- [ ] Verify line items, amounts, customer, dates in production QBO
- [ ] Monitor logs for 24 hours → verify token refresh fires successfully
- [ ] Verify scheduler token refresh at 50-minute intervals

---

## 11.5 Known Limitations (v1)

These are intentional scope boundaries for the initial release. Documented here for transparency.

1. **No invoice update after sync.** Once an invoice is synced to QBO (`qbo_sync_status = 'synced'`), there is no automated update mechanism. The `qbo_sync_token` column stores QBO's optimistic lock for future use, but no update endpoint exists in v1. **Workaround:** If a synced invoice needs correction, void it in QBO manually, reset `qbo_sync_status` to `'pending'` in the local DB, and re-sync.

2. **Bulk sync returns a single response.** No progress feedback or resumability. Acceptable for current volume (~12 invoices/year, one customer). If volume increases, add batch cursor and progress reporting.

3. **Item sync does not paginate.** QBO queries return max 1000 results. Fine for our 11 items but would need pagination for a larger item catalog.

---

## 12. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Refresh token lost or not persisted** — A missed DB write after token refresh invalidates the old token permanently. Requires user re-authorization. | Medium | **Critical** | Wrap token refresh + DB persist in a transaction. Log old/new token hashes for audit. Add alerting on refresh failures. Proactive 50-min scheduler refresh. |
| R2 | **Negative invoice total rejected by QBO** — Credits exceed billable amounts. | Low (with cap) | Medium | Pre-validate `total >= 0` in mapper before API call. Credit capping in `calculateBilling()` ensures credits ≤ gross billable. Mapper validation is a safety net. |
| R3 | **QBO Item IDs change or items deleted** — Someone modifies/deletes Items in QBO. | Low | High | Cache in `qbo_item_mappings` table. Re-run Item sync if lookups fail. Log warnings on missing mappings. |
| R4 | **QBO rate limiting (429)** — Batch sync exceeds 500 req/min. | Low | Medium | `intuit-oauth` auto-retries on 429. Bulk sync limited to 5 invoices/minute. |
| R5 | **Amount precision mismatch** — Rounding differences between JS floats and QBO's 2-decimal validation. | Medium | Medium | `roundTo2()` on every field. Validate `Amount === roundTo2(Qty * UnitPrice)`. Paired credit lines computed from same rounded values. |
| R6 | **DocNumber conflict** — QBO auto-numbering clashes with `VEL-YYYY-NNN`. | Low | Medium | Disable auto-numbering in QBO (enable custom transaction numbers). Document in Phase 0 checklist. |
| R7 | **Token encryption key rotation** — Changing `QBO_TOKEN_ENCRYPTION_KEY` makes stored tokens unreadable. | Low | High | Document key rotation: decrypt with old key → re-encrypt with new key → update rows in transaction. |
| R8 | **Sandbox company expires** — 2-year lifetime. | Low | Low | Note expiration date. Create new sandbox if needed. |
| R9 | **`feat/fluent-category-mapping` branch changes billing data** — Category changes affect line items. | Medium | Medium | Merge branch before QBO testing (Decision D9). Verify billing summaries produce expected line items. |
| R10 | **Intuit refresh token policy changes (Jan 2026+)** — New "Reconnect URL" field mandatory. | Low | Medium | Monitor [Intuit blog](https://blogs.intuit.com/2025/11/12/important-changes-to-refresh-token-policy). May need to add reconnection flow. |
| R11 | **Paired credit lines rounding mismatch** — Positive and negative lines don't net to exactly $0.00. | Medium | Medium | Compute blended rate once, round it, compute both amounts from the same rounded values. Validate `positiveAmount + negativeAmount === 0` before sending. |
| R12 | **`EmailStatus: NeedToSend` without email** — Setting this without `BillEmail.Address` causes 400 error. | Low | Low | Conditionally set `EmailStatus` based on `customer.email` presence. Already handled in mapper logic. |

---

## 13. Open Questions (Resolved)

All open questions from the initial roadmap have been resolved. Captured here for traceability.

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q1 | Include negative credit lines in QBO? | **Yes** (D1) | Core purpose of integration. |
| Q2 | `node-quickbooks` vs raw API? | **Raw API only** (D2) | Tighter payload control for complex lines. |
| Q3 | Auto-sync on send? | **No, manual** (D6) | Validate first few months manually. |
| Q4 | Payment sync? | **Out of scope** | Separate future workstream. |
| Q5 | `SalesTermRef` resolution? | **Omit** (D7) | Use customer default terms. |
| Q6 | Free $0 project lines? | **Exclude** (D5) | No financial impact. |
| Q7 | `qbo_sync_token` column? | **Add now** (D8) | Low cost, needed for future updates. |
| Q8 | Merge Fluent branch first? | **Yes** (D9) | Stabilize billing data before testing. |
| Q9 | How to display free hours? | **Paired +/- lines** (D3) | Shows value of work with offsetting credit. |
| Q10 | What if credits > billable? | **Cap at gross** (D4) | 10hr allotment by resolvedAt date; credit ≤ billable. |

---

## 14. Appendix A: QBO API Reference

### Authentication

| Aspect | Value |
|--------|-------|
| OAuth Version | 2.0 (Authorization Code flow) |
| Auth URL | `https://appcenter.intuit.com/connect/oauth2` |
| Token URL | `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer` |
| Required Scope | `com.intuit.quickbooks.accounting` |
| Access Token Lifetime | **1 hour** |
| Refresh Token Lifetime | **Up to 5 years** (rotated on each refresh call) |
| SDK | `intuit-oauth` (npm) |

### Invoice Creation

| Aspect | Value |
|--------|-------|
| Endpoint | `POST /v3/company/{realmId}/invoice?minorversion=75` |
| Content-Type | `application/json` |
| Auth Header | `Bearer {access_token}` |
| Minimum Required | `CustomerRef.value` + at least one `Line` item |

### Line Item Structure

```json
{
  "Amount": 150.00,
  "DetailType": "SalesItemLineDetail",
  "Description": "Line item description",
  "SalesItemLineDetail": {
    "ItemRef": { "value": "42", "name": "Item Name" },
    "UnitPrice": 50.00,
    "Qty": 3.0
  }
}
```

**Constraints:**
- `Amount` = `Qty * UnitPrice` (QBO validates this relationship)
- `Amount` CAN be negative (for credit lines)
- Invoice total (sum of all `Amount` values) MUST be ≥ $0
- `ItemRef.value` is required and must reference an existing QBO Item
- `DetailType` must be exactly `"SalesItemLineDetail"`
- 2 decimal place precision for all amounts

### Rate Limits

| Limit | Value |
|-------|-------|
| Requests per minute | 500 per realm ID |
| Simultaneous requests | 10 per company per app |
| Batch operations | 40 per minute |

### Error Response Format

```json
{
  "Fault": {
    "Error": [
      {
        "Message": "Object Not Found",
        "Detail": "Object Not Found : Something you're trying to use has been made inactive.",
        "code": "610"
      }
    ],
    "type": "ValidationFault"
  }
}
```

---

## 15. Appendix B: File Inventory

### New Files (10)

| File | Purpose |
|------|---------|
| `backend/routes/qbo.js` | OAuth + sync + management routes |
| `backend/services/qboClient.js` | OAuth client, token refresh, API call wrapper |
| `backend/services/invoiceMapper.js` | Local invoice → QBO payload translation |
| `backend/repositories/QBOTokenRepository.js` | Token CRUD (encrypted) |
| `backend/repositories/QBOItemMappingRepository.js` | Item ID mapping CRUD |
| `backend/utils/encryption.js` | AES-256-GCM encrypt/decrypt |
| `backend/db/migrations/021_create_qbo_tokens_table.sql` | Token storage table |
| `backend/db/migrations/022_create_qbo_item_mappings_table.sql` | Item mapping table |
| `backend/db/migrations/023_add_qbo_sync_token.sql` | Add sync_token column |
| `frontend/src/hooks/useQBOStatus.ts` | Custom hook for QBO connection state |

### Modified Files (7)

| File | Changes |
|------|---------|
| `backend/server.js` | Register QBO routes (1 import + 1 line) |
| `backend/services/scheduler.js` | Add 50-min token refresh cron job |
| `frontend/src/services/invoiceApi.ts` | Add 4 QBO API functions + types |
| `frontend/src/features/invoices/components/InvoiceDetail.tsx` | Sync button, status badge, error display |
| `frontend/src/features/invoices/components/InvoiceList.tsx` | Sync status column |
| `frontend/src/features/invoices/components/Invoices.tsx` | QBO connection state, callback handling |
| `.env.example` | Add QBO environment variables + `FRONTEND_URL` |

### Unchanged Files (for reference)

| File | Why Unchanged |
|------|---------------|
| `backend/services/invoiceService.js` | Existing line-item generation already produces correct paired +/- lines. Mapper translates, doesn't modify. |
| `backend/middleware/conditionalAuth.js` | QBO routes use existing auth middleware as-is. |
| `backend/db/config.js` | DB connection pool unchanged. |
| `docker-compose.yml` | Only env vars added (no structural changes). |

---

## 16. Appendix C: Negative Line Item Examples

### Example 1: Support Invoice — 15 Hours Worked, 10 Free

**Internal invoice line items:**

| Line | Type | Description | Qty | Unit Price | Amount |
|------|------|-------------|-----|------------|--------|
| 1 | support | High Priority Support Hours | 3.00 | $250.00 | $750.00 |
| 2 | support | Medium Priority Support Hours | 5.50 | $175.00 | $962.50 |
| 3 | support | Low Priority Support Hours | 6.50 | $150.00 | $975.00 |
| 4 | other | Turbo Support Credit Applied (10h free) | 10.00 | -$194.25 | -$1,942.50 |

**How the credit is calculated (in `calculateBilling()`):**

The first 10 hours by `resolvedAt` date are free. Say those 10 hours break down as: 2h emergency ($500), 4h urgent ($700), 4h standard ($600) = $1,800 in free value.

Wait — the current code applies credits chronologically to the first N hours, not by cheapest tier. So the credit amount depends on which tickets are resolved first. The credit line stores:
- `quantity = freeHoursApplied` (10.0)
- `unit_price = -(creditValue / freeHoursApplied)` (blended rate)
- `amount = -creditValue`

**Gross support total:** $750 + $962.50 + $975 = $2,687.50
**Net billable total:** $2,687.50 - $1,942.50 = $745.00
**Invoice total:** $745.00 ✓ (positive, QBO accepts)

**QBO payload `Line` array:**

```json
[
  {
    "Amount": 750.00,
    "DetailType": "SalesItemLineDetail",
    "Description": "High Priority Support Hours",
    "SalesItemLineDetail": {
      "ItemRef": { "value": "1", "name": "p1 - Emergency Support" },
      "UnitPrice": 250.00,
      "Qty": 3.00
    }
  },
  {
    "Amount": 962.50,
    "DetailType": "SalesItemLineDetail",
    "Description": "Medium Priority Support Hours",
    "SalesItemLineDetail": {
      "ItemRef": { "value": "2", "name": "p2 - Urgent Support" },
      "UnitPrice": 175.00,
      "Qty": 5.50
    }
  },
  {
    "Amount": 975.00,
    "DetailType": "SalesItemLineDetail",
    "Description": "Low Priority Support Hours",
    "SalesItemLineDetail": {
      "ItemRef": { "value": "3", "name": "p3 - Standard Support" },
      "UnitPrice": 150.00,
      "Qty": 6.50
    }
  },
  {
    "Amount": -1942.50,
    "DetailType": "SalesItemLineDetail",
    "Description": "Turbo Support Credit Applied (10h free)",
    "SalesItemLineDetail": {
      "ItemRef": { "value": "4", "name": "Free Support Hours Credit" },
      "UnitPrice": -194.25,
      "Qty": 10.00
    }
  }
]
```

### Example 2: All Hours Free (≤10 Hours, Total = $0)

**Internal line items for 8.5 hours worked:**

| Line | Type | Description | Qty | Unit Price | Amount |
|------|------|-------------|-----|------------|--------|
| 1 | support | Low Priority Support Hours | 8.50 | $150.00 | $1,275.00 |
| 2 | other | Turbo Support Credit Applied (8.5h free) | 8.50 | -$150.00 | -$1,275.00 |

**QBO total:** $1,275.00 + (-$1,275.00) = **$0.00** ✓ (QBO accepts zero-total invoices)

The customer sees the full $1,275 value of work performed, offset by a matching credit.

### Example 3: Mixed Invoice — Support + Hosting + Credits

| Line | Type | Description | Qty | Unit Price | Amount |
|------|------|-------------|-----|------------|--------|
| 1 | support | High Priority Support Hours | 12.00 | $250.00 | $3,000.00 |
| 2 | other | Turbo Support Credit Applied (10h free) | 10.00 | -$250.00 | -$2,500.00 |
| 3 | hosting | Website Hosting - 22 sites | 22.00 | $99.00 | $2,178.00 |
| 4 | other (HOSTING_CREDIT) | Free hosting credit (1 site) | 1.00 | -$99.00 | -$99.00 |
| 5 | other (HOSTING_PRORATED) | Hosting proration adjustment | 1.00 | -$45.00 | -$45.00 |

**QBO total:** $3,000 - $2,500 + $2,178 - $99 - $45 = **$2,534.00** ✓

---

---

## Review History

### Review 1 — Agent Team Gap Analysis (2026-03-06)

Three review agents analyzed the plan against the four research documents. Findings incorporated:

| Finding | Severity | Status | Action Taken |
|---------|----------|--------|-------------|
| C1 — Token refresh not transactional | Critical | **Fixed** | Added transactional refresh with dedicated DB connection + emergency recovery logging |
| C2 — Description matching bug on credit lines | Critical | **Fixed** | Mapper uses `startsWith()` to normalize dynamic description before lookup |
| C3 — CSRF state token has no persistence | Important (downgraded) | **Fixed** | Switched to signed JWT state token (self-validating, no storage) |
| C4 — No concurrency guard on token refresh | Critical | **Fixed** | Added `_refreshPromise` singleton pattern to prevent parallel refreshes |
| I1 — No invoice update after sync | Important | **Documented** | Added to Known Limitations with manual workaround |
| I2 — `intuit-oauth` log file path | Important | **Fixed** | Added note to ensure `logs/` dir exists or suppress SDK logger |
| I3 — Bulk sync no progress/resumability | Important | **Documented** | Added to Known Limitations; acceptable for current volume |
| I4 — Hosting credit types share QBO item | Important | **Confirmed intentional** | Added clarifying note to mapping table |
| I5 — No Joi validation for QBO responses | Important | **Fixed** | Added Joi schema for QBO invoice response in sync endpoint |
| I6 — Customer name matching brittle | Important | **Fixed** | Added `?dryRun=true` mode to customer sync |
| UQ1 — `realm_id` source of truth | Medium | **Resolved** | DB is authoritative; env var is informational only |
| UQ2 — `FRONTEND_URL` for callback | Low | **Fixed** | Added `FRONTEND_URL` to env config + docker-compose |
| UQ3 — Pre-merge invoice syncability | Medium | **Added test** | Historical invoice test added to Phase 6 checklist |
| UQ4 — `DocNumber` collision | Medium | **Fixed** | Added collision check to Phase 7 pre-cutover checklist |
| UQ5 — Sandbox customer create vs verify | Low | **Fixed** | Phase 0 wording corrected to "create" |
| UQ6 — Item sync pagination | Low | **Documented** | Added to Known Limitations |

---

*End of implementation plan.*
