# Client Portal Implementation Plan

## Overview

Add a client-facing portal to the Support Billing Tracker that allows clients to view their account data transparently while protecting sensitive internal business metrics.

**Architecture: Subdomain with Shared Codebase**
- Portal URL: `portal.peakonedigital.com`
- Same React app serves both internal and client routes
- Traefik routes subdomain to existing frontend container
- Backend adds `/api/client/*` endpoints with scope filtering

---

## What Clients Will See

| Data Type | Visible | Notes |
|-----------|---------|-------|
| Support tickets | Yes | Full conversation history from FluentSupport |
| Hosted websites | Yes | Site name, URL, hosting status |
| Projects | Yes | Name, status, completion state |
| Activity summary | Yes | Recent tickets, site count |
| **Hours/estimates** | **No** | Hidden - billing not finalized disclaimer |
| **Dollar amounts** | **No** | All revenue/cost data hidden |
| **Other clients** | **No** | Strict data isolation |

---

## Infrastructure: Traefik + Cloudflared Setup

### Current Architecture
```
Browser → Cloudflare DNS → Cloudflared Tunnel (NAS) → Traefik → Docker Services

velocity.peakonedigital.com/billing-overview     → frontend:5173
velocity.peakonedigital.com/billing-overview-api → backend:3011
```

### Target Architecture (Safe Addition)
```
velocity.peakonedigital.com/billing-overview     → frontend:5173 (unchanged)
velocity.peakonedigital.com/billing-overview-api → backend:3011  (unchanged)
portal.peakonedigital.com                        → frontend:5173 (NEW route)
portal.peakonedigital.com/api                    → backend:3011  (NEW route)
```

### Docker Compose Changes (docker-compose.yml)

Add new Traefik labels to existing services (NO new containers needed):

```yaml
# Frontend service - ADD these labels (keep existing ones)
labels:
  # ... existing billing-overview labels unchanged ...

  # NEW: Client portal subdomain
  - "traefik.http.routers.client-portal.rule=Host(`portal.peakonedigital.com`)"
  - "traefik.http.routers.client-portal.entrypoints=web"
  - "traefik.http.services.client-portal.loadbalancer.server.port=5173"

# Backend service - ADD these labels (keep existing ones)
labels:
  # ... existing billing-overview-api labels unchanged ...

  # NEW: Client portal API
  - "traefik.http.routers.client-portal-api.rule=Host(`portal.peakonedigital.com`) && PathPrefix(`/api`)"
  - "traefik.http.routers.client-portal-api.entrypoints=web"
  - "traefik.http.services.client-portal-api.loadbalancer.server.port=3011"
```

### Cloudflared Tunnel Configuration (On NAS)

Add DNS route in Cloudflare dashboard or tunnel config:
```yaml
# cloudflared config.yml (on NAS)
ingress:
  - hostname: velocity.peakonedigital.com
    service: http://traefik:80  # existing
  - hostname: portal.peakonedigital.com
    service: http://traefik:80  # NEW - same Traefik instance
  - service: http_status:404
```

### Risk Assessment: LOW RISK ✅

| Factor | Status |
|--------|--------|
| Existing routes | ✅ Unchanged - different Host rules |
| Port conflicts | ✅ None - same containers, different routes |
| SSL/TLS | ✅ Cloudflare handles both domains |
| Rollback | ✅ Easy - just remove new Traefik labels |

---

## Database Changes

### New Tables

```sql
-- 1. Primary client entity
CREATE TABLE clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fluent_customer_id VARCHAR(100) UNIQUE,  -- Links to fluent_tickets
  twenty_brand_id VARCHAR(100),            -- Links to Twenty CRM
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Client portal login credentials (separate from internal users)
CREATE TABLE client_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL REFERENCES clients(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP NULL
);

-- 3. Website-to-client mapping
CREATE TABLE client_website_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL REFERENCES clients(id),
  twenty_website_property_id VARCHAR(100) NOT NULL,
  website_url VARCHAR(255)
);
```

### Existing Table Changes

```sql
-- Add client_id to fluent_tickets for efficient filtering
ALTER TABLE fluent_tickets ADD COLUMN client_id INT REFERENCES clients(id);

-- Populate from existing customer_id data
UPDATE fluent_tickets ft
JOIN clients c ON ft.customer_id = c.fluent_customer_id
SET ft.client_id = c.id;
```

---

## Authentication Approach

### Unified JWT with Extended Roles

**Current roles**: `admin`, `viewer` (internal)
**New role**: `client` (portal users)

```javascript
// Client token payload includes clientId for scoping
{
  id: 123,
  email: "client@example.com",
  role: "client",
  clientId: 45,  // Used to filter all data queries
  clientName: "Acme Corp"
}
```

### New Endpoints

