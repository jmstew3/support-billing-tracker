#!/bin/bash

# Test Twenty API using environment variables
# To use: Ensure VITE_TWENTY_API_TOKEN is set in .env.docker

# Load environment variables from .env.docker
if [ -f .env.docker ]; then
    export $(grep -v '^#' .env.docker | xargs)
fi

# Check if API token is set
if [ -z "$VITE_TWENTY_API_TOKEN" ]; then
    echo "❌ ERROR: VITE_TWENTY_API_TOKEN not found in environment variables"
    echo "Please set VITE_TWENTY_API_TOKEN in .env.docker file"
    exit 1
fi

# Use the API URL from environment or default
API_URL="${VITE_TWENTY_API_URL:-https://twenny.peakonedigital.com}/rest/supportTickets"

echo "Testing Twenty API..."
echo "URL: $API_URL"
echo "----------------------------------------"

# Test Twenty API
curl -s "$API_URL" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $VITE_TWENTY_API_TOKEN" \
  | python3 -m json.tool