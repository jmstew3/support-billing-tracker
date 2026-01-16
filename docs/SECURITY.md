# Security & Authentication

## Authentication (Phase 1 - Active)

**Current Implementation:** Traefik BasicAuth Middleware

The application is protected by HTTP Basic Authentication at the reverse proxy level using Traefik middleware.

### Access Credentials
- **Username:** Configured in `.env.docker` (ADMIN_EMAIL)
- **Password:** Configured in `.env.docker` (ADMIN_PASSWORD)
- **Storage:** `.env.docker` file (NOT committed to Git)
- **Hash Algorithm:** Apache APR1 (MD5-based bcrypt variant)

> **SECURITY NOTE:** Never commit actual credentials to documentation or version control.
> See `.env.docker.example` for configuration template.

### How It Works
1. All requests to `billing.peakonedigital.com` and `/api` are intercepted by Traefik
2. Browser presents authentication dialog
3. Credentials validated against bcrypt hash in environment variable
4. If valid, request forwarded; if invalid, 401 Unauthorized returned

### Changing Credentials

**Step 1: Generate New Hash**
```bash
docker run --rm httpd:2.4-alpine htpasswd -nb newusername newpassword
```

**Step 2: Update `.env.docker`**
```bash
# IMPORTANT: Escape $ as $$ for docker-compose
BASIC_AUTH_USERS=newusername:$$apr1$$xyz123$$hashedpasswordhere
```

**Step 3: Restart Services**
```bash
docker-compose --env-file .env.docker up -d
```

### Logging Out

Click "Log Out" in sidebar footer:
1. Frontend sends request to `/api/auth/logout`
2. Backend responds with 401 + `WWW-Authenticate` header
3. Browser clears cached BasicAuth credentials
4. Page redirects to fresh authentication prompt

**Note:** BasicAuth is stateless - this is re-authentication, not true session termination.

### Security Considerations
- ✅ Adequate for internal team (5-10 users), trusted networks
- ⚠️ Single shared credential, no per-user tracking
- 🔒 Requires HTTPS in production
- 📝 Limited audit trail (Traefik access logs only)

### Future Enhancements (Phase 2)
See `docs/authentication-plan.md` for:
- JWT-based authentication with per-user accounts
- Role-based access control (admin, viewer, editor)
- True logout with session termination
- User management dashboard
- Audit logging and session tracking

## Data Protection

**Sensitive Data:**
- Client billing information and revenue calculations
- Support ticket details and request summaries
- Website URLs and hosting property data
- API credentials for Twenty CRM and FluentSupport

**Storage Security:**
- MySQL database with credentials in `.env.docker`
- API tokens as environment variables (not in code)
- All containers on isolated Docker network (`velocity-network`)
- Production access only via Traefik reverse proxy with authentication

**Best Practices:**
- Never commit `.env.docker` or `.env` files to Git
- Rotate API tokens periodically
- Use strong passwords for MySQL and BasicAuth
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
./scripts/restore-mysql.sh mysql_data_backup/daily/support_billing_tracker_YYYY-MM-DD.sql.gz
```
