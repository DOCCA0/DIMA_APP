# FocusRoom

FocusRoom is a React Native mobile app prototype for focused study sessions.

The app supports two focus modes:

- Focus Timer: keeps the screen awake and resets the timer when the app leaves the foreground.
- Live Study Rooms: create or join Firestore rooms with a live front-camera preview and real participant presence.
- Focus Dashboard: track sessions, total study time, and daily goal progress.
- Account and Data Sync: requires Google login and stores each user's sessions in Firestore.

## Tech Stack

- React Native with Expo
- Firebase for account and data sync
- WebRTC design for peer-to-peer live study rooms

## Run

```bash
npm install
npm start
```

The timer and dashboard can run in Expo Go. LiveKit video rooms require the FocusRoom development build described below; Expo Go does not contain the required WebRTC native module.

Google login works directly on web after enabling the Google provider in Firebase Authentication. For Android and iOS, add the matching OAuth Client IDs to `.env` and restart Expo.

The room flow uses LiveKit SFU for live camera video. Web clients run in a browser; Android and iOS clients require an Expo development build because the LiveKit WebRTC module is native and is not available in Expo Go.

## LiveKit demo setup

Copy `.env.example` values into `.env`, then set `LIVEKIT_API_SECRET` to the server-only secret from the LiveKit Cloud project. Never prefix that secret with `EXPO_PUBLIC_`.

For physical phones, set `EXPO_PUBLIC_LIVEKIT_TOKEN_ENDPOINT` to this PC's LAN address instead of `localhost`. The checked local configuration uses `http://192.168.1.72:3001/token`; update it if the PC's address changes, and allow TCP port 3001 through the local firewall.

Run the token service and Expo in separate terminals:

```bash
npm run token-server
npm start
```

### Build the Android APK with EAS (no USB required)

The repository includes a `development` EAS profile that produces an installable APK containing the LiveKit WebRTC native module. Sign in to Expo and link the project the first time:

```bash
npx eas-cli login
npx eas-cli build:configure
```

Start the cloud build:

```bash
npx eas-cli build --profile development --platform android --clear-cache
```

When the build finishes, EAS prints a download link and QR code. Open it on each Android phone, download the APK, allow installation from that source when Android asks, and install FocusRoom. The same APK can be installed on both demo phones.

After installation, start the two local services on the PC:

```bash
# Terminal 1: issues LiveKit room tokens
npm run token-server

# Terminal 2: serves the development JavaScript bundle over the LAN
npx expo start --dev-client --lan --clear
```

Open the installed **FocusRoom** app on each phone and connect it to the development server. Do not open the project in Expo Go. The PC and both phones must be on the same network, and the phones must be able to reach the `EXPO_PUBLIC_LIVEKIT_TOKEN_ENDPOINT` address configured in `.env`.

Rebuild the EAS APK whenever native dependencies or Expo config plugins change. Ordinary JavaScript changes only require restarting/reloading the development server.

The development build uses the Hermes JavaScript engine. Keep `expo.jsEngine` set to `hermes`; changing the engine requires a fresh APK build.

Alternatively, create and install a native development build locally:

```bash
npx expo run:android
npx expo run:ios
```

All clients use the Firestore room document id as the LiveKit room name, so Web, Android, and iOS users who select the same FocusRoom automatically join the same video session.

## Project Structure

```text
App.js
src/config/firebase.js
src/services/focusStore.js
src/services/webrtcRoom.js
```

`focusStore.js` stores authenticated user sessions in Firestore. `webrtcRoom.js` shows the signaling flow expected for peer-to-peer rooms.

Firebase Authentication and Firestore are initialized in `src/config/firebase.js`. The current Firebase project is `app-room-6c5f2`.

Deploy the included Firestore rules before using cloud sessions:

```bash
firebase deploy --only firestore:rules
```

## Test

See [TESTING.md](./TESTING.md) for the full testing strategy, coverage thresholds, and current gaps.

The current test suite focuses on the FocusRoom web and app logic:

- Core app logic: timer formatting, dashboard stats, saved session payloads, and elapsed minute calculation.
- Firebase data models: Firestore payload construction, snapshot mapping, active room filtering, and invalid room rejection.
- Web smoke check: verifies that the local Expo web server returns the FocusRoom app shell.

Run all unit tests:

```bash
npm test
```

Run unit tests directly:

```bash
npm run test:unit
```

Run coverage with thresholds:

```bash
npm run test:coverage
```

Current coverage thresholds:

- Lines: 90%
- Functions: 90%
- Branches: 80%

For a local web smoke check, start the FocusRoom web server first:

```bash
npm run web
```

Then run this in another terminal:

```bash
npm run test:web:server
```
