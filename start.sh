#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "Starting AutoHub BD..."
echo "  Web: http://localhost:3000"
echo "  API: http://localhost:4000"
echo ""

npm run dev