```
POST /api/auth/client/login     - Client portal login
POST /api/auth/client/logout    - Client logout
GET  /api/auth/client/me        - Get client profile
```

### Middleware

```javascript
// All /api/client/* routes use these middleware:
authenticateToken    // Verify JWT
requireClient        // Ensure role === 'client'
enforceClientScope   // Attach clientId filter to all queries
```

---

## API Endpoints (Client-Scoped)

```
/api/client/
├── profile              GET   Client company info
├── tickets              GET   Support tickets (filtered, no hours)
├── tickets/:id          GET   Single ticket with full conversation history
├── tickets/:id/messages GET   Conversation thread from FluentSupport
├── sites                GET   Hosted websites
├── projects             GET   Client's projects
└── activity             GET   Recent activity summary
```

**Security**: Every query automatically filtered by `client_id` from JWT token.

### Ticket Conversation Data

FluentSupport API provides conversation history via ticket responses. The `/api/client/tickets/:id/messages` endpoint will:

1. Fetch ticket responses from FluentSupport API using stored `fluent_id`
2. Filter to show only customer messages and agent replies
3. Strip internal notes and admin-only content
4. Return chronological conversation thread

```typescript
// Response shape for ticket detail
interface ClientTicketDetail {
  id: number;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  messages: Array<{
    id: number;
    content: string;
    sender: 'client' | 'agent';
    senderName: string;
    createdAt: string;
  }>;
  // NO: estimatedHours, category, urgency, internalNotes
}
```

### Client Account Management (Admin Only)

```
/api/admin/clients              GET    List all clients
/api/admin/clients              POST   Create new client
/api/admin/clients/:id          GET    Get client details
/api/admin/clients/:id          PUT    Update client
/api/admin/clients/:id/users    GET    List client users
/api/admin/clients/:id/users    POST   Create client user (admin-created only)
/api/admin/clients/:id/users/:uid PUT  Update/reset password
```

---

## Frontend Structure

### New Components

```
frontend/src/features/client-portal/
├── components/
│   ├── ClientDashboard.tsx      # Overview with scorecards
│   ├── ClientTickets.tsx        # Ticket list (read-only)
│   ├── ClientSites.tsx          # Website list
│   ├── ClientProjects.tsx       # Project list
│   └── BillingDisclaimer.tsx    # Required disclaimer banner
├── hooks/
│   ├── useClientTickets.ts
│   ├── useClientSites.ts
│   └── useClientProjects.ts
└── layouts/
    └── ClientLayout.tsx         # Portal wrapper with disclaimer
```

### Component Reuse

| Category | Reuse % | Components |
|----------|---------|------------|
| UI Primitives | 100% | Card, Table, Button, etc. |
| Charts | 90% | All Recharts components |
| Scorecards | 95% | Scorecard component |
| Layout | 80% | Modified Sidebar/Header |

### Routes

```typescript
// Internal (existing)
/overview, /support, /projects, /billing

// Client Portal (new)
/client/dashboard    - Overview
/client/tickets      - Support history
/client/sites        - Hosted websites
/client/projects     - Project status
```

---

## Key UI Component: Billing Disclaimer

```tsx
// Shown persistently on client portal
<BillingDisclaimer>
  Note: Support hours and billing data shown here are estimates
  and may be adjusted before final invoicing. Please refer to
  your official invoices for finalized charges.
</BillingDisclaimer>
```

---

## Deployment

**Single deployment** - same Docker containers serve both internal and client portal:

```
velocity.peakonedigital.com/billing-overview         → Internal
velocity.peakonedigital.com/billing-overview/client  → Client Portal
```

OR with subdomain (optional):

```
velocity.peakonedigital.com/billing-overview  → Internal
portal.peakonedigital.com                     → Client Portal
```

---

## Implementation Phases

### Phase 1: Infrastructure & Database (2-3 days)

**Infrastructure Setup:**
- [ ] Add Cloudflare DNS record for `portal.peakonedigital.com`
- [ ] Update cloudflared tunnel config on NAS to route new subdomain
- [ ] Add Traefik labels to docker-compose.yml for portal routes
- [ ] Test routing works (can reach frontend on new subdomain)

**Database Migrations:**
- [ ] Create migration: `clients` table
- [ ] Create migration: `client_users` table
- [ ] Create migration: `client_website_links` table
- [ ] Add `client_id` column to `fluent_tickets` table
- [ ] Create seed script to populate clients from existing `customer_id` data
- [ ] Run migrations in dev, test, then production

### Phase 2: Authentication & Client API (3-4 days)

**Auth Layer:**
- [ ] Create `ClientUser` model (backend/models/ClientUser.js)
- [ ] Create `/api/auth/client/login` endpoint
- [ ] Create `/api/auth/client/logout` endpoint
- [ ] Add `requireClient` middleware
- [ ] Add `enforceClientScope` middleware
- [ ] Extend JWT payload with `clientId`, `clientName`

