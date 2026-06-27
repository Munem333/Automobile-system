# ERP POS — Cross-Platform Setup

Browser-based ERP POS (`erp-pos-web/`) sends orders to the Android receiver (`erp-pos-android/`) over:

| Method | Requires | Best for |
|--------|----------|----------|
| **USB (ADB)** | `bridge-server` + USB cable + USB debugging | Windows/Linux — reliable, works with BT off on phone |
| **Bluetooth** | Web Bluetooth (Chrome) or `bridge-server` BLE scan (Linux) | Wireless, phone must have Bluetooth on |
| **QR Code** | Nothing — no cable, no BT, no bridge | Offline / fallback when other methods fail |

## Connection Setup Order

Follow this sequence every time:

1. Build and install the Android APK (`erp-pos-android/`)
2. Open the **ERP POS** app on your phone → grant **all** permissions when prompted
3. Tap **Start Receiving** (or just keep the app open — ADB listener starts automatically)
4. Wait for notification **"ADB Ready"** (USB) and/or **"BLE Ready"** (Bluetooth)
5. Start the **bridge server** (required for USB on all platforms; also used for Bluetooth on Linux):
   ```bash
   cd bridge-server
   npm install
   npm start
   ```
   Leave it running — you should see `ERP POS bridge server listening on ws://localhost:8080`.
6. Serve the web folder over localhost:
   ```bash
   cd erp-pos-web
   python3 -m http.server 3000
   ```
   **Linux BLE**: use `./run.sh` instead (Chrome experimental Web Platform flag).
7. Open `http://localhost:3000` in Chrome (or Edge on Windows)
8. Click **Connect USB** (ADB via bridge) **OR** **Connect Bluetooth**
9. Add items to cart → click **Send To Android POS**
10. Watch the total appear on the Android screen instantly

**No connection?** Click **QR Code** on the web POS → scan with phone camera or the app’s **QR Scan** tab.

## Platform Requirements

| Feature | Windows | Linux | Mac |
|---------|---------|-------|-----|
| Web Bluetooth | Win 10 1903+ (Chrome/Edge) | Chrome with `./run.sh` flag, or bridge-server BLE | Native (Chrome 89+) |
| USB (ADB) | bridge-server + ADB driver | bridge-server + `adb` | bridge-server + platform-tools |
| QR Code | Any browser on localhost | Any browser on localhost | Any browser on localhost |
| JDK for Android build | 17 | 17 | 17 |
| Android SDK | API 34 | API 34 | API 34 |
| Node.js (bridge-server) | 18+ | 18+ | 18+ |

## Windows USB Setup (ONE TIME)

