# Security Audit Report — Support Billing Tracker

**Date:** 2026-03-08 | **Scope:** Full stack (backend, frontend, infrastructure)

---

## CRITICAL (2 findings)

| # | Finding | Location |
|---|---------|----------|
| 1 | **Host header spoofing bypasses authentication** — `conditionalAuth` checks `req.get('host')` / `req.get('origin')` to decide whether JWT is required. An attacker can set `Host: billing.peakonedigital.com` to bypass auth entirely. | `backend/middleware/conditionalAuth.js:33-39` |
| 2 | **Production credentials in git history** — `.env` is gitignored now, but passwords, JWT secrets, QBO OAuth keys, and FluentSupport credentials have appeared in committed files historically and are recoverable. | Git history (commit `921359969f` and others) |

---

## HIGH (6 findings)

| # | Finding | Location |
|---|---------|----------|
| 3 | **VITE_ env vars expose secrets in JS bundle** — `VITE_FLUENT_API_PASSWORD`, `VITE_FLUENT_API_USERNAME`, `VITE_TWENTY_API_TOKEN` are baked into frontend JS, visible in DevTools. | `frontend/.env`, `frontend/src/services/twentyApi.ts:6-7` |
| 4 | **QBO query injection** — String interpolation in QBO queries with no/incorrect escaping (backslash instead of doubled quotes). | `backend/routes/invoices.js:503,663`, `backend/routes/qbo.js:223` |
| 5 | **Shared JWT secret for admin and client tokens** — Both use same `JWT_SECRET`, enabling potential token confusion. | `backend/middleware/auth.js:18`, `backend/middleware/clientAuth.js:19` |
| 6 | **Access token in localStorage** — XSS-extractable. Refresh token is correctly in HttpOnly cookie, but access token is in `localStorage`. | `frontend/src/contexts/AuthContext.tsx:39,115,162` |
| 7 | **Traefik routes use HTTP-only entrypoint** — All routers specify `entrypoints=web` (no TLS). Credentials and billing data travel unencrypted. | `docker-compose.yml:108-109,115,189,196` |
| 8 | **Default MySQL credentials in docker-compose** — `rootpassword`/`thadpassword` as defaults; root password visible in healthcheck command line. | `docker-compose.yml:14-17,26` |

---

## MEDIUM (11 findings)

| # | Finding | Location |
|---|---------|----------|
| 9 | No input validation on invoice route params (no `validateId()`) | `backend/routes/invoices.js` (multiple lines) |
| 10 | Error messages expose internal details (`error.message` returned raw) | `backend/routes/invoices.js`, `fluent-sync.js`, `twenty-proxy.js` |
| 11 | `express-rate-limit` IPv4-mapped IPv6 bypass (CVE) | `backend/package.json` (v8.2.1) |
| 12 | QBO `/connect` endpoint has no authentication | `backend/routes/qbo.js:20` |
| 13 | JWT_SECRET falls back to QBO_CLIENT_SECRET | `backend/routes/qbo.js:39` |
| 14 | No rate limiting on invoice mutation/sync endpoints | `backend/routes/invoices.js` |
| 15 | `NODE_ENV=development` in production — disables error sanitization, enables dev admin seed, weakens cookies | `.env:42`, `docker-compose.yml:55` |
| 16 | Containers run as root with source bind-mounts (read-write) | All Dockerfiles, `docker-compose.yml:98,179` |
| 17 | Backend/frontend ports exposed to all interfaces (bypasses Traefik) | `docker-compose.yml:96,177` |
| 18 | Pre-commit hook exists but is not installed | `scripts/pre-commit-hook.sh` (not in `.git/hooks/`) |
| 19 | Regex-based HTML stripping (bypassable) + unvalidated OAuth redirect URL | `frontend/...ClientTicketDetail.tsx:31-46`, `QBOConnectionPanel.tsx:36` |

---

## LOW (10 findings)

