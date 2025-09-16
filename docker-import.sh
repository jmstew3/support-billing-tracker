#!/bin/bash

# Docker CSV Import Script for Thad Chat

set -e

echo "📂 Importing CSV data to Docker MySQL database..."

# Default CSV path
CSV_PATH="${1:-data/03_final/thad_requests_table.csv}"

# Check if file exists
if [ ! -f "$CSV_PATH" ]; then
    echo "❌ CSV file not found: $CSV_PATH"
    echo "Usage: ./docker-import.sh [path/to/csv]"
    exit 1
fi

# Check if services are running
if ! docker-compose ps | grep -q "thad-chat-backend.*Up"; then
    echo "⚠️  Backend service is not running. Starting services..."
    docker-compose up -d
    echo "⏳ Waiting for services to be ready..."
    sleep 15
fi

# Copy CSV file to container
echo "📤 Copying CSV file to backend container..."
docker cp "$CSV_PATH" thad-chat-backend:/tmp/import.csv

# Run import command
echo "🔄 Running import script..."
docker-compose exec backend npm run import -- --file /tmp/import.csv --clear

# Clean up
echo "🧹 Cleaning up temporary files..."
docker-compose exec backend rm /tmp/import.csv

echo "✅ Import completed successfully!"
echo ""
echo "You can now view the data at: http://localhost:5173"