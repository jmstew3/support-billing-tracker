# Support Billing Tracker

## Overview

This is a comprehensive business intelligence dashboard that processes iMessage conversation data to extract, categorize, and analyze support requests. The application transforms raw chat messages into structured business insights through an ETL pipeline and provides an interactive React dashboard for data visualization and management.

## Security

### Authentication (Phase 1 - Active)

**Current Implementation:** Traefik BasicAuth Middleware

The application is protected by HTTP Basic Authentication at the reverse proxy level using Traefik middleware. This provides immediate security without requiring code changes to the application itself.

#### How It Works
1. All requests to `velocity.peakonedigital.com/billing-overview` and `/billing-overview-api` are intercepted by Traefik
2. Browser presents authentication dialog requesting username and password
3. Credentials are sent as Base64-encoded `Authorization` header
4. Traefik validates credentials against bcrypt hash stored in environment variable
5. If valid, request is forwarded to application; if invalid, 401 Unauthorized returned

#### Access Credentials
- **Username:** `admin`
- **Password:** `***REMOVED***`
- **Storage:** `.env.docker` file (not committed to Git)
- **Hash Algorithm:** Apache APR1 (MD5-based bcrypt variant)

#### Changing Credentials

To update the username and password for production access:

**Step 1: Generate New Credentials Hash**
```bash
docker run --rm httpd:2.4-alpine htpasswd -nb newusername newpassword
```

This will output:
```
newusername:$apr1$xyz123$hashedpasswordhere
```

**Step 2: Update Environment File**

Edit `.env.docker` and update the `BASIC_AUTH_USERS` variable:
```bash
# IMPORTANT: Escape $ as $$ for docker-compose
BASIC_AUTH_USERS=newusername:$$apr1$$xyz123$$hashedpasswordhere
```

**Step 3: Restart Docker Services**
```bash
docker-compose --env-file .env.docker up -d
```

**Step 4: Verify the Change**
1. Access `https://velocity.peakonedigital.com/billing-overview`
2. Browser should prompt for new credentials
3. Enter the new username and password
4. Dashboard should load successfully

**Notes:**
- The `$` character must be escaped as `$$` in `.env.docker` for docker-compose to parse correctly
- Changes take effect immediately after container restart (no rebuild needed)
- Old sessions may persist in browser until cache is cleared or browser is restarted
- Test the new credentials in an incognito/private browser window first

#### Logging Out

A "Log Out" button is available in the sidebar footer (below the Theme toggle):

**How it works:**
1. Click the red "Log Out" button in the sidebar
2. Frontend sends XMLHttpRequest to `/api/auth/logout` endpoint
3. Backend responds with `401 Unauthorized` and `WWW-Authenticate` header
4. Browser receives 401 and clears cached BasicAuth credentials
5. Page redirects, triggering fresh authentication prompt

**Technical Implementation:**
- **Backend:** `routes/auth.js` provides `/api/auth/logout` endpoint that always returns 401
- **Traefik:** Logout endpoint is **not protected** by BasicAuth (higher priority route without auth middleware)
- **Frontend:** Uses `fetch()` with invalid credentials to trigger 401 response
- **Browser:** Modern browsers (Chrome, Firefox, Safari) clear credential cache on 401

**Testing:**
- On **production** (velocity.peakonedigital.com): Click logout → Browser prompts for credentials
- On **localhost**: Shows informative alert (BasicAuth not active in development)

**Collapsed Sidebar:**
- When sidebar is collapsed, logout shows as icon-only with tooltip

**Note:** This is still not a true logout with session termination - BasicAuth is stateless. For proper session management, see Phase 2 (JWT authentication) in `docs/authentication-plan.md`.

#### Security Considerations
- ✅ **Adequate for:** Internal team access (5-10 users), trusted networks
- ⚠️ **Limitations:** Single shared credential, no per-user tracking, no session management
- 🔒 **Requires HTTPS:** Must use TLS in production (credentials transmitted in headers)
- 📝 **Audit Trail:** Limited - Traefik access logs only show successful/failed auth attempts
- 🚪 **Logout:** Basic re-authentication mechanism (not true session termination)

#### Future Enhancements (Phase 2)
See `docs/authentication-plan.md` for detailed roadmap:
- JWT-based authentication with per-user accounts
- Role-based access control (admin, viewer, editor)
- True logout with session termination
- User management dashboard
- Audit logging and session tracking

### Data Protection

**Sensitive Data:**
- Client billing information and revenue calculations
- Support ticket details and request summaries
- Website URLs and hosting property data
- API credentials for Twenty CRM and FluentSupport

**Storage Security:**
- MySQL database with credentials stored in `.env.docker`
- API tokens stored as environment variables (not in code)
- All containers on isolated Docker network (`velocity-network`)
- Production access only via Traefik reverse proxy with authentication

**Best Practices:**
- Never commit `.env.docker` or `.env` files to Git
- Rotate API tokens periodically
- Use strong passwords for MySQL and BasicAuth
- Keep Docker images and dependencies updated

## Architecture & Components

### 1. Data Processing Pipeline (ETL)

#### Raw Data Input
- **Source**: iMessage conversation exports from macOS Messages app
- **Format**: CSV files containing message data
- **Required CSV columns**:
  - `sender`: Message sender name
  - `message_text`: Raw message content
  - `message_date`: Message timestamp
  - Additional metadata columns as available

#### Stage 1: Data Preprocessing (`src/data_preprocessor.py`)
**Purpose**: Clean raw message text and remove iMessage artifacts

**Key Features**:
- Removes NSAttributedString artifacts (e.g., "streamtyped @ NSMutableAttributedString...")
- Removes iMessage reaction messages ("Emphasized", "Liked", "Disliked")
- Cleans malformed text prefixes (e.g., "AGood morning" → "Good morning")
- Handles Unicode artifacts and control characters
- Supports both old CSV format and new export_imessages.py format
- Automatically maps column names for compatibility

**How to Run**:
```bash
cd /Users/justinstewart/support-billing-tracker/src
python3 data_preprocessor.py
```

**Configuration**:
- Input: `/Users/justinstewart/support-billing-tracker/data/01_raw/messages_export.csv`
- Output: `/Users/justinstewart/support-billing-tracker/data/02_processed/messages_cleaned.csv`

**Column Mapping**:
- `message` → `message_text`
- `sent_at` → `message_date`
- Preserves `phone` and `sender` columns

#### Stage 2: Request Extraction (`src/request-extractor/`)
**Purpose**: Extract business requests from cleaned messages using pattern matching and NLP

**Key Components**:
- `main.py`: Entry point and summary reporting (uses absolute path to cleaned data)
- `request_extractor.py`: Core extraction logic (supports both sender names)
- `request_patterns.py`: Pattern definitions and categorization rules

**Request Classification**:
- **Categories**: Support, Hosting, Forms, Billing, Email, Migration, Scripts
- **Urgency Levels**: High, Medium, Low (based on keyword analysis)
- **Effort Estimation**: Small (0.25h), Medium (0.5h), Large (1.0h)
- **Request Types**: General Request, Site Migration, Backup Request, Form Removal, License Update, Email Routing, Form Integration

**How to Run**:
```bash
cd /Users/justinstewart/support-billing-tracker/src/request-extractor
python3 main.py
```

**Outputs**:
- `output/requests_by_month.csv`: Main structured dataset (without status column)
- `output/requests_detailed.xlsx`: Excel format with additional analytics
- `output/requests_summary.json`: Summary statistics

**Note**: The extractor handles various sender formats from iMessage exports

### 2. FluentSupport Sync Operations

#### Overview
The FluentSupport sync system integrates support tickets from FluentSupport (WordPress plugin) into the application database. This allows unified management of both iMessage SMS requests and FluentSupport tickets in a single dashboard.

#### Architecture

**API Integration**:
- **WordPress REST API**: `https://support.peakonedigital.com/wp-json/fluent-support/v2/tickets`
- **Authentication**: WordPress Application Password (HTTP Basic Auth)
- **Backend Service**: `backend/services/fluentSupportApi.js`
- **Sync Route**: `backend/routes/fluent-sync.js`

**UI Components** ✅ **Implemented**:
- **FluentSyncButton**: Trigger button with optional date filter in Support page header
  - Location: `frontend/src/components/Support/FluentSyncButton.tsx`
  - Features: Loading state, date picker, success/error notifications
  - Automatically reloads request data after successful sync
- **FluentSyncStatus**: Status widget displaying last sync information
  - Location: `frontend/src/components/Support/FluentSyncStatus.tsx`
  - Displays: Last sync time, total tickets, sync statistics, status indicator
  - Auto-refreshes after sync completion
- **Integration**: Both components are integrated into `SupportTickets.tsx`
  - Sync button: Header (desktop/tablet only, hidden on mobile)
  - Sync status: Main content area (after scorecards)

**Database Schema**:
```sql
-- Main requests table (stores all support requests)
CREATE TABLE requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  category VARCHAR(50),
  description TEXT,
  urgency ENUM('LOW', 'MEDIUM', 'HIGH'),
  source ENUM('sms', 'fluent', 'ticket', 'email', 'phone'),
  -- ... other fields
);

-- FluentSupport ticket metadata
CREATE TABLE fluent_tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fluent_id INT UNIQUE NOT NULL,  -- Unique ticket ID from FluentSupport
  request_id INT,                 -- Links to requests table
  ticket_number VARCHAR(50),
  customer_email VARCHAR(255),
  product_name VARCHAR(255),
  ticket_status VARCHAR(50),
  -- ... metadata fields
  FOREIGN KEY (request_id) REFERENCES requests(id)
);

-- Sync operation tracking
CREATE TABLE fluent_sync_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  last_sync_at TIMESTAMP,
  last_sync_status ENUM('in_progress', 'success', 'failed'),
  tickets_fetched INT,
  tickets_added INT,
  tickets_updated INT,
  date_filter DATE
);
```

#### Sync Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     FluentSupport Sync Flow                      │
└─────────────────────────────────────────────────────────────────┘

1. Configuration
   ├── VITE_FLUENT_DATE_FILTER in .env.docker
   ├── Determines which tickets to fetch (created_at >= date)
   └── Backend restart required to apply changes

2. Authentication
   ├── User logs in via /api/auth/login
   ├── Receives JWT access token (1 hour expiry)
   └── Token sent in Authorization header

3. Sync Trigger
   ├── POST /api/fluent/sync
   ├── Requires valid JWT token
   ├── Optional dateFilter in request body
   └── Fetches tickets from FluentSupport API

4. Data Processing
   ├── For each ticket:
   │   ├── Check if fluent_id exists in fluent_tickets table
   │   ├── Transform FluentSupport format → Request format
   │   └── INSERT new or UPDATE existing record
   └── Transaction-based (all or nothing)

5. Deduplication Logic
   ├── UNIQUE constraint on fluent_tickets.fluent_id
   ├── Existing ticket → UPDATE request + fluent_tickets
   ├── New ticket → INSERT request + fluent_tickets
   └── No duplicates possible

6. Response
   ├── {ticketsFetched, ticketsAdded, ticketsUpdated, ticketsSkipped}
   ├── Sync status recorded in fluent_sync_status
   └── Viewable via GET /api/fluent/status
```

#### Data Transformation

**FluentSupport Ticket → Request Mapping**:

| FluentSupport Field | Request Field | Transformation |
|---------------------|---------------|----------------|
| `created_at` | `date`, `time` | Split timestamp into date (YYYY-MM-DD) and time (HH:MM:SS) |
| `title` + `customer_message` | `description` | Concatenate subject and message body |
| `priority` | `urgency` | Maps: `critical`→HIGH, `high`→HIGH, `medium`→MEDIUM, `normal`→LOW |
| `product_name` | `website_url` | Direct copy if available |
| `status` | Metadata only | Stored in `fluent_tickets.ticket_status`, not in `requests.status` |
| `id` | `fluent_id` | Unique identifier stored in `fluent_tickets` table |
| - | `source` | Hard-coded as `'fluent'` |
| - | `request_type` | Default: `'General Request'` |
| - | `effort` | Default: `'Medium'` |
| - | `status` | Default: `'active'` |

**Priority Mapping Logic** (`fluentSupportApi.js`):
```javascript
function mapPriority(priority) {
  const normalizedPriority = priority?.toString().trim().toLowerCase();

  // FluentSupport → Our Urgency
  if (normalizedPriority === 'critical' || normalizedPriority === 'high' || normalizedPriority === 'urgent') {
    return 'HIGH';
  }
  if (normalizedPriority === 'medium' || normalizedPriority === 'normal') {
    return 'MEDIUM';
  }
  if (normalizedPriority === 'low') {
    return 'LOW';
  }

  return 'MEDIUM'; // Default fallback
}
```

**Priority Mapping Table**:

| FluentSupport Priority | Our Urgency Level | Notes |
|------------------------|-------------------|-------|
| `critical` | `HIGH` | Highest priority tickets |
| `high` | `HIGH` | High priority tickets |
| `urgent` | `HIGH` | Urgent tickets |
| `medium` | `MEDIUM` | Standard priority |
| `normal` | `MEDIUM` | Normal priority |
| `low` | `LOW` | Low priority tickets |
| *(any other value)* | `MEDIUM` | Unknown priority defaults to MEDIUM |
| *(null/empty)* | `MEDIUM` | Missing priority defaults to MEDIUM |

#### Product → Category Mapping

**FluentSupport Product Mapping Logic** (`fluentSupportApi.js`):

The `product.title` field from FluentSupport tickets is mapped to our internal `Category` field with the following rules:

**Mapping Table**:

| FluentSupport Product | Our Category | Example Use Case |
|----------------------|--------------|------------------|
| `Support` | `Support` | General support requests |
| `Hosting` | `Hosting` | Server, DNS, SSL, email hosting |
| `Migration` | `Migration` | Website transfers, domain migrations |
| `Website` | `Website` | Website updates, content changes |
| `Project` | `General` | Project-related requests |
| `General` | `General` | Miscellaneous requests |
| `Email` | `Email` | Email configuration, troubleshooting |
| `Forms` | `Forms` | Contact forms, Gravity Forms |
| `Scripts` | `Scripts` | Custom scripts, automation |
| `Advisory` | `Advisory` | Consultations, recommendations |
| *(unknown product)* | `Support` | Any unmapped product defaults to Support |
| *(null/empty)* | `Support` | Missing product defaults to Support |

**Case Normalization**:
- Product names are **case-insensitive**: `"support"`, `"Support"`, `"SUPPORT"` all map correctly
- Leading/trailing whitespace is automatically trimmed
- First character capitalized, rest lowercase: `"hosting"` → `"Hosting"`

**Validation**:
- All mapped categories are validated against the frontend `CATEGORY_OPTIONS` list
- Invalid categories are logged as warnings and fallback to `Support`
- Valid categories: `Advisory`, `Email`, `Forms`, `General`, `Hosting`, `Migration`, `Non-billable`, `Scripts`, `Support`, `Website`

**Logging**:
- ✅ Successful mappings: `[FluentSupport] Mapping product "Hosting" → category "Hosting"`
- ⚠️ Unknown products: `[FluentSupport] Unknown product "Custom Product" - defaulting to Support`
- ⚠️ Invalid categories: `[FluentSupport] Invalid category "InvalidCat" - defaulting to Support`
- ℹ️ Missing products: `[FluentSupport] No product title provided, defaulting to Support`

**Code Reference**:
```javascript
// Example: "hosting" → "Hosting" category
const normalizedTitle = productTitle.trim();
const capitalizedTitle = normalizedTitle.charAt(0).toUpperCase() + normalizedTitle.slice(1).toLowerCase();

