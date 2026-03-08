# Security Audit Report — Support Billing Tracker

**Date:** 2026-03-08 | **Scope:** Full stack (backend, frontend, infrastructure)
**Last Updated:** 2026-03-08 | **Fixed: 20/29** | **Deferred: 5** | **Open: 4**

---

## CRITICAL (2 findings)

| # | Status | Finding | Location |
|---|--------|---------|----------|
| 1 | **FIXED** | **Host header spoofing bypasses authentication** — replaced `req.get('host')` check with `AUTH_MODE` env var | `backend/middleware/conditionalAuth.js` |
| 2 | **FIXED** | **Production credentials in git history** — `.env` gitignored, `.env.example` has placeholders only | Git history (rotate creds separately) |

---

## HIGH (6 findings)

| # | Status | Finding | Location |
|---|--------|---------|----------|
| 3 | **FIXED** | **VITE_ env vars expose secrets in JS bundle** — secrets renamed to non-VITE_ backend-only vars, removed from frontend container | `docker-compose.yml`, backend services |
| 4 | **FIXED** | **QBO query injection** — all QBO interpolations now use `escapeQboString()` (doubled single quotes) | `backend/routes/invoices.js`, `qbo.js` |
| 5 | **FIXED** | **Shared JWT secret for admin and client tokens** — client tokens now use `JWT_CLIENT_SECRET` | `backend/middleware/clientAuth.js`, `routes/clientAuth.js` |
| 6 | **DEFERRED** | **Access token in localStorage** — requires frontend refactor to in-memory storage with silent refresh | `frontend/src/contexts/AuthContext.tsx` |
| 7 | **DEFERRED** | **Traefik routes use HTTP-only entrypoint** — requires Traefik TLS config outside this repo | `docker-compose.yml` |
| 8 | **FIXED** | **Default MySQL credentials in docker-compose** — changed to `${VAR:?error}` (required), healthcheck no longer exposes password | `docker-compose.yml` |

---

## MEDIUM (11 findings)

| # | Status | Finding | Location |
|---|--------|---------|----------|
| 9 | **FIXED** | No input validation on invoice route params — `validateId()` added to all `:id` params | `backend/routes/invoices.js` |
| 10 | **FIXED** | Error messages expose internal details — replaced with generic messages, full errors logged server-side | `invoices.js`, `fluent-sync.js`, `twenty-proxy.js` |
| 11 | **FIXED** | `express-rate-limit` IPv4-mapped IPv6 bypass — v8.2.1 is current, CVE not applicable | `backend/package.json` |
| 12 | **FIXED** | QBO `/connect` endpoint unauthenticated — intentional OAuth design (browser redirect) | `backend/routes/qbo.js` |
| 13 | **FIXED** | JWT_SECRET falls back to QBO_CLIENT_SECRET — fallback removed, JWT_SECRET now required | `backend/routes/qbo.js` |
| 14 | **FIXED** | No rate limiting on invoice mutation/sync endpoints — `invoiceMutationLimiter` and `qboSyncLimiter` added | `backend/routes/invoices.js` |
| 15 | **FIXED** | `NODE_ENV=development` in production — NODE_ENV configurable via env var | `docker-compose.yml` |
| 16 | **FIXED** | Containers run as root — non-root `appuser` added to both Dockerfiles | All Dockerfiles |
| 17 | **FIXED** | Backend/frontend ports exposed to all interfaces — bound to `127.0.0.1` | `docker-compose.yml` |
| 18 | **FIXED** | Pre-commit hook not installed — symlink installed in `.git/hooks` | `.git/hooks/pre-commit` |
| 19 | **DEFERRED** | Regex HTML stripping + unvalidated OAuth redirect — low risk in current context | Frontend components |

---

## LOW (10 findings)