**Client Data Endpoints:**
- [ ] Create `ClientRepository` with scoped queries
- [ ] Implement `GET /api/client/profile`
- [ ] Implement `GET /api/client/tickets` (list, no hours)
- [ ] Implement `GET /api/client/tickets/:id` (detail with conversation)
- [ ] Implement `GET /api/client/tickets/:id/messages` (FluentSupport API integration)
- [ ] Implement `GET /api/client/sites` (from Twenty CRM)
- [ ] Implement `GET /api/client/projects` (from Twenty CRM)
- [ ] Implement `GET /api/client/activity` (summary endpoint)
- [ ] Add response transformers to strip internal fields (hours, revenue)

**Admin Endpoints for Client Management:**
- [ ] Implement `GET/POST /api/admin/clients`
- [ ] Implement `GET/PUT /api/admin/clients/:id`
- [ ] Implement `GET/POST /api/admin/clients/:id/users`
- [ ] Implement `PUT /api/admin/clients/:id/users/:uid` (password reset)

### Phase 3: Frontend - Client Portal (4-5 days)

**Layout & Navigation:**
- [ ] Create `ClientLayout` component with persistent disclaimer banner
- [ ] Create `ClientSidebar` with simplified nav (Dashboard, Tickets, Sites, Projects)
- [ ] Create `BillingDisclaimer` component
- [ ] Update router to detect portal subdomain and route accordingly
- [ ] Extend `AuthContext` for client role detection

**Portal Pages:**
- [ ] Create `ClientDashboard` - activity summary, scorecards, recent items
- [ ] Create `ClientTickets` - ticket list with filtering
- [ ] Create `ClientTicketDetail` - full conversation view
- [ ] Create `ClientSites` - website list with status
- [ ] Create `ClientProjects` - project list with status

**Data Hooks:**
- [ ] Create `useClientTickets` hook
- [ ] Create `useClientTicketDetail` hook (with conversation)
- [ ] Create `useClientSites` hook
- [ ] Create `useClientProjects` hook
- [ ] Create `useClientActivity` hook

### Phase 4: Admin UI for Client Management (2-3 days)

**Internal Dashboard Additions:**
- [ ] Add "Clients" menu item to internal Sidebar
- [ ] Create `AdminClients` page - list all clients
- [ ] Create `AdminClientDetail` page - view/edit client
- [ ] Create `AdminClientUsers` section - manage client portal users
- [ ] Add "Create Client User" form with auto-generated password
- [ ] Add password reset functionality

### Phase 5: Testing & Polish (2-3 days)

**Testing:**
- [ ] Unit tests for ClientRepository (data scoping)
- [ ] Integration tests for client API endpoints
- [ ] Security tests: verify cross-client data isolation
- [ ] E2E tests: client login → view tickets → view sites
- [ ] Test FluentSupport conversation fetching

**Polish:**
- [ ] Mobile-responsive design for all portal pages
- [ ] Loading states and error handling
- [ ] Empty states (no tickets, no sites, etc.)
- [ ] Accessibility audit (WCAG 2.1 AA)

### Phase 6: Deployment & Documentation (1-2 days)

**Deployment:**
- [ ] Deploy to production
- [ ] Verify Traefik routing in production
- [ ] Verify Cloudflare SSL working for new subdomain
- [ ] Monitor logs for errors

**Documentation:**
- [ ] Admin guide: how to create client accounts
- [ ] Client guide: how to log in and use portal
- [ ] Update CLAUDE.md with client portal architecture
- [ ] Pilot with 1-2 clients, gather feedback

**Total estimate: 3-4 weeks**

---

## Security Checklist

- [ ] All `/api/client/*` routes require authentication
- [ ] All queries include mandatory `client_id` filter
- [ ] No dollar amounts in any client response
- [ ] No hours/estimates in ticket responses
- [ ] Cross-client data access impossible
- [ ] Rate limiting on client login (5 attempts/15min)
- [ ] Audit logging for client access

---

## Files to Modify

**Backend:**
- `backend/routes/auth.js` - Add client login endpoint
- `backend/middleware/auth.js` - Add client middleware
- `backend/db/schema.sql` - Reference for migrations
- NEW: `backend/routes/client.js` - Client API endpoints
- NEW: `backend/repositories/ClientRepository.js`
- NEW: `backend/models/ClientUser.js`

**Frontend:**
- `frontend/src/contexts/AuthContext.tsx` - Extend for client role
- `frontend/src/router.tsx` - Add client routes
- `frontend/src/components/shared/Sidebar.tsx` - Role-based menu
- NEW: `frontend/src/features/client-portal/*` - All client components

**Database:**
- NEW: `backend/db/migrations/XXX_create_client_tables.sql`
