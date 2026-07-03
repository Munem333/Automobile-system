# AutoHub BD — Android App

Kotlin + Jetpack Compose companion app for the AutoHub BD storefront. Connects to the same API as the web app.

## Features

- **Home** — Featured cars (same API as website), brand cards with images, EV spotlight
- **Cars & Parts** — Search, brand/category filters, product detail with gallery & descriptions
- **Cart** — Local cart with quantity controls (checkout coming soon)
- **Account** — Sign in, register, admin role display, light/dark/system theme
- **Service** — Book appointments at service centers
- **Live Chat** — REST session + Socket.IO real-time messaging with AI bot
- **Support** — FAQ, contact tickets, order tracking
- **Images** — Uploaded product photos (`/uploads/...`) resolve correctly like the website

## Prerequisites

- JDK 17
- Android SDK 35
- API server running on port **4000** (`npm run dev` from project root)

## API URL

| Device | Default URL |
|--------|-------------|
| Emulator | `http://10.0.2.2:4000` (maps to host `localhost`) |
| Physical phone | Your PC's LAN IP, e.g. `http://192.168.1.5:4000` |

Change `API_BASE_URL` in `app/build.gradle.kts` for physical devices:

```kotlin
buildConfigField("String", "API_BASE_URL", "\"http://192.168.1.5:4000\"")
```

Make sure your phone and PC are on the same Wi‑Fi network and Windows firewall allows port 4000.

## Build & Run

```bash
cd android
./gradlew assembleDebug
```

Install on a connected device or emulator:

```bash
./gradlew installDebug
```

On Windows:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Open the project in **Android Studio** (recommended) and click Run.

## Project structure

```
app/src/main/java/com/autohub/bd/
├── MainActivity.kt          # Navigation + bottom bar
├── data/
│   ├── ApiClient.kt         # Retrofit + JWT interceptor
│   ├── ApiService.kt        # REST endpoints
│   ├── Models.kt            # DTOs
│   ├── CartRepository.kt    # SharedPreferences cart
│   ├── ChatSocket.kt        # Socket.IO client
│   ├── AuthStore.kt         # Token persistence
│   └── ThemePreferences.kt  # Light / dark / system
└── ui/
    ├── screens/             # Compose screens
    └── theme/               # Material3 theme
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not connect to server" | Start API with `npm run dev`; check `API_BASE_URL` |
| Chat messages not sending | Ensure Socket.IO is reachable on same host as API |
| Login fails | Use a registered account or create one in the app |
| Cleartext HTTP blocked | `usesCleartextTraffic` is enabled for local dev only |