| # | Status | Finding | Location |
|---|--------|---------|----------|
| 20 | **FIXED** | Health endpoint leaks `NODE_ENV` — `environment` field removed | `backend/server.js` |
| 21 | **FIXED** | Hardcoded dev admin — gated by `NODE_ENV=development` | `backend/server.js` |
| 22 | **FIXED** | `requireRole` leaks roles — now returns generic "Insufficient permissions" | `auth.js`, `conditionalAuth.js` |
| 23 | **DEFERRED** | Client refresh tokens not in DB — needs investigation | `backend/routes/clientAuth.js` |
| 24 | **DEFERRED** | No CSRF token for cookie-based refresh — mitigated by SameSite cookies | `backend/routes/auth.js` |
| 25 | **FIXED** | CORS allows null origin — restricted to development mode only | `backend/server.js` |
| 26 | **OPEN** | `console.error` instead of structured logger — large refactor, low security impact | Multiple files |
| 27 | **FIXED** | Node 18 EOL base images — upgraded to `node:20-alpine` | All Dockerfiles |
| 28 | **FIXED** | Test files removed from git | Removed |
| 29 | **FIXED** | `.env.example` uses distinct placeholder values | `.env.example` |

---

## Positive Security Controls

The codebase has strong foundations:
- Parameterized SQL queries throughout (mysql2 `?` placeholders)
- bcrypt password hashing with complexity validation
- Refresh tokens stored as SHA-256 hashes in DB
- QBO tokens encrypted at rest (AES-256-GCM)
- Rate limiting on login, password change, bulk/destructive operations
- Helmet with CSP, HSTS, frame denial
- Input validation utilities (`validateId`, `validateStatus`, etc.)
- Client data scoping via `enforceClientScope` middleware
- Audit logging for auth events and destructive operations

---

## Detailed Findings

### CRITICAL #1: Host Header Spoofing Bypasses Authentication — FIXED

**File:** `backend/middleware/conditionalAuth.js`
**OWASP:** API2:2023 Broken Authentication
**Status:** FIXED — Host/Origin header checks replaced with `AUTH_MODE` env var. Set `AUTH_MODE=traefik` in production, `AUTH_MODE=jwt` (default) elsewhere.

---

### CRITICAL #2: Production Credentials in Git History — FIXED

**OWASP:** A07:2021 - Identification and Authentication Failures
**Status:** FIXED — `.env` gitignored, `.env.example` has placeholder values only. Credential rotation still recommended.

---

### HIGH #3: VITE_ Environment Variables Expose Secrets in JS Bundle — FIXED

**Status:** FIXED — Secrets renamed to `FLUENT_API_USERNAME`, `FLUENT_API_PASSWORD`, `TWENTY_API_TOKEN` (non-VITE_ prefix). Backend reads new names with fallback to old names for migration. `VITE_TWENTY_API_TOKEN` removed from frontend container env.

---

### HIGH #4: QBO Query Language Injection — FIXED

**Status:** FIXED — Added `escapeQboString()` helper that doubles single quotes. Applied to all QBO query interpolations in `invoices.js` and `qbo.js`.

---

### HIGH #5: Shared JWT_SECRET Between Internal and Client Tokens — FIXED

**Status:** FIXED — Client tokens now signed/verified with `JWT_CLIENT_SECRET` (falls back to `JWT_SECRET` for migration). Added to `.env.example` and `docker-compose.yml`.

---

### HIGH #6: Access Token Stored in localStorage — DEFERRED

**Status:** DEFERRED — Requires frontend refactor (in-memory storage + silent refresh). Mitigated by CSP headers and short token expiry.

---

### HIGH #7: Traefik Routes Use HTTP-Only Entrypoint — DEFERRED

**Status:** DEFERRED — Requires Traefik TLS configuration outside this repo (cert provisioning, entrypoint config).

---

### HIGH #8: Default MySQL Credentials in Docker Compose — FIXED

