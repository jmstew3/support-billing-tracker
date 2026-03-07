# QBO Integration Roadmap

## Executive Summary

The Support Billing Tracker needs to push locally-generated invoices into QuickBooks Online via the QBO REST API. The backend is well-positioned for this work: the Express/MySQL architecture already follows a clean routes-services-repositories layering, the invoice system is mature with full CRUD and line-item management, and the database schema already contains QBO-ready columns (`invoices.qbo_invoice_id`, `invoices.qbo_sync_status`, `customers.qbo_customer_id`). The existing QBO CSV export even has hardcoded product-name mappings that can be converted to `ItemRef` lookups. What is entirely missing is the OAuth 2.0 token lifecycle (authorization, storage, refresh, revocation), a QBO API service layer, and the frontend sync UI.

The primary risks are (1) refresh-token rotation -- every token refresh returns a new refresh token and the old one is immediately invalidated, so a single missed persist can lock us out until the user re-authorizes; (2) negative line-item handling -- QBO rejects invoices with a negative total, and the current CSV export deliberately excludes all credit/discount lines, so the API integration needs an explicit strategy for representing free-hours credits; and (3) the `ItemRef` resolution gap -- the backend maps item types to QBO product *names* but the API requires numeric QBO Item IDs, which must be fetched and cached from the QBO Items API.

Estimated complexity is moderate. The OAuth plumbing and token infrastructure (Phases 1-2) are the most sensitive pieces. Once tokens are flowing, the invoice-push logic (Phase 3) is largely a translation of the existing `exportInvoiceJSON()` output into the QBO `POST /v3/company/{realmId}/invoice` payload format. Frontend changes (Phase 4) are minor -- adding sync buttons and status badges to the existing `InvoiceDetail.tsx` and `InvoiceList.tsx` components.

---

## Phase 0: QBO Developer Portal Setup
> Actions required on developer.intuit.com BEFORE writing any code

