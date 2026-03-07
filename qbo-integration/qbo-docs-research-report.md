# QBO Docs Research Report

Research compiled from Intuit Developer documentation, GitHub repositories, npm package docs, and community resources for implementing QuickBooks Online invoice creation from a Node.js/Express backend.

---

## OAuth 2.0 Setup Requirements

### App Credentials

Two credentials are generated when you create an app on the Intuit Developer portal:

- **Client ID** (consumer key): Identifies your application
- **Client Secret** (consumer secret): Used to authenticate your app during token exchange

### Redirect URI Configuration

- Must be registered in the Intuit Developer portal under your app's settings
- For local development: `http://localhost:<port>/callback` (HTTP is allowed for localhost)
- For production: Must be HTTPS
- The redirect URI in your authorization request must exactly match what is registered in the portal

### Sandbox vs. Production

| Aspect | Sandbox | Production |
|--------|---------|------------|
| API Base URL | `https://sandbox-quickbooks.api.intuit.com` | `https://quickbooks.api.intuit.com` |
| Company limit | Up to 10 sandbox companies | Real customer companies |
| Company lifetime | Valid for 2 years | Permanent |
| Rate limits | Same as production | 500 req/min per realm ID |
| Data | Pre-populated test data | Real financial data |

The `intuit-oauth` SDK handles environment switching via a single constructor parameter: `environment: 'sandbox'` or `environment: 'production'`.

### OAuth 2.0 Scopes

| Scope | Purpose |
|-------|---------|
| `com.intuit.quickbooks.accounting` | Full QuickBooks accounting API access (invoices, customers, items, etc.) |
| `com.intuit.quickbooks.payment` | Payment processing |
| `openid` | OpenID Connect authentication |
| `profile` | User profile information |
| `email` | User email address |

For invoice creation, the required scope is **`com.intuit.quickbooks.accounting`**.

### Token Lifetimes

| Token | Lifetime | Notes |
|-------|----------|-------|
| Access Token | **1 hour** | Must refresh before making API calls after expiry |
| Refresh Token | **Up to 5 years** | Rotated every 24 hours (new refresh token returned on each refresh call) |

**Critical**: Every refresh token API call returns a **new** refresh token. You must persist the latest refresh token each time you refresh. The old refresh token is invalidated.

### Authorization Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `https://appcenter.intuit.com/connect/oauth2` |
| Token Exchange | `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer` |

---

## Invoice API: Key Fields & Constraints

### Minimum Required Fields for Invoice Creation

```json
{
  "CustomerRef": {
    "value": "123"
  },
  "Line": [
    {
      "Amount": 150.00,
      "DetailType": "SalesItemLineDetail",
      "SalesItemLineDetail": {
        "ItemRef": {
          "value": "1",
          "name": "Services"
        }
      }
    }
  ]
}
```

**Absolute minimum**: A `CustomerRef` with a valid customer ID, and at least one `Line` item.

### Line Item Structure (SalesItemLineDetail)

Each line in the `Line` array requires:

| Field | Required | Description |
|-------|----------|-------------|
| `Amount` | Yes | Total amount for this line (Qty * UnitPrice) |
| `DetailType` | Yes | Must be exactly `"SalesItemLineDetail"` |
| `SalesItemLineDetail.ItemRef` | Yes | Reference to a QBO Item (`value` = Item ID, `name` = Item name) |
| `SalesItemLineDetail.Qty` | No | Quantity (defaults to 1) |
| `SalesItemLineDetail.UnitPrice` | No | Price per unit |
| `Description` | No | Text description for the line item |
| `SalesItemLineDetail.TaxCodeRef` | No | Tax code reference (`"TAX"` or `"NON"`) |

**Amount calculation**: `Amount = Qty * UnitPrice`. QBO validates this relationship.

### All Line DetailType Options

| DetailType | Purpose |
|------------|---------|
| `SalesItemLineDetail` | Standard product/service line items |
| `DiscountLineDetail` | Discount applied to preceding lines |
| `SubTotalLineDetail` | Subtotal line (auto-calculated) |
| `GroupLineDetail` | Group of bundled items |
| `DescriptionOnly` | Text-only line (no amount) |

### Negative Amounts and Discounts

**Key constraint: QBO will NOT save an invoice with a negative total.**

Options for handling credits/reductions on invoices:

1. **Negative line items**: You CAN add a line with a negative `Amount` in `SalesItemLineDetail` (e.g., negative `UnitPrice` with positive `Qty`). The invoice total must still be >= 0.

