# Docker Setup for Support Billing Tracker

This guide explains how to run the Support Billing Tracker using Docker Compose.

## Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop/))
- Docker Compose (included with Docker Desktop)
- 4GB+ of available RAM for Docker

## Quick Start

### 1. Set Up Environment

```bash
cp .env.example .env
# Edit .env — set ADMIN_PASSWORD (required) and review other values
```

### 2. Start All Services

```bash
docker compose up -d
```

### 3. Access the Application

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:5173 | React dashboard |
| Backend API | http://localhost:3011/api | Express API |
| MySQL | localhost:3307 | External port (internal 3306) |
| Production | https://billing.peakonedigital.com | Via Traefik reverse proxy |

### 4. Log In

Credentials are set via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

In development (`NODE_ENV=development`), if no admin user exists the backend auto-seeds `admin@localhost` / `admin`.

To manually create or update the admin user:

```bash
docker compose exec backend node db/seed_admin_user.js
```

## Services

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network                          │
├──────────────┬──────────────┬──────────────┬───────────────┤
│    mysql     │   backend    │   frontend   │  mysql-backup │
│  Port: 3307  │  Port: 3011  │  Port: 5173  │  (scheduled)  │
│  MySQL 8.4   │  Express.js  │  React+Vite  │  mysqldump    │
│              │              │              │               │
│  Container:  │  Container:  │  Container:  │  Container:   │
│  support-    │  support-    │  support-    │  support-     │
│  billing-    │  billing-    │  billing-    │  billing-     │
│  tracker-    │  tracker-    │  tracker-    │  tracker-     │
│  mysql       │  backend     │  frontend    │  backup       │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

### Container Names

| Service | Container Name |
|---------|---------------|
| mysql | `support-billing-tracker-mysql` |
| backend | `support-billing-tracker-backend` |
| frontend | `support-billing-tracker-frontend` |
| mysql-backup | `support-billing-tracker-backup` |

## Environment Configuration

A single `.env` file in the project root configures all services. Copy from `.env.example`:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@yourdomain.com` | Login email |
| `ADMIN_PASSWORD` | *(required)* | Login password |
| `MYSQL_PORT` | `3307` | External MySQL port |
| `BACKEND_PORT` | `3011` | Backend API port |
| `FRONTEND_PORT` | `5173` | Frontend dev server port |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | — | JWT signing secret |
| `JWT_REFRESH_SECRET` | — | Refresh token secret |

Generate JWT secrets with: `openssl rand -hex 32`

## Authentication

The app uses JWT-based authentication. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then seed:

```bash
docker compose up -d --build backend
docker compose exec backend node db/seed_admin_user.js
```

The seed script reads credentials from the **running container's** environment (not `.env` directly), so always rebuild before seeding if you changed `.env`.

## Common Commands

### Starting / Stopping

```bash
docker compose up -d              # Start all services (background)
docker compose down               # Stop all services
docker compose down -v            # Stop and remove volumes (full reset)
docker compose restart backend    # Restart a single service
```

### Viewing Logs

```bash
docker compose logs -f            # Follow all logs
docker compose logs -f backend    # Follow backend logs only
```

### Database Access

```bash
# MySQL shell
docker exec -it support-billing-tracker-mysql mysql -u thaduser -pthadpassword velocity_billing

# Run a query
docker exec support-billing-tracker-mysql mysql -u thaduser -pthadpassword velocity_billing \
  -e "SELECT COUNT(*) FROM requests;"

# Backup
docker exec support-billing-tracker-mysql mysqldump -u root -prootpassword velocity_billing > backup.sql

# Restore
docker exec -i support-billing-tracker-mysql mysql -u root -prootpassword velocity_billing < backup.sql
```

### Rebuilding

```bash
docker compose build                    # Rebuild all
docker compose build backend            # Rebuild one service
docker compose up -d --build backend    # Rebuild and restart
```

### Importing Data

```bash
./docker-import.sh data/03_final/requests_table.csv
```

## Production Deployment

Production uses Traefik as a reverse proxy. The `docker-compose.yml` includes Traefik labels for:

- `billing.peakonedigital.com` → frontend + backend `/api` routes
- `portal.peakonedigital.com` → client portal routes

The `traefik-general` external network must exist on the host.

## Networking

Two Docker networks are configured:

| Network | Purpose |
|---------|---------|
| `velocity-network` | Internal communication between services |
| `traefik-general` | External network for Traefik reverse proxy (production) |

## Troubleshooting

### Services Won't Start

```bash
docker compose ps                 # Check service status
docker compose logs               # Check for errors
lsof -i :3307                    # Check if MySQL port is in use
lsof -i :3011                    # Check if backend port is in use
lsof -i :5173                    # Check if frontend port is in use
```

### Can't Log In

```bash
# Re-seed the admin user
docker compose up -d --build backend
docker compose exec backend node db/seed_admin_user.js

# If rate-limited (5 attempts per 15 min), restart backend
docker compose restart backend
```

### Database Connection Issues

```bash
# Check MySQL is healthy
docker exec support-billing-tracker-mysql mysqladmin ping -h localhost

# Verify database exists
docker exec support-billing-tracker-mysql mysql -u root -prootpassword -e "SHOW DATABASES;"
```

### Backend Port Mismatch

If you see API 500 errors, check for a stray `backend/.env` file that may override the Docker port:

```bash
# Check the port inside the container
docker exec support-billing-tracker-backend printenv | grep PORT
# Should show: PORT=3011

# Remove conflicting local .env if it exists
rm -f backend/.env
docker compose up -d --build backend
```

### API Health Check

```bash
curl http://localhost:3011/api/health
# Expected: {"status":"ok","database":"connected"}
```

### Reset Everything

```bash
docker compose down -v
docker compose up --build -d
```