1. Install the **Android ADB driver** from [developer.android.com](https://developer.android.com/studio/run/win-usb) or via Android Studio (SDK Manager → Google USB Driver)
2. On the phone: **Settings → Developer options → USB debugging** → ON
3. Connect USB cable → run `adb devices` → confirm device shows as **device** (not *unauthorized*)
4. Start `bridge-server` (`npm start` in `bridge-server/`)
5. Open ERP POS app → wait for **ADB Ready** notification
6. Chrome → **Connect USB**

On Windows, set `JAVA_HOME` for Gradle builds:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

## Linux USB Setup (ONE TIME)

```bash
sudo apt install android-tools-adb nodejs npm
sudo usermod -aG plugdev $USER
# Log out and back in for group change
```

Create `/etc/udev/rules.d/51-android.rules`:

```
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev"
```

Then:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
adb devices
cd bridge-server && npm install && npm start
```

Launch Chrome with BLE support (optional — bridge-server can scan BLE instead):

```bash
cd erp-pos-web
chmod +x run.sh
./run.sh
```

## macOS USB Setup

1. Install Android platform-tools (`brew install android-platform-tools`) and Node.js
2. Enable USB debugging on the phone
3. Run `adb devices` and trust the computer on the phone
4. Start `bridge-server`, open ERP POS app, wait for **ADB Ready**
5. Chrome → **Connect USB**

## Android Build

```bash
cd erp-pos-android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Requires Android Studio or **JDK 17** + Android SDK (API 34).

## Common Errors & Fixes

| Error | Platform | Fix |
|-------|----------|-----|
| `JAVA_HOME` not set | All | Point `JAVA_HOME` to JDK 17 (Android Studio bundled JBR on Windows/Mac; `/usr/lib/jvm/java-17-openjdk-amd64` on Linux) |
| SDK location not found | All | Set `ANDROID_HOME` or create `local.properties` with `sdk.dir=/path/to/Android/Sdk` |
| Device **unauthorized** | All | Revoke USB debugging authorizations on phone → reconnect → tap **Allow** |
| `Cannot reach bridge server` | All | Run `cd bridge-server && npm start` — web POS needs `ws://localhost:8080` for USB |
| `read ECONNRESET` / USB send failed | All | **Open ERP POS app** on phone → wait for **ADB Ready** notification → click **Connect USB** again |
| `Phone ADB listener is not ready` | All | App was closed or not started after install. Open app, wait for **ADB Ready**, retry |
| `EADDRINUSE` port 8080 | All | Another bridge-server is already running, or kill the old process and restart |
| BLE not available | Linux | Use `./run.sh`, or use **Connect USB** / bridge-server BLE scan |
| BLE not available | Windows | Upgrade to Windows 10 1903+; use Chrome/Edge on localhost |
| Phone BT off but web still connected | All | Fixed — web POS health-checks every second and disconnects immediately |
| USB not found / access denied | Windows | Install Android ADB/USB driver; retry after `adb devices` works |
| USB not found | Linux | Add udev rule for vendor `18d1`; join `plugdev` group |
| `adb: no devices` | All | Check cable, enable USB debugging, try another port; accept RSA prompt on phone |
| Web Bluetooth blocked | All | Use `http://localhost:3000` — not `file://` |
| No ERP POS in BLE list | All | Android app open → **Start Receiving** → wait for **BLE Ready**; grant Bluetooth Advertise permission on Android 12+ |
| QR scan opens wrong app | All | Install ERP POS APK; deep link is `erppos://receive?d=...` |

## Shared UUIDs

| Constant | Value |
|----------|-------|
| `SERVICE_UUID` | `12345678-1234-1234-1234-123456789abc` |
| `CHAR_UUID` | `87654321-4321-4321-4321-cba987654321` |

## Payload format

```json
{
  "id": "uuid",
  "total": 1250.00,
  "currency": "BDT",
  "items": [{ "name": "Rice (1kg)", "qty": 2, "price": 500.00 }],
  "timestamp": 1719000000000
}
```

## Protocol notes

- **BLE**: 20-byte chunks `[seq][total][up to 18 bytes data]` + `[0xFF][0xFF]` terminator; 50 ms between writes
- **USB (ADB)**: Web POS → bridge-server (`ws://localhost:8080`) → `adb forward tcp:8765 localabstract:erppos_adb` → phone `AdbTcpReceiverService` → JSON + `\n` → responds `OK` or `ERR`
- **QR Code** (no connection): Web POS shows deep-link QR: `erppos://receive?d=<base64url order json>`. Scan with **phone camera**, any QR app, or in-app **QR Scan** tab — ERP POS opens and total is received.

### QR fallback flow

1. Web POS: add items → click **QR Code** (header or cart area)
2. Scan with **phone camera** / Google Lens / any QR app → tap **Open in ERP POS**
3. Or open app → bottom tab **QR Scan** → point at web screen
4. Order saved with source `QR Code`; receipt overlay shows total

No Bluetooth, USB, or bridge server required for QR.

## Project layout

| Path | Role |
|------|------|
| `erp-pos-web/` | Chrome POS sender (Web Bluetooth + USB via bridge + QR) |
| `erp-pos-android/` | Android BLE/USB/ADB/QR receiver + Room history |
| `bridge-server/` | WebSocket bridge: ADB TCP relay + optional PC BLE scan (Linux) |
