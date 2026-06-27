# ERP POS Web Sender

Browser-based ERP POS that sends order payloads to the Android receiver over **Web Bluetooth** or **WebUSB**.

See the [root README](../README.md) for full cross-platform setup, USB drivers, udev rules, and troubleshooting.

## Quick start

```bash
cd erp-pos-web
python3 -m http.server 3000
# Open http://localhost:3000 in Chrome
```

**Linux BLE**: use `./run.sh` — it starts `python3 -m http.server 3000` and opens Chrome with `--enable-experimental-web-platform-features` at `http://localhost:3000` (required; `file://` breaks Web Bluetooth).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Unable to claim interface` on Connect USB | USB debugging (ADB) is using the phone. Use **Connect Bluetooth** instead, or turn off USB debugging and replug. |
| No ERP POS in Bluetooth list | Open Android app → **Start Receiving** → wait for **BLE Ready** notification → grant Bluetooth permissions on the phone. |
| Old Epos-System app installed | BLE UUIDs match; keep the app open and wait for **BLE ready — waiting for POS** notification. New app: install from `erp-pos-android/` (`./gradlew assembleDebug` needs JDK 17). |

## Setup order

Android first → **Start Receiving** → Chrome → **Connect** → **Send**

Full steps: [Connection Setup Order](../README.md#connection-setup-order)