| # | Finding | Location |
|---|---------|----------|
| 20 | Health endpoint leaks `NODE_ENV` | `backend/server.js:154-160` |
| 21 | Hardcoded dev admin `admin@localhost` / `admin` | `backend/server.js:191-192` |
| 22 | `requireRole` error response leaks current and required roles | `backend/middleware/auth.js:59-64`, `conditionalAuth.js:127-134` |
| 23 | Client refresh tokens not stored in DB (no revocation on logout) | `backend/routes/clientAuth.js:139-143,191-237` |
| 24 | No CSRF token for cookie-based refresh (mitigated by `strict` SameSite in prod) | `backend/routes/auth.js`, `clientAuth.js` |
| 25 | CORS allows null origin | `backend/server.js:82` |
| 26 | `console.error` used instead of structured logger in many routes | Multiple backend route/model files |
| 27 | Node 18 EOL base images | All Dockerfiles |
| 28 | Test files with credential-loading logic tracked in git | `test-api.sh`, `test-api.html`, `test-twenty-api.py` |
| 29 | Same password used for admin and velocity accounts | `.env:14,17` |

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

### CRITICAL #1: Host Header Spoofing Bypasses Authentication

**File:** `backend/middleware/conditionalAuth.js:33-39`
**OWASP:** API2:2023 Broken Authentication

The `conditionalAuth` middleware determines whether to require JWT by checking the `Host` and `Origin` request headers:

```javascript
const host = req.get('host') || '';
const origin = req.get('origin') || '';
const isBasicAuthProtected =
  host.includes('billing.peakonedigital.com') ||
  origin.includes('billing.peakonedigital.com');
```

An attacker can set `Host: billing.peakonedigital.com` or `Origin: https://billing.peakonedigital.com` in a direct request to the server, completely bypassing JWT authentication. The middleware then looks up the cached admin user and grants full admin access with no credentials required.

**Remediation:** Do not trust client-supplied headers for authentication decisions. Use a dedicated environment variable (e.g., `AUTH_MODE=basicauth`) to distinguish environments, or validate that the request actually passed through Traefik by checking a custom header that Traefik sets and the backend validates.

---

### CRITICAL #2: Production Credentials in Git History

**OWASP:** A07:2021 - Identification and Authentication Failures

The `.env` file is gitignored now, but the git history contains commits where the following were exposed:
- JWT secrets (128-char hex strings)
- Admin password
- MySQL root and user passwords
- Twenty CRM JWT API token
- FluentSupport WordPress application password
- QuickBooks Online production and sandbox OAuth credentials

**Remediation:**
1. Rotate ALL credentials immediately — every key, password, and token must be considered compromised.
2. Use `git filter-repo` or BFG Repo-Cleaner to purge secrets from git history.
3. Consider moving to Docker secrets or an external secrets manager.

---

### HIGH #3: VITE_ Environment Variables Expose Secrets in JS Bundle

**Files:** `frontend/.env`, `frontend/src/services/twentyApi.ts:6-7`

Every variable prefixed `VITE_` is inlined into the compiled JavaScript bundle by Vite at build time. `VITE_FLUENT_API_USERNAME`, `VITE_FLUENT_API_PASSWORD`, and `VITE_TWENTY_API_TOKEN` are baked into static JS files served to any browser — authenticated or not.

**Remediation:** Move all credentials to the backend's `.env` only (non-`VITE_` prefixed). The frontend should trigger syncs via authenticated calls to the backend, which uses its own server-side secrets.

---

### HIGH #4: QBO Query Language Injection

**Files:** `backend/routes/invoices.js:503,663`, `backend/routes/qbo.js:223`

QBO queries use string interpolation:

```javascript
`SELECT Id, SyncToken FROM Invoice WHERE DocNumber = '${invoice.invoice_number}'`
```

The `invoice_number` is not escaped. The customer name escape in `qbo.js` uses backslash escaping (`\'`) but QBO's query language uses doubled single quotes (`''`).

**Remediation:** Escape single quotes by doubling them (`value.replace(/'/g, "''")`) per QBO query language specification, applied consistently to all interpolated values.

---

### HIGH #5: Shared JWT_SECRET Between Internal and Client Tokens

**Files:** `backend/middleware/auth.js:18`, `backend/middleware/clientAuth.js:19`, `backend/routes/clientAuth.js:129`

Both internal admin tokens and client portal tokens are signed with the same `JWT_SECRET`. The `conditionalAuth` middleware on internal routes does not verify the absence of `clientId` in the decoded token, enabling potential token confusion.

