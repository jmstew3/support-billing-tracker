# API Documentation

## Base URL

- **Development**: `http://localhost:3011/api`
- **Production**: `https://billing.peakonedigital.com/api`

## Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@peakonedigital.com",
  "password": "PeakonBilling2025"
}
```

**Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": 1,
    "email": "admin@peakonedigital.com",
    "role": "admin"
  }
}
```

**Rate Limit:** 5 attempts per 15 minutes per IP+email combination

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

## Requests Endpoint

### List Requests

```http
GET /api/requests
Authorization: Bearer <accessToken>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `active` | Filter by status: `active`, `deleted`, `ignored` |
| `category` | string | - | Filter by category |
| `urgency` | string | - | Filter by urgency: `LOW`, `MEDIUM`, `HIGH` |
| `startDate` | string | - | Filter from date (YYYY-MM-DD) |
| `endDate` | string | - | Filter to date (YYYY-MM-DD) |
| `limit` | number | - | Results per page (enables pagination) |
| `offset` | number | `0` | Skip first N results |
| `cursor` | number | - | Cursor-based pagination (request ID) |

**Response (without pagination):**
```json
[
  {
    "id": 1,
    "Date": "2025-01-15",
    "Time": "09:30:00",
    "Month": "2025-01",
    "Request_Type": "General Request",
    "Category": "Support",
    "Request_Summary": "Test request",
    "Urgency": "MEDIUM",
    "Effort": "Medium",
    "EstimatedHours": 0.5,
    "Status": "active",
    "source": "sms",
    "website_url": null
  }
]
```

**Response (with pagination):**
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true,
    "nextCursor": 21,
    "currentPage": 1,
    "totalPages": 5
  }
}
```

### Create Request

```http
POST /api/requests
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "date": "2025-01-15",
  "time": "09:30:00",
  "request_type": "General Request",
  "category": "Support",
  "description": "Test request",
  "urgency": "MEDIUM",
  "effort": "Medium",
  "estimated_hours": 0.5,
  "source": "sms"
}
```

### Update Request

```http
PUT /api/requests/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "category": "Hosting",
  "urgency": "HIGH"
}
```

### Delete Request

```http
DELETE /api/requests/:id
Authorization: Bearer <accessToken>
```

### Bulk Update Requests

```http
PUT /api/requests/bulk
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "ids": [1, 2, 3],
  "updates": {
    "status": "deleted"
  }
}
```

### Request Statistics

```http
GET /api/requests/statistics
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "total": 430,
  "byStatus": {
    "active": 400,
    "deleted": 20,
    "ignored": 10
  },
  "byCategory": {
    "Support": 380,
    "Hosting": 36
  },
  "byUrgency": {
    "LOW": 11,
    "MEDIUM": 390,
    "HIGH": 29
  }
}
```

## FluentSupport Sync

### Trigger Sync

```http
POST /api/fluent/sync
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "dateFilter": "2025-10-17"
}
```

**Response:**
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

### Get Sync Status

```http
GET /api/fluent/status
```

**Response:**
```json
{
  "syncStatus": {
    "id": 15,
    "last_sync_at": "2025-10-17T13:25:50.000Z",
    "last_sync_status": "success",
    "tickets_fetched": 7,
    "tickets_added": 7,
    "tickets_updated": 0
  },
  "totalTickets": 29,
  "statusBreakdown": [
    {"ticket_status": "active", "count": 4},
    {"ticket_status": "closed", "count": 19}
  ]
}
```

### List FluentSupport Tickets

```http
GET /api/fluent/tickets?limit=100&offset=0
```

## Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Invalid token"
}
```

### 404 Not Found
```json
{
  "error": "Request not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many login attempts. Please try again after 15 minutes.",
  "retryAfter": 900
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Error message (development only)"
}
```

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 5 requests | 15 minutes |
| `/api/auth/*` | 20 requests | 5 minutes |
| `/api/auth/change-password` | 3 requests | 1 hour |
