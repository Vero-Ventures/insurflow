#!/usr/bin/env bash
set -euo pipefail

# Load .env file to check DATABASE_URL
if [[ -f .env ]]; then
  export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

# Check if using Neon (production) or local database
if [[ "$DATABASE_URL" == *"neon.tech"* ]]; then
  echo "Using Neon database - running migrations (production flow)"
  bun drizzle-kit migrate
  exec bun next dev --turbo
else
  echo "Using local database - starting services and pushing schema"
  bash scripts/dev-services.sh start
  bun drizzle-kit push
  exec bun next dev --turbo
fi
