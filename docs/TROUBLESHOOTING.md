# Troubleshooting & Maintenance

## Common Issues

### Data Not Loading in Dashboard
1. Verify CSV exists at `/frontend/public/requests_table.csv`
2. Check CSV format matches expected columns
3. Ensure no malformed CSV data (quotes, commas in content)

### Request Extraction Issues
1. Verify cleaned data exists in preprocessor output
2. Check pattern matching rules in `request_patterns.py`
3. Review exclusion patterns if legitimate requests filtered

### Build Errors
1. `npm install` to update dependencies
2. `npm run build` to check TypeScript errors
3. Verify all imports and file paths

## Docker & Environment Issues

### API 404 Error (Production Domain)

**Issue:** Frontend shows 404 for API requests from `velocity.peakonedigital.com`

**Cause:** Frontend using incorrect API path after Traefik strips prefix

**Solution:** In `frontend/src/utils/api.ts`:
```javascript
// Change from:
'https://velocity.peakonedigital.com/billing-overview-api'
// To:
'https://velocity.peakonedigital.com/billing-overview-api/api'
```

Then restart: `docker-compose restart frontend`

### MySQL Data Directory - NEVER COMMIT!

**CRITICAL:** Never commit `mysql_data/` to Git!

**Why dangerous:**
- Security risk (contains sensitive data)
- Repository bloat (binary files)
- Merge conflicts (binary files can't merge)
- Platform incompatibility

**Do commit:** `backend/db/schema.sql`, migration scripts
**Never commit:** `mysql_data/`, `*.ibd`, `binlog.*`, `ibdata*`

### Docker Compose Port & CORS Issues

**Issue:** "Failed to fetch", CORS errors, or MySQL connection failures after restart

**Root Cause:** Mismatch between `.env.docker` and `docker-compose.yml` defaults

**Solution:**
1. Align `.env.docker` with defaults:
```bash
FRONTEND_PORT=5173
MYSQL_PORT=3307
VITE_PORT=5173
VITE_API_URL=http://localhost:3011/api
```

2. Update backend CORS (`backend/.env`):
```bash
FRONTEND_URL=http://localhost:5173
```

**Verification:**
```bash
docker exec support-billing-tracker-frontend printenv | grep VITE_API_URL
docker exec support-billing-tracker-backend printenv | grep FRONTEND_URL
curl http://localhost:3011/api/health
```

**Best Practices:**
- ✅ Keep `.env.docker` aligned with `docker-compose.yml` defaults
- ✅ Always use `docker-compose --env-file .env.docker up -d`
- ❌ Don't mix with/without `--env-file` flag

### API Error 403 & JWT Token Invalidation

**Issue:** "API error: 403" after `docker-compose down && up`

**Cause:** JWT tokens in browser become invalid after backend restart

**Quick Fix:**
1. Clear browser localStorage (DevTools → Application → Local Storage → Clear)
2. Or use incognito window

**Automated Fix:** Frontend auto-detects 403 and redirects to login

**Prevention:**
- 403 after restart is normal with JWT auth
- Ensure `JWT_SECRET` in `.env.docker` is stable
- User accounts must persist (check MySQL data volume)

### API Error 500 & Environment Variable Conflicts

**Issue:** "Error Loading Data - API error: 500" after restart

**Root Cause:** Conflicting environment files and cached Vite builds

**Problem 1: Backend Port Mismatch**
- `backend/.env` overrides Docker Compose variables
- Example: `backend/.env` has `PORT=3001` but Docker expects `PORT=3011`

**Problem 2: Vite Cache**
- Vite caches environment variables in `node_modules/.vite/`
- Cache persists across `docker-compose down/up`

**Solution:**
```bash
# 1. Remove conflicting backend .env
rm backend/.env
# Or rename: mv backend/.env backend/.env.local.example

# 2. Clear Vite cache and rebuild
docker-compose down
rm -rf frontend/node_modules/.vite
docker-compose build --no-cache frontend
docker-compose --env-file .env.docker up -d

# 3. Verify
curl http://localhost:3011/api/health
docker exec support-billing-tracker-frontend printenv | grep VITE
```

**Prevention:**
- Use `.env.docker` as single source of truth
- Delete or rename `backend/.env`
- Always use `--env-file .env.docker` flag

**Configuration Checklist:**
- ✅ `.env.docker` exists with correct values
- ✅ No `backend/.env` (or values match `.env.docker`)
- ✅ No `frontend/.env` (Docker provides all env vars)
- ✅ Ports: Backend=3011, Frontend=5173, MySQL=3307

## Performance Notes

- Dashboard handles ~1000 requests efficiently
- Large datasets may require pagination adjustments
- Chart rendering performance depends on date range selection