const mapping = {
  'Support': 'Support',
  'Hosting': 'Hosting',
  'Migration': 'Migration',
  'Website': 'Website',
  'Project': 'General',    // Special mapping
  'General': 'General',
  'Email': 'Email',
  'Forms': 'Forms',
  'Scripts': 'Scripts',
  'Advisory': 'Advisory'
};

const mappedCategory = mapping[capitalizedTitle] || 'Support';
return validateCategory(mappedCategory);
```

#### Sync API Endpoints

##### POST `/api/fluent/sync`
**Purpose**: Trigger synchronization of FluentSupport tickets

**Authentication**: Context-aware via `conditionalAuth` middleware
- **Production** (velocity.peakonedigital.com): Protected by Traefik BasicAuth - no JWT needed
- **Development** (localhost): Requires JWT Bearer token from `/api/auth/login`
- Middleware automatically detects environment and applies appropriate authentication

**Request Body**:
```json
{
  "dateFilter": "2025-10-17"  // Optional, overrides env var
}
```

**Response (Success)**:
```json
{
  "success": true,
  "ticketsFetched": 7,
  "ticketsAdded": 5,
  "ticketsUpdated": 2,
  "ticketsSkipped": 0,
  "syncDuration": 1489,
  "dateFilter": "2025-10-17"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "FluentSupport API connection failed"
}
```

##### GET `/api/fluent/status`
**Purpose**: Retrieve last sync operation status and statistics

**Authentication**: None required (public endpoint)

**Response**:
```json
{
  "syncStatus": {
    "id": 15,
    "last_sync_at": "2025-10-17T13:25:50.000Z",
    "last_sync_status": "success",
    "tickets_fetched": 7,
    "tickets_added": 7,
    "tickets_updated": 0,
    "tickets_skipped": 0,
    "sync_duration_ms": 1489,
    "date_filter": "2025-10-11T00:00:00.000Z"
  },
  "totalTickets": 29,
  "statusBreakdown": [
    {"ticket_status": "active", "count": 4},
    {"ticket_status": "closed", "count": 19},
    {"ticket_status": "new", "count": 6}
  ]
}
```

##### GET `/api/fluent/tickets`
**Purpose**: Retrieve FluentSupport tickets with request details

**Authentication**: None required

**Query Parameters**:
- `limit`: Number of records (default: 100)
- `offset`: Pagination offset (default: 0)

**Response**:
```json
[
  {
    "id": 1,
    "fluent_id": 12345,
    "ticket_number": "TKT-001",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "priority": "high",
    "ticket_status": "active",
    "product_name": "Example Website",
    "date": "2025-10-16",
    "time": "19:26:50",
    "category": "Support",
    "urgency": "HIGH",
    "status": "active"
  }
]
```

#### Step-by-Step Sync Procedure

**Option 1: Using the UI (Recommended)**

1. Navigate to the Support page in the dashboard
2. Click the "Sync FluentSupport" button in the header
3. (Optional) Click the calendar icon to set a custom date filter
4. Click "Sync FluentSupport" to trigger the sync
5. View sync results in the notification and status widget

**Option 2: Using the Automation Script**

```bash
# Sync from 7 days ago (default)
./scripts/sync-fluent-tickets.sh

# Sync from specific date
./scripts/sync-fluent-tickets.sh 2025-10-17
```

**Option 3: Manual CLI Sync (Localhost)**

**1. Update Configuration**
```bash
# Edit .env.docker
VITE_FLUENT_DATE_FILTER=2025-10-17
```

**2. Restart Backend**
```bash
docker-compose restart backend
sleep 5  # Allow time for backend to initialize
```

**3. Authenticate**
```bash
curl -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@peakonedigital.com","password":"***REMOVED***"}'
# Save the accessToken from response
```

**4. Trigger Sync**
```bash
curl -X POST http://localhost:3011/api/fluent/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"dateFilter":"2025-10-17"}'
```

**5. Verify Results**
```bash
# Check sync status
curl -s http://localhost:3011/api/fluent/status | python3 -m json.tool

# Check database
docker exec support-billing-tracker-mysql mysql -u ***REMOVED*** -p***REMOVED*** support_billing_tracker \
  -e "SELECT COUNT(*) FROM requests WHERE source='fluent' AND date >= '2025-10-17';"
```

**Option 4: Manual CLI Sync (Production)**

**Note**: On production (velocity.peakonedigital.com), Traefik BasicAuth is already active, so JWT authentication is **not needed**.

**1. SSH to production server**
```bash
ssh user@velocity.peakonedigital.com
cd /path/to/support-billing-tracker
```

**2. Update Configuration**
```bash
# Edit .env.docker
VITE_FLUENT_DATE_FILTER=2025-10-17
```

**3. Restart Backend**
```bash
docker-compose restart backend
sleep 5
```

**4. Trigger Sync (BasicAuth Only)**
```bash
# Traefik handles authentication - no JWT needed
curl -X POST https://velocity.peakonedigital.com/billing-overview-api/api/fluent/sync \
  -u "admin:***REMOVED***" \
  -H "Content-Type: application/json" \
  -d '{"dateFilter":"2025-10-17"}'
```

**5. Verify Results**
```bash
curl -s -u "admin:***REMOVED***" \
  https://velocity.peakonedigital.com/billing-overview-api/api/fluent/status | python3 -m json.tool
```

#### Deduplication Strategy

**How It Works**:
1. Each FluentSupport ticket has a unique `id` from the WordPress database
2. This ID is stored as `fluent_id` in the `fluent_tickets` table
3. `UNIQUE` constraint prevents duplicate `fluent_id` entries
4. Before inserting, system checks: `SELECT id FROM fluent_tickets WHERE fluent_id = ?`
5. If found → **UPDATE** existing request record
6. If not found → **INSERT** new request record

**Benefits**:
- ✅ Safe to run sync multiple times
- ✅ No duplicate tickets created
- ✅ Existing tickets updated with latest data
- ✅ Preserves manual edits (hours, custom categories)
- ✅ Transaction-based rollback on errors

**Code Example** (`fluent-sync.js`):
```javascript
// Check if ticket exists
const [existing] = await connection.query(
  'SELECT id, request_id FROM fluent_tickets WHERE fluent_id = ?',
  [requestData.fluent_id]
);

if (existing.length > 0) {
  // UPDATE existing ticket
  await connection.query(
    'UPDATE requests SET description = ?, urgency = ? WHERE id = ?',
    [requestData.description, requestData.urgency, existing[0].request_id]
  );
  ticketsUpdated++;
} else {
  // INSERT new ticket
  const [result] = await connection.query(
    'INSERT INTO requests (date, time, description, urgency, source) VALUES (?, ?, ?, ?, ?)',
    [requestData.date, requestData.time, requestData.description, requestData.urgency, 'fluent']
  );
  await connection.query(
    'INSERT INTO fluent_tickets (fluent_id, request_id, ...) VALUES (?, ?, ...)',
    [requestData.fluent_id, result.insertId, ...]
  );
  ticketsAdded++;
}
```

#### Error Handling

**Transaction-Based Sync**:
- Entire sync wrapped in MySQL transaction
- If any error occurs → `ROLLBACK` all changes
- Ensures data consistency (all or nothing)

**Common Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Missing/invalid JWT token | Re-authenticate to get fresh token |
| `403 Forbidden` | Token expired (>1 hour old) | Login again for new token |
| `500 Internal Server Error` | FluentSupport API unreachable | Check WordPress site status |
| `Database connection failed` | MySQL container not running | `docker-compose ps` to verify |
| `Sync status: failed` | Exception during processing | Check backend logs: `docker logs support-billing-tracker-backend` |

**Logging**:
```bash
# View backend logs for sync details
docker logs -f support-billing-tracker-backend | grep FluentSupport

# Example output:
# [FluentSupport Sync] Starting sync process...
# [FluentSupport Sync] Sync ID: 15, Date Filter: 2025-10-17
# [FluentSupport Sync] Fetched 7 tickets from API
# [FluentSupport Sync] Creating new ticket 12345
# [FluentSupport Sync] Completed successfully in 1489ms
```

#### Sync Frequency Recommendations

**Regular Maintenance**:
- **Weekly**: Sync from 7 days ago every Monday
- **Bi-weekly**: Sync from 14 days ago every other week
- **Monthly**: Full sync from beginning of month

**After Incidents**:
- **Data Gap**: Sync from last known good date
- **System Outage**: Sync from outage start date
- **Historical Import**: Sync from earliest desired date

**Best Practices**:
1. Always check last sync date before choosing new date filter
2. Use conservative date ranges (go back further than needed)
3. Verify sync results before updating date filter for next sync
4. Keep sync logs for audit trail
5. Test sync in development before production

#### Automation Options

**Option 1: Shell Script** ✅ **Implemented**

The automation script is located at [`scripts/sync-fluent-tickets.sh`](scripts/sync-fluent-tickets.sh).

**Features**:
- ✅ Automatic date calculation (defaults to 7 days ago)
- ✅ Environment file updates
- ✅ Backend container restart with health checks
- ✅ JWT authentication
- ✅ Sync execution with formatted output
- ✅ Database verification
- ✅ Error handling and logging
- ✅ Cross-platform support (Linux & macOS)

**Usage**:
```bash
# Sync from 7 days ago (default)
./scripts/sync-fluent-tickets.sh

# Sync from specific date
./scripts/sync-fluent-tickets.sh 2025-10-17
```

**Example Output**:
```
[INFO] Date filter: 2025-10-17
[SUCCESS] Updated VITE_FLUENT_DATE_FILTER to 2025-10-17
[SUCCESS] Backend container restarted
[SUCCESS] Backend is ready
[SUCCESS] Authenticated successfully
[INFO] Triggering FluentSupport sync for dates >= 2025-10-17...

============================================================
                    SYNC RESULTS
============================================================
{
  "success": true,
  "ticketsFetched": 7,
  "ticketsAdded": 7,
  "ticketsUpdated": 0,
  "ticketsSkipped": 0,
  "syncDuration": 1489
}

[SUCCESS] Sync completed successfully
[INFO] Fetched: 7 | Added: 7 | Updated: 0 | Skipped: 0
[SUCCESS] FluentSupport tickets in database (>= 2025-10-17): 7
```

**Option 2: Cron Job Automation**

Schedule automatic syncs using cron:

```bash
# Edit crontab
crontab -e

# Add one of these entries:

# Daily sync at 2 AM (recommended for active support)
0 2 * * * cd /path/to/support-billing-tracker && ./scripts/sync-fluent-tickets.sh >> /var/log/fluent-sync.log 2>&1

# Weekly sync every Sunday at 2 AM
0 2 * * 0 cd /path/to/support-billing-tracker && ./scripts/sync-fluent-tickets.sh >> /var/log/fluent-sync.log 2>&1

# Bi-weekly sync (1st and 15th at 2 AM)
0 2 1,15 * * cd /path/to/support-billing-tracker && ./scripts/sync-fluent-tickets.sh >> /var/log/fluent-sync.log 2>&1
```

**Log Rotation** (optional):
```bash
# Create /etc/logrotate.d/fluent-sync
/var/log/fluent-sync.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```

**Option 3: n8n Workflow** (Advanced)

For visual workflow automation:

1. **Create new workflow** in n8n
2. **Add Schedule Trigger** (e.g., every Sunday at 2 AM)
3. **Add HTTP Request node** (Auth):
   - Method: POST
   - URL: `http://localhost:3011/api/auth/login`
   - Body: `{"email":"admin@peakonedigital.com","password":"***REMOVED***"}`
   - Extract: `accessToken` from response
