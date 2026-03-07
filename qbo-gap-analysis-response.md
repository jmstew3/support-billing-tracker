# QBO API Integration — Gap Analysis Response

**Date:** 2026-03-06
**Responding to:** Agent Team Gap Analysis (3 review agents)
**Plan file:** `qbo-api-implementation-plan.md`

---

## Overall Assessment

Strong review. The agents found legitimate issues — C1, C2, and C4 are real bugs that would bite us in production. C3 is valid but lower severity than claimed. All findings have been addressed in the updated plan.

---

## Critical Gaps

### C1 — `refreshTokens()` not transactional: AGREE, real risk

**Verdict:** Must fix. This is the single most dangerous code path in the integration.

The sequence is: call Intuit's refresh endpoint (which *immediately* invalidates the old refresh token on their side) → then write the new tokens to MySQL. If the DB write fails after the Intuit call succeeds, we're locked out permanently.

The fix they propose is correct — acquire a dedicated connection, call `oauthClient.refresh()`, immediately persist on the same connection. One addition: on DB write failure, the `catch` block should log the new tokens (encrypted or hashed) to a separate recovery file or alert channel as a last-resort recovery mechanism, since at that point the new tokens exist only in memory.

Also agree on adding `last_refreshed_at` — cheap insurance for monitoring.

**Status:** Fixed in plan (Section 5.6).

---

### C2 — Description matching bug on credit lines: AGREE, guaranteed runtime failure

**Verdict:** Must fix. This would fail on every single invoice with free hours.

The code at line 328 of `invoiceService.js` writes `"Turbo Support Credit Applied (${summary.freeHoursApplied}h free)"` as the description, but the `qbo_item_mappings` table stores `"Turbo Support Credit Applied"` as the static `internal_description`. The `findQBOItemId()` exact match will fail every time.

The cleanest fix is option (a) from the review — in the mapper, detect credit lines by `item_type === 'other'` and the description *starting with* `"Turbo Support Credit Applied"` rather than matching the full string. We should NOT use LIKE in the SQL query because that makes the lookup ambiguous if other descriptions ever share the prefix. Instead, the mapper normalizes/strips the parenthetical before doing the DB lookup, passing the static key to the repository.

**Status:** Fixed in plan (Sections 7.2.2 and 7.2.4).

---

### C3 — CSRF state token has no persistence: PARTIALLY AGREE (downgraded to Important)

**Verdict:** Valid finding, wrong severity.

The finding is correct that there's no session middleware and a memory-stored state token would be lost on container restart. However, the OAuth flow is a manual, admin-initiated, one-time action (connecting QBO). It's not user-facing. A container restart mid-OAuth-flow is unlikely, and the only consequence is the flow fails and you redo it.

That said, the signed JWT approach they suggest is elegant and correct — self-validating, no storage needed, simple to implement. We should do it. But it's not in the same risk tier as C1/C2/C4.

**Status:** Fixed in plan (Section 5.7) using signed JWT with 10-minute expiry.

---

### C4 — No concurrency guard on token refresh: AGREE, real risk

**Verdict:** Must fix.

Since `qboClient` is a singleton and we have a 50-minute proactive scheduler refresh *plus* on-demand refresh on 401 responses, there's a real scenario where a scheduled refresh and a request-triggered refresh race each other. The second `oauthClient.refresh()` call would use the already-rotated refresh token and fail.

The `refreshPromise` pattern is exactly right:

```javascript
let _refreshPromise = null;

async refreshTokens(realmId) {
  if (_refreshPromise) {
    logger.info('Token refresh already in flight, awaiting existing promise');
    return _refreshPromise;
  }
  _refreshPromise = this._doRefreshTokens(realmId).finally(() => {
    _refreshPromise = null;
  });
  return _refreshPromise;
}
```

**Status:** Fixed in plan (Section 5.6).

---

## Important Gaps

### I1 — No update mechanism for synced invoices: AGREE with caveat

Correct that we block re-sync on `'synced'` status and have no update path. However, this was a *deliberate* scope decision — we said manual sync first (D6), validate for months.

For v1, the right approach is: if an invoice needs correction after sync, void it in QBO manually and re-sync with a reset `qbo_sync_status`. We should document this as the v1 workaround and add "Force Re-sync" as a Phase 8 backlog item. Don't overengineer the first version.

**Status:** Documented in Known Limitations (Section 11.5) with manual workaround.

---

### I2 — `intuit-oauth` SDK writes to `logs/oAuthClient-log.log`: AGREE, easy fix

Good catch. In Docker, the container filesystem may not have a `logs/` directory. During `OAuthClient` initialization, we should either create the directory or configure the SDK's logging. Quick one-liner.

**Status:** Fixed in plan (Section 5.1, added note).

---

### I3 — Bulk sync progress/resumability: AGREE it's a limitation, DISAGREE on priority

With only ~12 invoices per year (monthly billing, one customer), the bulk sync will never time out. Document the limitation, add cursor support later if we go multi-customer.

**Status:** Documented in Known Limitations (Section 11.5).

---

### I4 — `HOSTING_PRORATED` and `HOSTING_CREDIT` sharing a QBO item: INTENTIONAL

Both are hosting adjustments. Keeping them as the same QBO Service Item ("Free Hosting Credit") is correct — the `Description` field on each line distinguishes them. The QBO item is just for categorization.

