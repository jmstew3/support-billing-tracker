#!/bin/bash
#
# FluentSupport Ticket Sync Script
#
# This script automates synchronization of FluentSupport tickets from the WordPress API
# into the Support Billing Tracker database.
#
# Usage:
#   ./scripts/sync-fluent-tickets.sh [YYYY-MM-DD]
#
# Arguments:
#   YYYY-MM-DD  Optional date filter (defaults to 7 days ago)
#
# Examples:
#   ./scripts/sync-fluent-tickets.sh                 # Sync from 7 days ago
#   ./scripts/sync-fluent-tickets.sh 2025-10-01      # Sync from specific date
#
# Requirements:
#   - Docker and docker-compose installed
#   - .env file with FluentSupport configuration
#   - curl and jq commands available
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENV_FILE="$PROJECT_ROOT/.env"
BACKEND_CONTAINER="support-billing-tracker-backend"
API_BASE_URL="http://localhost:3011/api"

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================
# VALIDATION
# ============================================================

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    log_error ".env file not found at: $ENV_FILE"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose is not installed or not in PATH"
    exit 1
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    log_error "curl is not installed or not in PATH"
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed - JSON output will not be formatted"
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

# ============================================================
# DATE FILTER CONFIGURATION
# ============================================================

# Get date filter from argument or default to 7 days ago
if [ -n "$1" ]; then
    DATE_FILTER="$1"

    # Validate date format (basic check)
    if ! [[ "$DATE_FILTER" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        log_error "Invalid date format. Use YYYY-MM-DD (e.g., 2025-10-17)"
        exit 1
    fi
else
    # Calculate 7 days ago
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        DATE_FILTER=$(date -v-7d +%Y-%m-%d)
    else
        # Linux
        DATE_FILTER=$(date -d '7 days ago' +%Y-%m-%d)
    fi
    log_info "No date specified, using default: $DATE_FILTER (7 days ago)"
fi

log_info "Date filter: $DATE_FILTER"

# ============================================================
# UPDATE ENVIRONMENT FILE
# ============================================================

log_info "Updating VITE_FLUENT_DATE_FILTER in .env..."

# Check if the variable exists in the file
if grep -q "^VITE_FLUENT_DATE_FILTER=" "$ENV_FILE"; then
    # Update existing line
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS (BSD sed)
        sed -i '' "s|^VITE_FLUENT_DATE_FILTER=.*|VITE_FLUENT_DATE_FILTER=$DATE_FILTER|" "$ENV_FILE"
    else
        # Linux (GNU sed)
        sed -i "s|^VITE_FLUENT_DATE_FILTER=.*|VITE_FLUENT_DATE_FILTER=$DATE_FILTER|" "$ENV_FILE"
    fi
    log_success "Updated VITE_FLUENT_DATE_FILTER to $DATE_FILTER"
else
    # Add new line
    echo "VITE_FLUENT_DATE_FILTER=$DATE_FILTER" >> "$ENV_FILE"
    log_success "Added VITE_FLUENT_DATE_FILTER=$DATE_FILTER to .env"
fi

# ============================================================
# RESTART BACKEND CONTAINER
# ============================================================

log_info "Restarting backend container to apply new environment..."

cd "$PROJECT_ROOT"

if docker-compose restart backend > /dev/null 2>&1; then
    log_success "Backend container restarted"
else
    log_error "Failed to restart backend container"
    exit 1
fi

# Wait for backend to be ready
log_info "Waiting for backend to initialize..."
sleep 5

# Check if backend is healthy
HEALTH_CHECK_URL="http://localhost:3011/health"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log_success "Backend is ready"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        log_error "Backend health check failed after $MAX_RETRIES attempts"
        exit 1
    fi

    log_info "Waiting for backend... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

# ============================================================
# AUTHENTICATE
# ============================================================

log_info "Authenticating with API..."

# Get credentials from .env.docker
JWT_USERNAME=$(grep "^JWT_USERNAME=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo "admin@peakonedigital.com")
JWT_PASSWORD=$(grep "^JWT_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo "PeakonBilling2025")

AUTH_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$JWT_USERNAME\",\"password\":\"$JWT_PASSWORD\"}")

# Extract access token
if [ "$JQ_AVAILABLE" = true ]; then
    ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.accessToken // empty')
else
    # Fallback: extract token without jq (basic regex)
    ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    log_error "Authentication failed. Response:"
    echo "$AUTH_RESPONSE"
    exit 1
fi

log_success "Authenticated successfully"

# ============================================================
# TRIGGER SYNC
# ============================================================

log_info "Triggering FluentSupport sync for dates >= $DATE_FILTER..."

SYNC_RESPONSE=$(curl -s -X POST "$API_BASE_URL/fluent/sync" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{\"dateFilter\":\"$DATE_FILTER\"}")

# ============================================================
# DISPLAY RESULTS
# ============================================================

echo ""
echo "============================================================"
echo "                    SYNC RESULTS"
echo "============================================================"

if [ "$JQ_AVAILABLE" = true ]; then
    # Pretty print with jq
    echo "$SYNC_RESPONSE" | jq .

    # Extract key metrics
    SUCCESS=$(echo "$SYNC_RESPONSE" | jq -r '.success // false')
    TICKETS_FETCHED=$(echo "$SYNC_RESPONSE" | jq -r '.ticketsFetched // 0')
    TICKETS_ADDED=$(echo "$SYNC_RESPONSE" | jq -r '.ticketsAdded // 0')
    TICKETS_UPDATED=$(echo "$SYNC_RESPONSE" | jq -r '.ticketsUpdated // 0')
    TICKETS_SKIPPED=$(echo "$SYNC_RESPONSE" | jq -r '.ticketsSkipped // 0')
    SYNC_DURATION=$(echo "$SYNC_RESPONSE" | jq -r '.syncDuration // 0')
    ERROR_MSG=$(echo "$SYNC_RESPONSE" | jq -r '.error // ""')

    echo ""
    echo "Summary:"
    echo "--------"
    if [ "$SUCCESS" = "true" ]; then
        log_success "Sync completed successfully"
        log_info "Fetched: $TICKETS_FETCHED | Added: $TICKETS_ADDED | Updated: $TICKETS_UPDATED | Skipped: $TICKETS_SKIPPED"
        log_info "Duration: ${SYNC_DURATION}ms"
    else
        log_error "Sync failed: $ERROR_MSG"
        exit 1
    fi
else
    # Raw output without jq
    echo "$SYNC_RESPONSE"

    # Basic success check
    if echo "$SYNC_RESPONSE" | grep -q '"success":true'; then
        echo ""
        log_success "Sync completed successfully"
    else
        echo ""
        log_error "Sync may have failed - check response above"
        exit 1
    fi
fi

echo "============================================================"
echo ""

# ============================================================
# VERIFY DATABASE
# ============================================================

log_info "Verifying database records..."

# Query database for FluentSupport tickets count
MYSQL_CONTAINER="support-billing-tracker-mysql"
MYSQL_USER="thaduser"
MYSQL_PASS="thadpassword"
MYSQL_DB="support_billing_tracker"

DB_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" \
    -se "SELECT COUNT(*) FROM requests WHERE source='fluent' AND date >= '$DATE_FILTER';" 2>/dev/null || echo "0")

log_success "FluentSupport tickets in database (>= $DATE_FILTER): $DB_COUNT"

echo ""
log_success "Sync process completed!"
echo ""
echo "Next steps:"
echo "  - View tickets at: http://localhost:5173 (Support page)"
echo "  - Check sync status: curl -s http://localhost:3011/api/fluent/status | jq ."
echo "  - View backend logs: docker logs $BACKEND_CONTAINER"
echo ""

exit 0