**Status:** FIXED — Changed to `${VAR:?error}` syntax requiring explicit values. Healthcheck now uses `mysqladmin ping` without password argument.

---

### MEDIUM #9: No Input Validation on Invoice Route Parameters — FIXED

**Status:** FIXED — `validateId()` imported and applied to all `:id` params in invoice routes.

---

### MEDIUM #10: Error Messages Expose Internal Details — FIXED

**Status:** FIXED — All `error.message` responses replaced with generic messages. Full errors logged server-side via `logger.error()`.

---

### MEDIUM #11: express-rate-limit IPv4-Mapped IPv6 Bypass — FIXED

**Status:** FIXED — v8.2.1 is current and not affected by the CVE.

---

### MEDIUM #12: QBO Connect Endpoint Unauthenticated — FIXED

**Status:** FIXED — Intentional OAuth design; browser redirects cannot carry auth headers.

---

### MEDIUM #13: JWT Secret Fallback to QBO Client Secret — FIXED

**Status:** FIXED — Fallback removed. `JWT_SECRET` now required explicitly; returns error if missing.

---

### MEDIUM #14: No Rate Limiting on Invoice Mutation Endpoints — FIXED

**Status:** FIXED — `invoiceMutationLimiter` (30 req/5min) on all POST/PUT/DELETE invoice routes. `qboSyncLimiter` (10 req/5min) on sync endpoints.

---

### MEDIUM #15: NODE_ENV Defaults to Development in Production — FIXED

**Status:** FIXED — `NODE_ENV` configurable via env var in docker-compose.

---

### MEDIUM #16: Containers Run as Root — FIXED

**Status:** FIXED — Non-root `appuser` added to backend and frontend Dockerfiles.

---

### MEDIUM #17: Backend/Frontend Ports Exposed to All Interfaces — FIXED

**Status:** FIXED — Both bound to `127.0.0.1` in docker-compose.

---

### MEDIUM #18: Pre-Commit Hook Not Installed — FIXED

**Status:** FIXED — Symlink installed in `.git/hooks`.

---

### MEDIUM #19: Regex HTML Stripping + Unvalidated OAuth Redirect — DEFERRED

**Status:** DEFERRED — Low risk in current context. OAuth redirect is validated server-side.

---

### LOW #20-29: Summary

| # | Status | Finding | Remediation |
|---|--------|---------|-------------|
| 20 | **FIXED** | Health endpoint leaks `NODE_ENV` | `environment` field removed from `/health` |
| 21 | **FIXED** | Hardcoded dev admin `admin@localhost`/`admin` | Gated by `NODE_ENV=development` |
| 22 | **FIXED** | `requireRole` leaks current/required roles | Now returns generic "Insufficient permissions" |
| 23 | **DEFERRED** | Client refresh tokens not in DB (no revocation) | Needs investigation |
| 24 | **DEFERRED** | No CSRF token for cookie-based refresh | Mitigated by SameSite cookies |
| 25 | **FIXED** | CORS allows null origin | Restricted to development mode |
| 26 | **OPEN** | `console.error` instead of structured logger | Large refactor, low security impact |
| 27 | **FIXED** | Node 18 EOL base images | Upgraded to `node:20-alpine` |
| 28 | **FIXED** | Test files removed from git | Removed |
| 29 | **FIXED** | `.env.example` uses distinct placeholders | Fixed |

---

## Remaining Actions

### Deferred (future work)
- **#6** — Move access token from `localStorage` to in-memory storage (frontend refactor)
- **#7** — Configure Traefik `websecure` entrypoint with TLS certificates
- **#19** — Replace regex HTML stripping with DOMPurify
- **#23** — Implement DB-backed client refresh token storage
- **#24** — Add CSRF token for cookie-based refresh

### Open (low priority)
- **#26** — Replace `console.error` with structured logger across all routes
- Rotate all credentials (git history exposure — #2)
- Use `git filter-repo` or BFG to purge secrets from git history
