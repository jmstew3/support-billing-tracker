# FluentSupport Sync Operations

Integration with FluentSupport (WordPress plugin) for unified ticket management.

## Architecture

**API Integration:**
- WordPress REST API: `https://support.peakonedigital.com/wp-json/fluent-support/v2/tickets`
- Authentication: WordPress Application Password (HTTP Basic Auth)
- Backend Service: `backend/services/fluentSupportApi.js`
- Sync Route: `backend/routes/fluent-sync.js`

**UI Components:**
- `FluentSyncButton` - Trigger button with optional date filter
- `FluentSyncStatus` - Status widget displaying last sync info

**Database Tables:**
- `requests` - Main table (stores all support requests)
- `fluent_tickets` - FluentSupport ticket metadata (links to requests via `request_id`)
- `fluent_sync_status` - Sync operation tracking

## Data Transformation

### FluentSupport → Request Mapping

| FluentSupport Field | Request Field | Transformation |
|---------------------|---------------|----------------|
| `created_at` | `date`, `time` | Split into YYYY-MM-DD and HH:MM:SS |
| `title` + `customer_message` | `description` | Concatenate |
| `priority` | `urgency` | critical/high/urgent→HIGH, medium/normal→MEDIUM, low→LOW |
| `product_name` | `website_url` | Direct copy |
| `id` | `fluent_id` | Unique identifier in `fluent_tickets` |
| - | `source` | Hard-coded as `'fluent'` |

### Product → Category Mapping

| FluentSupport Product | Our Category |
|----------------------|--------------|
| Support, Hosting, Migration, Website, Email, Forms, Scripts, Advisory | Same name |
| Project, General | General |
| Unknown/Empty | Support (default) |

## API Endpoints

### POST `/api/fluent/sync`
Trigger synchronization.

**Auth:** Traefik BasicAuth (production) or JWT (localhost)

```json
// Request
{"dateFilter": "2025-10-17"}

// Response
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

### GET `/api/fluent/status`
Get last sync status (public endpoint).

### GET `/api/fluent/tickets`
List FluentSupport tickets with request details.

## Sync Methods

### Option 1: UI (Recommended)
1. Navigate to Support page
2. Click "Sync FluentSupport" button
3. (Optional) Set date filter
4. View results in notification

### Option 2: Automation Script
```bash
./scripts/sync-fluent-tickets.sh              # Default: 7 days ago
./scripts/sync-fluent-tickets.sh 2025-10-17   # Specific date
```

### Option 3: CLI (Production)
```bash
curl -X POST https://billing.peakonedigital.com/api/fluent/sync \
  -u "admin:YOUR_BASICAUTH_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"dateFilter":"2025-10-17"}'
```

### Option 4: CLI (Localhost)
```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@peakonedigital.com","password":"YOUR_ADMIN_PASSWORD"}' | jq -r .accessToken)

# 2. Sync
curl -X POST http://localhost:3011/api/fluent/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dateFilter":"2025-10-17"}'
```

## Deduplication Strategy

1. Each FluentSupport ticket has unique `id`
2. Stored as `fluent_id` with UNIQUE constraint
3. Before insert: check `SELECT id FROM fluent_tickets WHERE fluent_id = ?`
4. If found → UPDATE existing; if not → INSERT new
5. Transaction-based: all or nothing

**Benefits:**
- Safe to run sync multiple times
- No duplicates created
- Existing tickets updated with latest data
- Preserves manual edits (hours, categories)

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid JWT | Re-authenticate |
| 403 Forbidden | Token expired | Login again |
| 500 Internal Server Error | FluentSupport API unreachable | Check WordPress |
| Database connection failed | MySQL not running | `docker-compose ps` |

**View logs:**
```bash
docker logs -f support-billing-tracker-backend | grep FluentSupport
```

## Cron Automation

```bash
# Daily sync at 2 AM
0 2 * * * cd /path/to/support-billing-tracker && ./scripts/sync-fluent-tickets.sh >> /var/log/fluent-sync.log 2>&1

# Weekly (Sundays)
0 2 * * 0 cd /path/to/support-billing-tracker && ./scripts/sync-fluent-tickets.sh >> /var/log/fluent-sync.log 2>&1
```

## Configuration

**Environment Variables (`.env.docker`):**
```bash
VITE_FLUENT_API_URL=https://support.peakonedigital.com
VITE_FLUENT_API_USERNAME=Justin
VITE_FLUENT_API_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
VITE_FLUENT_DATE_FILTER=2025-10-11
```

**Files:**
- `backend/services/fluentSupportApi.js` - API client
- `backend/routes/fluent-sync.js` - Sync endpoint
- `backend/db/schema.sql` - Database schema
