# Security Review: Support Billing Tracker
**Date:** January 2025
**Status:** All code fixes complete ✅ | Git history cleanup pending ⚠️

## Executive Summary

Comprehensive security audit of the support-billing-tracker application. The codebase demonstrates **solid security fundamentals** with JWT auth, rate limiting, parameterized queries, and audit logging. However, **critical credential exposure issues** require immediate attention.

---

## Critical Findings (Immediate Action Required)

### 1. Credentials Committed to Git Repository
**Severity:** 🔴 CRITICAL
**Files:** `.env`, `.env.docker`

Both files contain **actual production credentials** committed to the repository:
- JWT secrets (64-character hex strings)
- Admin credentials: `admin@peakonedigital.com` / `[REDACTED]`
- Database credentials: `[REDACTED]` / `[REDACTED]`
- MySQL root password

**Impact:** Anyone with repo access has full admin access to the system.

**Remediation:**
1. Remove files from git history using `git filter-branch` or BFG Repo-Cleaner
2. Rotate ALL credentials immediately (JWT secrets, admin password, database passwords)
3. Add pre-commit hook to prevent future `.env` commits

### 2. Query Parameter Injection in Twenty Proxy
**Severity:** 🔴 HIGH
**File:** `backend/routes/twenty-proxy.js:16`

```javascript
const queryParams = new URLSearchParams(req.query).toString();
const url = `${TWENTY_BASE_URL}/projects${queryParams ? `?${queryParams}` : ''}`;
```

Query parameters forwarded directly to upstream API without validation - enables parameter pollution attacks.

**Remediation:** Whitelist allowed query parameters before forwarding.

### 3. Admin Privilege Escalation via Fallback
**Severity:** 🔴 HIGH
**File:** `backend/middleware/conditionalAuth.js:56-65`

If admin user not found in database, code falls back to hardcoded admin identity:
```javascript
cachedBasicAuthUser = { id: 1, email: adminEmail, role: 'admin' };
```

**Impact:** System grants admin access even if user deleted from database.

**Remediation:** Return 401 error instead of fallback identity.

### 4. Hardcoded Credentials in Scripts
**Severity:** 🔴 HIGH
**Files:** `scripts/sync-fluent-tickets.sh`, `scripts/backup-mysql.sh`

Scripts contain hardcoded fallback credentials:
- `JWT_PASSWORD="[REDACTED]"`
- `DB_USER="[REDACTED]"` / `DB_PASSWORD="[REDACTED]"`

**Remediation:** Remove hardcoded values; require environment variables with no fallbacks.

---

## Medium Severity Findings

### 5. HTTP Allowed in Production CORS
**File:** `backend/server.js:68`

CORS whitelist includes `http://velocity.peakonedigital.com` (non-HTTPS).

**Remediation:** Remove HTTP origin; keep only HTTPS for production.

### 6. JWT Tokens in localStorage
**File:** `frontend/src/services/api/apiClient.ts:16`

Access tokens stored in localStorage are vulnerable to XSS attacks.

**Remediation:** Consider HttpOnly cookies for token storage (requires backend changes).

### 7. JWT Secret Fallback
**File:** `backend/routes/auth.js:143-145`

If `JWT_REFRESH_SECRET` not configured, system uses `JWT_SECRET` as fallback - reduces security of refresh token separation.

**Remediation:** Require both secrets; fail startup if missing.

### 8. Regex ReDoS Vulnerability
**File:** `backend/routes/requests.js:694`

CSV parsing regex `/(".*?"|[^,]+)/g` could cause ReDoS with malformed input.

**Remediation:** Use a proper CSV parsing library or limit input size/complexity.

---

## Security Strengths

| Area | Implementation | Status |
|------|----------------|--------|
| **Authentication** | JWT with refresh tokens, bcrypt (10 rounds) | ✅ Strong |
| **Rate Limiting** | Login (5/15min), auth (20/5min), password (3/hr), bulk ops | ✅ Strong |
| **SQL Injection** | Parameterized queries throughout | ✅ Strong |
| **Input Validation** | Comprehensive validators in `security.js` | ✅ Strong |
| **Audit Logging** | Full event logging with user/IP tracking | ✅ Strong |
| **Security Headers** | Helmet with CSP, HSTS, X-Frame-Options | ✅ Strong |
| **Error Handling** | Sanitized errors, no info leakage in production | ✅ Strong |
| **Password Policy** | 12+ chars, complexity requirements, common pattern rejection | ✅ Strong |
| **Session Management** | Multi-device tracking, session revocation | ✅ Strong |

---

## Recommended Actions

### Immediate (This Week)
1. [ ] Remove `.env` and `.env.docker` from git history (see Git Cleanup section below)
2. [ ] Rotate all credentials (JWT secrets, admin password, DB passwords)
3. [x] ~~Fix admin fallback vulnerability in `conditionalAuth.js`~~ **FIXED**
4. [x] ~~Add query parameter validation to Twenty proxy~~ **FIXED**
5. [x] ~~Remove hardcoded credentials from bash scripts~~ **FIXED**

### Short-Term (This Month)
6. [x] ~~Remove HTTP from production CORS whitelist~~ **FIXED**
7. [x] ~~Make JWT_REFRESH_SECRET required (no fallback)~~ **FIXED**
8. [x] ~~Add pre-commit hook to block `.env` commits~~ **FIXED** (scripts/pre-commit-hook.sh)
9. [x] ~~Replace CSV regex with proper parsing library~~ **FIXED** (utils/csvParser.js)
10. [ ] Update old dependencies (axios, cors)

