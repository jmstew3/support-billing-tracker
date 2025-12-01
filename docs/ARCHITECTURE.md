# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPPORT BILLING TRACKER                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Traefik    │───▶│   Frontend   │    │   Backend    │───▶│    MySQL     │
│ (Reverse     │    │   (React)    │───▶│  (Express)   │    │   Database   │
│  Proxy)      │    │  Port 5173   │    │  Port 3011   │    │  Port 3307   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                    │
       │                   │                   │                    │
       ▼                   ▼                   ▼                    ▼
  BasicAuth           React Query         Repository           Indexed
  Protection           Caching             Pattern             Tables
```

## Layer Architecture

### Frontend (React + TypeScript)

```
frontend/src/
├── features/              # Feature-based organization
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Billing overview
│   ├── hosting/          # Turbo Hosting MRR
│   ├── projects/         # Project revenue
│   └── support/          # Support tickets
├── components/           # Shared UI components
│   ├── base/             # Base components (DataTrackerCard)
│   ├── charts/           # Recharts visualizations
│   ├── shared/           # Cross-page components
│   └── ui/               # Primitive UI (shadcn/ui)
├── hooks/                # React Query hooks
│   ├── useRequests.ts    # Request data hooks
│   ├── useBilling.ts     # Billing data hooks
│   └── useSync.ts        # Sync operation hooks
├── services/             # API service layer
│   ├── api/              # API client modules
│   ├── billingApi.ts     # Billing aggregation
│   ├── hostingApi.ts     # Hosting calculations
│   └── projectsApi.ts    # Project management
├── contexts/             # React contexts
├── lib/                  # Library configurations
│   └── queryClient.ts    # React Query setup
└── types/                # TypeScript definitions
```

### Backend (Node.js + Express)

```
backend/
├── routes/               # Express route handlers
│   ├── requests.js       # Support request CRUD
│   ├── auth.js           # Authentication (rate limited)
│   ├── fluent-sync.js    # FluentSupport integration
│   └── __tests__/        # Route unit tests
├── services/             # Business logic layer
│   └── FluentSyncService.js
├── repositories/         # Data access layer
│   ├── RequestRepository.js
│   ├── FluentTicketRepository.js
│   └── FluentSyncStatusRepository.js
├── middleware/           # Express middleware
│   └── auth.js           # JWT authentication
├── db/                   # Database configuration
│   ├── config.js         # MySQL pool
│   ├── schema.sql        # Table definitions
│   └── migrations/       # Schema migrations
├── types/                # TypeScript definitions
│   └── index.d.ts
└── test/                 # Test configuration
    └── setup.js
```

## Design Patterns

### Repository Pattern
Data access is abstracted through repository classes:
- `RequestRepository` - CRUD for requests table
- `FluentTicketRepository` - FluentSupport ticket data
- `FluentSyncStatusRepository` - Sync operation tracking

### Service Layer
Business logic separated from route handlers:
- `FluentSyncService` - Handles ticket synchronization with transactions

### React Query for Caching
Frontend uses React Query for:
- Automatic cache management (5-minute stale time)
- Optimistic updates
- Query invalidation on mutations
- Background refetching

## Data Flow

### Request Lifecycle

```
1. Frontend Request
   └── React Query hook (useRequests)
       └── API call (fetchRequests)
           └── Backend route handler
               └── Repository query
                   └── MySQL database

2. Response Flow
   └── MySQL result
       └── Repository transforms
           └── Route handler formats
               └── React Query caches
                   └── Component renders
```

### FluentSupport Sync Flow

```
1. Trigger (UI Button or API)
   └── POST /api/fluent/sync
       └── FluentSyncService.syncTickets()
           ├── FluentSyncStatusRepository.startSync()
           ├── Fetch from FluentSupport API
           ├── For each ticket (in transaction):
           │   ├── FluentTicketRepository.findByFluentId()
           │   ├── RequestRepository.create() or update()
           │   └── FluentTicketRepository.create() or update()
           └── FluentSyncStatusRepository.markSuccess()
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `requests` | Support tickets and SMS requests |
| `fluent_tickets` | FluentSupport ticket metadata |
| `fluent_sync_status` | Sync operation tracking |
| `users` | User accounts for authentication |

### Key Indexes

| Index | Table | Purpose |
|-------|-------|---------|
| `idx_requests_date` | requests | Date filtering |
| `idx_requests_status` | requests | Status filtering |
| `idx_requests_source` | requests | Source filtering |
| `idx_fluent_tickets_fluent_id` | fluent_tickets | Deduplication lookup |
| `idx_fluent_sync_status_date` | fluent_sync_status | Sync history queries |

## Security Layers

1. **Traefik BasicAuth** - Production HTTP authentication
2. **JWT Tokens** - API authentication (1-hour expiry)
3. **Rate Limiting** - Login attempts (5/15min), API calls (20/5min)
4. **CORS** - Restricted origins
5. **Input Validation** - Parameterized queries, type checking

## Environment Configuration

| Variable | Service | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | Frontend | Backend API endpoint |
| `JWT_SECRET` | Backend | Token signing |
| `MYSQL_*` | Backend | Database connection |
| `VITE_TWENTY_*` | Backend | Twenty CRM integration |
| `VITE_FLUENT_*` | Backend | FluentSupport integration |
| `BASIC_AUTH_USERS` | Traefik | Production authentication |
