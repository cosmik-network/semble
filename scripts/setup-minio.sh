#!/bin/bash

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

# Check if the MinIO container is running
if [ "$(docker ps -q -f name=annos-minio)" ]; then
  echo "MinIO container is already running."
  export STORAGE_RUNNING=true
else
  echo "Starting MinIO container..."
  npm run storage:start
  export STORAGE_RUNNING=false

  # Wait for MinIO to accept requests, then make sure the bucket exists
  # (the app also creates it on first use; this just gets it ready now)
  until curl -sf http://localhost:9000/minio/health/ready > /dev/null 2>&1; do
    sleep 0.5
  done
  docker run --rm --network host minio/mc \
    sh -c "mc alias set local http://localhost:9000 minioadmin minioadmin && mc mb --ignore-existing local/semble-canvas" \
    || echo "Warning: couldn't create the semble-canvas bucket (the app will retry on first use)"
fi

# Trap SIGINT and SIGTERM to stop containers on exit, only if we started them
function cleanup_minio {
  if [ "$STORAGE_RUNNING" = false ]; then
    if [ "$(docker ps -q -f name=annos-minio)" ]; then
      echo "Stopping MinIO container..."
      npm run storage:stop
      npm run storage:remove
    fi
  fi
}

# Export the cleanup function so it can be called from other scripts
export -f cleanup_minio
