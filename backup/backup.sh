#!/bin/bash
#
# MySQL Backup Script (Docker Container Version)
# Creates compressed SQL dumps with daily/weekly/monthly rotation
#
# Environment Variables Required:
#   MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
#
# Retention Policy:
#   - Daily backups: 5 days
#   - Weekly backups: 4 weeks (Sundays)
#   - Monthly backups: 6 months (1st of month)
#

set -e

# Configuration from environment
BACKUP_DIR="/backups"
LOG_FILE="/var/log/backup.log"

DB_HOST="${MYSQL_HOST:-mysql}"
DB_USER="${MYSQL_USER}"
DB_PASSWORD="${MYSQL_PASSWORD}"
DB_NAME="${MYSQL_DATABASE:-support_billing_tracker}"

# Retention settings
DAILY_RETENTION=5
WEEKLY_RETENTION=4
MONTHLY_RETENTION=6

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    echo "[$timestamp] [$level] $message"
}

# Determine backup type based on day
get_backup_type() {
    local day_of_week=$(date +%u)  # 1=Monday, 7=Sunday
    local day_of_month=$(date +%d)

    if [ "$day_of_month" == "01" ]; then
        echo "monthly"
    elif [ "$day_of_week" == "7" ]; then
        echo "weekly"
    else
        echo "daily"
    fi
}

# Clean old backups based on retention policy
cleanup_old_backups() {
    local backup_type="$1"
    local retention="$2"
    local target_dir="$BACKUP_DIR/$backup_type"

    log "INFO" "Cleaning $backup_type backups older than $retention files..."

    # Count existing backups
    local count=$(find "$target_dir" -name "*.sql.gz" -type f 2>/dev/null | wc -l)

    if [ "$count" -gt "$retention" ]; then
        local to_delete=$((count - retention))
        log "INFO" "Removing $to_delete old $backup_type backup(s)"

        # Remove oldest files first (using ls -t for sorting by time)
        find "$target_dir" -name "*.sql.gz" -type f -print0 2>/dev/null | \
            xargs -0 ls -t 2>/dev/null | tail -n "$to_delete" | \
            while read -r file; do
                rm -f "$file"
                log "INFO" "Deleted: $(basename "$file")"
            done
    fi
}

# Main backup function
do_backup() {
    local backup_type="${1:-$(get_backup_type)}"
    local timestamp=$(date '+%Y-%m-%d_%H%M%S')
    local target_dir="$BACKUP_DIR/$backup_type"
    local backup_file="$target_dir/${DB_NAME}_${timestamp}.sql.gz"

    log "INFO" "=========================================="
    log "INFO" "Starting $backup_type backup..."
    log "INFO" "Target: $backup_file"
    log "INFO" "Database: $DB_NAME on $DB_HOST"

    # Validate credentials
    if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
        log "ERROR" "Database credentials not configured!"
        exit 1
    fi

    # Ensure target directory exists
    mkdir -p "$target_dir"

    # Create backup using mysqldump
    log "INFO" "Running mysqldump..."

    if mysqldump \
        -h "$DB_HOST" \
        -u "$DB_USER" \
        -p"$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        "$DB_NAME" 2>/dev/null | gzip > "$backup_file"; then

        # Verify backup file
        if [ -s "$backup_file" ]; then
            local size=$(du -h "$backup_file" | cut -f1)
            log "INFO" "Backup completed successfully: $size"

            # Cleanup old backups
            case "$backup_type" in
                "daily")   cleanup_old_backups "daily" "$DAILY_RETENTION" ;;
                "weekly")  cleanup_old_backups "weekly" "$WEEKLY_RETENTION" ;;
                "monthly") cleanup_old_backups "monthly" "$MONTHLY_RETENTION" ;;
            esac

            log "INFO" "Backup process completed successfully"
            return 0
        else
            log "ERROR" "Backup file is empty!"
            rm -f "$backup_file"
            exit 1
        fi
    else
        log "ERROR" "mysqldump failed!"
        rm -f "$backup_file"
        exit 1
    fi
}

# Parse arguments
BACKUP_TYPE=""
case "${1:-}" in
    daily|weekly|monthly)
        BACKUP_TYPE="$1"
        ;;
    --list)
        echo "Available backups:"
        for type in daily weekly monthly; do
            echo "=== $type ==="
            ls -lh "$BACKUP_DIR/$type"/*.sql.gz 2>/dev/null || echo "  (no backups)"
        done
        exit 0
        ;;
    --help|-h)
        echo "Usage: backup.sh [daily|weekly|monthly|--list|--help]"
        exit 0
        ;;
esac

# Run backup
do_backup "$BACKUP_TYPE"