2. **DiscountLineDetail**: A dedicated discount line type applied to preceding lines:
   ```json
   {
     "Amount": 50.00,
     "DetailType": "DiscountLineDetail",
     "DiscountLineDetail": {
       "PercentBased": true,
       "DiscountPercent": 10,
       "DiscountAccountRef": {
         "value": "86"
       }
     }
   }
   ```
   - Supports both percentage-based and fixed-amount discounts
   - Requires a `DiscountAccountRef` pointing to a discount income/expense account
   - Applied at the transaction level, not per-line

3. **Credit Memos**: For credits that exceed line item totals, use the CreditMemo entity instead. A CreditMemo can be applied to an invoice via a $0 ReceivePayment transaction.

**For our use case** (free hours credits on invoices): Use negative `SalesItemLineDetail` line items with a negative `UnitPrice`, ensuring the invoice total remains >= 0. This is the simplest approach and avoids needing a separate discount account.

### Additional Invoice Fields

| Field | Purpose |
|-------|---------|
| `TxnDate` | Invoice date (YYYY-MM-DD) |
| `DueDate` | Payment due date (YYYY-MM-DD) |
| `DocNumber` | Custom invoice number |
| `BillEmail.Address` | Customer email for sending |
| `EmailStatus` | `"NeedToSend"` or `"NotSet"` |
| `TxnTaxDetail` | Tax configuration for the invoice |
| `PrivateNote` | Internal note (not visible to customer) |
| `CustomerMemo` | Note visible to customer |

### Invoice Updates

Updates use the **same endpoint** as create. The distinction is in the request body -- updates **must** include:
- `Id`: The invoice ID
- `SyncToken`: Optimistic locking token (retrieved from the existing invoice)

### API Endpoint

```
POST /v3/company/{realmId}/invoice
Content-Type: application/json
```

Query parameter: `?minorversion=75` (or current latest; default is 8 if not specified).

---

## Customer & Item Reference Resolution

### Querying Customers

**Via raw API (using intuit-oauth `makeApiCall`)**:
```
GET /v3/company/{realmId}/query?query=SELECT * FROM Customer WHERE DisplayName = 'Acme Corp'
```

**Via node-quickbooks**:
```javascript
// Find by name
qbo.findCustomers({ DisplayName: 'Acme Corp' }, (err, customers) => {
  const customerId = customers.QueryResponse.Customer[0].Id;
});

// Find all customers
qbo.findCustomers({ fetchAll: true }, (err, customers) => { ... });

// Advanced filtering
qbo.findCustomers([
  { field: 'DisplayName', value: '%Corp%', operator: 'LIKE' }
], callback);
```

**CustomerRef format** for invoice payloads:
```json
{
  "CustomerRef": {
    "value": "123",
    "name": "Acme Corp"
  }
}
```
Only `value` (the customer ID) is required. `name` is optional but helpful for readability.

### Querying Items (Products/Services)

**Via raw API**:
```
GET /v3/company/{realmId}/query?query=SELECT * FROM Item WHERE Name = 'Support Hours'
```

**Via node-quickbooks**:
```javascript
// Find by name
qbo.findItems({ Name: 'Support Hours' }, (err, items) => {
  const itemId = items.QueryResponse.Item[0].Id;
});

// Advanced filtering
qbo.findItems([
  { field: 'Name', value: 'Support%', operator: 'LIKE' }
], callback);
```

**ItemRef format** for invoice line items:
```json
{
  "ItemRef": {
    "value": "1",
    "name": "Support Hours"
  }
}
```
Again, only `value` is strictly required.

### Query Language Notes

- QBO uses a SQL-like query language
- String values must be single-quoted: `WHERE Name = 'Value'`
- Supports operators: `=`, `>`, `<`, `>=`, `<=`, `LIKE`, `IN`
- Default max results: 1000 per query
- Use `STARTPOSITION` and `MAXRESULTS` for pagination
- The `fetchAll` option in node-quickbooks handles pagination automatically

---

## Node.js SDK Capabilities

There are **two** npm packages to consider:

### 1. `intuit-oauth` (Official Intuit SDK)

**Purpose**: OAuth 2.0 authentication and token management only.

**Install**: `npm install intuit-oauth`

**What it covers**:
- OAuth 2.0 Authorization Code flow (authorize URL generation, token exchange)
- Token refresh and rotation
- Token validity checking (`isAccessTokenValid()`)
- Token revocation
- Generic API call method (`makeApiCall()`) for any QBO endpoint
- Automatic retry with exponential backoff (3 retries on 408, 429, 500, 502, 503, 504)
- Structured error handling with transaction IDs for Intuit support
- Logging to `logs/oAuthClient-log.log`

