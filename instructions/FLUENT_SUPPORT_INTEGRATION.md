# FluentSupport Integration Guide

## Overview

This integration connects the Thad Chat dashboard with FluentSupport WordPress plugin to automatically import and sync support tickets. FluentSupport tickets are displayed alongside SMS and Twenty CRM tickets in a unified dashboard view.

## Features

✅ **Automatic Ticket Import**: Fetch tickets from FluentSupport REST API
✅ **Date Filtering**: Only import tickets created after September 20, 2025
✅ **Deduplication**: Prevents importing the same ticket multiple times
✅ **Source Tracking**: Tickets marked with 'fluent' source and purple 📋 Clipboard icon
✅ **Bi-directional Sync**: Updates existing tickets if changed in FluentSupport
✅ **Error Handling**: Robust error handling with sync status tracking

## Prerequisites

### WordPress Requirements

1. **FluentSupport Plugin** installed and activated
2. **WordPress 5.0+** (for REST API support)
3. **Application Password** created for API authentication

### Creating WordPress Application Password

1. Log in to your WordPress admin dashboard
2. Go to **Users** → **Profile**
3. Scroll to **Application Passwords** section
4. Enter an application name (e.g., "Thad Chat Sync")
5. Click **Add New Application Password**
6. **Copy the generated password** (format: `xxxx xxxx xxxx xxxx`)
7. Store it securely - you won't be able to see it again!

## Configuration

### 1. Environment Variables

Edit `.env.docker` and add your FluentSupport credentials:

```bash
# FluentSupport WordPress API Configuration
VITE_FLUENT_API_URL=https://your-wordpress-site.com
VITE_FLUENT_API_USERNAME=your_wp_username
VITE_FLUENT_API_PASSWORD=xxxx xxxx xxxx xxxx
VITE_FLUENT_DATE_FILTER=2025-09-20
```

**Configuration Details**:

- `VITE_FLUENT_API_URL`: Your WordPress site URL (no trailing slash)
- `VITE_FLUENT_API_USERNAME`: WordPress username with FluentSupport access
- `VITE_FLUENT_API_PASSWORD`: Application password from WordPress (spaces optional)
- `VITE_FLUENT_DATE_FILTER`: Only sync tickets created on/after this date (YYYY-MM-DD)

### 2. Database Setup

Run the migration to create FluentSupport sync tables:

```bash
# From project root
docker-compose exec mysql mysql -u root -prootpassword thad_chat < backend/db/add_fluent_sync.sql
```

Or manually connect to MySQL and run:

```bash
docker-compose exec mysql mysql -u root -prootpassword
mysql> USE thad_chat;
mysql> source /app/db/add_fluent_sync.sql;
mysql> exit;
```

**Tables Created**:

1. `fluent_sync_status` - Tracks sync history and status
2. `fluent_tickets` - Stores FluentSupport ticket metadata

### 3. Restart Services

After configuration, restart Docker containers:

```bash
docker-compose restart
```

## Usage

### Manual Sync via API

Trigger a sync from the command line:

```bash
# Sync with default date filter (from .env.docker)
curl -X POST http://localhost:3011/api/fluent/sync \
  -H "Content-Type: application/json"

# Sync with custom date filter
curl -X POST http://localhost:3011/api/fluent/sync \
  -H "Content-Type: application/json" \
  -d '{"dateFilter": "2025-10-01"}'
```

### Check Sync Status

```bash
curl http://localhost:3011/api/fluent/status
```

**Response Example**:

```json
{
  "syncStatus": {
    "id": 1,
    "last_sync_at": "2025-10-06T10:30:00.000Z",
    "last_sync_status": "success",
    "tickets_fetched": 45,
    "tickets_added": 42,
    "tickets_updated": 3,
    "tickets_skipped": 0,
    "sync_duration_ms": 2340,
    "date_filter": "2025-09-20"
  },
  "totalTickets": 42,
  "statusBreakdown": [
    { "ticket_status": "active", "count": 38 },
    { "ticket_status": "closed", "count": 4 }
  ]
}
```

### Frontend Display

FluentSupport tickets automatically appear in the Support dashboard with:

- **Icon**: 📋 Purple Clipboard icon
- **Tooltip**: "Via FluentSupport"
- **Source**: `fluent` (filterable in source dropdown)
- **Colors**: Purple theme for FluentSupport tickets

## Data Flow

```
FluentSupport API → Backend Service → Database → Frontend Dashboard
     (WordPress)      (fluentSupportApi.js)   (MySQL)   (React)
```

### Field Mapping

| FluentSupport Field | Internal Field | Notes |
|---------------------|----------------|-------|
| `id` | `fluent_id` | Unique ticket identifier |
| `created_at` | `date`, `time` | Split into separate fields |
| `title` / `subject` | `description` | Ticket subject line |
| `customer_message` | `description` | Appended to subject |
| `priority` (critical/high) | `urgency = HIGH` | |
| `priority` (medium/normal) | `urgency = MEDIUM` | |
| `priority` (low) | `urgency = LOW` | |
| `status` | `ticket_status` | Stored in fluent_tickets table |
| *(all fields)* | `source = 'fluent'` | Identifies as FluentSupport |

## Architecture

### Backend Components

1. **Service Layer**: [`backend/services/fluentSupportApi.js`](backend/services/fluentSupportApi.js)
   - WordPress REST API authentication (Basic Auth)
   - Ticket fetching with pagination support
   - Date filtering logic
   - Data transformation

