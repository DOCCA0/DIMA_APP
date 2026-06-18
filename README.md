# FocusRoom

FocusRoom is a React Native mobile app prototype for focused study sessions.

The app supports two focus modes:

- Phone Lock Mode: start a fixed focus timer and block distracting actions inside the app.
- Live Video Study Room: join a simple live study room mockup where users study together with cameras on.
- Focus Dashboard: track sessions, total study time, daily goal progress, and streak.
- Account and Data Sync: includes a Firebase-ready config and a lightweight local sync service for course demo use.

## Tech Stack

- React Native with Expo
- Firebase for account and data sync
- WebRTC design for peer-to-peer live study rooms

## Run

```bash
npm install
npm start
```

Then open the app with Expo Go or an emulator.

## Project Structure

```text
App.js
src/config/firebase.js
src/services/focusStore.js
src/services/webrtcRoom.js
```

`focusStore.js` stores demo data locally. `webrtcRoom.js` shows the simple signaling flow expected for real peer-to-peer rooms.

For a real deployment, install and connect `firebase` and `react-native-webrtc`, then replace `src/config/firebase.js` with your Firebase project values.