### Long-Term (Backlog)
11. [ ] Migrate from localStorage to HttpOnly cookies for tokens
12. [ ] Implement secrets management (AWS Secrets Manager / Vault)
13. [ ] Add two-factor authentication for admin accounts
14. [ ] Implement automatic credential rotation

---

## Files Requiring Changes

| File | Change | Priority |
|------|--------|----------|
| `.env`, `.env.docker` | Remove from git history | 🔴 Critical |
| `backend/middleware/conditionalAuth.js` | Remove admin fallback | 🔴 Critical |
| `backend/routes/twenty-proxy.js` | Add query param validation | 🔴 Critical |
| `scripts/sync-fluent-tickets.sh` | Remove hardcoded creds | 🔴 Critical |
| `scripts/backup-mysql.sh` | Remove hardcoded creds | 🔴 Critical |
| `backend/server.js` | Remove HTTP CORS origin | ✅ Fixed |
| `backend/routes/auth.js` | Require JWT_REFRESH_SECRET | ✅ Fixed |
| `backend/routes/requests.js` | Fix CSV regex | ✅ Fixed |
| `scripts/pre-commit-hook.sh` | Block .env commits | ✅ Added |
| `backend/utils/csvParser.js` | Safe CSV parsing | ✅ Added |

---

## Verification Steps

After implementing fixes:
1. Run `git log --all --full-history -- .env .env.docker` to verify files removed
2. Test login with old credentials (should fail)
3. Test Twenty proxy with malicious query params (should be rejected)
4. Delete admin user and verify 401 returned (not fallback access)
5. Run bash scripts without env vars (should fail, not use fallbacks)
6. Test CORS from `http://` origin (should be blocked)

---

## Git History Cleanup Guide

### CRITICAL: Credentials Are In Git History

Even after the code fixes, the `.env` and `.env.docker` files with real credentials are still in git history. **Anyone who clones or has cloned the repo can access them.**

### Step 1: Backup Current State
```bash
# Save current .env files (you'll need to recreate with new values)
cp .env .env.backup
cp .env.docker .env.docker.backup
```

### Step 2: Install BFG Repo-Cleaner (Recommended)
```bash
# macOS
brew install bfg

# Or download from https://rtyley.github.io/bfg-repo-cleaner/
```

### Step 3: Remove Files from History
```bash
# Clone a fresh copy (mirror clone)
git clone --mirror git@github.com:YOUR_ORG/support-billing-tracker.git repo-mirror.git
cd repo-mirror.git

# Remove .env files from all history
bfg --delete-files .env
bfg --delete-files .env.docker

# Clean up and push
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### Step 4: Verify Removal
```bash
# Check that files no longer exist in history
git log --all --full-history -- .env .env.docker
# Should return empty

# Verify with git-filter-repo (alternative check)
git rev-list --all | xargs git ls-tree | grep -E '\.env$|\.env\.docker$'
# Should return empty
```

### Step 5: Force Re-clone for All Users
All developers and any automated systems with repo access must:
```bash
# Delete old clones completely
rm -rf support-billing-tracker

# Fresh clone
git clone git@github.com:YOUR_ORG/support-billing-tracker.git
```

### Step 6: Rotate ALL Credentials
**MANDATORY** - assume all credentials are compromised:
```bash
# Generate new JWT secrets
openssl rand -hex 32  # for JWT_SECRET
openssl rand -hex 32  # for JWT_REFRESH_SECRET

# Change database passwords in MySQL
ALTER USER 'your_db_user'@'%' IDENTIFIED BY 'NEW_SECURE_PASSWORD';

# Update admin password via API or database
# Update .env with all new values
```

### Step 7: Add Pre-commit Hook
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Prevent committing .env files
if git diff --cached --name-only | grep -qE '^\.env'; then
    echo "ERROR: Attempting to commit .env file!"
    echo "Remove .env files from staging: git reset HEAD .env*"
    exit 1
fi
```
Make executable: `chmod +x .git/hooks/pre-commit`

### Alternative: Using git-filter-repo
```bash
# Install
pip install git-filter-repo

# Remove files
git filter-repo --invert-paths --path .env --path .env.docker

# Force push
git push origin --force --all
git push origin --force --tags
```

---

## Summary of Changes Made (January 2025)

| File | Change | Status |
|------|--------|--------|
| `backend/middleware/conditionalAuth.js` | Removed admin fallback - now returns 401 | ✅ Fixed |
| `backend/routes/twenty-proxy.js` | Added query param whitelist validation | ✅ Fixed |
| `scripts/sync-fluent-tickets.sh` | Removed hardcoded credentials | ✅ Fixed |
| `scripts/backup-mysql.sh` | Removed hardcoded credentials | ✅ Fixed |
| `backend/server.js` | Removed HTTP from CORS whitelist | ✅ Fixed |
| `backend/routes/auth.js` | JWT_REFRESH_SECRET now required | ✅ Fixed |
| `scripts/pre-commit-hook.sh` | Added pre-commit hook to block .env commits | ✅ Added |
| `backend/utils/csvParser.js` | Safe CSV parser (replaces ReDoS-vulnerable regex) | ✅ Added |
| `backend/routes/requests.js` | Uses safe CSV parser instead of regex | ✅ Fixed |
| `.env`, `.env.docker` | **STILL IN GIT HISTORY** - follow cleanup guide above | ⚠️ Manual |
