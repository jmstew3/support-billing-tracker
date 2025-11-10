# Support Ticket Integration Plan

This document outlines the steps to integrate Support Tickets from the self-hosted Twenty CRM into the Billable Requests component of the React dashboard.

## 1. Define Data Model & API Client
- Create a TypeScript interface in `frontend/src/types/supportTicket.ts`:
  ```ts
  export interface SupportTicket {
    id: string;
    fsCreationDate: string;   // ISO date string from CRM
    description: string;      // Request summary
    priority: "NORMAL" | "MEDIUM" | "CRITICAL";
    // additional fields as needed
  }
  ```
- Implement `fetchSupportTickets()` in `frontend/src/utils/supportTicketsService.ts`:
  ```ts
  import { SupportTicket } from '../types/supportTicket';

  export async function fetchSupportTickets(): Promise<SupportTicket[]> {
    const res = await fetch('/api/supportTickets');
    if (!res.ok) throw new Error('Failed to load support tickets');
    return res.json();
  }
  ```

## 2. Extend Frontend Data Flow
- In the parent component or hook that loads billable requests (e.g. `useBillableRequests`), call `fetchSupportTickets()` alongside the existing data source.
- Normalize each `SupportTicket` into the app’s internal `BillableRequest` shape:
  ```ts
  import { BillableRequest } from '../types/request';
  import { SupportTicket } from '../types/supportTicket';

  function mapTicketToRequest(ticket: SupportTicket): BillableRequest {
    const date = ticket.fsCreationDate.split('T')[0]; 
    const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    const priorityMap = {
      NORMAL: 'Low',
      MEDIUM: 'Medium',
      CRITICAL: 'High',
    };
    return {
      id: `ticket-${ticket.id}`,
      date,
      day,
      description: ticket.description,
      priority: priorityMap[ticket.priority],
      hours: undefined,          // manual entry
      source: 'ticket',
    };
  }
  ```

## 3. Merge and Render Tickets
- Combine mapped ticket requests with existing SMS/text requests before passing into the table and charts.
- Ensure deduplication or sorting logic if needed (e.g. by date/time).

## 4. Update Source Column & Selector
- In `Dashboard.tsx` (or table configuration), add a case for `source === 'ticket'`:
  - Use the 🎫 ticket icon and label “Ticket” in the Source column.
- Extend the Source-filter dropdown to include “Ticket”:
  ```tsx
  const sourceOptions = ['sms', 'ticket', /* … */];
  ```

## 5. Manual Hours Entry
- Verify `EditableNumberCell` in `frontend/src/components/EditableNumberCell.tsx` supports empty initial values and enforces 0.25-hour steps.
- No additional changes unless edge cases arise when hours are blank.

## 6. Testing
- Unit tests for `fetchSupportTickets()` with mocked fetch responses.
- Tests for `mapTicketToRequest()` covering date parsing, day inference, and priority mapping.
- Component/integration tests: render Dashboard with ticket data to confirm correct icon, mapping, and hours cell behavior.

## 7. Documentation & Release
- Add a “Ticket System” entry under **Source Indicators** in `README.md`.
- Commit `support-ticket-plan.md` and related README updates.
- Tag and publish the release.

---

**Next Steps:**  
1. Implement types and service module.  
2. Wire up data fetching and mapping in the frontend.  
3. Update UI components and filters.  
4. Write tests and validate in the browser.