2. **API Routes**: [`backend/routes/fluent-sync.js`](backend/routes/fluent-sync.js)
   - `POST /api/fluent/sync` - Trigger sync
   - `GET /api/fluent/status` - Get sync status
   - `GET /api/fluent/tickets` - List tickets

3. **Database Schema**: [`backend/db/add_fluent_sync.sql`](backend/db/add_fluent_sync.sql)
   - Sync status tracking
   - Ticket metadata storage
   - Foreign key relationship to requests table

### Frontend Components

1. **TypeScript Types**: Updated `source` field to include `'fluent'`
2. **Icon Display**: Purple Clipboard icon in SupportTableRow and ArchivedRequestsSection
3. **API Functions**: `triggerFluentSync()`, `getFluentSyncStatus()`

## Troubleshooting

### Common Issues

#### 1. "FluentSupport API credentials not configured"

**Cause**: Missing or incorrect environment variables

**Solution**:
```bash
# Check .env.docker has all required fields
grep FLUENT .env.docker

# Should show:
# VITE_FLUENT_API_URL=https://...
# VITE_FLUENT_API_USERNAME=...
# VITE_FLUENT_API_PASSWORD=...
# VITE_FLUENT_DATE_FILTER=...
```

#### 2. 401 Unauthorized Error

**Cause**: Invalid WordPress credentials or application password

**Solutions**:
- Verify username is correct (not email)
- Regenerate application password in WordPress
- Check password format (spaces are OK but remove any line breaks)
- Ensure user has permissions to access FluentSupport

#### 3. No Tickets Imported

**Possible Causes**:

a) **Date Filter Too Recent**
   - Check if tickets exist after the date filter
   - Try adjusting `VITE_FLUENT_DATE_FILTER` to an earlier date

b) **API Endpoint Issues**
   - Verify FluentSupport plugin is activated
   - Test API manually: `https://your-site.com/wp-json/fluent-support/v2/tickets`
   - Check WordPress permalinks are enabled

c) **Firewall/CORS Issues**
   - Ensure WordPress site is accessible from server
   - Check firewall rules allow outbound HTTPS

#### 4. Sync Fails with Timeout

**Cause**: Large number of tickets or slow API response

**Solutions**:
- Increase timeout in `fluentSupportApi.js` (default: 30 seconds)
- Reduce `per_page` parameter for smaller batches
- Run sync during off-peak hours

### Debugging

Enable verbose logging:

```javascript
// In backend/services/fluentSupportApi.js
console.log('[FluentSupport] Full response:', JSON.stringify(response.data, null, 2));
```

Check database for sync errors:

```sql
SELECT * FROM fluent_sync_status ORDER BY id DESC LIMIT 5;
SELECT COUNT(*) FROM fluent_tickets;
SELECT * FROM fluent_tickets ORDER BY created_at DESC LIMIT 10;
```

## API Reference

### POST /api/fluent/sync

Trigger a sync from FluentSupport API.

**Request Body** (optional):
```json
{
  "dateFilter": "2025-09-20"
}
```

**Response**:
```json
{
  "success": true,
  "ticketsFetched": 45,
  "ticketsAdded": 42,
  "ticketsUpdated": 3,
  "ticketsSkipped": 0,
  "syncDuration": 2340,
  "dateFilter": "2025-09-20"
}
```

### GET /api/fluent/status

Get current sync status and statistics.

**Response**:
```json
{
  "syncStatus": {
    "id": 1,
    "last_sync_at": "2025-10-06T10:30:00.000Z",
    "last_sync_status": "success",
    "tickets_fetched": 45,
    "tickets_added": 42,
    "tickets_updated": 3,
    "tickets_skipped": 0,
    "sync_duration_ms": 2340,
    "date_filter": "2025-09-20"
  },
  "totalTickets": 42,
  "statusBreakdown": [...]
}
```

### GET /api/fluent/tickets

Get FluentSupport tickets from database.

**Query Parameters**:
- `limit` (default: 100)
- `offset` (default: 0)

**Response**: Array of ticket objects with joined request data

## Security Considerations

1. **Application Passwords**: More secure than using main WordPress password
2. **HTTPS Required**: Always use HTTPS for WordPress API calls
3. **Environment Variables**: Never commit `.env.docker` to version control
4. **Rate Limiting**: FluentSupport API may have rate limits - respect them
5. **User Permissions**: Ensure API user only has necessary FluentSupport permissions

## Performance Tips

1. **Scheduled Syncs**: Set up cron job for automatic periodic syncs
2. **Incremental Updates**: Use date filter to only fetch recent tickets
3. **Pagination**: API automatically handles pagination for large datasets
4. **Database Indexing**: Migration includes indexes for optimal query performance

## Future Enhancements

- [ ] Automatic scheduled sync (cron job)
- [ ] Webhook support for real-time updates
- [ ] Bi-directional sync (update FluentSupport from dashboard)
- [ ] Custom field mapping configuration
- [ ] Sync status dashboard UI
- [ ] Multi-mailbox support with separate filters

## Related Documentation

- [CLAUDE.md](CLAUDE.md) - Main project documentation
- [FluentSupport REST API Docs](https://fluentsupport.com/rest-api/) - Official API reference
- [WordPress Application Passwords](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/) - WordPress auth guide

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section above
2. Review sync logs in database: `SELECT * FROM fluent_sync_status`
3. Enable debug logging in backend service
4. Verify FluentSupport plugin version compatibility

---

**Last Updated**: October 6, 2025
**Integration Version**: 1.0.0
**Tested With**: FluentSupport 1.7.x, WordPress 6.x
