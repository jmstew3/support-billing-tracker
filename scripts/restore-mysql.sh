#!/bin/bash
#
# MySQL Restore Script for Support Billing Tracker
# Restores database from backup files with safety confirmations
#
# Usage: ./restore-mysql.sh [backup_file]
#        ./restore-mysql.sh --list
#        ./restore-mysql.sh --latest [daily|weekly|monthly]
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/mysql_data_backup"
LOG_FILE="$BACKUP_DIR/backup.log"

# Database configuration (matches docker-compose.yml)
CONTAINER_NAME="support-billing-tracker-mysql"
DB_NAME="support_billing_tracker"
DB_USER="thaduser"
DB_PASSWORD="thadpassword"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
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

# List all available backups
list_backups() {
    echo -e "${BOLD}Available Backups:${NC}"
    echo ""

    local index=1
    declare -g -a BACKUP_FILES=()

    for type in monthly weekly daily; do
        local dir="$BACKUP_DIR/$type"
        if [ -d "$dir" ]; then
            local files=$(find "$dir" -name "*.sql.gz" -type f 2>/dev/null | sort -r)
            if [ -n "$files" ]; then
                echo -e "${BLUE}=== ${type^^} ===${NC}"
                while IFS= read -r file; do
                    local size=$(du -h "$file" | cut -f1)
                    local date=$(stat -c %y "$file" 2>/dev/null | cut -d' ' -f1)
                    local basename=$(basename "$file")
                    echo -e "  ${YELLOW}[$index]${NC} $basename (${size}, $date)"
                    BACKUP_FILES+=("$file")
                    ((index++))
                done <<< "$files"
                echo ""
            fi
        fi
    done

    if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
        echo -e "${RED}No backups found!${NC}"
        return 1
    fi

    return 0
}

# Get latest backup of specified type
get_latest_backup() {
    local type="${1:-daily}"
    local dir="$BACKUP_DIR/$type"

    if [ ! -d "$dir" ]; then
        echo ""
        return 1
    fi

    find "$dir" -name "*.sql.gz" -type f 2>/dev/null | sort -r | head -1
}

# Confirm restore action
confirm_restore() {
    local backup_file="$1"
    local basename=$(basename "$backup_file")
    local size=$(du -h "$backup_file" | cut -f1)

    echo ""
    echo -e "${RED}${BOLD}WARNING: This will REPLACE all data in '$DB_NAME' database!${NC}"
    echo ""
    echo -e "Backup file: ${YELLOW}$basename${NC}"
    echo -e "Size: $size"
    echo ""
    echo -e "${BOLD}Current database will be completely overwritten.${NC}"
    echo ""
    read -p "Type 'RESTORE' to confirm: " confirmation

    if [ "$confirmation" != "RESTORE" ]; then
        echo -e "${YELLOW}Restore cancelled.${NC}"
        return 1
    fi

    return 0
}

# Perform the restore
do_restore() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log "ERROR" "Backup file not found: $backup_file"
        exit 1
    fi

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "ERROR" "Container '$CONTAINER_NAME' is not running!"
        echo -e "${RED}Start the container first: docker-compose up -d mysql${NC}"
        exit 1
    fi

    log "INFO" "=========================================="
    log "INFO" "Starting restore from: $(basename "$backup_file")"

    echo ""
    echo -e "${GREEN}Restoring database...${NC}"

    # Decompress and restore
    if [[ "$backup_file" == *.gz ]]; then
        if gunzip -c "$backup_file" | docker exec -i "$CONTAINER_NAME" mysql \
            -u"$DB_USER" \
            -p"$DB_PASSWORD" \
            "$DB_NAME" 2>/dev/null; then
            log "INFO" "Restore completed successfully!"
            echo ""
            echo -e "${GREEN}${BOLD}Restore completed successfully!${NC}"
        else
            log "ERROR" "Restore failed!"
            echo -e "${RED}Restore failed! Check logs for details.${NC}"
            exit 1
        fi
    else
        if docker exec -i "$CONTAINER_NAME" mysql \
            -u"$DB_USER" \
            -p"$DB_PASSWORD" \
            "$DB_NAME" < "$backup_file" 2>/dev/null; then
            log "INFO" "Restore completed successfully!"
            echo ""
            echo -e "${GREEN}${BOLD}Restore completed successfully!${NC}"
        else
            log "ERROR" "Restore failed!"
            echo -e "${RED}Restore failed! Check logs for details.${NC}"
            exit 1
        fi
    fi
}

# Interactive backup selection
interactive_select() {
    if ! list_backups; then
        exit 1
    fi

    echo ""
    read -p "Enter backup number to restore (or 'q' to quit): " selection

    if [ "$selection" == "q" ] || [ "$selection" == "Q" ]; then
        echo "Cancelled."
        exit 0
    fi

    if ! [[ "$selection" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}Invalid selection!${NC}"
        exit 1
    fi

    local index=$((selection - 1))
    if [ $index -lt 0 ] || [ $index -ge ${#BACKUP_FILES[@]} ]; then
        echo -e "${RED}Invalid selection!${NC}"
        exit 1
    fi

    local selected_file="${BACKUP_FILES[$index]}"

    if confirm_restore "$selected_file"; then
        do_restore "$selected_file"
    fi
}

# Show usage
show_usage() {
    echo "MySQL Restore Script for Support Billing Tracker"
    echo ""
    echo "Usage: $0 [OPTIONS] [BACKUP_FILE]"
    echo ""
    echo "Options:"
    echo "  --list              List all available backups"
    echo "  --latest [TYPE]     Restore latest backup (daily/weekly/monthly)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                              # Interactive selection"
    echo "  $0 --list                       # List all backups"
    echo "  $0 --latest                     # Restore latest daily backup"
    echo "  $0 --latest monthly             # Restore latest monthly backup"
    echo "  $0 /path/to/backup.sql.gz       # Restore specific file"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --list)
            list_backups
            exit 0
            ;;
        --latest)
            TYPE="${2:-daily}"
            BACKUP_FILE=$(get_latest_backup "$TYPE")
            if [ -z "$BACKUP_FILE" ]; then
                echo -e "${RED}No $TYPE backups found!${NC}"
                exit 1
            fi
            echo -e "Latest $TYPE backup: ${YELLOW}$(basename "$BACKUP_FILE")${NC}"
            if confirm_restore "$BACKUP_FILE"; then
                do_restore "$BACKUP_FILE"
            fi
            exit 0
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            if [ -f "$1" ]; then
                if confirm_restore "$1"; then
                    do_restore "$1"
                fi
                exit 0
            else
                echo -e "${RED}File not found: $1${NC}"
                exit 1
            fi
            ;;
    esac
done

# No arguments - interactive mode
interactive_select