4. **Add HTTP Request node** (Sync):
   - Method: POST
   - URL: `http://localhost:3011/api/fluent/sync`
   - Headers: `Authorization: Bearer {{$json["accessToken"]}}`
   - Body: `{"dateFilter":"{{ $now.minus({days: 7}).toFormat('yyyy-MM-dd') }}"}`
5. **Add Email node** (Notification):
   - Subject: `FluentSupport Sync Complete`
   - Body: `Fetched: {{$json["ticketsFetched"]}}, Added: {{$json["ticketsAdded"]}}`

#### Configuration Reference

**Environment Variables** (`.env.docker`):
```bash
# FluentSupport API Configuration
VITE_FLUENT_API_URL=https://support.peakonedigital.com
VITE_FLUENT_API_USERNAME=Justin
VITE_FLUENT_API_PASSWORD=2uuy 1vjJ 0biK IE4o vmS3 SOMJ
VITE_FLUENT_DATE_FILTER=2025-10-11  # Only sync tickets after this date
```

**Authentication**:
- WordPress Application Password (not regular password)
- Generated in WordPress: Users → Profile → Application Passwords
- Format: `xxxx xxxx xxxx xxxx` (spaces optional)

**Files Involved**:
- `backend/services/fluentSupportApi.js` - API client and data transformation
- `backend/routes/fluent-sync.js` - Sync endpoint and logic
- `backend/db/schema.sql` - Database schema (fluent_tickets, fluent_sync_status)
- `.env.docker` - Configuration (line 60-68)

#### Monitoring & Maintenance

**Health Checks**:
```bash
# Check last sync time
curl -s http://localhost:3011/api/fluent/status | grep last_sync_at

# Check for failed syncs
docker exec support-billing-tracker-mysql mysql -u ***REMOVED*** -p***REMOVED*** support_billing_tracker \
  -e "SELECT * FROM fluent_sync_status WHERE last_sync_status='failed' ORDER BY id DESC LIMIT 5;"

# Check for duplicate fluent_ids (should be 0)
docker exec support-billing-tracker-mysql mysql -u ***REMOVED*** -p***REMOVED*** support_billing_tracker \
  -e "SELECT fluent_id, COUNT(*) FROM fluent_tickets GROUP BY fluent_id HAVING COUNT(*) > 1;"
```

**Data Integrity Checks**:
```bash
# Verify all fluent_tickets link to valid requests
docker exec support-billing-tracker-mysql mysql -u ***REMOVED*** -p***REMOVED*** support_billing_tracker \
  -e "SELECT COUNT(*) FROM fluent_tickets WHERE request_id NOT IN (SELECT id FROM requests);"
# Expected: 0

# Check for orphaned requests (fluent source but no fluent_tickets entry)
docker exec support-billing-tracker-mysql mysql -u ***REMOVED*** -p***REMOVED*** support_billing_tracker \
  -e "SELECT COUNT(*) FROM requests WHERE source='fluent' AND id NOT IN (SELECT request_id FROM fluent_tickets WHERE request_id IS NOT NULL);"
# Expected: 0
```

### 3. Frontend Dashboard (`frontend/`)

#### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts library
- **UI Components**: Custom shadcn/ui components

#### Design System & UI/UX Guidelines

##### Visual Design Principles
- **Monochrome Theme**: Pure grayscale base (0% saturation) with sharp edges
- **Border Radius**: 0rem (sharp, flat design) for all components
- **Shadows**: Minimal usage - only subtle header shadows (`0 1px 2px 0 rgba(0, 0, 0, 0.05)`)
- **Typography**: System font stack with clear hierarchy
- **Layout**: Consistent spacing using Tailwind's gap utilities (gap-4, gap-6, gap-8)

##### Color Scheme
- **Badge Colors**: Vibrant muted colors for category and status badges
  - **Green**: Full billing cycles, credits applied, paid status, "FREE" indicators
  - **Blue**: Standard billing types, ready to invoice status, support tickets
  - **Orange**: Prorated billing (start/end), invoiced status
  - **Purple**: Special categories (reserved for future use)
  - **Slate**: Inactive/disabled states
  - **Gray**: Not ready status, neutral states

##### Component Patterns

**Scorecards**
- Compact padding (16px / p-4)
- Clear metrics display with large numbers
- Icon in header for visual identification
- Muted foreground for labels
- Card component with minimal styling

**Tables**
- Nested collapsible sections for hierarchical data (ChevronUp/ChevronDown icons)
- Clickable column headers for sorting with arrow indicators (ArrowUp/ArrowDown)
- Hover states on interactive elements (`hover:bg-muted/30` or `hover:bg-muted/50`)
- Whole number Y-axis for count displays (`allowDecimals={false}`)
- Alternating row backgrounds for readability
- Full-width tables with responsive overflow (`overflow-auto`)

**Badges**
- Small text size (text-xs)
- Ring borders for subtle emphasis (`ring-1 ring-inset`)
- Contextual colors per badge type:
  - **"FREE" Badge**: Green with ring border (`bg-green-100 text-green-800 ring-green-200`)
  - **Billing Type Badges**: Green (Full), Blue (Prorated Start), Orange (Prorated End), Slate (Inactive)
  - **Status Badges**: Gray (Not Ready), Blue (Ready), Yellow (Invoiced), Green (Paid)
- Whitespace control (`whitespace-nowrap`) to prevent text wrapping

**Loading States**
- Unified skeleton animations with shimmer effects
- Page-specific variants (dashboard, projects, hosting, overview)
- Staggered animation delays for natural appearance
- Matching dimensions to actual components to prevent layout shift
- Pulse and shimmer keyframe animations

**Buttons & Interactive Elements**
- Consistent hover transitions (`transition-colors`)
- Icon-only buttons for compact actions
- Clear visual feedback on interaction states
- Disabled states with reduced opacity

##### Layout Standards

**Header Bar Architecture**
- **Definition**: The header bar is the sticky top section containing the page title and period/filter controls
- **Component**: `PageHeader` component in `shared/PageHeader.tsx` is the unified solution
- **Key Features**:
  - Sticky positioning (`sticky top-0 z-10`) keeps title and controls visible while scrolling
  - Left-aligned page title
  - Right-aligned controls (period selector, filters, etc.)
  - Full-width border separator
  - Mobile-responsive with hamburger menu integration
  - Configurable: Can show/hide period selector, view toggle, and custom controls

**Period Selector Modes**
- **Component**: `PeriodSelector` in `shared/PeriodSelector.tsx`
- **Two Modes**:
  1. **`'full'`**: Navigation arrows + DatePickerPopover (used in Dashboard, Support)
     - Left/right arrow buttons for quick month/year navigation
     - Clickable formatted period display opens date picker
     - Smart navigation that skips months without data
     - Tooltips show target period on hover
  2. **`'simple'`**: Dropdown select only (used in TurboHosting)
     - Compact month/year dropdown
     - "All Months" option available
     - Better for pages with simpler filtering needs

**Current Implementation Status** *(as of January 2025 - Updated)*

| Page | Header Implementation | Uses PageHeader? | Period Selector Mode |
|------|----------------------|------------------|---------------------|
| Dashboard (Billing Overview) | ✅ PageHeader | ✅ Yes | `'full'` |
| Support | ✅ PageHeader | ✅ Yes | `'full'` |
| Projects | ✅ PageHeader | ✅ Yes | ❌ None (no period filtering) |
| Turbo Hosting | ✅ PageHeader | ✅ Yes | `'simple'` |

**Status**: ✅ All pages now use the unified `PageHeader` component for consistency. Technical debt has been resolved.

**General Layout**
- **Full-Width Borders**: Edge-to-edge separator lines extending to browser edges
- **Responsive Spacing**: Consistent padding (p-4, p-6, p-8) and gaps
- **Filter Controls**: Top-right positioning with clear labels and dropdowns
- **Sidebar Navigation**: Fixed left sidebar with icon + label navigation items
- **Main Content Area**: Flex-1 with overflow-auto for independent scrolling

##### Interaction Patterns

**Sorting**
- Click column headers to toggle ascending/descending
- Arrow indicators show current sort direction and column
- Initial state: ascending on first click
- Toggle direction on subsequent clicks of same column

**Filtering**
- Dropdown selects with "All" options as default
- Multiple filter types can be combined
- Clear visual indication of active filters
- Month/date selectors for temporal filtering

**Collapsible Sections**
- Chevron icons (ChevronUp/ChevronDown) indicate expand/collapse state
- Click entire header row to toggle
- Smooth transitions for expand/collapse animations
- Nested levels for hierarchical data (e.g., month > revenue source > line items)

**Month Navigation**
- Arrow buttons for quick month traversal (ChevronLeft/ChevronRight)
- Skip months without data automatically
- Tooltips show target month on hover
- Month selector dropdown for direct access

**Search & Text Input**
- Real-time filtering as user types
- Clear button (X icon) to reset search
- Placeholder text for guidance
- Case-insensitive matching

##### Dark Mode Support
- All components support dark mode with `dark:` prefixes
- Badge colors maintain vibrant muted appearance in both themes
- Background transparency adjustments for dark mode (e.g., `dark:bg-green-900/30 dark:text-green-300`)
- Border colors adapt to theme (e.g., `dark:border-green-800`)
- Text colors use semantic tokens (`text-foreground`, `text-muted-foreground`)
- Chart colors remain consistent across themes for data continuity

##### Accessibility Considerations
- Semantic HTML structure
- Proper heading hierarchy
- Icon buttons include tooltips for screen readers
- Sufficient color contrast ratios
- Keyboard navigation support for interactive elements
- ARIA labels where appropriate

#### Key Features

##### Data Loading
- Loads CSV data from `/frontend/public/requests_table.csv`
- Automatic parsing and type conversion
- Real-time data updates when CSV is replaced

##### Time-Based Filtering
- **All View**: Shows all requests across entire date range
- **Month View**: Filters by specific year/month combination
- **Day View**: Shows hourly breakdown for selected date
- Automatic view mode switching based on filter selection

##### Interactive Charts
- **Request Bar Chart**: Daily/hourly request counts by priority level
- **Category Pie Chart**: Modern circular chart with hover effects and animated transitions
- **Category Radar Chart**: Multidimensional visualization showing request volume, urgency distribution, and effort metrics per category
- **Whole Number Y-Axis**: Ensures request counts display as integers

##### Data Management
- **Status-Based System**: Requests marked as `active`, `deleted`, or `ignored` instead of permanent removal
- **Editable Fields**: Click to edit Category and Urgency in individual table cells
- **Bulk Selection**: Checkbox column for selecting multiple requests
- **Select All/None**: Master checkbox in header to toggle all selections
- **Bulk Actions Toolbar**: When requests are selected, a toolbar appears with:
  - **Bulk Status Change**: Move multiple requests to deleted status (recoverable)
  - **Bulk Category Change**: Change category for all selected requests via dropdown
  - **Bulk Urgency Change**: Change urgency for all selected requests via dropdown
  - **Clear Selection**: Deselect all currently selected requests
- **Recovery Interface**: Restore deleted requests with one click (status change)
- **Permanent Cleanup**: Option to permanently remove deleted requests from dataset
- **Auto-Save**: Changes persist to `data/03_final/` directory with versioning

##### Advanced Features
- **Sorting**: Click column headers to sort by any field
- **Pagination**: Configurable page sizes (20, 50, 100, All)
- **Search Functionality**: Real-time text search across request summaries
- **Cost Calculation**:
  - **Tiered Pricing**: $200 (Regular), $250 (Same Day), $300 (Emergency)
  - **Flat Rate**: $125/hour for all requests
  - **Automatic Savings**: Shows amount and percentage saved with flat rate
- **Summary Cards**: Real-time KPIs and statistics with enhanced Total Cost display

#### How to Run Frontend

