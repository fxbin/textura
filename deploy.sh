#!/bin/bash

# Stop execution on error
set -e

COMPOSE_FILE="${1:-docker-compose.yml}"

echo "🚀 Starting Textura deployment..."

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: Compose file '$COMPOSE_FILE' does not exist."
    exit 1
fi

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

echo "🧾 Using compose file: $COMPOSE_FILE"

echo "📦 Building and starting services..."
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d --build

echo "🧹 Cleaning up unused images..."
docker image prune -f

echo "✅ Deployment successful!"
echo "🌐 Access the application at http://localhost"
