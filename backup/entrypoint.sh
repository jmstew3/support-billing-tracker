#!/bin/bash
#
# Entrypoint for MySQL Backup Container
# Sets up environment and starts cron daemon
#

set -e

echo "[$(date '+%Y-%m-%d %H:%M:%S')] MySQL Backup Container Starting..."

# Validate required environment variables
if [ -z "$MYSQL_USER" ] || [ -z "$MYSQL_PASSWORD" ]; then
    echo "[ERROR] MYSQL_USER and MYSQL_PASSWORD must be set!"
    exit 1
fi

# Export environment variables for cron jobs
# Cron runs in a clean environment, so we need to pass these
printenv | grep -E '^(MYSQL_|TZ=)' > /etc/environment

# Log configuration (without exposing password)
echo "[INFO] Configuration:"
echo "  - MYSQL_HOST: ${MYSQL_HOST:-mysql}"
echo "  - MYSQL_DATABASE: ${MYSQL_DATABASE:-velocity_billing}"
echo "  - MYSQL_USER: ${MYSQL_USER}"
echo "  - Timezone: ${TZ:-UTC}"
echo "  - Backup Directory: /backups"

# Wait for MySQL to be ready
echo "[INFO] Waiting for MySQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while ! mysqladmin ping -h "${MYSQL_HOST:-mysql}" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --silent 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "[ERROR] MySQL not available after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "[INFO] Waiting for MySQL... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

echo "[INFO] MySQL is ready!"

# Run initial backup on startup (optional - comment out if not wanted)
if [ "${BACKUP_ON_STARTUP:-false}" = "true" ]; then
    echo "[INFO] Running initial backup..."
    /usr/local/bin/backup.sh daily
fi

# Display cron schedule
echo "[INFO] Cron schedule:"
cat /etc/cron.d/mysql-backup | grep -v "^#" | grep -v "^$"

# Start cron daemon in foreground
echo "[INFO] Starting cron daemon..."
exec crond -n -s
