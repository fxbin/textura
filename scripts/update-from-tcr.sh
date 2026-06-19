#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.tcr.yml}"
ENV_FILE="${2:-.env.tcr}"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: Compose file '$COMPOSE_FILE' does not exist."
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Env file '$ENV_FILE' does not exist."
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Error: Docker is not installed."
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
else
    echo "❌ Error: Docker Compose is not installed."
    exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [ -n "${TCR_REGISTRY:-}" ] && [ -n "${TCR_USERNAME:-}" ] && [ -n "${TCR_PASSWORD:-}" ]; then
    echo "🔐 Logging in to ${TCR_REGISTRY}..."
    printf '%s' "$TCR_PASSWORD" | docker login "$TCR_REGISTRY" --username "$TCR_USERNAME" --password-stdin
fi

echo "📥 Pulling latest image..."
"${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull textura

echo "🔄 Restarting services..."
"${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo "🧹 Cleaning up unused images..."
docker image prune -f

echo "✅ Server updated successfully."
