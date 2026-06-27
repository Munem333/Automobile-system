# ERP POS Android Receiver

Kotlin Android app that receives ERP POS orders over **BLE GATT**, **USB/ADB**, or **QR Code** (camera / deep link).

See the [root README](../README.md) for cross-platform USB/BLE setup and troubleshooting.

## Build & install

```bash
cd erp-pos-android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Requires **JDK 17** + Android SDK (API 34).

**Windows** — if Gradle cannot find Java:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Create `local.properties` with `sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk` if the SDK path is not detected.

## First run

1. Open **ERP POS** → allow **Bluetooth**, **Location**, **Notifications**, and **Camera** when prompted
2. Tap **Start Receiving** on the Receiving screen
3. Confirm notifications:
   - **ADB Ready — connect USB in web POS** (starts automatically when app opens; works even if Bluetooth is off)
   - **BLE Ready** (only when phone Bluetooth is on)
4. Keep the app open (or in background) while sending from web POS
5. On the PC, run `start.bat` / `start.ps1` / `start.sh` from the project root, then use **Connect USB** in the web cart

## Receiving channels

| Source | Service / entry | When to use |
|--------|-----------------|-------------|
| **ADB (USB)** | `AdbTcpReceiverService` — local socket `erppos_adb` | Web POS **Connect USB** via bridge-server on `http://localhost:3000`. Works with Bluetooth off. |
| **BLE** | `BleAdvertiseService` — GATT write, device name `ERP-POS-001` | Web POS **Connect Bluetooth**. Requires phone BT on. |
| **QR Code** | `QrScannerFragment` + deep link `erppos://receive?d=...` | No cable or Bluetooth. Scan from web POS QR or phone camera. |
| **USB host** | `UsbReceiverService` — physical USB accessory mode | Optional; ADB path is the primary USB flow from web POS. |

### ADB protocol (web POS USB)

Bridge-server forwards TCP to the app’s abstract socket:

```
PC: adb forward tcp:8765 localabstract:erppos_adb

Connect check:  PING\n  →  OK\n   (case-insensitive ping accepted)
Send order:     {"id","total","currency","items":[...],"timestamp"}\n  →  OK\n
Invalid JSON:   →  ERR\n
```

Orders are saved via `EntryNotifier.saveAndNotify()` with source `ADB`. Check logcat tag **`ErpPosUsb`** for connect/send diagnostics.

### QR deep link

```
erppos://receive?d=<base64url-encoded order JSON>
```

- Phone camera / any QR app → tap **Open in ERP POS**
- In-app: bottom nav **QR Scan** tab → point camera at web POS QR
- Legacy prefix `ERP-POS:` still supported for older QR codes

## App navigation

| Tab | Purpose |
|-----|---------|
| Dashboard | Last transaction, totals (refreshes on resume) |
| Receiving | Start / stop receiving, status |
| QR Scan | Built-in camera scanner (CameraX + ML Kit) |
| History | Room DB order history (refreshes on resume) |
| Settings | Theme, Devices (USB) |

## Architecture

- `MainActivity` — permissions, USB attach/detach, deep link handler, auto-starts ADB listener on launch
- `AdbTcpReceiverService` — foreground service (`connectedDevice`); listens on `localabstract:erppos_adb`; `PING`/`ping` → `OK`; JSON order → parse → `OK`/`ERR`; restarts listener without tearing down an already-active socket
- `BleAdvertiseService` — foreground BLE advertising + GATT write characteristic; stops when phone Bluetooth turns off
- `UsbReceiverService` — foreground USB read loop (physical USB host mode); permission flow via `ACTION_USB_PERMISSION`
- `EntryNotifier` — normalizes payload, persists to Room, notifies UI
- `QrScannerFragment` / `QrOrderHandler` — camera scan + `erppos://` deep link parsing
- Room DB — persists received orders for History screen

## Bluetooth off behavior

- BLE advertising stops immediately; web POS disconnects on next health check
- **ADB/USB receiving stays active** — use **Connect USB** on web POS without turning Bluetooth back on

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Web POS: `Phone did not answer over USB` | Open app → wait for **ADB Ready** → keep phone unlocked → on PC run `start.bat` → **Connect USB** again |
| Web POS USB send fails / timeout | Confirm **ADB Ready** notification; check `adb devices` shows **device**; retry **Connect USB** then **Send** |
| No **ADB Ready** notification | Force-stop app → reopen; grant notification permission on Android 13+ |
| Ping returns ERR | Check logcat `ErpPosUsb`; reinstall latest APK; ensure only one ERP POS instance is running |
| No **BLE Ready** | Turn on phone Bluetooth → tap **Start Receiving** → grant **Bluetooth Advertise** on Android 12+ |
| Order sent but not on Dashboard/History | Switch tabs or bring app to foreground (fragments refresh on resume); check History tab |
| QR scan says invalid | Scan the QR from web POS cart (`erppos://receive?d=...`) |
| Camera permission denied | Settings → Apps → ERP POS → Permissions → Camera → Allow |
| `adb: unauthorized` | Revoke USB debugging authorizations on phone → reconnect → tap **Allow** |
| App crash on open | Reinstall latest debug APK from this folder |

## Logcat (debug USB)

```bash
adb logcat -s ErpPosUsb MainActivity EntryNotifier
```

Look for `acceptLoop: listening localabstract:erppos_adb`, `PING → OK`, and `saveAndNotify: order saved from ADB`.