```bash
cd /Users/justinstewart/support-billing-tracker/frontend

# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

#### Dashboard Navigation

##### Filter Controls
Located in top-right header:
1. **Year Selector**: Choose from available years in data
2. **Month Selector**: Filter by specific month (or "All Months")
3. **Day Selector**: Available when month is selected (or "All Days")

##### View Mode Toggle
Three buttons control chart granularity:
- **All** (📊): Shows all data in daily aggregation
- **Month** (📅): Shows selected month's daily data
- **Day** (🕐): Shows hourly breakdown for selected day

##### Table Interactions
- **Search**: Type in search bar to filter requests by summary text
- **Sort**: Click any column header to sort ascending/descending
- **Select**: Use checkboxes to select individual requests or select all
- **Bulk Actions**: When requests are selected, options appear to:
  - Delete selected requests (move to deleted status)
  - Change category for all selected requests
  - Change urgency for all selected requests
- **Individual Edit**: Click Category or Urgency cells to modify single values
- **Delete**: Click trash icon to soft-delete individual requests
- **Pagination**: Use controls at bottom to navigate pages
- **Reset Filters**: Clear all active filters including search with one click

##### Status-Based Request Management
- **Active Requests**: Included in all calculations, charts, and KPIs
- **Deleted Requests**: Excluded from calculations but visible in collapsible section
- **Ignored Requests**: Marked as irrelevant, excluded from business metrics
- **Status Visibility**: Toggle show/hide for different status types
- **One-Click Recovery**: Change status from deleted/ignored back to active
- **Audit Trail**: Complete history of status changes preserved in backups

#### Application Pages

The application has 4 main pages accessible via the sidebar navigation:

##### 1. Billing Overview (Dashboard.tsx) 📊
**Purpose**: Comprehensive billing rollup combining all revenue sources (MAIN LANDING PAGE)

**File**: `frontend/src/components/Dashboard.tsx`
**Route**: `'overview'` view in App.tsx
**Sidebar**: "Billing Overview" (BarChart3 icon)

**Key Features**:
- **Unified Revenue View**: Combines tickets, projects, and hosting in single dashboard
- **Monthly Breakdown**: Nested collapsible table structure
  - Month header row with total revenue
  - Support Tickets subsection (billable hours from Support page)
  - Projects subsection (ready to invoice from Projects page)
  - Hosting subsection (monthly recurring from Turbo Hosting page)
- **Summary Scorecards**:
  - Total Revenue (combined)
  - Support Tickets Revenue (blue)
  - Project Revenue (yellow)
  - Hosting MRR (green)
- **Month Filtering**: View specific month or all months combined
- **Drill-Down Capability**: Expand/collapse each revenue source for line-item details
- **Export Ready**: Structured for QuickBooks reconciliation

**Data Sources**:
- Tickets: `fetchRequests()` from Twenty CRM + CSV (billable only)
- Projects: `fetchProjects()` from Twenty CRM (READY status only)
- Hosting: `fetchWebsiteProperties()` with proration logic

**Components Used**:
- Scorecard, LoadingState, SiteFavicon, PageHeader
- BillingBadge (CountBadge, CreditBadge, BillingTypeBadge)
- Recharts (BarChart, PieChart)
- Services: billingApi.ts
- Types: billing.ts

##### 2. Support (SupportTickets.tsx) 🎫
**Purpose**: Support ticket tracking and analysis from iMessage/Twenty CRM

**File**: `frontend/src/components/SupportTickets.tsx`
**Route**: `'home'` view in App.tsx
**Sidebar**: "Support" (Ticket icon)

**Key Features**:
- Support ticket list with real-time filtering and search
- Interactive charts (bar chart, pie chart, radar chart, calendar heatmap)
- Cost calculation based on tiered pricing (Regular/Same Day/Emergency)
- Source tracking (SMS vs Ticket System)
- Editable fields for category, urgency, and hours
- Status-based management (active/deleted/ignored)

**Data Source**: Twenty CRM support tickets + iMessage CSV exports

**Components Used**:
- Card, Scorecard, ThemeToggle, Table components
- RequestCalendarHeatmap, CategoryRadarChart, CategoryPieChart
- Pagination, EditableCell, EditableNumberCell, ConfirmDialog, DatePickerPopover
- Recharts (BarChart, ComposedChart)
- Services: api.ts (fetchRequests, updateRequest)
- Types: request.ts

##### 3. Projects (Projects.tsx) 📁
**Purpose**: Project revenue tracking for QuickBooks reconciliation

**File**: `frontend/src/components/Projects.tsx`
**Route**: `'projects'` view in App.tsx
**Sidebar**: "Projects" (FolderKanban icon)

**Key Features**:
- Displays ONLY "Ready" invoice status projects (ready to invoice)
- Monthly revenue breakdown organized by `projectCompletionDate`
- Cumulative billing chart showing revenue growth
- Filter by hosting status and project category
- Search functionality across project names
- Color-coded status badges (Gray/Blue/Yellow/Green)

**Data Source**: Twenty CRM projects API (`/rest/projects`)

**Components Used**:
- MonthlyRevenueTable, MonthlyRevenueChart, ProjectCategoryPieChart
- Scorecard, LoadingState
- Services: projectsApi.ts
- Types: project.ts

##### 4. Turbo Hosting (TurboHosting.tsx) ⚡
**Purpose**: Website hosting monthly recurring revenue (MRR) tracking

**File**: `frontend/src/components/TurboHosting.tsx`
**Route**: `'billing'` view in App.tsx
**Sidebar**: "Turbo Hosting" (Zap icon)

**Key Features**:
- Proration calculations for partial-month hosting
- Free credit system (1 free site per 20 paid sites)
- "FREE" badge for sites receiving credits
- Month-by-month breakdown (June 2025 - present)
- Nested collapsible table with site details
- Billing type badges (Green=Full, Blue=Prorated Start, Orange=Prorated End)
- Filter by billing type
- Sortable columns (all 8 columns clickable)

**Data Source**: Twenty CRM website properties API (`/rest/websiteProperties`)

**Proration Rules**:
- Start Date: `(daysInMonth - startDay + 1) / daysInMonth × $99`
- End Date: `endDay / daysInMonth × $99`
- Free Credits: `floor(activeSites / 21)`

**Free Hosting Credits Policy**:
- **Credit Formula**: 1 free site per 20 paid sites (`floor(activeSites / 20)`)
- **Exclusion**: Free hosting credits do NOT apply to May 2025
- **Effective**: June 2025 onwards
- **Implementation**: Credits are prioritized for full-month charges first, then highest prorated amounts

**Components Used**:
- Scorecard, LoadingState
- MonthlyRevenueChart, HostingTypeChart, MonthlyHostingCalculator
- Services: hostingApi.ts
- Types: websiteProperty.ts

## Billing Policies

### Free Landing Page Policy (Starting June 2025)

**Policy**: Client receives 1 free landing page project per month

**Implementation Details**:
- **Effective Date**: June 2025 (`FREE_LANDING_PAGE_START_DATE = '2025-06'`)
- **Credit Amount**: 1 landing page per month (`FREE_LANDING_PAGES_PER_MONTH = 1`)
- **Eligibility**: Only applies to projects with category `LANDING_PAGE`
- **Application Logic**: Credit is applied to the **first** landing page project completed in each month
- **Categories Excluded**: `MIGRATION` and `WEBSITE` projects do not receive this credit

**Configuration Location**: `frontend/src/config/pricing.ts`

**How It Works**:
1. When generating billing summaries (`billingApi.ts`), the system identifies all landing page projects per month
2. The first landing page in each eligible month (June 2025+) receives a free credit
3. Original amount is stored in `originalAmount` field for display purposes
4. Project `amount` is set to $0.00 and `isFreeCredit` flag is set to `true`
5. Month summary tracks `projectsLandingPageCredit` (0-1) and `projectsLandingPageSavings` (dollar amount)

**Visual Indicators**:
- **Billing Overview Page**:
  - Project shows green "FREE" badge next to name
  - Revenue column displays strikethrough original price
  - Net amount shown as $0.00 in green
  - Projects section header shows "1 free landing page credit" badge
- **Projects Page**: Shows full revenue amounts (credit applied only in Billing Overview for accounting)

**Revenue Calculation**:
- `projectsGrossRevenue`: Total before free landing page credit
- `projectsRevenue`: Net revenue after credit (`grossRevenue - landingPageSavings`)
- `projectsLandingPageCredit`: Number of credits applied (0 or 1)
- `projectsLandingPageSavings`: Dollar amount saved from free credit

**Files Modified**:
- `frontend/src/config/pricing.ts` - Policy constants
- `frontend/src/types/billing.ts` - Type definitions
- `frontend/src/services/billingApi.ts` - Credit application logic
- `frontend/src/components/Dashboard.tsx` - Visual display (Billing Overview)

### Free Multi-Form Policy (Starting June 2025)

**Policy**: Client receives 1 free multi-form project per month

**Implementation Details**:
- **Effective Date**: June 2025 (`FREE_MULTI_FORM_START_DATE = '2025-06'`)
- **Credit Amount**: 1 multi-form per month (`FREE_MULTI_FORMS_PER_MONTH = 1`)
- **Eligibility**: Only applies to projects with category `MULTI_FORM`
- **Application Logic**: Credit is applied to the **first** multi-form project completed in each month
- **Configuration Location**: `frontend/src/config/pricing.ts`

**How It Works**:
1. System identifies all multi-form projects per month in `billingApi.ts`
2. The first multi-form in each eligible month (June 2025+) receives a free credit
3. Original amount stored in `originalAmount` field; project `amount` set to $0.00
4. `isFreeCredit` flag set to `true`
5. Month summary tracks `projectsMultiFormCredit` (0-1) and `projectsMultiFormSavings`

**Visual Indicators**:
- Green "FREE" badge next to project name
- Strikethrough original price with $0.00 net amount in green
- Projects section header shows "1 free multi-form" badge
- Orange badge for category identification

### Free Basic Form Policy (Starting June 2025)

**Policy**: Client receives 5 free basic form projects per month

**Implementation Details**:
- **Effective Date**: June 2025 (`FREE_BASIC_FORM_START_DATE = '2025-06'`)
- **Credit Amount**: 5 basic forms per month (`FREE_BASIC_FORMS_PER_MONTH = 5`)
- **Eligibility**: Only applies to projects with category `BASIC_FORM`
- **Application Logic**: Credits are applied to the **first 5** basic form projects completed in each month
- **Configuration Location**: `frontend/src/config/pricing.ts`

**How It Works**:
1. System identifies all basic form projects per month in `billingApi.ts`
2. The first 5 basic forms in each eligible month (June 2025+) receive free credits
3. Original amounts stored; project `amount` values set to $0.00
4. `isFreeCredit` flag set to `true` for each credited project
5. Month summary tracks `projectsBasicFormCredit` (0-5) and `projectsBasicFormSavings`

**Visual Indicators**:
- Green "FREE" badge next to project names
- Strikethrough original prices with $0.00 net amounts in green
- Projects section header shows "X free basic form(s)" badge
- Teal badge for category identification

**Revenue Calculation (All Project Credits)**:
- `projectsGrossRevenue`: Total before all free credits
- `projectsRevenue`: Net revenue after all credits (landing page + multi-form + basic forms)
- Credits tracked separately: `projectsLandingPageCredit`, `projectsMultiFormCredit`, `projectsBasicFormCredit`
- Savings tracked separately: `projectsLandingPageSavings`, `projectsMultiFormSavings`, `projectsBasicFormSavings`

### Free Support Hours Policy (Starting June 2025)

**Policy**: Client receives 10 free support hours per month

**Effective Date**: June 2025 (`FREE_HOURS_START_DATE = '2025-06'`)
**Credit Amount**: 10 hours per month (`FREE_HOURS_PER_MONTH = 10`)

**Application Logic**: Hours are applied to billable support tickets, prioritizing lowest hourly rates first to maximize dollar savings

**Configuration Location**: `frontend/src/config/pricing.ts`

## Data Flow Architecture

```
iMessage DB → Export Script → Data Preprocessor → Request Extractor → Frontend Dashboard
   (Stage 0)     (Stage 1)        (Stage 2)          (Stage 3)           (Stage 4)
```

0. **Stage 0**: Export messages from iMessage database using `export_imessages.py`
1. **Stage 1**: Clean NSAttributedString artifacts, reactions, and normalize text
2. **Stage 2**: Extract structured requests using pattern matching
3. **Stage 3**: Generate final CSV with status column for frontend consumption
4. **Stage 4**: Interactive dashboard with status-based management

### Status-Based Data Management

**Core Concept**: Instead of deleting data, requests are marked with status fields:
- `active` - Counted in all calculations and charts
- `deleted` - Excluded from calculations but recoverable
- `ignored` - Excluded from calculations, marked as irrelevant

**CSV Format** (Enhanced):
```csv
date,time,month,request_type,category,description,urgency,effort,status
2025-07-15,09:30 AM,2025-07,General Request,Support,"Website help",MEDIUM,Medium,active
2025-07-14,03:45 PM,2025-07,General Request,Hosting,"Server issue",HIGH,Large,deleted
```

**Persistence Strategy**:
- **Single Dataset**: All requests in one array with status differentiation
- **File Integration**: Saves to `data/03_final/` with versioning
- **Recovery Path**: Complete audit trail from raw → processed → final
- **Backup Strategy**: Timestamped snapshots for point-in-time recovery

## File Structure

```
support-billing-tracker/
├── CLAUDE.md                          # This documentation file
├── data/
│   ├── 01_raw/                        # Raw iMessage exports
│   ├── 02_processed/                  # Cleaned message data
│   └── 03_final/                      # Final structured data with status
│       ├── requests_table.csv         # Main dataset (all statuses)
│       ├── deleted_requests.csv       # Backup of deleted requests
│       └── backups/                   # Timestamped snapshots
│           └── requests_backup_*.csv
├── src/
│   ├── data_preprocessor.py           # Stage 1: Message cleaning
│   └── request-extractor/             # Stage 2: Request extraction
│       ├── main.py
│       ├── request_extractor.py
│       └── request_patterns.py
└── frontend/                          # Stage 3: React dashboard
    ├── src/
    │   ├── components/
    │   │   ├── base/                  # Reusable base components
    │   │   │   └── DataTrackerCard.tsx # Base tracker with render props pattern
    │   │   ├── shared/                # Cross-page shared components
    │   │   │   ├── PageHeader.tsx     # Unified page header with title and controls
    │   │   │   ├── PeriodSelector.tsx # Period/month selector (full & simple modes)
    │   │   │   ├── ViewModeToggle.tsx # View mode toggle (All/Month/Day)
    │   │   │   ├── Sidebar.tsx        # Navigation sidebar
    │   │   │   ├── Pagination.tsx     # Table pagination
    │   │   │   ├── EditableCell.tsx   # In-line editing (text)
    │   │   │   ├── EditableNumberCell.tsx # In-line editing (numbers)
    │   │   │   ├── DatePickerPopover.tsx  # Date selection
    │   │   │   ├── ConfirmDialog.tsx  # Action confirmations
    │   │   │   ├── Scorecard.tsx      # Metric display cards
    │   │   │   └── LoadingState.tsx   # Skeleton loading animations
    │   │   ├── charts/                # Visualization components
    │   │   │   ├── RequestBarChart.tsx      # Time-series chart
    │   │   │   ├── CategoryPieChart.tsx     # Modern pie chart with animations
    │   │   │   ├── CategoryRadarChart.tsx   # Radar chart for category metrics
    │   │   │   ├── RequestCalendarHeatmap.tsx # Calendar heatmap
    │   │   │   ├── MonthlyRevenueChart.tsx  # Monthly revenue chart
    │   │   │   ├── HostingTypeChart.tsx     # Hosting billing type distribution
    │   │   │   └── ProjectCategoryPieChart.tsx # Project category distribution
    │   │   ├── support/               # Support page components
    │   │   │   ├── SupportTickets.tsx # Support ticket tracking (MAIN PAGE)
    │   │   │   ├── sections/          # Support sub-components
    │   │   │   ├── CostTrackerCard.tsx # Cost tracking by urgency levels
    │   │   │   └── CategoryTrackerCard.tsx # Category tracking
    │   │   ├── dashboard/             # Dashboard page components
    │   │   │   ├── Dashboard.tsx      # Billing Overview (MAIN LANDING PAGE)
    │   │   │   └── RevenueTrackerCard.tsx # Revenue tracking by categories
    │   │   ├── projects/              # Projects page components
    │   │   │   ├── Projects.tsx       # Project revenue tracking
    │   │   │   ├── ProjectCard.tsx    # Individual project card
    │   │   │   └── MonthlyRevenueTable.tsx # Projects monthly breakdown
    │   │   ├── hosting/               # Hosting page components
    │   │   │   ├── TurboHosting.tsx   # Turbo Hosting MRR tracking
    │   │   │   └── MonthlyHostingCalculator.tsx # Hosting breakdown table
    │   │   └── ui/                    # Primitive UI components (shadcn/ui)
    │   │       ├── button.tsx
    │   │       ├── card.tsx
    │   │       ├── table.tsx
    │   │       ├── tooltip.tsx
    │   │       └── ...
    │   ├── services/
    │   │   ├── twentyApi.ts           # Twenty CRM API integration
    │   │   ├── projectsApi.ts         # Projects API service
    │   │   ├── hostingApi.ts          # Hosting API service
    │   │   └── billingApi.ts          # Comprehensive billing aggregation
    │   ├── utils/
    │   │   ├── dataProcessing.ts      # Data transformation
    │   │   ├── csvExport.ts           # Save functionality
    │   │   ├── ticketTransform.ts     # Twenty ticket to request conversion
    │   │   └── api.ts                 # API utilities
    │   └── types/
    │       ├── request.ts             # TypeScript interfaces for requests
    │       ├── project.ts             # TypeScript interfaces for projects
    │       ├── websiteProperty.ts     # TypeScript interfaces for hosting
    │       └── billing.ts             # TypeScript interfaces for billing
    └── public/
        └── requests_table.csv          # Data source for dashboard