**Remediation:** Use separate signing secrets (e.g., `JWT_SECRET` and `JWT_CLIENT_SECRET`), or add `iss`/`aud` claims and validate them in each middleware.

---

### HIGH #6: Access Token Stored in localStorage

**Files:** `frontend/src/contexts/AuthContext.tsx:39,115,162`, `frontend/src/utils/api.ts:12,43,54`, `frontend/src/services/api/apiClient.ts:16,52,63`

JWT access tokens are stored in `localStorage` under `accessToken` and `clientAccessToken`. Any XSS can call `localStorage.getItem('accessToken')` and exfiltrate the token.

**Remediation:** Store access tokens in memory only (React ref or module-level variable). On page reload, use the HttpOnly refresh cookie to silently re-issue a new access token.

---

### HIGH #7: Traefik Routes Use HTTP-Only Entrypoint

**File:** `docker-compose.yml:108-109,115,189,196`

All Traefik routers specify `entrypoints=web` (HTTP port 80). Traffic including JWT tokens, passwords, and billing data travels unencrypted.

**Remediation:** Configure routers to use `websecure` entrypoint with TLS certificates. Add HTTP-to-HTTPS redirect middleware.

---

### HIGH #8: Default MySQL Credentials in Docker Compose

**File:** `docker-compose.yml:14-17,26`

```yaml
MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
MYSQL_USER: ${MYSQL_USER:-thaduser}
MYSQL_PASSWORD: ${MYSQL_PASSWORD:-thadpassword}
```

The healthcheck also embeds root password in the command line (visible via `docker top`).

**Remediation:** Remove default values. Use `${VAR:?error message}` to require them. For healthcheck, use a MySQL options file instead of CLI password.

---

### MEDIUM #9: No Input Validation on Invoice Route Parameters

**File:** `backend/routes/invoices.js` (lines 71, 148, 215, 232, 251, 265, 282, 299)

Unlike requests routes which use `validateId()`, invoice routes pass raw `req.params.id` directly to service functions. While parameterized queries prevent SQL injection, invalid IDs hit the database layer instead of being rejected at the middleware level.

**Remediation:** Apply `validateId()` from security middleware to all invoice route params.

---

### MEDIUM #10: Error Messages Expose Internal Details

**Files:** `backend/routes/invoices.js:63,79,106,140`, `fluent-sync.js:24,46,94`, `twenty-sync.js:224`, `twenty-proxy.js:58-62`

Multiple routes return raw `error.message` to the client. In contrast, the requests routes correctly use generic messages. Raw error messages can expose database column names, SQL syntax, and file paths.

**Remediation:** Replace `error.message` with generic error messages. Use the existing `sanitizeErrorMessage()` utility.

---

### MEDIUM #11: express-rate-limit IPv4-Mapped IPv6 Bypass

**File:** `backend/package.json` (v8.2.1)
**CVE:** GHSA-46wh-pxpv-q5gq

IPv4-mapped IPv6 addresses can bypass per-client rate limiting on dual-stack servers, affecting all rate limiters including login.

**Remediation:** Run `npm audit fix`.

---

### MEDIUM #12: QBO Connect Endpoint Unauthenticated

**Files:** `backend/routes/qbo.js:20`, `backend/server.js:143`

The `/api/qbo/connect` endpoint has no authentication middleware. An unauthenticated attacker could initiate OAuth flows.

**Remediation:** Add `conditionalAuth` middleware to the `/connect` endpoint.

---

### MEDIUM #13: JWT Secret Fallback to QBO Client Secret

**File:** `backend/routes/qbo.js:39`

```javascript
const jwtSecret = process.env.JWT_SECRET || process.env.QBO_CLIENT_SECRET;
```

If `JWT_SECRET` is missing, a lower-entropy OAuth secret would be used for CSRF protection.

**Remediation:** Require `JWT_SECRET` explicitly and fail startup if not configured. Remove the fallback.

---

### MEDIUM #14: No Rate Limiting on Invoice Mutation Endpoints

**File:** `backend/routes/invoices.js`

While requests routes have rate limiters on create/update/delete/bulk, invoice routes have none — including `POST /generate`, `DELETE /:id`, `POST /:id/sync-qbo`, and `POST /bulk-sync-qbo`.

**Remediation:** Apply rate limiters to invoice mutation endpoints, particularly QBO sync endpoints.

