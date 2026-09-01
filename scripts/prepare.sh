#!/bin/bash
set -Eeuo pipefail

cd "$(pwd)"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --reporter=append-only
