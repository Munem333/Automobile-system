# ERP POS Web Sender

Browser-based ERP POS that sends order payloads to the Android receiver over **USB (ADB)**, **Web Bluetooth**, or **QR Code** (offline fallback).

See the [root README](../README.md) for full cross-platform setup, USB drivers, udev rules, and troubleshooting.

## Quick start

```bash
# Terminal 1 — bridge server (required for Connect USB)
cd bridge-server
npm install
npm start

# Terminal 2 — web POS
cd erp-pos-web
python3 -m http.server 3000
# Open http://localhost:3000 in Chrome
```

**Linux BLE**: use `./run.sh` — it starts the HTTP server and opens Chrome with `--enable-experimental-web-platform-features` at `http://localhost:3000`. On Linux, **Connect Bluetooth** also uses bridge-server BLE scan when the Chrome device picker is empty.

## Connection methods

| Button | How it works |
|--------|--------------|
| **Connect USB** | WebSocket → `bridge-server` → ADB forward → phone app (`AdbTcpReceiverService`). Phone must show **ADB Ready**. |
| **Connect Bluetooth** | Direct Web Bluetooth (Windows/Mac) or bridge-server noble scan (Linux). Phone must show **BLE Ready**. |
| **QR Code** | Generates `erppos://receive?d=<base64url JSON>`. No bridge, cable, or Bluetooth needed. |

## Setup order

1. Android app installed and open → **Start Receiving** → **ADB Ready** / **BLE Ready**
2. `bridge-server` running (`npm start`)
3. Chrome at `http://localhost:3000`
4. **Connect USB** or **Connect Bluetooth**
5. Add cart items → **Send To Android POS**

Full steps: [Connection Setup Order](../README.md#connection-setup-order)

## Features

- **View persistence** — refreshing the page keeps you on the current module (Dashboard, Products, Sales, etc.)
- **Bluetooth health check** — if phone Bluetooth turns off, connection status updates immediately (no stale “connected” state)
- **QR deep link** — scanned QR opens ERP POS app directly via `erppos://receive`
- **Theme** — light / dark / system (saved in `localStorage`)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot reach bridge server` | Run `cd bridge-server && npm start` in a separate terminal |
| `read ECONNRESET` on Send | Open ERP POS app on phone → wait for **ADB Ready** → click **Connect USB** again |
| `ADB phone check timed out` | App not open or ADB listener not started. Open app, wait for notification, retry |
| `Unable to claim interface` on Connect USB | Web POS uses ADB bridge, not WebUSB. Start `bridge-server` and use **Connect USB** |
| No ERP POS in Bluetooth list | Open Android app → **Start Receiving** → wait for **BLE Ready** → grant Bluetooth permissions |
| Web Bluetooth blocked on Linux | Use `./run.sh` or **Connect USB** via bridge-server |
| QR not opening app | Install ERP POS APK; ensure QR contains `erppos://receive?d=...` |
| Page refresh goes to Dashboard | Should stay on current view — clear site data if stuck on old cache |

## Payload & protocol

Same JSON as [root README](../README.md#payload-format). BLE uses 20-byte chunked writes; USB sends one JSON line terminated with `\n`.
