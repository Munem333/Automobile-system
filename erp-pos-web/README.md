# ERP POS Web Sender

Browser-based ERP POS that sends order payloads to the Android receiver over **USB (ADB)**, **Web Bluetooth**, or **QR Code** (offline fallback).

See the [root README](../README.md) for full cross-platform setup, USB drivers, udev rules, and troubleshooting.

## Quick start

From the **project root** (recommended — one command starts the web UI and bridge together):

| Platform | Command |
|----------|---------|
| Windows | Double-click `start.bat` or run `.\start.ps1` |
| Linux / macOS | `./start.sh` |

Then open **http://localhost:3000** in Chrome (the start script opens it automatically on most setups).

The bridge server serves the web POS and handles USB/ADB on **port 3000**. Keep that terminal window open while you use the POS.

**Manual start** (two terminals only if you need to debug separately):

```bash
cd bridge-server
npm install
npm start
# Web UI + bridge: http://localhost:3000
```

**Linux Bluetooth**: `./run.sh` from this folder delegates to the root `start.sh` and opens Chrome with `--enable-experimental-web-platform-features` for Web Bluetooth. On Linux, **Connect Bluetooth** can also use bridge-server BLE scan when the Chrome device picker is empty.

## Connection controls (cart panel)

**Connect USB**, **Connect Bluetooth**, **Send To Android POS**, and **QR Code** live in the **right-side cart footer** (not a separate toolbar).

## Connection methods

| Button | How it works |
|--------|--------------|
| **Connect USB** | HTTP `GET /api/adb-ping` → bridge-server → `adb forward tcp:8765 localabstract:erppos_adb` → phone sends `PING\n` → `OK\n`. Connection is marked connected only when the phone returns a **verified** ping. |
| **Send To Android POS** (USB) | HTTP `POST /api/adb-send` with order JSON → phone saves order → responds `OK\n`. |
| **Connect Bluetooth** | Direct Web Bluetooth (Windows/Mac) or bridge-server noble scan (Linux). Phone must show **BLE Ready**. |
| **QR Code** | Generates `erppos://receive?d=<base64url JSON>`. No bridge, cable, or Bluetooth needed. |

USB does **not** use WebUSB in the browser. It always goes through the local bridge and ADB.

## Setup order

1. Install and open the Android app → **Start Receiving** → wait for **ADB Ready** (USB) and/or **BLE Ready** (Bluetooth)
2. Plug in USB and allow USB debugging on the phone if prompted
3. Run `start.bat` / `start.ps1` / `start.sh` from the project root
4. Chrome at **http://localhost:3000** (hard refresh with Ctrl+F5 if you had an old tab open)
5. Add cart items → **Connect USB** or **Connect Bluetooth** → **Send To Android POS**

Full steps: [Connection Setup Order](../README.md#connection-setup-order)

## Bridge HTTP API (USB)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bridge-health` | GET | Bridge is running |
| `/api/adb-status` | GET | ADB device + forward status (diagnostics) |
| `/api/adb-ping` | GET | Real phone ping — used by **Connect USB** |
| `/api/adb-send` | POST | Send order JSON — used by **Send To Android POS** over USB |

WebSocket is still available at `ws://localhost:3000/ws` (legacy `ws://localhost:8080` if free). USB connect/send prefer HTTP for reliability.

## Features

- **View persistence** — refreshing the page keeps you on the current module (Dashboard, Products, Sales, etc.)
- **Verified USB link** — connect succeeds only after the phone answers `PING` with `OK` (no cached “fake connected” state)
- **Bluetooth health check** — if phone Bluetooth turns off, connection status updates immediately (no stale “connected” state)
- **QR deep link** — scanned QR opens ERP POS app directly via `erppos://receive`
- **Theme** — light / dark / system (saved in `localStorage`)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot reach bridge server` | Run `start.bat` / `start.ps1` / `start.sh` from the project root; confirm **http://localhost:3000/api/bridge-health** returns JSON |
| `Phone did not answer over USB` | Open ERP POS on the phone → wait for **ADB Ready** → unlock phone → click **Connect USB** again |
| USB shows connected but Send fails | Hard refresh (Ctrl+F5), click **Connect USB** again, then **Send To Android POS** |
| `read ECONNRESET` on Send | App closed or ADB listener stopped. Open app, wait for **ADB Ready**, reconnect USB |
| `Port 3000 is already in use` | Close the other ERP POS / Node window, or stop the process using port 3000 |
| Old bridge on port 8080 only | Stop stale Node processes; always use `start.bat` so web + bridge run together on port **3000** |
| `Unable to claim interface` on Connect USB | Web POS uses ADB via bridge, not WebUSB. Use **Connect USB** with `start.bat` running |
| No ERP POS in Bluetooth list | Open Android app → **Start Receiving** → wait for **BLE Ready** → grant Bluetooth permissions |
| Web Bluetooth blocked on Linux | Use `./run.sh` or **Connect USB** via bridge-server |
| QR not opening app | Install ERP POS APK; ensure QR contains `erppos://receive?d=...` |
| Page refresh goes to Dashboard | Should stay on current view — clear site data if stuck on old cache |

## Payload & protocol

Same JSON as [root README](../README.md#payload-format).

- **BLE**: 20-byte chunked writes; terminator `[0xFF][0xFF]`
- **USB (ADB)**: Web POS → `POST /api/adb-send` → bridge → `adb forward` → `localabstract:erppos_adb` → JSON line + `\n` → phone responds `OK\n` or `ERR\n`
- **Connect check**: `GET /api/adb-ping` → bridge sends `PING\n` → phone responds `OK\n` (`verified: true` in JSON response)
