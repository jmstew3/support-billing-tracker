# Migration Guide - Moving Thad Chat to NAS or Another Server

This guide explains how to migrate your Thad Chat application to a NAS or different server while preserving all data.

## Prerequisites

- Docker and Docker Compose installed on the target system
- SSH access to the target system
- The MySQL backup file created earlier

## Step 1: Backup Current Data

Already completed! You have:
- `thad_chat_backup_20250927_111410.sql` - Your MySQL database backup

## Step 2: Copy Application to Target Server

Transfer the entire application directory to your NAS:

```bash
# From your Mac, copy to NAS (replace with your NAS user and path)
scp -r /Users/justinstewart/thad-chat/ user@172.16.0.89:/volume1/docker/thad-chat/

# Also copy the MySQL backup
scp thad_chat_backup_20250927_111410.sql user@172.16.0.89:/volume1/docker/thad-chat/
```

## Step 3: Configure for New Environment

SSH into your NAS and navigate to the application directory:

```bash
ssh user@172.16.0.89
cd /volume1/docker/thad-chat
```

Edit the `.env.docker` file and change only the `APP_HOST`:

```bash
# Edit .env.docker
nano .env.docker

# Change this line:
APP_HOST=172.16.0.89  # Changed from localhost

# Optionally, adjust paths for NAS:
MYSQL_DATA_PATH=/volume1/docker/thad-chat/mysql_data
DATA_PATH=/volume1/docker/thad-chat/data
```

That's it! All URLs will automatically update based on the APP_HOST variable.

## Step 4: Start Services and Restore Data

```bash
# Create mysql_data directory for the bind mount
mkdir -p mysql_data

# Start MySQL service first
docker-compose up -d mysql

# Wait for MySQL to be ready (about 30 seconds)
sleep 30

# Import the database backup
docker exec -i thad-chat-mysql mysql -u root -prootpassword thad_chat < thad_chat_backup_20250927_111410.sql

# Start all other services
docker-compose up -d

# Check that all services are running
docker-compose ps
```

## Step 5: Verify Migration

1. Open your browser and navigate to:
   - Frontend: `http://172.16.0.89:5173`
   - Backend API: `http://172.16.0.89:3001/api/health`
   - n8n (if using): `http://172.16.0.89:5678`

2. Check that all your data is present in the dashboard

## Environment Variables Reference

Key variables you might need to adjust:

| Variable | Description | Example for NAS |
|----------|-------------|-----------------|
| `APP_HOST` | Server IP or hostname | `172.16.0.89` |
| `MYSQL_DATA_PATH` | MySQL data directory | `/volume1/docker/thad-chat/mysql_data` |
| `DATA_PATH` | Application data directory | `/volume1/docker/thad-chat/data` |
| `MYSQL_PORT` | External MySQL port | `3307` (change if conflict) |
| `BACKEND_PORT` | Backend API port | `3001` (change if conflict) |
| `FRONTEND_PORT` | Frontend port | `5173` (change if conflict) |

## Troubleshooting

### Port Conflicts
If you get port binding errors, change the port numbers in `.env.docker`:
```bash
MYSQL_PORT=3308  # Different port
BACKEND_PORT=3002
FRONTEND_PORT=5174
```

### Permission Issues
On some NAS systems, you may need to set proper permissions:
```bash
chmod -R 755 data/
chmod -R 755 mysql_data/
```

### MySQL Connection Issues
If the backend can't connect to MySQL:
1. Ensure MySQL container is healthy: `docker-compose ps`
2. Check logs: `docker-compose logs mysql`
3. Verify environment variables are loaded: `docker-compose config`

## Backup Strategy for NAS

Once migrated, set up regular backups:

```bash
# Create a backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/volume1/backups/thad-chat"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MySQL
docker exec thad-chat-mysql mysqldump -u root -prootpassword thad_chat > $BACKUP_DIR/thad_chat_$DATE.sql

# Backup data directory
tar czf $BACKUP_DIR/data_$DATE.tar.gz data/

# Keep only last 7 backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to cron for daily backups
# crontab -e
# 0 2 * * * /volume1/docker/thad-chat/backup.sh
```

## Reverting Migration

If you need to move back to your Mac or another server:

1. Create a new MySQL backup on the NAS
2. Copy the application folder to the new location
3. Update `APP_HOST` in `.env.docker`
4. Follow steps 4-5 above

The beauty of this setup is that you only need to change the `APP_HOST` variable - everything else adjusts automatically!