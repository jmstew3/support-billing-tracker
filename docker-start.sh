#!/bin/bash

# Support Billing Tracker Docker Startup Script

set -e

echo "🚀 Starting Support Billing Tracker Application with Docker..."

# Load environment variables if .env exists
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start the services
echo "🔨 Building Docker images..."
docker-compose build

echo "🎯 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health status
echo "🏥 Checking service health..."

# Check MySQL
if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} > /dev/null 2>&1; then
    echo "✅ MySQL is healthy"
else
    echo "⚠️  MySQL is not ready yet"
fi

# Check backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend is not ready yet"
fi

# Check frontend
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend is not ready yet"
fi

echo ""
echo "📊 Services are starting up..."
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo "   MySQL:    localhost:3306"
echo ""
echo "📝 To view logs: docker-compose logs -f [service]"
echo "🛑 To stop:     docker-compose down"
echo "🗑️  To reset:    docker-compose down -v"
echo ""
echo "✨ Support Billing Tracker is ready!"