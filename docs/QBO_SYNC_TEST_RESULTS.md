# QBO Invoice Sync — Integration Test Results

## Test Environment
- Billing Dashboard: localhost:5173
- QBO Sandbox: Advanced Sandbox Company_US_1 (realmId: 9341455736293777)
- Date: 2026-03-08
- Starting state: 1 invoice (VEL-2026-001, Sent, QBO Synced ID: 11241)

## Test Results Summary

| Test | Description | Result |
|------|-------------|--------|
| Test 1 | Stale QBO Link Recovery (VEL-2026-001) | PASS |
| Test 2 | Edit Invoice + Resync Updates QBO | PASS |
| Test 3 | Delete from QBO + Resubmit | PASS |
| Test 4 | Duplicate Period Prevention | PASS (Gap Documented) |
| Test 5 | Edit Period Dates + Resync | PASS |
| Test 6 | Invoice Date Editing Gap | PASS (Gap Documented) |
| Test 7 | Sync Error Handling | PASS |
| Test 8 | Bulk Sync Behavior | PASS |

## Detailed Results

### Test 1: Stale QBO Link Recovery
- **Scenario:** VEL-2026-001 showed "QBO Synced" (ID 11241) but the QBO invoice had been deleted from sandbox
- **Steps:** Revert to Draft → Finalize & Sync to QBO
- **Result:** QBO reused txnId 11241 (same DocNumber lookup). Status restored to Sent + Synced.
- **Key Finding:** QBO may reuse txnIds for deleted invoices when the same DocNumber is used

### Test 2: Edit Invoice + Resync Updates QBO
- **Scenario:** Generated VEL-2026-002 for Jan 2026, synced, then reverted, edited line items, and re-synced
- **Steps:** Generate → Sync (QBO ID 11242) → Revert → Edit quantity → Re-sync
- **Result:** Same QBO ID 11242 retained. sync_token incremented 0→1 confirming UPDATE (not CREATE). No duplicate invoice.
- **Key Finding:** DocNumber idempotency works correctly — finds existing invoice and updates it

### Test 3: Delete from QBO + Resubmit
- **Scenario:** Generated VEL-2026-003 for Dec 2025, synced (QBO ID 11243), deleted from QBO sandbox, then re-synced
- **Steps:** Generate → Sync (QBO 11243) → Delete in QBO UI → Revert → Re-sync
- **Result:** New QBO ID 11244 created (DocNumber query found nothing since original was deleted)
- **Key Finding:** After QBO-side deletion, revert + resync correctly creates a fresh QBO invoice

### Test 4: Duplicate Period Prevention (Gap)
- **Scenario:** Attempted to generate a second invoice for the same period (Nov 2025) that already had an invoice
- **Result:** System allowed the duplicate invoice. No prevention guard exists in generateInvoice.
- **Key Finding:** Support requests already linked to the first invoice showed $0 on the duplicate, but Projects and Hosting line items were fully duplicated
- **Severity:** HIGH — requires follow-up fix

### Test 5: Edit Period Dates + Resync
- **Scenario:** VEL-2026-004 (Nov 2025) — changed period from Nov 1-30 to Nov 5-25, then re-synced
- **Steps:** Revert → Edit period_start/period_end → Re-sync (new QBO ID 11245)
- **Result:** Period dates persisted in DB and propagated to QBO via line item descriptions
- **Key Finding:** Period dates don't have a dedicated QBO field — they appear in line item descriptions (e.g., "Turbo Hosting - 60 sites (November 2025)"). TxnDate maps to invoice_date, not the period.
- **UI Bug:** Date picker calendar selection triggers page navigation before save completes. Period had to be updated via API.

### Test 6: Invoice Date Editing Gap (Documented)
- **Scenario:** Attempted to edit invoice_date and due_date on a draft invoice
- **UI Test:** No edit control (pencil icon) exists for invoice_date or due_date in edit mode — only Period has one
- **API Test:** PUT with invoice_date/due_date returns 200 but fields are silently ignored (not in allowedFields)
- **Severity:** MEDIUM — follow-up task needed

### Test 7: Sync Error Handling
- **Scenario:** Manually set VEL-2026-005 to qbo_sync_status='error' with error message, then tested retry
- **Error State UI:** Red "Error" badge with warning triangle in invoice list; "Retry QBO Sync" button in detail view
- **Retry:** Clicked "Retry QBO Sync" → successfully synced (QBO ID 11246), error cleared
- **Key Finding:** Error handling works as designed — error state is visible, retry is accessible, and recovery works

### Test 8: Bulk Sync Behavior
- **Scenario:** Generated 3 invoices (Jul/Sep/Oct 2025), set to sent+pending, used bulk sync from Settings
- **Steps:** Settings → Bulk Invoice Sync → "Sync All Eligible" (3 eligible)
- **Result:** All 3 synced successfully. Eligible count dropped to 0. "Synced: 3 / Total: 3" displayed.
- **QBO IDs:** 11247, 11248, 11249 (sequential, unique)
- **Key Finding:** Bulk sync processes correctly with rate limiting. UI provides clear feedback.

## Findings and Follow-Up Tasks

| # | Finding | Severity | Recommended Action |
|---|---------|----------|--------------------|
| 1 | No duplicate period prevention in generateInvoice | HIGH | Add guard to check for existing invoice with same customer_id + overlapping period before generating |
| 2 | invoice_date and due_date not editable | MEDIUM | Add invoice_date and due_date to allowedFields in backend update handler; add UI edit controls for draft invoices |
| 3 | Hard delete loses QBO reference history | LOW | Consider adding a cancelled/voided status instead of hard delete for invoices that have been synced to QBO |
| 4 | Period date picker UI bug | LOW | Fix calendar component — selecting an end date triggers page navigation before the save action completes |

## QBO ID Mapping (Final State)

| Invoice | Period | QBO ID | Notes |
|---------|--------|--------|-------|
| VEL-2026-001 | Feb 2026 | 11241 | Original invoice, recovered from stale link |
| VEL-2026-002 | Jan 2026 | 11242 | Test 2 — edit+resync verified UPDATE behavior |
| VEL-2026-003 | Dec 2025 | 11244 | Test 3 — re-created after QBO deletion (was 11243) |
| VEL-2026-004 | Nov 2025 | 11245 | Test 5 — period dates modified then restored |
| VEL-2026-005 | Aug 2025 | 11246 | Test 7 — error recovery verified |
| VEL-2026-006 | Jul 2025 | 11247 | Test 8 — bulk synced |
| VEL-2026-007 | Sep 2025 | 11248 | Test 8 — bulk synced |
| VEL-2026-008 | Oct 2025 | 11249 | Test 8 — bulk synced |