**What it does NOT cover**:
- No entity-specific methods (no `createInvoice()`, `findCustomers()`, etc.)
- No query builder
- No pagination handling
- You must construct all API URLs and JSON payloads manually

**Key methods**:
```javascript
const OAuthClient = require('intuit-oauth');

const oauthClient = new OAuthClient({
  clientId: '...',
  clientSecret: '...',
  environment: 'sandbox',
  redirectUri: 'http://localhost:3011/callback'
});

// Generate auth URL
const authUrl = oauthClient.authorizeUri({
  scope: ['com.intuit.quickbooks.accounting'],
  state: 'csrf_token'
});

// Exchange code for tokens
const authResponse = await oauthClient.createToken(callbackUrl);
const token = authResponse.getToken();

// Refresh tokens
const refreshResponse = await oauthClient.refresh();

// Make API calls
const response = await oauthClient.makeApiCall({
  url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/invoice`,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: invoicePayload
});
```

### 2. `node-quickbooks` (Community SDK)

**Purpose**: Full QBO API wrapper with entity-specific methods.

**Install**: `npm install node-quickbooks`

**What it covers**:
- CRUD methods for all QBO entities (`createInvoice`, `findCustomers`, `findItems`, etc.)
- Query builder with filtering, sorting, pagination
- `fetchAll` option for automatic multi-page retrieval
- Reports (P&L, Balance Sheet, etc.)
- Delete and void operations

**What it does NOT cover**:
- OAuth 2.0 flow (you must handle auth separately with `intuit-oauth`)
- Token refresh (you must refresh tokens externally and update the instance)

**Constructor**:
```javascript
const QuickBooks = require('node-quickbooks');

const qbo = new QuickBooks(
  clientId,           // OAuth consumer key
  clientSecret,       // OAuth consumer secret
  accessToken,        // Current access token
  false,              // No token secret (OAuth 2.0)
  realmId,            // Company ID
  true,               // Use sandbox
  true,               // Debug mode
  null,               // Minor version (null = default)
  '2.0',              // OAuth version
  refreshToken        // Current refresh token
);
```

### Recommended Approach

Use **both packages together**:
- `intuit-oauth` for OAuth 2.0 flow, token storage, and refresh
- `node-quickbooks` for entity-specific API operations (creating invoices, querying customers/items)

Alternatively, use `intuit-oauth` alone with `makeApiCall()` if you want fewer dependencies and don't mind constructing payloads manually (which is our likely approach since we need precise control over invoice line items).

---

## Developer Portal Setup Checklist

### Step 1: Create an Intuit Developer Account
- Go to [developer.intuit.com](https://developer.intuit.com)
- Sign up or log in with an Intuit account

### Step 2: Create a Sandbox Company
- Navigate to Dashboard > Sandbox from the left menu
- Click "Add Sandbox"
- Choose the company type (US company recommended)
- The sandbox comes pre-populated with test data (customers, items, etc.)
- You can create up to 10 sandbox companies
- Sandbox companies are valid for 2 years

### Step 3: Create an App
- Go to Dashboard > My Apps
- Click "Create an App"
- Select "QuickBooks Online and Payments"
- Give the app a name and select scopes:
  - Check `com.intuit.quickbooks.accounting`
- This generates your **Client ID** and **Client Secret**

### Step 4: Configure Redirect URIs
- In your app settings, go to the "Keys & credentials" section
- Under "Redirect URIs", add:
  - Development: `http://localhost:3011/api/qbo/callback` (or your preferred callback route)
  - Production: `https://billing.peakonedigital.com/api/qbo/callback`
- Save changes

### Step 5: Note Your Credentials
- Copy **Client ID** and **Client Secret** for both sandbox and production
- Note your **Sandbox Company ID** (Realm ID) -- visible in sandbox settings
- Store all credentials in `.env` (never commit to version control)

### Step 6: Test the OAuth Flow
- Implement the authorization flow in your backend
- Redirect to the authorization URL with proper scopes
- Handle the callback to exchange the code for tokens
- Store the access token and refresh token securely (database recommended)
- Verify you can make a test API call (e.g., `GET /v3/company/{realmId}/companyinfo/{realmId}`)

