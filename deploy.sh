#!/bin/bash

# Stop execution on error
set -e

echo "🚀 Starting Textura deployment..."

# Check required tools
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  docker-compose command not found, trying 'docker compose'..."
    if ! docker compose version &> /dev/null; then
        echo "❌ Error: Docker Compose is not installed."
        exit 1
    fi
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo "📦 Building Docker image..."
$COMPOSE_CMD build

echo "sc Starting services..."
$COMPOSE_CMD up -d

echo "🧹 Cleaning up unused images..."
docker image prune -f

echo "✅ Deployment successful!"
echo "🌐 Access the application at http://localhost"