```

## Navigation & Routing

### Sidebar Navigation Structure

The application uses a sidebar navigation with 4 main menu items defined in `Sidebar.tsx`:

| Sidebar Label | Icon | Route ID | Component File | Purpose |
|--------------|------|----------|----------------|---------|
| **Dashboard** | BarChart3 | `'overview'` | `Dashboard.tsx` | Billing Overview (Main Landing Page) |
| **Support** | Ticket | `'home'` | `SupportTickets.tsx` | Support Ticket Tracking |
| **Projects** | FolderKanban | `'projects'` | `Projects.tsx` | Project Revenue Tracking |
| **Turbo Hosting** | Zap | `'billing'` | `TurboHosting.tsx` | Hosting MRR Tracking |

### Routing Configuration

Routes are managed in `App.tsx`:

```typescript
{currentView === 'overview' && <Dashboard />}      // Billing Overview (default)
{currentView === 'home' && <SupportTickets />}     // Support Tickets
{currentView === 'projects' && <Projects />}        // Projects
{currentView === 'billing' && <TurboHosting />}  // Turbo Hosting
```

**Default View**: `'overview'` (Billing Overview / Dashboard)

### Page-to-Component Mapping

#### 1. Billing Overview (Dashboard.tsx)
**Navigation**: Sidebar → "Dashboard" (BarChart3 icon)
**Route**: `'overview'`
**Main Component**: `dashboard/Dashboard.tsx`
**Child Components**:
- `shared/Scorecard` - Revenue metrics display
- `shared/LoadingState` - Skeleton loading animations
- `shared/PageHeader` - Page title and controls
- `dashboard/RevenueTrackerCard` - Revenue tracking by categories (NEW)
- `base/DataTrackerCard` - Base component for RevenueTrackerCard styling
- `BillingBadge` components:
  - `CountBadge` - Item count indicators
  - `CreditBadge` - Free credit indicators
  - `BillingTypeBadge` - Billing cycle type badges
- Recharts components: `BarChart`, `PieChart`

**Services Used**:
- `billingApi.ts` → `generateComprehensiveBilling()`

**Type Definitions**:
- `billing.ts` → `BillingSummary`, `MonthlyBillingSummary`

#### 2. Support (SupportTickets.tsx)
**Navigation**: Sidebar → "Support" (Ticket icon)
**Route**: `'home'`
**Main Component**: `support/SupportTickets.tsx`
**Child Components**:
- `ui/Card`, `shared/Scorecard`, `ThemeToggle` - UI containers and controls
- `ui/Table` components - Data table display
- `support/CostTrackerCard` - Cost tracking by urgency levels (REFACTORED)
- `base/DataTrackerCard` - Base component for CostTrackerCard styling
- `charts/RequestCalendarHeatmap` - Calendar view of requests
- `charts/CategoryRadarChart` - Multi-dimensional category analysis
- `charts/CategoryPieChart` - Category distribution
- `shared/Pagination` - Table pagination controls
- `shared/EditableCell`, `shared/EditableNumberCell` - Inline editing
- `shared/ConfirmDialog` - Action confirmations
- `shared/DatePickerPopover` - Date selection
- Recharts components: `BarChart`, `ComposedChart`

**Services Used**:
- `api.ts` → `fetchRequests()`, `updateRequest()`, `bulkUpdateRequests()`, `deleteRequest()`, `checkAPIHealth()`
- `dataProcessing.ts` → `processDailyRequests()`, `processCategoryData()`, `calculateCosts()`, `categorizeRequest()`

**Type Definitions**:
- `request.ts` → `ChatRequest`

#### 3. Projects (Projects.tsx)
**Navigation**: Sidebar → "Projects" (FolderKanban icon)
**Route**: `'projects'`
**Main Component**: `projects/Projects.tsx`
**Child Components**:
- `projects/MonthlyRevenueTable` - Monthly project breakdown
- `projects/ProjectCard` - Individual project card
- `charts/MonthlyRevenueChart` - Monthly revenue visualization
- `charts/ProjectCategoryPieChart` - Project category distribution
- `shared/Scorecard` - Revenue metrics
- `shared/LoadingState` - Loading animations

**Services Used**:
- `projectsApi.ts` → `fetchProjects()`, `formatCurrency()`, `convertMicrosToDollars()`

**Type Definitions**:
- `project.ts` → `Project`, `ProjectFilters`

#### 4. Turbo Hosting (TurboHosting.tsx)
**Navigation**: Sidebar → "Turbo Hosting" (Zap icon)
**Route**: `'billing'`
**Main Component**: `hosting/TurboHosting.tsx`
**Child Components**:
- `shared/Scorecard` - MRR metrics
- `shared/LoadingState` - Loading animations
- `charts/MonthlyRevenueChart` - Monthly MRR visualization
- `charts/HostingTypeChart` - Billing type distribution
- `hosting/MonthlyHostingCalculator` - Detailed monthly breakdown table

**Services Used**:
- `hostingApi.ts` → `fetchWebsiteProperties()`, `generateMonthlyBreakdown()`, `calculateCreditProgress()`

**Type Definitions**:
- `websiteProperty.ts` → `WebsiteProperty`, `MonthlyHostingSummary`

## Development History & Updates

### Recent Major Updates

#### BasicAuth Authentication Implementation (October 8, 2025) 🔒
- **Security Enhancement - Phase 1 Complete**:
  - Implemented Traefik BasicAuth middleware to protect application
  - Added HTTP Basic Authentication at reverse proxy level
  - No code changes required - purely infrastructure configuration

- **Configuration Details**:
  - Generated htpasswd hash with bcrypt algorithm (apr1)
  - Added `BASIC_AUTH_USERS` environment variable to `.env.docker`
  - Configured Traefik middleware in `docker-compose.yml` with two labels:
    - `traefik.http.middlewares.billing-auth.basicauth.users` - Stores hashed credentials
    - `traefik.http.middlewares.billing-auth.basicauth.realm` - Sets browser dialog title
  - Applied middleware to both frontend and backend routes

- **Protected Routes**:
  - Frontend: `https://velocity.peakonedigital.com/billing-overview` (with `billing-auth` middleware)
  - Backend API: `https://velocity.peakonedigital.com/billing-overview-api` (with `billing-auth,billing-overview-api-strip` middlewares)

- **Files Modified**:
  - `docker-compose.yml` - Added BasicAuth middleware labels to frontend and backend services
  - `.env.docker` - Added `BASIC_AUTH_USERS` variable with hashed credentials
  - `backend/.env.local.example` - Documented authentication configuration
  - `docs/authentication-plan.md` - Created comprehensive authentication strategy document

- **Credentials**:
  - Username: `admin`
  - Password: `***REMOVED***`
  - Hash: `$apr1$js8l0b5d$sc6lHrdNpX.DVHhyBFtbI.` (escaped as `$$` in docker-compose)

- **Testing**:
  - Verified environment variable set in containers
  - Verified Traefik labels applied correctly to both services
  - Local access (localhost:3011, localhost:5173) bypasses auth as expected
  - Production access via Traefik requires authentication

- **Next Steps (Phase 2)**:
  - JWT-based authentication with per-user accounts
  - Role-based access control (admin, viewer, editor)
  - User management interface
  - See `docs/authentication-plan.md` for detailed roadmap

- **Security Level**: Medium - Adequate for internal team use (5-10 users)

---

#### Unified Header Bar Migration (January 2025) 🎯
- **Unified PageHeader Implementation**:
  - Migrated all 4 pages (Dashboard, Support, Projects, Turbo Hosting) to use `PageHeader` component
  - Eliminated custom header implementations for consistency
  - Deleted `SupportHeader.tsx` component (67 lines removed)
  - Support page now uses `viewMode` from `PeriodContext` instead of local `timeViewMode` state

- **Support Page Refactoring**:
  - Replaced custom `SupportHeader` with `PageHeader`
  - Removed local `timeViewMode` state, now uses `viewMode` from `PeriodContext`
  - Updated `handleCalendarDateClick` and `handleBackToCalendar` to use context methods
  - Configured PageHeader: `periodSelectorType="full"`, `showViewToggle={true}`

- **Projects Page Refactoring**:
  - Replaced inline `<h1>` with `PageHeader`
  - Removed `FolderKanban` icon from header (consistent with PageHeader design)
  - Configured PageHeader: `showPeriodSelector={false}`, `showViewToggle={false}`
  - Added mobile menu integration via `onToggleMobileMenu` prop

- **Turbo Hosting Page Refactoring**:
  - Replaced custom month dropdown with `PeriodSelector` (simple mode)
  - Integrated with `PeriodContext` for state management
  - Converted month format from string ('YYYY-MM') to context format (year + month number)
  - Configured PageHeader: `periodSelectorType="simple"`, `showViewToggle={false}`
  - Removed local `selectedMonth` state and `availableMonths` logic

- **Files Modified**:
  - `frontend/src/components/Support/SupportTickets.tsx` - PageHeader integration, viewMode refactoring
  - `frontend/src/components/Projects/Projects.tsx` - PageHeader integration
  - `frontend/src/components/Hosting/TurboHosting.tsx` - PageHeader + PeriodContext integration

- **Files Deleted**:
  - `frontend/src/components/Support/sections/SupportHeader.tsx` - Replaced by PageHeader
  - `frontend/src/components/Support/sections/__tests__/SupportHeader.test.tsx` - Test file removed

- **Benefits**:
  - ✅ Single source of truth for header styling and behavior
  - ✅ Unified mobile menu integration across all pages
  - ✅ Consistent sticky header behavior
  - ✅ Reduced code duplication (67+ lines removed)
  - ✅ Eliminated technical debt
  - ✅ Better state management (PeriodContext used consistently)

#### Component Architecture Refactoring (October 2, 2025) 🏗️
- **Base Component Architecture with Render Props Pattern**:
  - Created `DataTrackerCard.tsx` as single source of truth for all tracker component styling
  - Implements render props pattern where child components provide data logic via functions
  - Exports shared `TABLE_STYLES` and `CHART_STYLES` constants for consistency
  - Ensures identical look-and-feel across all tracker components with zero style duplication

- **New Specialized Tracker Components**:
  - `CostTrackerCard.tsx` - Support ticket cost tracking by urgency levels (Promotion, Low, Medium, High)
  - `RevenueTrackerCard.tsx` - Revenue tracking by categories (Tickets, Projects, Hosting) for Dashboard
  - Both components use same base styling but handle different data structures
  - Layout: CostTrackerCard = urgency × months, RevenueTrackerCard = categories × months

- **Folder Structure Reorganization**:
  - Created `components/base/` for reusable base components
  - Created `components/shared/` for cross-page shared components (PageHeader, Sidebar, etc.)
  - Created `components/charts/` for all visualization components
  - Created page-specific folders: `support/`, `dashboard/`, `projects/`, `hosting/`
  - Improves maintainability and semantic organization

- **Files Created**:
  - `frontend/src/components/base/DataTrackerCard.tsx` - Base component with all styling
  - `frontend/src/components/support/CostTrackerCard.tsx` - Refactored from SupportTickets.tsx
  - `frontend/src/components/dashboard/RevenueTrackerCard.tsx` - New component for Dashboard

