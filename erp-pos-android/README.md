# ERP POS Android Receiver

Kotlin Android app that receives ERP POS orders over **BLE GATT** or **USB** (newline-delimited JSON).

See the [root README](../README.md) for cross-platform USB/BLE setup and troubleshooting.

## Build

```bash
cd erp-pos-android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Requires JDK 17 + Android SDK (API 34). On Windows, set `JAVA_HOME` and `sdk.dir` in `local.properties` if Gradle cannot find them.

## Architecture

- `BleAdvertiseService` — foreground BLE advertising + GATT write characteristic
- `UsbReceiverService` — foreground USB read loop, newline-delimited JSON
- Room DB — persists received orders for History screen
