# ERP POS — Cross-Platform Setup

Browser-based ERP POS (`erp-pos-web/`) sends orders to the Android receiver (`erp-pos-android/`) over **Web Bluetooth** or **WebUSB** — no bridge server required.

## Connection Setup Order

Follow this sequence every time:

1. Build and install the Android APK (`erp-pos-android/`)
2. Open the app → grant **all** permissions when prompted
3. Tap **Start Receiving** → wait for notification **"BLE Ready"**
4. Serve the web folder over localhost:
   ```bash
   cd erp-pos-web
   python3 -m http.server 3000
   ```
   Or launch Chrome with platform flags: `./run.sh`
5. Open `http://localhost:3000` in Chrome (or the page opened by `run.sh`)
6. Click **Connect Bluetooth** → select **ERP-POS-001**  
   **OR** plug USB cable → click **Connect USB**
7. Add items to cart → click **Send To Android POS**
8. Watch the total appear on the Android screen instantly

## Platform Requirements

| Feature | Windows | Linux | Mac |
|---------|---------|-------|-----|
| Web Bluetooth | Win 10 1903+ (Chrome/Edge) | Chrome with `--enable-experimental-web-platform-features` (`run.sh`) | Native (Chrome 89+) |
| WebUSB | With ADB driver installed | With udev rules + plugdev | Native |
| JDK for Android build | 17 | 17 | 17 |
| Android SDK | API 34 | API 34 | API 34 |

## Windows USB Setup (ONE TIME)

1. Install the **Android ADB driver** from [developer.android.com](https://developer.android.com/studio/run/win-usb) or via Android Studio (SDK Manager → Google USB Driver)
2. On the phone: **Settings → Developer options → USB debugging** → ON
3. Connect USB cable → run `adb devices` → confirm device shows as **device** (not *unauthorized*)
4. Open Chrome → **Connect USB** → pick your Android device from the WebUSB list

## Linux USB Setup (ONE TIME)

```bash
sudo apt install android-tools-adb
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
```

If permission errors persist: `sudo chmod 666 /dev/bus/usb/*/*`

Launch Chrome with BLE support:

```bash
cd erp-pos-web
chmod +x run.sh
./run.sh
```

## macOS USB Setup

1. Install Android platform-tools (`brew install android-platform-tools`)
2. Enable USB debugging on the phone
3. Run `adb devices` and trust the computer on the phone
4. Use Chrome → **Connect USB**

**Note:** WebUSB and ADB cannot claim the same USB interface at once. With USB debugging enabled, prefer **Connect Bluetooth**. For WebUSB, disable USB debugging or disconnect ADB first.

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
| `JAVA_HOME` not set | All | Point `JAVA_HOME` to JDK 17 (`/usr/lib/jvm/java-17-openjdk-amd64` on Linux, Android Studio bundled JDK on Windows/Mac) |
| SDK location not found | All | Set `ANDROID_HOME` or create `local.properties` with `sdk.dir=/path/to/Android/Sdk` |
| Device **unauthorized** | All | Revoke USB debugging authorizations on phone → reconnect → tap **Allow** |
| BLE not available | Linux | Launch Chrome with `./run.sh` (experimental Web Platform features flag) |
| BLE not available | Windows | Upgrade to Windows 10 1903+; use Chrome/Edge on localhost |
| USB not found / access denied | Windows | Install Android ADB/USB driver; retry after `adb devices` works |
| USB not found | Linux | Add udev rule for vendor `18d1`; join `plugdev` group |
| `adb: no devices` | All | Check cable, enable USB debugging, try another port; accept RSA prompt on phone |
| Web Bluetooth blocked | All | Use `http://localhost:3000` — not `file://` |
| No ERP POS in BLE list | All | Android app open → **Start Receiving** → wait for **BLE Ready** first; grant Bluetooth Advertise permission on Android 12+ |
| `Unable to claim interface` / USB claim failed | All | **ADB holds the USB interface** while USB debugging is on. Use **Connect Bluetooth** (works with debugging on), or unplug/replug with USB debugging off, or stop `adb` and retry USB |
| Web Bluetooth blocked on Linux | Linux | Do not open `file://` — run `python3 -m http.server 3000` and use `./run.sh` (Chrome experimental flag) |

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
- **USB**: JSON payload + `\n` delimiter (WebUSB vendor-neutral; no `/dev/tty` paths)

## Project layout

| Path | Role |
|------|------|
| `erp-pos-web/` | Chrome POS sender (Web Bluetooth + WebUSB) |
| `erp-pos-android/` | Android BLE/USB receiver + Room history |
