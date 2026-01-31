#!/bin/bash

# Source both setup scripts
source ./scripts/setup-postgres.sh
source ./scripts/setup-redis.sh

# Function to handle cleanup for both services
cleanup_and_exit() {
    echo "Cleaning up services..."
    cleanup_postgres
    cleanup_redis
    exit 0
}

# Trap SIGINT and SIGTERM to cleanup on exit
trap cleanup_and_exit SIGINT SIGTERM

echo "Starting development with separate processes (BullMQ + Redis)..."

# Use nodemon instead of tsup --onSuccess for better process management
concurrently -k -n APP,FEED,SEARCH,FIREHOSE,NOTIF,SYNC,BUILD -c blue,green,yellow,magenta,cyan,white,red \
  "dotenv -e .env.local -- nodemon --exec 'node dist/index.js' --watch dist/index.js --delay 1000ms" \
  "dotenv -e .env.local -- nodemon --exec 'node dist/workers/feed-worker.js' --watch dist/workers/feed-worker.js --delay 1000ms" \
  "dotenv -e .env.local -- nodemon --exec 'node dist/workers/search-worker.js' --watch dist/workers/search-worker.js --delay 1000ms" \
  "dotenv -e .env.local -- nodemon --exec 'node dist/workers/firehose-worker.js' --watch dist/workers/firehose-worker.js --delay 1000ms" \
  "dotenv -e .env.local -- nodemon --exec 'node dist/workers/notification-worker.js' --watch dist/workers/notification-worker.js --delay 1000ms" \
  "dotenv -e .env.local -- nodemon --exec 'node dist/workers/sync-worker.js' --watch dist/workers/sync-worker.js --delay 1000ms" \
  "tsup --watch"

# Cleanup after concurrently exits
cleanup_postgres
cleanup_redis