**Status:** Confirmed intentional. Added clarifying note to mapping table (Section 6.2).

---

### I5 — No Joi validation for QBO responses: AGREE, good practice

The codebase validates FluentSupport API responses with Joi. We should do the same for QBO invoice responses — validate that `Invoice.Id` (string) and `Invoice.SyncToken` (string) exist before storing. Quick schema, low effort.

**Status:** Fixed in plan (Section 7.3, added Joi schema).

---

### I6 — Customer name matching is brittle: AGREE with the fix

The dry-run / match-only approach is smart. Since we have exactly one customer, the risk is low but the fix is free. Run customer sync in read-only mode first, display the match, require explicit confirmation before creating. This also protects against accidentally creating a duplicate customer in production QBO.

**Status:** Fixed in plan (Section 6.4, added `?dryRun=true` parameter).

---

## Unresolved Questions

### UQ1 — Where does `qboClient.js` read `realm_id` from?

**Resolution:** Always read from the `qbo_tokens` table (the active row). The `QBO_REALM_ID` env var is populated during initial setup as a convenience but the DB is authoritative. After a re-auth to a different company, the DB row updates automatically via `upsertToken()`. The env var is informational only — `qboClient.js` should read realm_id from the token record, never from `process.env`.

**Status:** Resolved in plan (Section 5.2, added note).

---

### UQ2 — What is `FRONTEND_URL` set to?

**Resolution:** In dev, the callback redirects the browser to `${FRONTEND_URL}/invoices?qbo=connected`. This should be `http://localhost:5173` in dev and `https://billing.peakonedigital.com` in production.

**Status:** Fixed. Added `FRONTEND_URL` to `.env` template and `docker-compose.yml` (Section 5.2).

---

### UQ3 — Are pre-merge invoices syncable?

**Resolution:** Historical invoices (before `feat/fluent-category-mapping`) may have different category/description values that don't match `qbo_item_mappings`. They should still sync because the mapper matches on `item_type` + `category` + `description` with a fallback chain. But we should test at least one historical invoice during Phase 6 to verify.

**Status:** Added test case to Phase 6 checklist (Section 10.1).

---

### UQ4 — Could `DocNumber` collide with CSV-imported invoices?

**Resolution:** Real risk. If any `VEL-YYYY-NNN` invoices were previously imported via CSV into production QBO, the API sync will get a 400 duplicate error. Fix: add a pre-cutover step in Phase 7 to query QBO for existing invoices with `DocNumber LIKE 'VEL-%'` and document any that already exist. Those would need to be skipped or voided before API sync.

**Status:** Fixed. Added collision check to Phase 7 pre-cutover checklist (Section 11.2).

---

### UQ5 — Sandbox customer creation

**Resolution:** Phase 0 checklist should say "create" not just "verify." Minor wording fix.

**Status:** Fixed (Section 4.3).

---

### UQ6 — Item sync pagination

**Resolution:** Correct that QBO queries return max 1000 results. With 11 items this doesn't matter. Note the limitation in a code comment and move on.

**Status:** Documented in Known Limitations (Section 11.5).

---

## Research Insights

All three minor points from the review are valid:

1. **Intuit CorePlus API metering** — The caching strategy in `qbo_item_mappings` is also a cost-control measure. Worth noting but no code change needed.

2. **Intuit "Reconnect URL" policy change** — R10 flags monitoring the blog but doesn't describe what code change would be needed. This is acceptable for now — the policy is still in flux and we'll address it when the requirement is finalized.

3. **Multi-tier blended rate rounding test case** — The example of `$1,575 / 8.5h = $185.294...` is a great edge case for validating our rounding logic. Added to Phase 6 checklist.

---

## Summary of Changes to Plan

| Finding | Severity | Disposition | Plan Section Updated |
|---------|----------|-------------|---------------------|
| C1 — Token refresh atomicity | Critical | **Fixed** | 5.3, 5.6 |
| C2 — Description matching bug | Critical | **Fixed** | 7.2.2, 7.2.4 |
| C3 — CSRF state persistence | Important (downgraded) | **Fixed** | 5.7 |
| C4 — Concurrent refresh race | Critical | **Fixed** | 5.6 |
| I1 — No invoice update after sync | Important | **Documented** | 11.5 |
| I2 — `intuit-oauth` log path | Important | **Fixed** | 5.1 |
| I3 — Bulk sync progress | Important | **Documented** | 11.5 |
| I4 — Hosting credits share QBO item | Important | **Confirmed intentional** | 6.2 |
| I5 — No Joi for QBO responses | Important | **Fixed** | 7.3 |
| I6 — Customer name matching | Important | **Fixed** | 6.4 |
| UQ1 — `realm_id` source of truth | Medium | **Resolved** | 5.2 |
| UQ2 — `FRONTEND_URL` for callback | Low | **Fixed** | 5.2 |
| UQ3 — Pre-merge invoice sync | Medium | **Added test** | 10.1 |
| UQ4 — `DocNumber` collision | Medium | **Fixed** | 11.2 |
| UQ5 — Sandbox customer wording | Low | **Fixed** | 4.3 |
| UQ6 — Item sync pagination | Low | **Documented** | 11.5 |

---

## Verdict

The plan is now ready for implementation. All critical gaps have been resolved, all important gaps are either fixed or documented as intentional limitations, and all unresolved questions have clear answers. The Review History table in the plan itself tracks every finding and its disposition for future reference.
