#!/bin/bash
cd "$(dirname "$0")"
PORT=3000
URL="http://localhost:${PORT}"
ROOT_DIR="$(cd .. && pwd)"
BRIDGE_DIR="${ROOT_DIR}/bridge-server"

if ! pgrep -f "python3 -m http.server ${PORT}" >/dev/null 2>&1; then
  python3 -m http.server "${PORT}" >/dev/null 2>&1 &
  sleep 1
fi

if ! pgrep -f "node server.js" >/dev/null 2>&1 && [ -f "${BRIDGE_DIR}/server.js" ]; then
  (cd "${BRIDGE_DIR}" && npm start) >/dev/null 2>&1 &
  sleep 1
fi

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  google-chrome --enable-experimental-web-platform-features --enable-features=WebBluetooth,WebBluetoothScanning "${URL}"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  open -a "Google Chrome" "${URL}"
else
  start chrome "${URL}"
fi