- **Files Moved**:
  - 9 shared components moved to `components/shared/`
  - 7 chart components moved to `components/charts/`
  - Page components moved to respective folders (`support/`, `dashboard/`, `projects/`, `hosting/`)

- **Files Modified**:
  - `App.tsx` - Updated all imports for new folder structure
  - `SupportTickets.tsx` - Reduced from 3,247 to 2,628 lines (619 lines removed, 19% smaller)
  - Multiple components - Fixed import paths after folder reorganization

- **Benefits**:
  - Single source of truth for styling - impossible for tracker components to diverge visually
  - Clear separation of concerns - base handles styling, specialized components handle data logic
  - Better organization - easy to locate any component by purpose/page
  - Improved maintainability - update styling once in base component, affects all children
  - Scalable architecture - easy to add new tracker variants without duplicating code

#### Component Renaming for Semantic Clarity (October 2, 2025) 📝
- **Renamed Components to Match Sidebar Labels**:
  - `BillingOverview.tsx` → `Dashboard.tsx` (Billing Overview - main landing page)
  - `Dashboard.tsx` → `SupportTickets.tsx` (Support ticket tracking)
  - `HostingBilling.tsx` → `TurboHosting.tsx` (Turbo Hosting - MRR tracking)

- **Benefits**:
  - Component names now align with user-facing sidebar labels
  - More semantic and intuitive naming convention
  - Dashboard is now the comprehensive billing overview (main page)
  - Eliminates confusion between multiple "dashboard" concepts

- **Files Modified**:
  - Component files: `Dashboard.tsx`, `SupportTickets.tsx`, `TurboHosting.tsx`
  - Imports: `App.tsx`
  - Documentation: `CLAUDE.md`, `mobile-optimization.md`, `BADGE_STYLING_GUIDE.md`
  - Comments: `PageHeader.tsx`, `PeriodSelector.tsx`

- **Navigation Mapping**:
  - `'overview'` → Dashboard.tsx (Billing Overview)
  - `'home'` → SupportTickets.tsx (Support)
  - `'projects'` → Projects.tsx (Projects)
  - `'billing'` → TurboHosting.tsx (Turbo Hosting)

#### Invoice Status Enum Update (September 30, 2025) 💼
- **Updated Invoice Status Values for Twenty CRM Projects**:
  - Changed `UNPAID` → `NOT_READY` ("Not Ready")
  - Changed `DRAFTED` → `READY` ("Ready")
  - Changed `SENT` → `INVOICED` ("Invoiced")
  - Kept `PAID` → `PAID` ("Paid") unchanged
  - Files Modified: [types/project.ts](frontend/src/types/project.ts:24), [projectsApi.ts](frontend/src/services/projectsApi.ts:50), [Projects.tsx](frontend/src/components/Projects.tsx:64), [ProjectCard.tsx](frontend/src/components/ProjectCard.tsx:39)

- **Created Migration Scripts**:
  - `update-invoice-status-enum.py`: Updates field metadata in Twenty CRM via GraphQL API
  - `migrate-invoice-status-data.py`: Migrates existing project data to new enum values
  - Both scripts use Bearer token authentication from `.env.docker`

- **Updated Frontend Components**:
  - Filter dropdown now shows all 4 status options (Not Ready, Ready, Invoiced, Paid)
  - ProjectCard displays color-coded status badges:
    - Gray: Not Ready
    - Blue: Ready (ready to invoice)
    - Yellow: Invoiced
    - Green: Paid
  - Default view shows "READY" projects (previously showed "UNPAID")

- **Semantic Changes**:
  - `unpaidRevenue` now represents "ready to invoice" revenue
  - `unpaidInvoices` count now represents "ready to invoice" projects
  - Monthly breakdown's "unpaid" field semantically means "ready for billing"

#### Hours Column Validation (September 23, 2025) ⏱️
- **Quarter-Hour Increment Enforcement**:
  - Hours column now strictly accepts only 0.25 increments (15-minute intervals)
  - Automatic rounding to nearest quarter hour for manual entries
  - Number input arrows increment/decrement by exactly 0.25
  - Examples: 0.26→0.25, 0.38→0.50, 0.63→0.75, 0.88→1.00
  - Files Modified: `frontend/src/components/EditableNumberCell.tsx`

- **Implementation Details**:
  - Removed variable step logic that depended on urgency levels
  - Added `roundToQuarterHour` function for consistent rounding
  - Applied rounding to initial display, edit values, and saved values
  - Ensures time tracking consistency across all requests

#### Interactive Cost Calculation Filtering (September 23, 2025) 📊
- **Interactive Legend Filtering**:
  - Click on any urgency level (Promotion, Low, Medium, High) to toggle visibility
  - Deselected items fade to grey but remain visible for easy re-enabling
  - Visual feedback with reduced opacity for inactive legend items
  - Reset button appears when filters are modified from default state
  - Files Modified: `SupportTickets.tsx` (previously Dashboard.tsx) (lines 100-105, 2065-2175)

- **Enhanced Chart Interactivity**:
  - Stacked bar chart maintains visual continuity with grayed out bars
  - Service tier view also supports dynamic filtering
  - Smooth transitions when toggling visibility states
  - All bars remain visible but change color to #D1D5DB when deselected

- **User Experience Improvements**:
  - No jarring layout shifts when filtering data
  - Clear visual indication of active vs inactive urgency levels
  - One-click reset to restore all urgency levels to visible
  - Consistent behavior across both table and chart views

#### Pricing Model Simplification (September 18, 2025) 💰
- **Removed Flat Rate Comparison**:
  - Eliminated all flat rate pricing logic ($125/hr)
  - Removed savings calculations and displays
  - Simplified cost scorecard to show only tiered pricing
  - Cleaned up Cost Calculation table to focus on service tiers
  - Files Modified: `types/request.ts`, `config/pricing.ts`, `utils/dataProcessing.ts`, `SupportTickets.tsx`

- **Centralized Pricing Configuration**:
  - Created single source of truth: `frontend/src/config/pricing.ts`
  - All pricing rates now managed in one location
  - Current rates: Regular $150/hr, Same Day $175/hr, Emergency $250/hr
  - Easy to update rates by modifying PRICING_CONFIG object

- **Monthly Cost Breakdown**:
  - When Period is set to "All", shows monthly cost breakdown
  - Displays Regular, Same Day, and Emergency costs per month
  - Includes total row summing all months
  - Dynamic description changes based on view mode

#### UI/UX Improvements (September 18, 2025) 🎨
- **Month Navigation Arrows**:
  - Added left/right arrow buttons for easy month navigation
  - Single-click month switching without opening date picker
  - Smart navigation that skips months without data
  - Tooltips show target month (e.g., "Go to August 2025")
  - Automatic year boundary handling
  - Files Modified: `SupportTickets.tsx`

- **Simplified Request Count Display**:
  - Replaced verbose multi-count display with clear, concise format
  - When billable filter ON: "Showing **189** billable requests *(241 non-billable hidden)*"
  - When billable filter OFF: "Showing **430** total requests *(189 billable, 241 non-billable)*"
  - Emphasizes currently displayed count with context in parentheses

- **Reduced Scorecard Padding**:
  - Tightened whitespace in all scorecards
  - Reduced padding from 24px to 16px for cleaner appearance
  - Better visual density without sacrificing readability
  - Files Modified: `Scorecard.tsx`, `scorecard.ts`

### Recent Major Updates

#### Twenty CRM Integration (January 23, 2025) 🎫
- **Feature**: Integration with Twenty CRM API to fetch and display support tickets alongside SMS requests
- **API Connection**:
  - REST API endpoint: `https://twenny.peakonedigital.com/rest/supportTickets`
  - Bearer token authentication stored in `.env.docker`
  - Fetches 60+ support tickets from live Twenty CRM instance
  - GraphQL-style nested response structure handling
- **Data Transformation**:
  - Created `ticketTransform.ts` utility to convert Twenty ticket format to dashboard format
  - Maps ticket priority (CRITICAL→HIGH, MEDIUM→MEDIUM, NORMAL→LOW)
  - Maps ticket categories to dashboard categories (BRAND_WEBSITE_TICKET→Support, LANDING_PAGE_TICKET→Forms)
  - Concatenates subject and description for request summary
  - Default time set to 8:00 AM EDT for all tickets
- **Services Created**:
  - `frontend/src/services/twentyApi.ts` - Main API service with authentication and error handling
  - Includes mock data fallback for testing without API connection
  - Automatic retry logic with exponential backoff
- **Configuration**:
  - Environment variables: `VITE_TWENTY_API_URL`, `VITE_TWENTY_API_TOKEN`, `VITE_TWENTY_USE_MOCK`
  - Docker Compose integration with `.env.docker` for secure token storage
  - Added `.mcp.json` to `.gitignore` to prevent API key exposure
- **Dashboard Integration**:
  - Tickets appear with 🎫 icon in source column
  - Seamlessly merged with SMS requests in unified view
  - Real-time fetching on dashboard load
  - Source filtering allows viewing SMS-only, tickets-only, or both
- **Files Modified**:
  - Created: `twentyApi.ts`, `ticketTransform.ts`
  - Modified: `SupportTickets.tsx`, `docker-compose.yml`, `.env.docker`, `.gitignore`
- **Benefits**: Unified view of all support requests regardless of source channel

#### Source Indicators Implementation (September 23, 2025) 📱
- **SMS vs Ticket System Identification**:
  - Added `source` field to ChatRequest interface supporting 'sms', 'ticket', 'email', 'phone'
  - New dedicated "Source" column in table with intuitive icons:
    - 💬 Text (formerly SMS): Blue message circle icon
    - 🎫 Ticket: Green ticket icon
    - 📧 Email: Purple mail icon (future)
    - 📞 Phone: Orange phone icon (future)
  - Interactive tooltips showing "Via Text", "Via Ticket System", etc.
  - Source filtering with checkbox dropdown for multiple selections
  - Total Requests scorecard now shows source breakdown (e.g., "189 Text, 52 Ticket")
  - Files Modified: `SupportTickets.tsx`, `request.ts`, `ui/tooltip.tsx`

- **Column Width Optimizations**:
  - Request Summary column: Narrowed from 300px to 200px minimum width
  - Actions column: Fixed to 80px width (w-20)
  - Date column: Added minimum width of 110px for better visibility
  - Day column: Reduced to 80px width (w-20)
  - Result: Better balanced table layout with improved Date column readability
  - Files Modified: `SupportTickets.tsx`

#### Header & Navigation Improvements (September 16, 2025) 🎨
- **Sticky Header Implementation**:
  - Created sticky navigation bar with Period and View controls
  - Title "Request Analysis Dashboard" remains visible while scrolling
  - Full-width border separator extends edge-to-edge in browser
  - Clean flat design with no box shadows
  - Files Modified: `SupportTickets.tsx` (lines 883-978)

- **CORS Configuration Fix**:
  - Fixed API connection issues for multiple localhost ports
  - Added support for ports 5173, 5174, and any localhost port
  - Enables proper database connectivity from different dev server instances
  - Files Modified: `backend/server.js` (lines 19-37)

- **UI Refinements**:
  - Removed emoji icons from View toggle buttons (All/Month/Day)
  - Conditional display of "Manual save required" message (hidden in API mode)
  - Improved layout with left-aligned title and right-aligned controls
  - Files Modified: `SupportTickets.tsx`, `api.ts`

#### UI/UX Enhancements (September 16, 2025) 🎨
- **Bulk Actions with Apply Pattern**:
  - Implemented two-stage confirmation pattern for bulk operations
  - Added staged changes with Apply/Cancel buttons
  - Automatic selection clearing after successful application
  - Prevents accidental bulk changes with explicit user confirmation
  - Files Modified: `SupportTickets.tsx` (lines 105-106, 670-733, 1266-1323)

- **Enhanced Pie Chart Labels**:
  - Added callout lines connecting slices to labels
  - Optimized label positioning with dynamic text anchoring
  - Smart label hiding for small slices (<1%) to prevent overlap
  - Improved tooltip formatting with request counts
  - Files Modified: `CategoryPieChart.tsx` (complete refactor)

- **Complete Category Support**:
  - Added all 10 categories to both radar and pie charts
  - Categories: Support, Hosting, Forms, Billing, Email, Migration, Non-billable, Advisory, Scripts, General
  - Consistent color mapping across all visualizations
  - Files Modified: `CategoryRadarChart.tsx`, `CategoryPieChart.tsx`

- **API Health Endpoint**:
  - Added `/api/health` endpoint for proper API mode detection
  - Includes database connectivity check
  - Enables automatic save without manual button in API mode
  - Files Modified: `backend/routes/requests.js` (lines 7-26)

#### Enhanced Data Visualizations (September 2025) 📊
- **Feature**: Added radar chart and modernized pie chart for better data insights
- **Components**:
  - Radar chart showing volume, urgency, and effort metrics per category
  - Modern pie chart with animated transitions and improved hover effects
  - Color-coordinated charts with consistent theming
  - Enhanced interactivity with smooth animations
- **Files Added**: `CategoryRadarChart.tsx`
- **Files Modified**: `CategoryPieChart.tsx`, `SupportTickets.tsx`
- **Benefits**: Multi-dimensional data analysis and improved visual appeal

#### Flat Rate Pricing Feature (December 2024) 💰
- **Feature**: Added flat rate pricing comparison showing value proposition
- **Components**:
  - Flat rate calculation at $125/hour for all requests
  - Automatic savings calculation (amount and percentage)
  - Enhanced Total Cost card with strikethrough tiered pricing
  - Green-highlighted savings display in cost breakdown
