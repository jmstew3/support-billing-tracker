#!/bin/bash
#
# MySQL Backup Script for Support Billing Tracker
# Creates compressed SQL dumps with daily/weekly/monthly rotation
#
# Usage: ./backup-mysql.sh [--type daily|weekly|monthly]
#
# Retention Policy:
#   - Daily backups: 5 days
#   - Weekly backups: 4 weeks (Sundays)
#   - Monthly backups: 6 months (1st of month)
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/mysql_data_backup"
LOG_FILE="$BACKUP_DIR/backup.log"
ENV_FILE="$PROJECT_DIR/.env"

# Container and database name (non-sensitive defaults OK)
CONTAINER_NAME="support-billing-tracker-mysql"
DB_NAME="support_billing_tracker"

# SECURITY: Load database credentials from environment - no hardcoded fallbacks
if [ -f "$ENV_FILE" ]; then
    DB_USER=$(grep "^MYSQL_USER=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"')
    DB_PASSWORD=$(grep "^MYSQL_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"')
    DB_NAME_ENV=$(grep "^MYSQL_DATABASE=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"')
    [ -n "$DB_NAME_ENV" ] && DB_NAME="$DB_NAME_ENV"
fi

# Require credentials - exit if not configured
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}[ERROR]${NC} Database credentials not found."
    echo "Set MYSQL_USER and MYSQL_PASSWORD in $ENV_FILE"
    exit 1
fi

# Retention settings
DAILY_RETENTION=5
WEEKLY_RETENTION=4
MONTHLY_RETENTION=6

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"

    case "$level" in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
    esac
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

        # Remove oldest files first
        find "$target_dir" -name "*.sql.gz" -type f -printf '%T+ %p\n' 2>/dev/null | \
            sort | head -n "$to_delete" | cut -d' ' -f2- | \
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

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "ERROR" "Container '$CONTAINER_NAME' is not running!"
        exit 1
    fi

    # Ensure target directory exists
    mkdir -p "$target_dir"

    # Create backup using mysqldump inside container
    log "INFO" "Running mysqldump..."

    if docker exec "$CONTAINER_NAME" mysqldump \
        -u"$DB_USER" \
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

# Show usage
show_usage() {
    echo "MySQL Backup Script for Support Billing Tracker"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --type TYPE    Backup type: daily, weekly, or monthly"
    echo "                 (default: auto-detected based on current date)"
    echo "  --list         List all existing backups"
    echo "  --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Auto-detect backup type"
    echo "  $0 --type daily       # Force daily backup"
    echo "  $0 --list             # List all backups"
}

# List all backups
list_backups() {
    echo "Available backups:"
    echo ""

    for type in daily weekly monthly; do
        echo "=== $type ==="
        local dir="$BACKUP_DIR/$type"
        if [ -d "$dir" ] && [ "$(ls -A "$dir" 2>/dev/null)" ]; then
            ls -lh "$dir"/*.sql.gz 2>/dev/null | awk '{print $9, $5, $6, $7}'
        else
            echo "  (no backups)"
        fi
        echo ""
    done
}

# Parse arguments
BACKUP_TYPE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --list)
            list_backups
            exit 0
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run backup
do_backup "$BACKUP_TYPE"
