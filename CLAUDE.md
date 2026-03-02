# Support Billing Tracker

Business intelligence dashboard for support request tracking and billing. Processes iMessage conversations and FluentSupport tickets into structured data.

## Quick Reference

| Resource | Location |
|----------|----------|
| Security & Auth | `docs/SECURITY.md` |
| FluentSupport Sync | `docs/FLUENT_SYNC.md` |
| Invoicing & QBO | `docs/INVOICING.md` |
| Troubleshooting | `docs/TROUBLESHOOTING.md` |
| Changelog | `docs/CHANGELOG.md` |
| API Documentation | `docs/API.md` |
| Architecture | `docs/ARCHITECTURE.md` |

## Quick Start

```bash
# Start with Docker
docker-compose up -d

# Frontend: http://localhost:5173
# Backend API: http://localhost:3011/api
# Production: https://billing.peakonedigital.com

# Credentials (BasicAuth) - see .env
# DO NOT commit actual credentials to documentation
```

### Data Processing Pipeline
```bash
# 1. Export iMessages
python3 export_imessages.py chat-backup.db [chat_id] [start] [end] data/01_raw/messages_export.csv

# 2. Clean messages
cd src && python3 data_preprocessor.py

# 3. Extract requests
cd request-extractor && python3 main.py

# 4. Sync FluentSupport tickets
./scripts/sync-fluent-tickets.sh
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   iMessage DB   │───▶│  ETL Pipeline   │───▶│    MySQL DB     │
│  FluentSupport  │    │  (Python)       │    │                 │
└─────────────────┘    └─────────────────┘    └────────┬────────┘
                                                       │
                       ┌─────────────────┐    ┌────────▼────────┐
                       │  React Frontend │◀───│  Node.js API    │
                       │  (Vite + TS)    │    │  (Express)      │
                       └─────────────────┘    └─────────────────┘
```

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind CSS, Recharts, Node.js/Express, MySQL, Docker

## Application Pages

| Page | Route | Component | Purpose |
|------|-------|-----------|---------|
| **Billing Overview** | `'overview'` | `Dashboard.tsx` | Combined revenue (main landing) |
| **Support** | `'home'` | `SupportTickets.tsx` | Ticket tracking & analysis |
| **Projects** | `'projects'` | `Projects.tsx` | Project revenue tracking |
| **Turbo Hosting** | `'billing'` | `TurboHosting.tsx` | Hosting MRR tracking |

## Key Configuration

**Environment (`.env`):**
```bash
# API
VITE_API_URL=http://localhost:3011/api
VITE_TWENTY_API_URL=https://twenny.peakonedigital.com/rest/supportTickets
VITE_TWENTY_API_TOKEN=your-token

# FluentSupport
VITE_FLUENT_API_URL=https://support.peakonedigital.com
VITE_FLUENT_DATE_FILTER=2025-10-11

# Database
DB_NAME=velocity_billing
MYSQL_PORT=3307
```

## Billing Policies

**Free Credits (June 2025+):**
- 1 free landing page per month
- 1 free multi-form per month
- 5 free basic forms per month
- 10 free support hours per month

**Pricing:** Regular $150/hr, Same Day $175/hr, Emergency $250/hr

**Hosting:** $99/month with proration. 1 free site per 20 paid sites.

## File Structure

```
├── frontend/src/
│   ├── components/
│   │   ├── base/          # DataTrackerCard (shared styling)
│   │   ├── shared/        # PageHeader, Sidebar, Pagination
│   │   ├── charts/        # All chart components
│   │   ├── dashboard/     # Dashboard.tsx, RevenueTrackerCard
│   │   ├── support/       # SupportTickets.tsx, CostTrackerCard
│   │   ├── projects/      # Projects.tsx
│   │   └── hosting/       # TurboHosting.tsx
│   ├── services/          # API clients (api.ts, billingApi.ts, etc.)
│   ├── config/pricing.ts  # All pricing configuration
│   └── types/             # TypeScript interfaces
├── backend/
│   ├── routes/            # API endpoints
│   ├── services/          # fluentSupportApi.js
│   └── db/schema.sql      # Database schema
├── src/                   # Python ETL pipeline
├── scripts/               # Backup/sync scripts
└── docs/                  # Detailed documentation
```

---

## Critical Implementation Notes #memorize

### React Performance - Infinite Loop Prevention ⚠️

**CRITICAL:** Always use `useMemo` for arrays/objects in `useEffect` dependencies.

```typescript
// ❌ WRONG - New reference every render → infinite loop
const myArray = ['a', 'b', 'c'];
useEffect(() => { ... }, [myArray]);

// ✅ CORRECT - Constant outside component
const MY_ARRAY = ['a', 'b', 'c'] as const;

// ✅ CORRECT - useMemo for computed values
const myData = useMemo(() => Array.from(new Set(...)), [deps]);
```

**Debug Checklist:**
1. Check console for repeated mounting logs
2. Inspect useEffect deps - any arrays/objects created in component body?
3. Move static arrays outside component
4. Wrap computed arrays with `useMemo`

**Remember:** React compares by **reference**, not value. `['a'] !== ['a']`

### Date and Time Handling #memorize

**Database:** MySQL stores dates as `YYYY-MM-DD`, times in 24-hour format (EDT timezone)

**Frontend Date Parsing Issue:**
```javascript
// ❌ WRONG - new Date("2025-06-23") interprets as UTC midnight
const date = new Date(dateString);

// ✅ CORRECT - Parse components manually
const [year, month, day] = dateString.split('-').map(Number);
const date = new Date(year, month - 1, day); // month is 0-indexed
```

**Time Display:** 12-hour with AM/PM (e.g., "8:47 AM")

**iMessage Import:** UTC → EDT conversion (subtract 4 hours)

---

## Development Notes

**After any updates:** Test the application and monitor console for errors.

**Status-Based Architecture:** Requests use `active`/`deleted`/`ignored` status - no permanent deletion.

**Testing:** `npm run dev` (port 5173), `npm run build` for production.

**Backups:** `./scripts/backup-mysql.sh` (daily at 2 AM via cron)