- [ ] Create an Intuit Developer account at [developer.intuit.com](https://developer.intuit.com) (if not done)
- [ ] Create a sandbox company (Dashboard > Sandbox > Add Sandbox, US company type)
- [ ] Note the **Sandbox Company ID** (Realm ID) from sandbox settings
- [ ] Create a QBO app (Dashboard > My Apps > Create an App > "QuickBooks Online and Payments")
- [ ] Select the **`com.intuit.quickbooks.accounting`** scope
- [ ] Copy **Client ID** and **Client Secret** for both sandbox and production keys
- [ ] Configure OAuth 2.0 redirect URIs:
  - Development: `http://localhost:3011/api/qbo/callback`
  - Production: `https://billing.peakonedigital.com/api/qbo/callback`
- [ ] Add credentials to `.env` (see Phase 1.2 below)
- [ ] Create the following service Items in the sandbox QBO company (Products and Services):
  - `p1 - Emergency Support` (Service, $250/hr) -- under Professional Services > Support Services
  - `p2 - Urgent Support` (Service, $175/hr) -- under Professional Services > Support Services
  - `p3 - Standard Support` (Service, $150/hr) -- under Professional Services > Support Services
  - `Free Support Hours Credit` (Service, $0) -- for negative credit lines
  - `PeakOne Website Hosting` (Service, $99/month) -- under Managed Services > Hosting Services
  - `Landing Page Development` (Service) -- under Professional Services > Lead Capture Assets
  - `Multi-Step Lead Form Implementation` (Service) -- under Professional Services > Lead Capture Assets
  - `Basic Lead Form Implementation` (Service) -- under Professional Services > Lead Capture Assets
  - `Website Migration Services` (Service) -- under Professional Services
  - `Custom Development` (Service) -- under Professional Services
  - `Free Hosting Credit` (Service, $0) -- for hosting discount lines
- [ ] Note the QBO Item IDs for each service item created above
- [ ] Test sandbox credentials with a basic CompanyInfo API call:
  ```
  GET https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}/companyinfo/{realmId}
  ```
- [ ] Verify sandbox company has at least one Customer entity matching "Velocity Business Automation, LLC"

---

## Phase 1: Backend -- OAuth 2.0 & Token Infrastructure

### 1.1 Install dependencies

From the backend assessment, `intuit-oauth` is required and `node-quickbooks` is recommended. The project already has `axios`, `joi`, `winston`, and `dotenv`.

```bash
cd backend && npm install intuit-oauth
```

Optional (recommended for cleaner CRUD, but can use `intuit-oauth.makeApiCall()` + `axios` instead):
```bash
npm install node-quickbooks
```

**Decision needed**: Use `node-quickbooks` for entity methods (`createInvoice`, `findCustomers`, `findItems`) or go `intuit-oauth` + raw API calls only. The raw approach gives more control over invoice payload construction, which matters for our complex line-item mapping. Recommendation: **start with `intuit-oauth` only** and add `node-quickbooks` later if the boilerplate becomes excessive.

### 1.2 Environment configuration

Add to `.env` and `.env.example`:

```bash
# QuickBooks Online OAuth 2.0
QBO_CLIENT_ID=                          # From Intuit Developer portal (sandbox key)
QBO_CLIENT_SECRET=                      # From Intuit Developer portal (sandbox key)
QBO_REDIRECT_URI=http://localhost:3011/api/qbo/callback
QBO_ENVIRONMENT=sandbox                 # 'sandbox' or 'production'
QBO_REALM_ID=                           # Sandbox company ID (populated after OAuth connect)
QBO_TOKEN_ENCRYPTION_KEY=               # 32-byte hex string for AES-256 encryption of stored tokens
QBO_MINOR_VERSION=75                    # Pin QBO API minor version for predictability

# Optional
QBO_AUTO_SYNC=false                     # Enable automatic invoice sync on send
QBO_WEBHOOK_VERIFIER_TOKEN=             # For future webhook support
```

Add to `docker-compose.yml` under the `backend` service `environment` section:

```yaml
- QBO_CLIENT_ID=${QBO_CLIENT_ID}
- QBO_CLIENT_SECRET=${QBO_CLIENT_SECRET}
- QBO_REDIRECT_URI=${QBO_REDIRECT_URI}
- QBO_ENVIRONMENT=${QBO_ENVIRONMENT}
- QBO_REALM_ID=${QBO_REALM_ID}
- QBO_TOKEN_ENCRYPTION_KEY=${QBO_TOKEN_ENCRYPTION_KEY}
- QBO_MINOR_VERSION=${QBO_MINOR_VERSION}
- QBO_AUTO_SYNC=${QBO_AUTO_SYNC}
```

### 1.3 Build OAuth routes

**New file:** `backend/routes/qbo.js`

Follow the existing route pattern (see `routes/fluent-sync.js`, `routes/auth.js`).

```
GET  /api/qbo/connect      -- Initiate OAuth flow (admin-only, behind conditionalAuth + requireAdmin)
GET  /api/qbo/callback      -- Exchange authorization code for tokens (UNPROTECTED -- Intuit redirects here)
GET  /api/qbo/status        -- Return current connection status (admin-only)
POST /api/qbo/disconnect    -- Revoke tokens and deactivate (admin-only)
POST /api/qbo/refresh       -- Force a manual token refresh (admin-only, for debugging)
```

**Route registration in `server.js`:**
```javascript
import qboRoutes from './routes/qbo.js';
app.use('/api/qbo', qboRoutes);
```

**OAuth flow details:**

1. `GET /api/qbo/connect`:
   - Instantiate `OAuthClient` with `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_ENVIRONMENT`, `QBO_REDIRECT_URI`
   - Generate auth URL with `oauthClient.authorizeUri({ scope: ['com.intuit.quickbooks.accounting'], state: csrfToken })`
   - Store CSRF state in session or short-lived DB record
   - Return `{ authUrl }` for the frontend to redirect

2. `GET /api/qbo/callback`:
   - Exchange code via `oauthClient.createToken(req.url)`
   - Extract `access_token`, `refresh_token`, `expires_in`, `x_refresh_token_expires_in`, `realmId` from response
   - Encrypt tokens with AES-256 using `QBO_TOKEN_ENCRYPTION_KEY`
   - Upsert into `qbo_tokens` table (keyed by `realm_id`)
   - Redirect browser to `${FRONTEND_URL}/invoices?qbo=connected`

3. `GET /api/qbo/status`:
   - Query `qbo_tokens` for active record
   - Return `{ connected: boolean, realmId, companyName, tokenExpiresAt, lastRefreshed }`

4. `POST /api/qbo/disconnect`:
   - Call `oauthClient.revoke({ access_token, refresh_token })`
   - Set `is_active = false` in `qbo_tokens`
   - Return `{ disconnected: true }`

### 1.4 Token storage

**Migration file:** `backend/db/migrations/021_create_qbo_tokens_table.sql`

```sql
CREATE TABLE IF NOT EXISTS qbo_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  realm_id VARCHAR(100) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  company_name VARCHAR(255) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_qbo_realm (realm_id),
  INDEX idx_qbo_active (is_active)
);
```

**Repository file:** `backend/repositories/QBOTokenRepository.js`

Follow the pattern in `RefreshTokenRepository.js` (static methods, explicit connection parameter for transaction support):

```javascript
export default class QBOTokenRepository {
  static async getActiveToken(connection = pool) { ... }
  static async upsertToken(realmId, tokenData, connection = pool) { ... }
  static async deactivate(realmId, connection = pool) { ... }
  static async updateTokens(realmId, accessToken, refreshToken, expiresAt, connection = pool) { ... }
}
```

Token encryption/decryption: Use Node.js built-in `crypto` module with AES-256-GCM. Store the IV alongside the ciphertext (e.g., `iv:ciphertext:authTag` format in the TEXT column). Create a `backend/utils/encryption.js` utility.

### 1.5 QBO client service

**New file:** `backend/services/qboClient.js`

This is the foundational service that all QBO API calls go through. It manages the `OAuthClient` instance and handles automatic token refresh.

```javascript
import OAuthClient from 'intuit-oauth';
import QBOTokenRepository from '../repositories/QBOTokenRepository.js';
import { decrypt, encrypt } from '../utils/encryption.js';
import logger from './logger.js';

class QBOClient {
  constructor() {
    this.oauthClient = new OAuthClient({
      clientId: process.env.QBO_CLIENT_ID,
      clientSecret: process.env.QBO_CLIENT_SECRET,
      environment: process.env.QBO_ENVIRONMENT || 'sandbox',
      redirectUri: process.env.QBO_REDIRECT_URI,
    });
  }

  async getAuthenticatedClient() {
    const tokenRecord = await QBOTokenRepository.getActiveToken();
    if (!tokenRecord) throw new Error('QBO not connected');

    const accessToken = decrypt(tokenRecord.access_token);
    const refreshToken = decrypt(tokenRecord.refresh_token);

    this.oauthClient.setToken({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenRecord.token_type,
      expires_in: Math.floor((new Date(tokenRecord.access_token_expires_at) - Date.now()) / 1000),
      x_refresh_token_expires_in: Math.floor((new Date(tokenRecord.refresh_token_expires_at) - Date.now()) / 1000),
      realmId: tokenRecord.realm_id,
    });

    // Refresh if access token expires within 5 minutes
    if (!this.oauthClient.isAccessTokenValid() || this.isExpiringSoon(tokenRecord.access_token_expires_at, 300)) {
      await this.refreshTokens(tokenRecord.realm_id);
    }

    return { oauthClient: this.oauthClient, realmId: tokenRecord.realm_id };
  }

  async refreshTokens(realmId) {
    const response = await this.oauthClient.refresh();
    const newToken = response.getToken();

    // CRITICAL: Persist the NEW refresh token immediately
    await QBOTokenRepository.updateTokens(
      realmId,
      encrypt(newToken.access_token),
      encrypt(newToken.refresh_token),
      new Date(Date.now() + newToken.expires_in * 1000)
    );

    logger.info('[QBO] Tokens refreshed', { realmId });
  }

  async makeApiCall(method, endpoint, body = null) {
    const { oauthClient, realmId } = await this.getAuthenticatedClient();
    const baseUrl = process.env.QBO_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
    const minorVersion = process.env.QBO_MINOR_VERSION || '75';
    const url = `${baseUrl}/v3/company/${realmId}/${endpoint}?minorversion=${minorVersion}`;

    const options = { url, method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);

    const response = await oauthClient.makeApiCall(options);
    return JSON.parse(response.body);
  }
}

export default new QBOClient();
```

**Scheduler integration** (add to `services/scheduler.js`):
- Add a cron job to proactively refresh the QBO access token every 50 minutes (token lifetime is 60 minutes). This prevents stale tokens during batch operations.

---

## Phase 2: Backend -- Customer & Item Sync

### 2.1 QBO Customer sync endpoint

**Endpoint:** `GET /api/qbo/sync/customers` (admin-only)

**Logic:**
1. Fetch all active customers from local `customers` table
2. For each customer without a `qbo_customer_id`:
   - Query QBO: `SELECT * FROM Customer WHERE DisplayName = '{customer.name}'`
   - If found: store `Customer.Id` in `customers.qbo_customer_id`
   - If not found: Create customer in QBO with `DisplayName`, `PrimaryEmailAddr`, address fields, then store returned ID
3. Return sync results (matched, created, failed)

**Important:** The system currently has only one customer ("Velocity Business Automation, LLC"). This step can be done manually via the admin UI for now, but the API endpoint should exist for future multi-customer support.

### 2.2 QBO Item sync endpoint

**Endpoint:** `GET /api/qbo/sync/items` (admin-only)

**Logic:**
1. Query QBO: `SELECT * FROM Item WHERE Type = 'Service'`
2. Match QBO Items against the product name mappings already defined in `invoiceService.js`:
   - `SUPPORT_PRODUCT_MAP` (3 entries: p1/p2/p3)
   - `PROJECT_PRODUCT_MAP` (5 entries: landing page, multi-form, basic form, migration, custom dev)
   - `HOSTING_PRODUCT` (1 entry)
   - Credit items (free support credit, free hosting credit)
3. Store mappings in a new `qbo_item_mappings` table
4. Return sync results

### 2.3 Mapping table schema

**Migration file:** `backend/db/migrations/022_create_qbo_item_mappings_table.sql`

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

**Seed data** (after running Item sync):

| internal_item_type | internal_category | internal_description | qbo_item_name |
|----|----|----|-----|
| support | NULL | High Priority Support Hours | p1 - Emergency Support |
| support | NULL | Medium Priority Support Hours | p2 - Urgent Support |
| support | NULL | Low Priority Support Hours | p3 - Standard Support |
| credit | NULL | Turbo Support Credit Applied | Free Support Hours Credit |
| project | LANDING_PAGE | NULL | Landing Page Development |
| project | MULTI_FORM | NULL | Multi-Step Lead Form Implementation |
| project | BASIC_FORM | NULL | Basic Lead Form Implementation |
| project | MIGRATION | NULL | Website Migration Services |
| project | NULL | NULL | Custom Development |
| hosting | NULL | NULL | PeakOne Website Hosting |
| credit | HOSTING_CREDIT | NULL | Free Hosting Credit |

**Repository file:** `backend/repositories/QBOItemMappingRepository.js`

```javascript
export default class QBOItemMappingRepository {
  static async findQBOItemId(itemType, category, description, connection = pool) { ... }
  static async upsertMapping(mapping, connection = pool) { ... }
  static async getAllMappings(connection = pool) { ... }
}
```

---

## Phase 3: Backend -- Invoice Creation Endpoint

### 3.1 Build POST /api/invoices/:id/sync-qbo

**Add to:** `backend/routes/invoices.js` (or as a separate route in `routes/qbo.js`)

**Logic:**
1. Load invoice with items from DB (reuse existing `GET /api/invoices/:id` service)
2. Verify `qbo_sync_status !== 'synced'` (prevent double-push; allow retry from 'error')
3. Resolve `CustomerRef` via `customers.qbo_customer_id` -- fail if unmapped
4. Map each line item to QBO `Line` array via `invoiceMapper.js`
5. Build full QBO invoice payload
6. Call `POST /v3/company/{realmId}/invoice` via `qboClient.makeApiCall()`
7. On success: update invoice record with `qbo_invoice_id`, `qbo_sync_status = 'synced'`, `qbo_sync_date`
8. On failure: update `qbo_sync_status = 'error'`, `qbo_sync_error = errorMessage`
9. Return updated invoice

### 3.2 Payload mapping layer (invoiceMapper.js)

**New file:** `backend/services/invoiceMapper.js`

Translates local invoice data into QBO API payload format.

```javascript
import QBOItemMappingRepository from '../repositories/QBOItemMappingRepository.js';

export async function mapInvoiceToQBO(invoice, customer) {
  const lines = [];

  for (const item of invoice.items) {
    // Skip $0 project lines (free-credited projects)
    if (item.item_type === 'project' && parseFloat(item.amount) === 0) continue;

    const qboItemId = await QBOItemMappingRepository.findQBOItemId(
      item.item_type === 'other' ? 'credit' : item.item_type,
      item.category,
      item.description
    );

    if (!qboItemId) {
      throw new Error(`No QBO Item mapping found for: type=${item.item_type}, category=${item.category}, desc="${item.description}"`);
    }

    const unitPrice = parseFloat(item.unit_price);
    const qty = parseFloat(item.quantity);
    const amount = parseFloat(item.amount);

    lines.push({
      Amount: amount,
      DetailType: 'SalesItemLineDetail',
      Description: item.description,
      SalesItemLineDetail: {
        ItemRef: { value: qboItemId },
        UnitPrice: unitPrice,
        Qty: qty,
      },
    });
  }

  // Validate total >= 0 (QBO rejects negative totals)
  const total = lines.reduce((sum, l) => sum + l.Amount, 0);
  if (total < 0) {
    throw new Error(`Invoice total is negative ($${total.toFixed(2)}). QBO rejects invoices with negative totals. Cap credits or use a Credit Memo.`);
  }

  return {
    CustomerRef: {
      value: customer.qbo_customer_id,
    },
    TxnDate: invoice.invoice_date,      // YYYY-MM-DD
    DueDate: invoice.due_date,           // YYYY-MM-DD
    DocNumber: invoice.invoice_number,   // "VEL-YYYY-NNN"
    Line: lines,
    PrivateNote: invoice.internal_notes || undefined,
    CustomerMemo: invoice.notes ? { value: invoice.notes } : undefined,
    BillEmail: customer.email ? { Address: customer.email } : undefined,
    EmailStatus: customer.email ? 'NeedToSend' : 'NotSet',
    GlobalTaxCalculation: 'NotApplicable',  // Tax always 0 in current system
  };
}
```

**Key decisions embedded:**
- Negative-amount credit lines (free hours, hosting credits) are included as negative `SalesItemLineDetail` lines. This keeps the QBO invoice total matching the internal total.
- `$0` free project lines are excluded (no value to QBO).
- `GlobalTaxCalculation: 'NotApplicable'` since tax is always 0.
- `DocNumber` uses the existing `VEL-YYYY-NNN` format. Verify this does not conflict with QBO auto-numbering (disable auto-numbering in QBO settings if needed).

### 3.3 Error handling

Follow the existing `withRetry()` pattern from `fluentSupportApi.js`:

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 200-201 | Success | Parse response, store `Invoice.Id` as `qbo_invoice_id` |
| 400 | Validation error | Parse `Fault.Error[].Detail`, store in `qbo_sync_error`, do NOT retry |
| 401 | Token expired | Refresh token and retry once |
| 403 | Insufficient scope | Log, set error, require re-authorization |
| 429 | Rate limited | Retry with exponential backoff (intuit-oauth SDK handles this automatically for 3 retries) |
| 500-504 | Server error | Retry with exponential backoff (up to 3 attempts) |

**QBO-specific error parsing:**
```javascript
function parseQBOError(responseBody) {
  const fault = responseBody?.Fault;
  if (!fault) return 'Unknown QBO error';
  return fault.Error?.map(e => `${e.code}: ${e.Detail || e.Message}`).join('; ');
}
```

### 3.4 Response handling

On successful `POST /v3/company/{realmId}/invoice`, QBO returns:

```json
{
  "Invoice": {
    "Id": "130",
    "SyncToken": "0",
    "DocNumber": "VEL-2026-001",
    "TotalAmt": 1425.00,
    ...
  }
}
```

Store:
- `response.Invoice.Id` -> `invoices.qbo_invoice_id`
- `response.Invoice.SyncToken` -> consider adding a `qbo_sync_token` column for future updates
- Update `qbo_sync_status = 'synced'`, `qbo_sync_date = NOW()`
- Clear `qbo_sync_error = NULL`

**Optional migration** for SyncToken support:
```sql
ALTER TABLE invoices ADD COLUMN qbo_sync_token VARCHAR(50) DEFAULT NULL AFTER qbo_sync_error;
```

---

## Phase 4: Frontend -- Wire React Invoicing Layer to QBO

### 4.1 Gaps to resolve in the UI

Based on the invoicing layer report, the following frontend changes are needed:

1. **QBO Connection Status Indicator** -- Add to the sidebar or page header showing whether QBO is connected. Call `GET /api/qbo/status` on mount.

2. **"Connect to QBO" Button** -- In a settings area or on the invoice page, a button that calls `GET /api/qbo/connect` and redirects to the returned `authUrl`.

3. **QBO Sync Status Badge** -- Render `invoice.qbo_sync_status` as a colored badge in:
   - `InvoiceList.tsx` (new column or inline badge next to status)
   - `InvoiceDetail.tsx` (header area)
   - States: `pending` (gray), `synced` (green), `error` (red), `not_applicable` (hidden)

4. **"Sync to QBO" Button** -- In `InvoiceDetail.tsx`:
   - Visible when: invoice status is `sent` or `paid`, QBO is connected, `qbo_sync_status !== 'synced'`
   - Calls `POST /api/invoices/:id/sync-qbo`
   - Shows loading spinner during sync
   - On success: update local invoice state with new `qbo_sync_status`, `qbo_invoice_id`
   - On error: display `qbo_sync_error` in an alert/toast

5. **Sync Error Display** -- In `InvoiceDetail.tsx`, show `qbo_sync_error` text with a "Retry" button when `qbo_sync_status === 'error'`.

6. **Bulk Sync Button** (optional, lower priority) -- In `InvoiceList.tsx`, a "Sync All to QBO" button for sent invoices that have `qbo_sync_status = 'pending'`.

### 4.2 API call updates

**Add to:** `frontend/src/services/api.ts` (or `invoiceApi.ts` if split)

```typescript
// QBO Connection
export async function getQBOStatus(): Promise<QBOStatus> { ... }
export async function connectQBO(): Promise<{ authUrl: string }> { ... }
export async function disconnectQBO(): Promise<void> { ... }

// QBO Invoice Sync
export async function syncInvoiceToQBO(invoiceId: number): Promise<Invoice> { ... }
```

**Add type:**
```typescript
interface QBOStatus {
  connected: boolean;
  realmId?: string;
  companyName?: string;
  tokenExpiresAt?: string;
}
```

### 4.3 State management updates

No migration to a state library is needed. The existing `useState`/`useEffect` pattern is sufficient:

- `InvoiceDetail.tsx`: Add `syncingToQBO: boolean` state. After successful sync, call the existing `loadInvoice()` to refresh the invoice data (which now includes updated `qbo_*` fields).
- `Invoices.tsx`: Add `qboConnected: boolean` state, fetched on mount via `getQBOStatus()`. Pass as prop to child components.
- `InvoiceList.tsx`: No new state needed -- `qbo_sync_status` is already on the `Invoice` type and just needs to be rendered.

### 4.4 Negative line item / discount UI

The frontend already handles negative-amount lines correctly in the detail view (they are displayed as read-only credit lines with negative amounts). No changes needed for display.

For the QBO sync flow, the `invoiceMapper.js` on the backend handles the translation. The frontend just needs to display the sync result (success or error). If the invoice total is negative (which would cause a QBO rejection), the error message from the backend should clearly explain why and suggest capping credits.

---

## Phase 5: Testing & Validation

### 5.1 Sandbox end-to-end test checklist

- [ ] OAuth connect flow completes: clicking "Connect to QBO" redirects to Intuit, authorizes, returns to callback, stores tokens
- [ ] `GET /api/qbo/status` returns `{ connected: true }` after successful OAuth
- [ ] Token refresh works: wait 60+ minutes (or manually expire token), then make an API call -- should auto-refresh
- [ ] Proactive token refresh via scheduler fires every 50 minutes without error
- [ ] `GET /api/qbo/sync/customers` matches "Velocity Business Automation, LLC" to the correct QBO Customer and stores `qbo_customer_id`
- [ ] `GET /api/qbo/sync/items` populates `qbo_item_mappings` with correct QBO Item IDs for all product types
- [ ] Basic invoice with positive-only support lines syncs to QBO sandbox successfully
- [ ] Invoice with negative credit lines (free support hours) syncs to QBO with correct negative `Amount` values
- [ ] Invoice with hosting lines + hosting credit discount syncs correctly
- [ ] Invoice with project lines syncs correctly
- [ ] Invoice with mixed support + projects + hosting syncs correctly
- [ ] Invoice total < $0 is rejected with a clear error message (not a raw QBO error)
- [ ] `qbo_invoice_id` is stored on the local invoice after successful sync
- [ ] `qbo_sync_status` transitions: `pending` -> `synced` (or `error` on failure)
- [ ] Retry from `error` state works (re-sync after fixing the issue)
- [ ] Synced invoice is visible in sandbox QBO at `app.sandbox.qbo.intuit.com` with correct line items, amounts, customer, dates
- [ ] `DocNumber` (`VEL-YYYY-NNN`) does not conflict with QBO auto-numbering
- [ ] `POST /api/qbo/disconnect` revokes tokens and sets `is_active = false`
- [ ] After disconnect, sync attempts fail gracefully with "QBO not connected" message
- [ ] Re-connect after disconnect works (new OAuth flow, new tokens)

### 5.2 Production cutover checklist

- [ ] Switch `QBO_ENVIRONMENT=production` in `.env`
- [ ] Replace `QBO_CLIENT_ID` and `QBO_CLIENT_SECRET` with production keys from Intuit Developer portal
- [ ] Update `QBO_REDIRECT_URI` to `https://billing.peakonedigital.com/api/qbo/callback`
- [ ] Verify production redirect URI is registered in the Intuit Developer portal
- [ ] Run OAuth connect flow against production QBO company
- [ ] Run `GET /api/qbo/sync/customers` against production QBO -- verify customer match
- [ ] Run `GET /api/qbo/sync/items` against production QBO -- verify all Items exist and IDs are correct
- [ ] Create one test invoice and sync to production QBO
- [ ] Verify the invoice is visible and correct in production QBO (`qbo.intuit.com`)
- [ ] Verify line items, amounts, customer, dates all match
- [ ] Verify `DocNumber` format is acceptable in production QBO settings
- [ ] Monitor logs for token refresh success over 24 hours

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Refresh token lost or not persisted** -- A missed DB write after token refresh invalidates the old token permanently | Medium | Critical | Wrap token refresh + DB persist in a transaction. Add alerting on refresh failures. Log every token rotation. |
| R2 | **Negative invoice total rejected by QBO** -- Credits exceed billable amounts for a given period | Medium | Medium | Pre-validate total >= 0 in `invoiceMapper.js` before API call. Return clear error message suggesting to cap credits or use Credit Memo. |
| R3 | **QBO Item IDs change or items deleted** -- Someone modifies/deletes Items in QBO | Low | High | Cache mappings in `qbo_item_mappings` table. Re-run Item sync if mapping lookups fail. Log warnings on missing mappings. |
| R4 | **QBO rate limiting (429)** -- Batch syncing many invoices exceeds 500 req/min | Low | Medium | `intuit-oauth` SDK auto-retries on 429. Add explicit rate limiting to batch sync (max 5 invoices/minute). |
| R5 | **Sandbox company expires** -- Sandbox companies have a 2-year lifetime | Low | Low | Note expiration date. Create a new sandbox if needed before expiry. |
| R6 | **Amount precision mismatch** -- Rounding differences between JS float arithmetic and QBO's 2-decimal validation | Medium | Medium | Round all `Amount`, `UnitPrice`, and `Qty` values to 2 decimal places before sending. Validate `Amount === Qty * UnitPrice` after rounding. |
| R7 | **DocNumber conflict with QBO auto-numbering** -- QBO may reject duplicate invoice numbers | Low | Medium | Disable QBO auto-numbering in company settings, or use QBO-generated numbers instead of `VEL-YYYY-NNN`. |
| R8 | **`EmailStatus: NeedToSend` without email** -- Setting this without `BillEmail.Address` causes API error | Low | Low | Only set `EmailStatus: 'NeedToSend'` when `customer.email` is populated. Already handled in `invoiceMapper.js`. |
| R9 | **Token encryption key rotation** -- Changing `QBO_TOKEN_ENCRYPTION_KEY` makes stored tokens unreadable | Low | High | Document key rotation procedure: decrypt with old key, re-encrypt with new key, update all rows in a transaction. |
| R10 | **`feat/fluent-category-mapping` branch changes billing data** -- Category mapping changes could affect which requests appear in invoices | Medium | Medium | Merge the Fluent category mapping branch before QBO integration testing. Verify billing summaries produce expected line items. |

---

## Open Questions

1. **Credit line strategy**: Should QBO invoices include negative credit lines (matching the internal total) or exclude them (QBO total = gross amount, credits handled outside QBO)? **Recommendation in this roadmap: include negative lines**, but Justin should confirm this matches accounting workflow expectations.

2. **`node-quickbooks` vs raw API**: Should we install `node-quickbooks` for convenience methods, or use `intuit-oauth` + `makeApiCall()` only? **Recommendation: start with `intuit-oauth` only** for tighter payload control, revisit if boilerplate becomes excessive.

3. **Auto-sync on send**: Should invoices automatically sync to QBO when marked as "Sent" (`POST /api/invoices/:id/send`), or should sync always be a manual action? The `.env` key `QBO_AUTO_SYNC` is scaffolded for this, but the default is `false`.

4. **Payment sync**: Should payment recording (`POST /api/invoices/:id/pay`) also create a QBO `Payment` entity? This is out of scope for the initial integration but should be planned. QBO partial payments work differently from the current single-payment model.

5. **SalesTermRef resolution**: The existing `QBO_TERMS_MAP` maps payment terms to *names* (`Net 30`), but QBO API requires a `SalesTermRef.value` (ID). Should we resolve Terms IDs during the Item sync phase, or omit `SalesTermRef` and let QBO use the customer default?

6. **Free project line handling**: Free-credited projects currently have `amount: 0`. Should they be included in the QBO invoice as $0 lines (for transparency) or excluded entirely? **Current recommendation: exclude** (no financial impact, reduces noise).

7. **QBO SyncToken for updates**: Should we add a `qbo_sync_token` column to the `invoices` table to support future invoice updates in QBO (not just creates)? Low cost, useful if invoice editing after sync is needed later.

8. **Fluent category mapping branch**: The `feat/fluent-category-mapping` branch is the main branch target. Should it be merged before starting QBO integration work, or can the two tracks proceed in parallel?
