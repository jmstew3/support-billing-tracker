# Docker Setup for Thad Chat Dashboard

This guide explains how to run the Thad Chat Dashboard using Docker, which provides a consistent development environment across all platforms.

## Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop/))
- Docker Compose (included with Docker Desktop)
- 4GB+ of available RAM for Docker

## Quick Start

### 1. Clone and Navigate to Project

```bash
git clone [your-repo-url]
cd thad-chat
```

### 2. Start with Docker

```bash
# Using the helper script (recommended)
./docker-start.sh

# Or manually with docker-compose
docker-compose up
```

This will:
- Start MySQL database on port 3306
- Start backend API on port 3001
- Start frontend dev server on port 5173
- Automatically run database migrations
- Set up all networking between services

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Docker Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Network                       │
├─────────────────┬──────────────┬────────────────────────┤
│                 │              │                         │
│    MySQL        │   Backend    │      Frontend          │
│  Container      │  Container   │     Container          │
│                 │              │                         │
│  Port: 3306     │  Port: 3001  │    Port: 5173         │
│                 │              │                         │
│  Database:      │  Express     │    React + Vite        │
│  thad_chat      │  API Server  │    Dev Server          │
│                 │              │                         │
│  Persistent     │  Depends on  │    Depends on          │
│  Volume         │  MySQL       │    Backend             │
└─────────────────┴──────────────┴────────────────────────┘
```

## Common Docker Commands

### Starting Services

```bash
# Start all services in foreground (see logs)
docker-compose up

# Start all services in background
docker-compose up -d

# Start specific service
docker-compose up backend
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v

# Stop specific service
docker-compose stop frontend
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
```

### Importing Data

```bash
# Import CSV data using helper script
./docker-import.sh

# Or import specific CSV file
./docker-import.sh data/03_final/thad_requests_table.csv

# Or manually inside container
docker-compose exec backend npm run import
```

### Database Access

```bash
# Access MySQL shell
docker-compose exec mysql mysql -u thaduser -pthadpassword thad_chat

# Run SQL query
docker-compose exec mysql mysql -u thaduser -pthadpassword thad_chat -e "SELECT COUNT(*) FROM requests;"

# Backup database
docker-compose exec mysql mysqldump -u root -prootpassword thad_chat > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -prootpassword thad_chat < backup.sql
```

### Rebuilding Containers

```bash
# Rebuild all containers
docker-compose build

# Rebuild specific service
docker-compose build frontend

# Rebuild and restart
docker-compose up --build
```

## Environment Configuration

### Development (Default)

The default configuration in `docker-compose.yml` is set up for development:

- Hot reloading enabled for both frontend and backend
- Source code mounted as volumes for live editing
- Debug-friendly logging
- Default passwords (change for production!)

### Production

For production deployment:

1. Create `.env.docker` with secure passwords:

```env
MYSQL_ROOT_PASSWORD=secure_root_password
MYSQL_USER=thaduser
MYSQL_PASSWORD=secure_user_password
NODE_ENV=production
```

2. Update `docker-compose.yml`:

```yaml
frontend:
  build:
    target: production  # Use production stage
  ports:
    - "80:80"  # Serve on port 80
```

3. Build and run:

```bash
docker-compose --env-file .env.docker up -d
```

## Troubleshooting

### Services Won't Start

```bash
# Check service status
docker-compose ps

# Check logs for errors
docker-compose logs

# Ensure ports are not in use
lsof -i :3306  # MySQL
lsof -i :3001  # Backend
lsof -i :5173  # Frontend
```

### Database Connection Issues

```bash
# Check MySQL is healthy
docker-compose exec mysql mysqladmin ping -h localhost

# Verify database exists
docker-compose exec mysql mysql -u root -prootpassword -e "SHOW DATABASES;"

# Recreate database
docker-compose exec mysql mysql -u root -prootpassword -e "CREATE DATABASE IF NOT EXISTS thad_chat;"
```

### Frontend Can't Connect to Backend

1. Check backend is running:
```bash
curl http://localhost:3001/health
```

2. Verify CORS settings in backend
3. Check network connectivity:
```bash
docker network ls
docker network inspect thad-chat_thad-network
```

### Changes Not Reflecting

For frontend/backend code changes:
- Ensure volumes are mounted correctly
- Check that hot-reload is working
- Try restarting the specific service:

```bash
docker-compose restart frontend
# or
docker-compose restart backend
```

### Reset Everything

```bash
# Stop all containers and remove volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Fresh start
docker-compose up --build
```

## Docker Files Explained

### docker-compose.yml

Orchestrates all three services (MySQL, backend, frontend) with:
- Service dependencies
- Network configuration
- Volume mounts
- Environment variables
- Health checks

### frontend/Dockerfile

Multi-stage build:
- Development stage with hot-reloading
- Production stage with nginx

### backend/Dockerfile

Node.js Alpine image with:
- Wait-for-it script for MySQL
- Health check endpoint
- Automatic migrations

### Helper Scripts

- `docker-start.sh` - Easy startup with health checks
- `docker-import.sh` - Import CSV data to MySQL

## Advantages of Docker Setup

1. **Consistency**: Same environment for all developers
2. **Isolation**: No conflicts with local MySQL/Node versions
3. **Easy Setup**: One command to run everything
4. **Production Ready**: Same containers deploy to production
5. **Cross-Platform**: Works on Windows, Mac, Linux
6. **Clean**: No system-wide installations needed
7. **Version Control**: Locked versions of all dependencies

## Next Steps

- Set up CI/CD pipeline with Docker
- Deploy to cloud (AWS ECS, Google Cloud Run, etc.)
- Add monitoring and logging services
- Implement container orchestration with Kubernetes
- Add Redis for caching
- Set up nginx as reverse proxy