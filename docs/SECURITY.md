# Security & Authentication

## Authentication

**Current Implementation:** JWT Authentication with per-user accounts

The application uses JWT-based authentication. Users log in via a form at `/login`, which issues short-lived access tokens and long-lived refresh tokens.

### How It Works

1. User submits credentials at `/login` form
2. `POST /api/auth/login` validates email/password against bcrypt hash in database
3. On success, returns a short-lived access token (1h) and sets an HttpOnly refresh token cookie (7d)
4. Frontend stores access token in localStorage and attaches it as `Authorization: Bearer <token>` on API requests
5. When the access token expires, `POST /api/auth/refresh` issues a new one using the refresh token cookie
6. Logout (`POST /api/auth/logout`) revokes the refresh token in the database and clears the cookie

### Production Hybrid Auth (`conditionalAuth`)

Production uses a hybrid approach via `backend/middleware/conditionalAuth.js`:

- **Production** (`billing.peakonedigital.com`): Traefik BasicAuth protects the site at the reverse proxy level. The `conditionalAuth` middleware detects the production hostname and trusts BasicAuth, looking up the admin user from the database via `ADMIN_EMAIL`. No JWT is required.
- **Development** (localhost): Standard JWT token validation. Users must log in via the `/login` form.

This prevents "double authentication" where users would need to pass BasicAuth AND provide a JWT token.

> **Known Risk:** The production hostname check uses the `Host` header, which can be spoofed. See `docs/SECURITY_REVIEW_2025-01.md` for details.

### Client Portal

A separate JWT flow exists for client-facing access:

- Login: `POST /api/auth/client/login`
- Middleware: `backend/middleware/clientAuth.js`
- Scope enforcement limits clients to their own data
- Separate refresh token cookie (`client_refresh_token`)

### Access Credentials

- **Admin credentials:** Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`
- **Password storage:** bcrypt with 10 salt rounds
- **Dev auto-seed:** When `NODE_ENV=development`, the backend auto-creates `admin@localhost` / `admin` on first startup (see `backend/server.js`). This is for development convenience only.

> **SECURITY NOTE:** Never commit actual credentials to documentation or version control.

### Setting Up / Changing Credentials

**Step 1:** Update `ADMIN_EMAIL` and/or `ADMIN_PASSWORD` in `.env`

**Step 2:** Rebuild the backend container (so it picks up the new `.env` values):
```bash
docker compose up -d --build backend
```

**Step 3:** Re-seed the database (so the password hash matches):
```bash
docker compose exec backend node db/seed_admin_user.js
```
If the user already exists, it updates the password. If not, it creates a new admin user.

> **Important:** The seed script reads credentials from the running container's environment, not directly from `.env`. If you skip Step 2, the seed script will use the old values and login will fail.

### Logging Out

Click "Log Out" in the sidebar footer:
1. Frontend calls `POST /api/auth/logout`
2. Backend revokes the refresh token (SHA-256 hash deleted from database)
3. HttpOnly refresh token cookie is cleared
4. Frontend clears the access token from localStorage
5. User is redirected to `/login`

### Security Features

- Per-user accounts with bcrypt password hashing (10 salt rounds)
- Short-lived access tokens (1h default, configurable via `JWT_EXPIRES_IN`)
- Refresh tokens (7d default) stored as SHA-256 hashes in the database
- Refresh tokens delivered via HttpOnly cookies (not exposed to JavaScript)
- Separate `JWT_REFRESH_SECRET` required (no fallback to `JWT_SECRET`)
- Rate limiting: 5 login attempts per 15 minutes per IP
- Password change revokes all refresh tokens (forces re-login on all devices)
- Session management: view active sessions, revoke individual sessions
- Full audit logging (login success/failure, password changes)
- HTTPS required in production

### Auth Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Authenticate and get tokens |
| POST | `/api/auth/logout` | Revoke refresh token |
| POST | `/api/auth/refresh` | Get new access token |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/change-password` | Change password (revokes all sessions) |
| POST | `/api/auth/logout-all` | Revoke all sessions |
| GET | `/api/auth/sessions` | List active sessions |
| DELETE | `/api/auth/sessions/:id` | Revoke specific session |
| POST | `/api/auth/client/login` | Client portal login |
| POST | `/api/auth/client/logout` | Client portal logout |
| POST | `/api/auth/client/refresh` | Client portal token refresh |

## Data Protection

**Sensitive Data:**
- Client billing information and revenue calculations
- Support ticket details and request summaries
- Website URLs and hosting property data
- API credentials for Twenty CRM and FluentSupport

**Storage Security:**
- MySQL database with credentials in `.env`
- API tokens as environment variables (not in code)
- All containers on isolated Docker network (`velocity-network`)
- Production access only via Traefik reverse proxy with authentication

**Best Practices:**
- Never commit `.env` files to Git
- Rotate API tokens periodically
- Use strong passwords for MySQL and admin accounts
- Keep Docker images and dependencies updated

## Database Backups

### Scripts Location
```
scripts/
├── backup-mysql.sh    # Creates compressed SQL dumps
└── restore-mysql.sh   # Restores from backup with safety prompts
```

### Backup Storage
```
mysql_data_backup/
├── daily/             # Last 5 days
├── weekly/            # Last 4 Sundays
├── monthly/           # Last 6 months (1st of each month)
├── backup.log
└── cron.log
```

### Commands

**Create Backup:**
```bash
./scripts/backup-mysql.sh                 # Auto-detect type
./scripts/backup-mysql.sh --type daily    # Force type
./scripts/backup-mysql.sh --list          # List backups
```

**Restore:**
```bash
./scripts/restore-mysql.sh                # Interactive
./scripts/restore-mysql.sh --latest daily # Restore latest
./scripts/restore-mysql.sh /path/to/backup.sql.gz
```

### Cron Setup (Asustor NAS)
1. ADM → Services → Scheduled Tasks
2. Add → User Defined Script
3. Name: `MySQL Backup - Support Billing Tracker`
4. Schedule: Daily at 02:00
5. Command:
```bash
/share/Coding/Docker/support-billing-tracker/scripts/backup-mysql.sh >> /share/Coding/Docker/support-billing-tracker/mysql_data_backup/cron.log 2>&1
```

### Recovery Scenarios

**Accidental `docker-compose down -v`:**
```bash
docker-compose up -d mysql && sleep 10
./scripts/restore-mysql.sh --latest daily
```

**Corrupted data:**
```bash
./scripts/restore-mysql.sh --list
./scripts/restore-mysql.sh mysql_data_backup/daily/velocity_billing_YYYY-MM-DD.sql.gz
```