- **Files Modified**: `SupportTickets.tsx`, `dataProcessing.ts`, `request.ts`
- **Benefits**: Clear demonstration of value to clients through savings visualization

#### Search Functionality (December 2024) 🔍
- **Feature**: Real-time text search across request summaries
- **Components**:
  - Search bar with icon in table header
  - Clear button for quick reset
  - Case-insensitive substring matching
  - Integration with existing filters and pagination
- **Files Modified**: `SupportTickets.tsx`
- **User Experience**: Instantly filter hundreds of requests by typing keywords

#### Status-Based Deletion System (July 2025) 🎯
- **Revolutionary Change**: Replaced separate deleted arrays with single dataset using status fields
- **Status Types**: `active`, `deleted`, `ignored` - no permanent data loss
- **Benefits**: 
  - Single source of truth for all data
  - Portable - status travels with CSV exports
  - Reversible - toggle between states freely
  - Persistent across sessions and deployments
- **Files Modified**: `SupportTickets.tsx`, `csvExport.ts`, `request.ts`
- **Data Persistence**: Status column added to CSV format for complete state preservation

#### Enhanced Data Persistence (July 2025)
- **Feature**: Integration with `data/03_final/` directory structure
- **Components**:
  - Main table: `requests_table.csv` (active requests)
  - Deleted backup: `deleted_requests.csv` (recoverable data)
  - Timestamped backups: `backups/requests_backup_YYYY-MM-DDTHH-mm-ss.csv`
  - Original preservation: `original_backup.csv`
- **Workflow**: Auto-save to file system with localStorage fallback
- **Recovery**: Complete audit trail from raw data through final state

#### Bulk Actions Implementation (July 2025)
- **Feature**: Added comprehensive bulk selection and editing capabilities
- **Components**:
  - Checkbox column for individual and bulk selection
  - Bulk actions toolbar with delete, category change, and urgency change
  - Smart selection clearing on filter/pagination changes
- **Files Modified**: `SupportTickets.tsx`
- **Benefits**: Significantly improved workflow efficiency for managing multiple requests

#### Week View Removal (July 2025)
- **Issue**: Week view was overcomplicating the dashboard interface
- **Solution**: Simplified to 3-mode system (All/Month/Day)
- **Files Modified**: `SupportTickets.tsx`, removed week-related functions and UI elements
- **Result**: Cleaner, more intuitive interface

#### Y-Axis Display Fix
- **Issue**: Request counts showing as decimals (1.5, 2.5, etc.)
- **Solution**: Added `allowDecimals={false}` to Recharts YAxis component
- **File**: `RequestBarChart.tsx:47`

#### iMessage Reaction Filtering
- **Issue**: "Emphasized", "Liked", "Disliked" messages cluttering data
- **Solution**: Dual-layer filtering in both preprocessor and extractor
- **Impact**: Reduced dataset from 211 → 188 requests (23 reactions removed)
- **Files**: `data_preprocessor.py`, `request_extractor.py`

### Current Data Statistics
- **Total Requests**: 490+ (430 SMS + 60 Twenty CRM tickets)
- **SMS Requests**: 430 (extracted from 6,156 messages)
- **Twenty CRM Tickets**: 60 (fetched from live API)
- **Active Requests**: Dynamic based on user management
- **Date Range**: May 2025 - January 2025
- **Monthly Distribution** (SMS only):
  - May: 88 requests (20.5%)
  - June: 142 requests (33.0%)
  - July: 106 requests (24.7%)
  - August: 82 requests (19.1%)
  - September: 12 requests (2.8%)
- **Categories**: Support (88.4%), Hosting (8.4%), Forms (2.3%), Billing (0.7%), Email (0.2%)
- **Urgency**: Medium (90.7%), High (6.7%), Low (2.6%)
- **Source Distribution**: ~88% SMS, ~12% Tickets
- **Status Distribution**: Tracked in real-time via dashboard

## Troubleshooting & Maintenance

### Common Issues

#### Data Not Loading in Dashboard
1. Verify CSV exists at `/frontend/public/requests_table.csv`
2. Check CSV format matches expected columns
3. Ensure no malformed CSV data (quotes, commas in content)

#### Request Extraction Issues
1. Verify cleaned data exists in preprocessor output directory
2. Check pattern matching rules in `request_patterns.py`
3. Review exclusion patterns if legitimate requests are filtered

#### Build Errors
1. Run `npm install` to ensure dependencies are current
2. Check TypeScript errors with `npm run build`
3. Verify all imports and file paths are correct

#### API 404 Error When Accessing from Production Domain (January 2025)
**Issue**: Frontend shows 404 error for API requests when accessed from `velocity.peakonedigital.com`

**Cause**: The frontend's `api.ts` file was using an incorrect API path for production. When accessed from the production domain, it was trying to reach `/billing-overview-api/requests` but the backend expects `/api/requests` after Traefik strips the path prefix.

**Solution**:
1. Edit `frontend/src/utils/api.ts`
2. Change the production API URL from:
   ```javascript
   const API_BASE_URL = window.location.hostname === 'velocity.peakonedigital.com'
     ? 'https://velocity.peakonedigital.com/billing-overview-api'
     : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
   ```
   To:
   ```javascript
   const API_BASE_URL = window.location.hostname === 'velocity.peakonedigital.com'
     ? 'https://velocity.peakonedigital.com/billing-overview-api/api'
     : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
   ```
3. Restart the frontend container: `docker-compose restart frontend`

**Prevention**: Always ensure API paths align with backend routing structure and Traefik path stripping configuration

#### MySQL Data Directory - Security Warning (January 2025)
**CRITICAL**: Never commit `mysql_data/` directory to Git!

**Why This is Dangerous**:
1. **Security Risk**: Contains actual database content including potentially sensitive data
2. **Repository Bloat**: Binary files (binlog, InnoDB files) will massively increase repo size
3. **Merge Conflicts**: Binary database files cannot be merged
4. **Platform Incompatibility**: Database files are platform-specific
5. **Constant Changes**: Files like binlog change with every database operation

**Proper Database Management**:
- ✅ **DO commit**: Schema files (`backend/db/schema.sql`), migration scripts
- ❌ **NEVER commit**: `mysql_data/`, `*.ibd`, `binlog.*`, `ibdata*` files
- **Backups**: Use `mysqldump` for SQL backups, not raw database files
- **Local Development**: Use Docker volumes or bind mounts (already configured)
- **Production**: Use proper database backup solutions (automated dumps, replication)

**If you see mysql_data in git status**:
1. Ensure `.gitignore` includes `mysql_data/`
2. Run `git status` to verify it's ignored
3. Never use `git add .` without checking what's being added

#### Docker Compose Port Configuration & CORS Issues (October 2025)
**Issue**: "Failed to fetch" errors, CORS errors, or MySQL connection failures after running `docker-compose down && up --build -d`

**Root Cause**: Mismatch between `.env.docker` values and `docker-compose.yml` defaults causes port inconsistencies

**Why This Happens**:
Docker Compose loads environment variables in this order:
1. `.env` file in project root (if exists)
2. Environment variables passed via `--env-file` flag
3. Default values in `docker-compose.yml` (e.g., `${VITE_PORT:-5173}`)

**The Problem**:
- When running `docker-compose --env-file .env.docker up -d`: Uses `.env.docker` values
- When running `docker-compose up -d`: Falls back to `docker-compose.yml` defaults
- If these don't match, containers use different ports than configs expect

**Example Scenario**:
```
docker-compose.yml defaults:
  VITE_API_URL: ${VITE_API_URL:-http://localhost:3011/api}  ← Correct
  VITE_PORT: ${VITE_PORT:-5173}
  MYSQL_PORT: ${MYSQL_PORT:-3307}

.env.docker had (WRONG):
  VITE_API_URL=http://localhost:3011/api  ← This matches now (fixed)
  VITE_PORT=5174  ← Mismatched!
  MYSQL_PORT=3308  ← Mismatched!
```

**Symptoms**:
- Frontend shows "Error loading data - Failed to fetch"
- CORS errors in browser console
- Backend logs show `Can't connect to MySQL server on '172.16.0.89:3308'`
- Environment variables in containers don't match expected values
- Works after one rebuild, breaks after another

**The "Flip-Flopping" Effect**:
1. Run with `--env-file` → Uses ports 5174/3308
2. Run without `--env-file` → Uses ports 5173/3307
3. Backend `.env` still has `FRONTEND_URL=http://localhost:5174`
4. Containers on 5173, but backend expects 5174 → **CORS failure**

**Solution**:
1. **Align `.env.docker` with `docker-compose.yml` defaults**:
   ```bash
   # .env.docker should have:
   FRONTEND_PORT=5173  # Match default
   MYSQL_PORT=3307     # Match default
   VITE_PORT=5173      # Match default
   VITE_API_URL=http://localhost:3011/api  # Match backend port
   ```

2. **Update `docker-compose.yml` defaults to match actual services**:
   - Changed `VITE_API_URL` default from `http://localhost:3001/api` → `http://localhost:3011/api`
   - This ensures frontend always connects to correct backend port

3. **Update backend CORS configuration**:
   ```bash
   # backend/.env should have:
   FRONTEND_URL=http://localhost:5173  # Match frontend port
   ```

**Verification Steps**:
```bash
# 1. Check environment variables in running containers
docker exec support-billing-tracker-frontend printenv | grep VITE_API_URL
# Should show: VITE_API_URL=http://localhost:3011/api

docker exec support-billing-tracker-backend printenv | grep FRONTEND_URL
# Should show: FRONTEND_URL=http://localhost:5173

# 2. Test CORS headers
curl -I -H "Origin: http://localhost:5173" http://localhost:3011/api/requests
# Should show: Access-Control-Allow-Origin: http://localhost:5173

# 3. Test API connectivity
curl http://localhost:3011/api/health
# Should return: {"status":"ok","database":"connected"}
```

**Recovery Steps**:
If you encounter CORS errors after rebuild:
1. Verify `.env.docker` matches `docker-compose.yml` defaults
2. Restart frontend to rebuild Vite with correct environment:
   ```bash
   docker-compose restart frontend
   ```
3. Clear browser cache (Vite may serve stale API URLs)
4. Check container environment variables (see Verification Steps above)

**Best Practices**:
- ✅ Keep `.env.docker` aligned with `docker-compose.yml` defaults
- ✅ Always verify environment variables after rebuilding containers
- ✅ Use consistent port numbers across all config files
- ❌ Don't mix `docker-compose up` with and without `--env-file` flag
- ❌ Don't assume environment changes apply immediately - restart affected containers

**Files to Check**:
- `.env.docker` - Port configuration
- `docker-compose.yml` - Default values (lines 85, 90-92, 96)
- `backend/.env` - CORS configuration
- `backend/server.js` - CORS allowedOrigins (lines 21-41)

#### API Error 403 & JWT Token Invalidation (October 2025)
**Issue**: "API error: 403" or "Invalid token" errors after running `docker-compose down && docker-compose up`

**Root Cause**: JWT authentication tokens stored in browser become invalid after backend restart

**Why This Happens**:
1. **JWT Tokens Persist in Browser**: Access tokens are stored in browser localStorage/sessionStorage
2. **Backend Restarts**: `docker-compose down && up` creates new container
3. **Token Invalidation**: Stored tokens either:
   - Reference user records that don't exist in fresh database
   - Have expired during the downtime
   - Were signed with different JWT_SECRET (if environment changed)
4. **Frontend Sends Stale Token**: Browser automatically includes old token in API requests
5. **Backend Returns 403**: `authenticateToken` middleware rejects invalid/expired token

**Symptoms**:
- Frontend shows "API error: 403" or "Invalid token" message
- Browser console shows `403 Forbidden` responses
- Login worked before Docker restart, now fails
- Happens EVERY TIME after `docker-compose down && up`

**Quick Fix (Immediate)**:
```bash
# Option 1: Clear browser localStorage manually
# 1. Open DevTools (F12)
# 2. Go to Application → Local Storage → http://localhost:5173
# 3. Click "Clear All" or delete specific token entries
# 4. Refresh page → Login screen appears

# Option 2: Use incognito/private browsing window
# New window has no cached tokens, forces fresh login
```

**Automated Fix (Implemented)**:
The frontend now automatically detects 403 errors and redirects to login:
- `frontend/src/utils/api.ts` checks all API responses
- On 403 error, clears localStorage and redirects to login page
- User sees login screen immediately without manual intervention

