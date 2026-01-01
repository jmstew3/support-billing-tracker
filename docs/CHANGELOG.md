# Changelog

Development history and updates for Support Billing Tracker.

## Recent Major Updates

### BasicAuth Authentication Implementation (October 8, 2025) 🔒
- Implemented Traefik BasicAuth middleware at reverse proxy level
- Protected routes: `/billing-overview` and `/billing-overview-api`
- Files Modified: `docker-compose.yml`, `.env.docker`, `docs/authentication-plan.md`
- Security Level: Medium - Adequate for internal team use (5-10 users)

### Unified Header Bar Migration (January 2025) 🎯
- Migrated all 4 pages to use unified `PageHeader` component
- Deleted `SupportHeader.tsx` (67 lines removed)
- Support page now uses `viewMode` from `PeriodContext`
- Benefits: Single source of truth, consistent behavior, reduced duplication

### Component Architecture Refactoring (October 2, 2025) 🏗️
- Created `DataTrackerCard.tsx` as single source of truth for tracker styling
- New components: `CostTrackerCard.tsx`, `RevenueTrackerCard.tsx`
- Folder reorganization: `base/`, `shared/`, `charts/`, page-specific folders
- `SupportTickets.tsx` reduced from 3,247 to 2,628 lines (19% smaller)

### Component Renaming (October 2, 2025) 📝
- `BillingOverview.tsx` → `Dashboard.tsx` (main landing page)
- `Dashboard.tsx` → `SupportTickets.tsx` (support tracking)
- `HostingBilling.tsx` → `TurboHosting.tsx` (MRR tracking)

### Invoice Status Enum Update (September 30, 2025) 💼
- `UNPAID` → `NOT_READY`, `DRAFTED` → `READY`, `SENT` → `INVOICED`
- Created migration scripts for Twenty CRM
- Updated ProjectCard with color-coded status badges

### Hours Column Validation (September 23, 2025) ⏱️
- Quarter-hour increment enforcement (0.25 steps only)
- Automatic rounding: 0.26→0.25, 0.38→0.50, etc.

### Interactive Cost Calculation Filtering (September 23, 2025) 📊
- Click urgency levels to toggle visibility
- Deselected items fade to grey
- Reset button for restoring defaults

### Pricing Model Simplification (September 18, 2025) 💰
- Removed flat rate comparison ($125/hr)
- Centralized pricing in `frontend/src/config/pricing.ts`
- Current rates: Regular $150/hr, Same Day $175/hr, Emergency $250/hr

### UI/UX Improvements (September 18, 2025) 🎨
- Month navigation arrows with smart navigation
- Simplified request count display
- Reduced scorecard padding (24px → 16px)

### Twenty CRM Integration (January 23, 2025) 🎫
- REST API: `https://twenny.peakonedigital.com/rest/supportTickets`
- Created `ticketTransform.ts` for data conversion
- Tickets display with 🎫 icon, merged with SMS requests
- Source filtering (SMS-only, tickets-only, or both)

### Source Indicators (September 23, 2025) 📱
- Added `source` field: 'sms', 'ticket', 'email', 'phone'
- Icons: 💬 Text, 🎫 Ticket, 📧 Email, 📞 Phone
- Column width optimizations for better layout

### Header & Navigation (September 16, 2025) 🎨
- Sticky header with Period and View controls
- CORS fix for multiple localhost ports
- Bulk actions with Apply/Cancel pattern

### Enhanced Data Visualizations (September 2025) 📊
- Radar chart for volume, urgency, effort metrics
- Modern pie chart with animated transitions
- All 10 categories supported

### Status-Based Deletion System (July 2025) 🎯
- Status types: `active`, `deleted`, `ignored`
- Single source of truth, no permanent data loss
- Status column in CSV for portability

### Bulk Actions (July 2025)
- Checkbox selection with bulk toolbar
- Delete, category change, urgency change
- Smart selection clearing

### Other Fixes
- Week View Removal: Simplified to All/Month/Day
- Y-Axis Fix: `allowDecimals={false}` for integer counts
- iMessage Reaction Filtering: Removed "Emphasized", "Liked", "Disliked"

## Current Data Statistics
- **Total Requests**: 490+ (430 SMS + 60 Twenty CRM tickets)
- **Date Range**: May 2025 - January 2025
- **Categories**: Support (88.4%), Hosting (8.4%), Forms (2.3%), Others (3%)
- **Urgency**: Medium (90.7%), High (6.7%), Low (2.6%)
- **Source Distribution**: ~88% SMS, ~12% Tickets
