#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
BRIDGE_DIR="${ROOT}/bridge-server"
URL="http://localhost:3000"

cd "${BRIDGE_DIR}"

if [ ! -d node_modules ]; then
  echo "Installing bridge-server dependencies..."
  npm install
fi

if curl -sf "${URL}/api/bridge-health" >/dev/null 2>&1; then
  echo "ERP POS already running at ${URL}"
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    google-chrome "${URL}" 2>/dev/null || xdg-open "${URL}" 2>/dev/null || true
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    open -a "Google Chrome" "${URL}" 2>/dev/null || open "${URL}" 2>/dev/null || true
  fi
  exit 0
fi

echo "Starting ERP POS web UI + bridge server..."
echo "Keep this terminal open while using the POS."

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  (sleep 1 && google-chrome --enable-experimental-web-platform-features --enable-features=WebBluetooth,WebBluetoothScanning "${URL}" 2>/dev/null || xdg-open "${URL}" 2>/dev/null || true) &
elif [[ "$OSTYPE" == "darwin"* ]]; then
  (sleep 1 && open -a "Google Chrome" "${URL}" 2>/dev/null || open "${URL}" 2>/dev/null || true) &
fi

node server.js