**Prevention**:
- ✅ **Expected Behavior**: 403 after restart is NORMAL with JWT auth
- ✅ **No Action Needed**: Frontend auto-redirects to login
- ⚠️ **If Using Production**: Ensure `JWT_SECRET` in `.env.docker` is stable (don't regenerate)
- ⚠️ **Database Persistence**: User accounts must persist across restarts (check MySQL data volume)

**Verification Steps**:
```bash
# 1. Check JWT configuration in backend
docker exec support-billing-tracker-backend printenv | grep JWT
# Should show: JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN

# 2. Verify user exists in database
docker exec -it support-billing-tracker-mysql mysql -u root -p
> USE support_billing_tracker;
> SELECT id, email, role FROM users;
# Should show at least one admin user

# 3. Test token generation
curl -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@peakonedigital.com","password":"***REMOVED***"}'
# Should return: {"token":"eyJ...","user":{...}}
```

**Related Files**:
- `backend/middleware/auth.js` - JWT verification logic (lines 36-39: 403 errors)
- `backend/routes/auth.js` - Login endpoint that issues tokens
- `frontend/src/utils/api.ts` - Auto-redirect logic on 403
- `frontend/src/contexts/AuthContext.tsx` - Token storage management

**Advanced: Token Refresh Strategy**:
If you want to avoid re-login after every restart, implement refresh tokens:
1. Backend already has `JWT_REFRESH_SECRET` configured
2. Frontend can store refresh token in httpOnly cookie (more secure)
3. On 403, attempt token refresh before redirecting to login
4. See Phase 2 in `docs/authentication-plan.md` for full implementation

#### API Error 500 & Environment Variable Conflicts (October 2025)
**Issue**: "Error Loading Data - API error: 500" after restarting Docker Compose

**Root Cause**: Conflicting environment files and cached Vite builds

**Two Common Problems**:

**Problem 1: Backend Port Mismatch**
- `backend/.env` file overrides Docker Compose environment variables
- Example: `backend/.env` has `PORT=3001` but Docker expects `PORT=3011`
- Node.js `dotenv.config()` loads local `.env` file **after** Docker sets environment variables
- Result: Backend starts on wrong port, API requests fail with 500 errors

**Problem 2: Vite Cache with Stale Environment Variables**
- Vite caches compiled JavaScript with environment variables baked in
- When you restart Docker, the cache persists in `node_modules/.vite/`
- Frontend serves cached code with old `VITE_API_URL` values
- Result: Frontend tries to connect to wrong backend URL

**Solution Steps**:

1. **Remove Conflicting Backend .env File**:
   ```bash
   # Option 1: Delete it (recommended for Docker-only setup)
   rm backend/.env

   # Option 2: Rename for reference
   mv backend/.env backend/.env.local.example
   ```

   This makes `.env.docker` the single source of truth for all configuration.

2. **Clear Vite Cache and Rebuild Frontend**:
   ```bash
   # Stop all containers
   docker-compose down

   # Remove Vite cache
   rm -rf frontend/node_modules/.vite

   # Rebuild frontend without cache
   docker-compose build --no-cache frontend

   # Start with env file
   docker-compose --env-file .env.docker up -d
   ```

3. **Verify Environment Variables**:
   ```bash
   # Check frontend env vars
   docker exec support-billing-tracker-frontend printenv | grep VITE_API_URL
   # Expected: VITE_API_URL=http://localhost:3011/api

   # Check backend env vars
   docker exec support-billing-tracker-backend printenv | grep PORT
   # Expected: PORT=3011

   # Test API health
   curl http://localhost:3011/api/health
   # Expected: {"status":"ok","database":"connected"}
   ```

**Why This Happens**:

**Environment Variable Loading Order**:
1. Docker Compose passes environment variables from `.env.docker`
2. Backend container starts with `PORT=3011`
3. Node.js executes `dotenv.config()` which reads `backend/.env`
4. `backend/.env` has `PORT=3001`, which **overwrites** Docker's `PORT=3011`
5. Backend starts on port 3001, but Docker mapped port 3011 → **Connection fails**

**Vite Build Caching**:
1. Vite compiles environment variables into JavaScript at build time
2. Compiled code is cached in `node_modules/.vite/` directory
3. Cache persists across `docker-compose down/up` cycles
4. Frontend serves stale JavaScript with old API URLs → **API calls fail**

**Prevention**:

**For Docker-Only Development**:
- ✅ Use `.env.docker` as the single source of truth
- ✅ Delete or rename `backend/.env` to avoid conflicts
- ✅ Always use `--env-file .env.docker` flag when starting containers
- ❌ Don't create `backend/.env` or `frontend/.env` files

**For Hybrid Development (Docker + Local)**:
- Keep `backend/.env` for local non-Docker development
- Ensure values in `backend/.env` match `.env.docker`
- When using Docker, backend will use `.env.docker` values
- When running locally, backend will use `backend/.env` values

**When Making Environment Changes**:
```bash
# Full rebuild workflow
docker-compose down
rm -rf frontend/node_modules/.vite
docker-compose build --no-cache frontend
docker-compose --env-file .env.docker up -d
```

**Quick Verification After Restart**:
```bash
# Should return healthy status
curl http://localhost:3011/api/health

# Should show correct values
docker exec support-billing-tracker-frontend printenv | grep VITE
```

**Configuration Checklist**:
- ✅ `.env.docker` exists with correct values
- ✅ No `backend/.env` file (or values match `.env.docker`)
- ✅ No `frontend/.env` file (Docker provides all env vars)
- ✅ Port numbers consistent: Backend=3011, Frontend=5173, MySQL=3307
- ✅ Always use `docker-compose --env-file .env.docker up -d`

**Files Involved**:
- `.env.docker` - Primary configuration source
- `docker-compose.yml` - Container configuration and env var defaults
- `backend/server.js` - Reads PORT from environment (line 19)
- `backend/.env.local.example` - Reference file (not loaded by Docker)
- `frontend/node_modules/.vite/` - Vite cache directory (clear when rebuilding)

### Performance Notes
- Dashboard handles up to ~1000 requests efficiently
- Large datasets may require pagination adjustments
- Chart rendering performance depends on date range selection

## Future Enhancement Opportunities

1. **Additional Request Categories**: Expand beyond current 6 categories
2. **Advanced Analytics**: Trend analysis, seasonal patterns, response time tracking
3. **Export Functionality**: PDF reports, custom date range exports
4. **Integration**: Connect to external project management tools
5. **Real-time Updates**: Live data refresh from message sources
6. **Mobile Responsiveness**: Optimize dashboard for mobile devices

## Quick Start Workflow

### For New Data Processing:
1. Export messages from iMessage database:
   ```bash
   python3 export_imessages.py chat-backup.db [chat_id] [start_date] [end_date] data/01_raw/messages_export.csv
   ```
2. Clean the exported messages:
   ```bash
   cd src && python3 data_preprocessor.py
   ```
3. Extract requests from cleaned data:
   ```bash
   cd request-extractor && python3 main.py
   ```
4. Configure Twenty CRM API (if using):
   ```bash
   # Edit .env.docker and add:
   VITE_TWENTY_API_URL=https://your-twenty-instance.com/rest/supportTickets
   VITE_TWENTY_API_TOKEN=your-bearer-token-here
   VITE_TWENTY_USE_MOCK=false
   ```
5. Start with Docker Compose:
   ```bash
   docker-compose --env-file .env.docker up -d
   ```
   Or without Docker: `cd frontend && npm run dev`

### For Dashboard Development:
1. Modify React components in `frontend/src/components/`
2. Test with: `npm run dev` (builds to http://localhost:5173 or next available port)
3. Monitor console for errors and verify all features work
4. Build for production: `npm run build`
5. Update this documentation for significant changes

### For Data Management:
1. **Delete Requests**: Use trash icon or bulk delete (sets status to 'deleted')
2. **Restore Requests**: Use rotate icon in deleted section (sets status to 'active')
3. **Save Changes**: Use save button to persist to `data/03_final/` directory
4. **Backup Recovery**: Access timestamped backups in `data/03_final/backups/`
5. **Complete Reset**: Reload from `data/01_raw/` through full ETL pipeline

## Development Best Practices

### Post-Update Testing
- It is important after any updates you test the application to make sure it runs and then monitor the console log so that you can make any changes

This application provides a complete solution for transforming conversational data into actionable business intelligence with enterprise-grade data management, comprehensive audit trails, and a focus on data safety through status-based operations rather than permanent deletions.

## Critical Implementation Notes

### React Performance & Infinite Loop Prevention ⚠️ #memorize

**CRITICAL**: Always use `useMemo` for arrays/objects created in component body that are used in `useEffect` dependencies.

#### Common Infinite Loop Patterns to Avoid:

**❌ WRONG - Arrays recreated every render:**
```typescript
export function MyComponent() {
  const myArray = ['option1', 'option2', 'option3'] // New reference every render
  const myData = Array.from(new Set(...)) // New reference every render

  useEffect(() => {
    someFunction(myArray, myData)
  }, [myArray, myData]) // ⚠️ INFINITE LOOP - dependencies change every render
}
```

**✅ CORRECT - Use constants outside component:**
```typescript
const MY_ARRAY = ['option1', 'option2', 'option3'] as const // Created once

export function MyComponent() {
  useEffect(() => {
    someFunction(MY_ARRAY)
  }, [MY_ARRAY]) // ✅ Stable reference
}
```

**✅ CORRECT - Use useMemo for computed arrays:**
```typescript
export function MyComponent() {
  const myData = useMemo(() =>
    Array.from(new Set(...)).sort()
  , [dependencies]) // Only recreates when dependencies change

  useEffect(() => {
    someFunction(myData)
  }, [myData]) // ✅ Stable reference unless dependencies change
}
```

#### Real Examples from This Project:

1. **EditableCell Infinite Loop (October 2025)**
   - **Problem**: `options` array passed as prop was recreated every render in parent
   - **Symptom**: Console flooded with EditableCell render logs, browser freezes
   - **Fix**: Moved `CATEGORY_OPTIONS` and `URGENCY_OPTIONS` outside component
   - **Files**: `SupportTickets.tsx`, `EditableCell.tsx`

2. **SupportTickets Infinite Mounting (October 2025)**
   - **Problem**: `availableYears`, `availableMonthsForYear`, `availableDates` arrays recreated every render
   - **Symptom**: "SupportTickets component mounting..." flooding console
   - **Fix**: Wrapped with `useMemo(() => Array.from(...), [dependencies])`
   - **Files**: `SupportTickets.tsx` lines 211-242

3. **Chart Rendering with useCallback (October 2025)**
   - **Problem**: Attempted `useCallback` with nested function dependencies
   - **Symptom**: "Maximum update depth exceeded" error
   - **Fix**: Removed `useCallback` - render props work fine without memoization
   - **Files**: `CostTrackerCard.tsx`, `CategoryTrackerCard.tsx`

#### When to Use Each Pattern:

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Constants outside component** | Static arrays/objects that never change | `CATEGORY_OPTIONS`, `URGENCY_OPTIONS` |
| **useMemo** | Computed values derived from props/state | `availableYears`, `filteredData` |
| **useCallback** | Functions passed as props to memoized children | Event handlers for `React.memo` components |
| **Plain variables** | Primitives, functions not in dependencies | Regular event handlers, render functions |

#### Debug Checklist for Infinite Loops:

1. ✅ **Check console** - Look for repeated component mounting logs
2. ✅ **Inspect useEffect deps** - Are any arrays/objects created in component body?
3. ✅ **Move static arrays outside** - Define constants before component export
4. ✅ **Wrap computed arrays with useMemo** - Add dependency array
5. ✅ **Remove unnecessary console.logs** - They flood output and slow performance
6. ✅ **Test in browser** - Verify console is clean and UI is responsive

**Remember**: React compares dependency arrays by **reference**, not value. `['a', 'b'] !== ['a', 'b']` in JavaScript!

---

### Status-Based Architecture Benefits
1. **Data Safety**: No accidental permanent data loss - everything is recoverable
2. **Audit Trail**: Complete history of all changes through timestamped backups
3. **Portability**: Status field travels with data in all CSV exports
4. **Flexibility**: Easy to add new status types (e.g., 'pending', 'archived') in the future
5. **Business Intelligence**: Clean separation between active business data and historical records

### File System Integration
- **Production Ready**: Saves directly to structured data directory (`data/03_final/`)
- **Version Control**: Timestamped backups prevent any data loss scenarios
- **ETL Compatible**: Works seamlessly with existing data processing pipeline
- **Recovery Options**: Multiple restoration paths from any point in the process

### Performance & Scalability
- **Efficient Filtering**: Active/deleted separation optimizes dashboard performance
- **Batch Operations**: Bulk actions process multiple requests efficiently
- **Memory Management**: Status-based filtering reduces memory usage for large datasets
- **Real-Time Updates**: Immediate UI feedback with persistent background saves

## Date and Time Handling (Critical) #memorize

### Database Storage
- **MySQL TIME field**: Stores times in 24-hour format (e.g., `08:47:07`)
- **MySQL DATE field**: Stores dates as `YYYY-MM-DD` format
- **Timezone**: Times are stored in EDT (Eastern Daylight Time, UTC-4)
- **Conversion**: When importing from iMessage exports (which are in UTC), we subtract 4 hours using `SUBTIME(time, '04:00:00')`
- **Midnight Crossings**: Handled by adjusting both date and time when conversion crosses day boundary

### Frontend Display
- **Date Parsing Issue**: JavaScript's `new Date("2025-06-23")` interprets as UTC midnight, causing timezone shift
- **Solution**: Parse date components manually to avoid timezone issues:
  ```javascript
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  ```
- **Time Format**: Display as 12-hour with AM/PM (e.g., "8:47 AM")
- **Chart Data**: Uses the same manual parsing to ensure consistency

### Request Extractor (Python)
- **Timezone Conversion**: Treats incoming timestamps as UTC and converts to EDT:
  ```python
  self.df['datetime'] = pd.to_datetime(self.df['message_date'], utc=True)
  self.df['datetime'] = self.df['datetime'].dt.tz_convert('America/New_York')
  ```
- **Time Formatting**: Outputs as 12-hour format: `strftime('%I:%M %p').str.lstrip('0')`
- **Date Output**: Maintains `YYYY-MM-DD` format for consistency

### Known Issues & Solutions
1. **Problem**: Scorecard showing wrong date (e.g., Jun 22 instead of Jun 23)
   - **Cause**: `new Date()` timezone conversion
   - **Fix**: Manual date component parsing

2. **Problem**: Times off by 4 hours
   - **Cause**: iMessage exports in UTC, displayed in EDT
   - **Fix**: Timezone conversion in request extractor and database update

3. **Problem**: Archived requests not sorted chronologically
   - **Cause**: Missing sort logic
   - **Fix**: Added date/time sorting using `parseTimeToMinutes` helper