---

### MEDIUM #15: NODE_ENV Defaults to Development in Production

**Files:** `.env:42`, `docker-compose.yml:55`

Running development mode in production:
- `sanitizeErrorMessage` returns full error messages
- Dev admin seed runs (`admin@localhost` / `admin`)
- Cookie `secure` flag is `false`
- `sameSite` is `lax` instead of `strict`

**Remediation:** Set `NODE_ENV=production` in the deployed environment.

---

### MEDIUM #16: Containers Run as Root

**Files:** All Dockerfiles

None of the three Dockerfiles specify a non-root `USER`. Combined with read-write source bind-mounts, a compromised container gets root access to host filesystem source code.

**Remediation:** Add non-root user to each Dockerfile:
```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

---

### MEDIUM #17: Backend/Frontend Ports Exposed to All Interfaces

**File:** `docker-compose.yml:96,177`

MySQL is correctly bound to localhost, but backend (3011) and frontend (5173) are exposed to all interfaces, bypassing Traefik and its TLS/auth layers.

**Remediation:** Bind to localhost: `"127.0.0.1:${BACKEND_PORT:-3011}:3011"`

---

### MEDIUM #18: Pre-Commit Hook Not Installed

**File:** `scripts/pre-commit-hook.sh`

A well-written pre-commit hook exists that blocks `.env` files and scans for hardcoded secrets, but `.git/hooks/pre-commit` does not exist.

**Remediation:** `ln -sf ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit`

---

### MEDIUM #19: Regex HTML Stripping + Unvalidated OAuth Redirect

**Files:** `frontend/...ClientTicketDetail.tsx:31-46`, `QBOConnectionPanel.tsx:36`, `Invoices.tsx:35`

The `stripHtmlTags` function uses regex (bypassable). OAuth redirect URLs from the backend are assigned to `window.location.href` without domain validation.

**Remediation:** Use DOMPurify for HTML stripping. Validate OAuth URLs start with `https://appcenter.intuit.com/` before redirect.

---

### LOW #20-29: Summary

| # | Finding | Remediation |
|---|---------|-------------|
| 20 | Health endpoint leaks `NODE_ENV` | Remove `environment` field from `/health` response |
| 21 | Hardcoded dev admin `admin@localhost`/`admin` | Use env vars for dev seed credentials |
| 22 | `requireRole` leaks current/required roles | Return generic "Insufficient permissions" only |
| 23 | Client refresh tokens not in DB (no revocation) | Store in DB like internal refresh tokens |
| 24 | No CSRF token for cookie-based refresh | Add CSRF token for defense in depth |
| 25 | CORS allows null origin | Restrict in production |
| 26 | `console.error` instead of structured logger | Replace with `logger.error()` / `logger.info()` |
| 27 | Node 18 EOL base images | Upgrade to `node:20-alpine` or `node:22-alpine` |
| 28 | Test files with credential-loading logic in git | Move to `.gitignore`-listed directory |
| 29 | Same password for admin and velocity accounts | Generate unique passwords per account |

---

## Recommended Priority Actions

### Immediate (Week 1)
1. Rotate all credentials (they've been in git history)
2. Fix host-header auth bypass — use env var instead of `req.get('host')`
3. Move `VITE_FLUENT_*` and `VITE_TWENTY_*` credentials to backend only
4. Set `NODE_ENV=production` in deployed environment
5. Run `npm audit fix` in both frontend and backend
6. Install pre-commit hook

### Short-term (Week 2-3)
7. Use separate JWT secrets for admin vs client tokens
8. Move access token from `localStorage` to in-memory storage
9. Switch Traefik to `websecure` entrypoint with TLS
10. Bind ports to `127.0.0.1` in docker-compose
11. Properly escape QBO query interpolations
12. Add auth to QBO `/connect`, rate limits to invoice routes

### Medium-term (Month 1-2)
13. Add `USER` directives to Dockerfiles
14. Replace `error.message` with generic messages in all routes
15. Add input validation to invoice routes
16. Implement DB-backed client refresh token storage
17. Upgrade to Node 20/22 LTS base images
18. Consolidate duplicate `authenticatedFetch` implementations
19. Use `git filter-repo` or BFG to purge secrets from git history