### Step 7: Set Up Items in QBO
- In the sandbox QBO company, create the service Items that will appear on invoices:
  - "Support Hours - Regular" ($150/hr)
  - "Support Hours - Same Day" ($175/hr)
  - "Support Hours - Emergency" ($250/hr)
  - "Free Support Hours Credit" (for negative line items)
  - "Turbo Hosting" ($99/month)
- Note the Item IDs for use in invoice line item `ItemRef` values

---

## Gotchas & Warnings

### Invoice Total Cannot Be Negative
QBO will reject any invoice where the total (sum of all line items) is less than zero. If free hour credits exceed billable amounts, you must either cap the credit or use a separate Credit Memo entity.

### SyncToken Required for Updates
Every update to an existing entity (invoice, customer, item) requires the current `SyncToken`. If another process updated the entity since you last read it, your update will fail with a concurrency error. Always read the latest entity before updating.

### Refresh Token Rotation
Each call to the refresh endpoint returns a **new** refresh token. You must persist this new token immediately. Using the old refresh token after rotation will result in an `invalid_grant` error, requiring the user to re-authorize.

### Rate Limits
- **500 requests per minute** per realm ID (company)
- **10 simultaneous requests** per company per app
- **40 batch operations per minute**
- Exceeding limits returns HTTP 429 "Too Many Requests"
- Sandbox and production share the same limits

### Minor Version Behavior
- If no `minorversion` query parameter is specified, QBO defaults to version 8
- Newer minor versions may change field behavior or add required fields
- Pin to a specific minor version for predictability (e.g., `?minorversion=75`)
- Test thoroughly when upgrading minor versions

### Sandbox-Specific Behaviors
- Email sending is restricted in sandbox (invoices won't actually be emailed)
- Sandbox companies expire after 2 years
- Pre-populated test data may differ between sandbox companies
- Sandbox data can be reset, but this cannot be undone

### Amount Precision
- QBO uses up to 2 decimal places for amounts
- The `Amount` field on a line must equal `Qty * UnitPrice` (QBO validates this)
- Rounding errors can cause validation failures

### Query Language Quirks
- String comparisons are case-insensitive
- `LIKE` operator uses `%` as wildcard (e.g., `WHERE Name LIKE '%Support%'`)
- `IN` operator requires parentheses: `WHERE Id IN ('1', '2', '3')`
- Maximum 1000 results per query; use `STARTPOSITION` for pagination

### EmailStatus Trap
- Setting `EmailStatus: "NeedToSend"` requires `BillEmail.Address` to be populated
- If the customer has no email on file and you don't provide one, the API will return an error

### Intuit App Partner Program (2025+)
- Intuit distinguishes between "Core" API calls (create/update -- unlimited) and "CorePlus" API calls (reads/queries -- metered and potentially charged)
- This may affect high-volume query patterns; cache customer and item IDs locally

### Token Storage Security
- Never store tokens in plaintext files or environment variables in production
- Use encrypted database storage or a secrets manager
- Access tokens in server memory are acceptable for the 1-hour lifetime
- Refresh tokens must be persisted securely across server restarts

---

## Sources

- [Intuit OAuth JS Client (GitHub)](https://github.com/intuit/oauth-jsclient)
- [intuit-oauth (npm)](https://www.npmjs.com/package/intuit-oauth)
- [node-quickbooks (npm)](https://www.npmjs.com/package/node-quickbooks)
- [node-quickbooks (GitHub)](https://github.com/mcohen01/node-quickbooks)
- [QuickBooks Invoice API Integration Guide (Apideck)](https://www.apideck.com/blog/quickbooks-invoice-api-integration)
- [Using the QuickBooks API to Create Invoices with JavaScript (Endgrate)](https://endgrate.com/blog/using-the-quickbooks-api-to-create-or-update-invoices-(with-javascript-examples))
- [QuickBooks API Rate Limits (Coefficient)](https://coefficient.io/quickbooks-api/quickbooks-api-rate-limits)
- [QuickBooks API Setup Guide (Coefficient)](https://coefficient.io/quickbooks-api/setup-quickbooks-api-integration)
- [Refresh Token Policy Changes (Intuit Blog)](https://blogs.intuit.com/2025/11/12/important-changes-to-refresh-token-policy)
- [Negative Line Items in QBO (QuickBooks Community)](https://quickbooks.intuit.com/learn-support/en-us/reports-and-accounting/is-it-fine-to-add-a-negative-line-item-to-a-new-invoice-for-a/00/727091)
- [Intuit Developer Portal](https://developer.intuit.com)
