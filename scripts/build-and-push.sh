#!/usr/bin/env bash

set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-me}"
IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
TCR_REGISTRY="${TCR_REGISTRY:-}"
TCR_NAMESPACE="${TCR_NAMESPACE:-}"
IMAGE_REF="${IMAGE_REF:-}"
PLATFORM="${PLATFORM:-}"

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Error: Docker is not installed."
    exit 1
fi

if [ -z "$IMAGE_REF" ]; then
    if [ -z "$TCR_REGISTRY" ] || [ -z "$TCR_NAMESPACE" ]; then
        echo "❌ Error: Set IMAGE_REF or both TCR_REGISTRY and TCR_NAMESPACE."
        exit 1
    fi

    IMAGE_REF="${TCR_REGISTRY}/${TCR_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
fi

if [ -n "${TCR_USERNAME:-}" ] && [ -n "${TCR_PASSWORD:-}" ]; then
    REGISTRY_HOST="${TCR_REGISTRY:-${IMAGE_REF%%/*}}"
    echo "🔐 Logging in to ${REGISTRY_HOST}..."
    printf '%s' "$TCR_PASSWORD" | docker login "$REGISTRY_HOST" --username "$TCR_USERNAME" --password-stdin
fi

BUILD_CMD=(docker build -t "$IMAGE_REF")
if [ -n "$PLATFORM" ]; then
    BUILD_CMD+=(--platform "$PLATFORM")
fi
BUILD_CMD+=(.)

echo "📦 Building image: $IMAGE_REF"
"${BUILD_CMD[@]}"

echo "🚀 Pushing image: $IMAGE_REF"
docker push "$IMAGE_REF"

echo "✅ Image published: $IMAGE_REF"
