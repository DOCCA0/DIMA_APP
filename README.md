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
cp .env.example .env
npm start
```

Then open the app with Expo Go or an emulator.

Google login works directly on web after enabling the Google provider in Firebase Authentication. For Android and iOS, add the matching OAuth Client IDs to `.env` and restart Expo.

The current room flow includes real camera preview, room creation, joining, leaving, and participant presence. Sending camera streams to other participants requires the native WebRTC peer connection layer and a development build.

## Project Structure

```text
App.js
src/config/firebase.js
src/services/focusStore.js
src/services/webrtcRoom.js
```

`focusStore.js` stores authenticated user sessions in Firestore. `webrtcRoom.js` shows the signaling flow expected for peer-to-peer rooms.

Firebase Authentication and Firestore are initialized in `src/config/firebase.js`. The current Firebase project is `focusroom-cb3b4`.

Deploy the included Firestore rules before using cloud sessions:

```bash
firebase deploy --only firestore:rules
```
