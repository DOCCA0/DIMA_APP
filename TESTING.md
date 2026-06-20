# Testing Guide

This project currently focuses testing on the FocusRoom web build and shared app logic.

## Test Layers

### Unit tests

Unit tests cover deterministic logic that does not require Firebase, Expo Go, the camera, or a browser.

Run:

```bash
npm run test:unit
```

Current unit test files:

- `test/focusMetrics.test.js`
- `test/firestoreModels.test.js`

#### Core app logic tests

Target:

- `src/utils/focusMetrics.js`

Purpose:

These tests cover the pure logic behind the web app's timer, dashboard, and saved session payloads. They do not need Firebase, Google login, Expo Go, camera permissions, or a browser.

Covered behavior:

- Timer formatting, such as `45:00`, `01:05`, and `00:00`
- Invalid or negative timer values clamping to `00:00`
- Dashboard totals for today's minutes, all-time minutes, session count, and daily goal progress
- Daily goal progress capping at `100%`
- Empty or missing session lists returning zeroed dashboard stats
- Saved focus session payload creation with mode, minutes, and date
- Elapsed minute calculation, including the minimum 1-minute save rule
- Date normalization to `yyyy-mm-dd`

#### Firebase data model tests

Target:

- `src/utils/firestoreModels.js`

Purpose:

These tests cover the data rules used before writing to Firestore and after reading Firestore snapshots. They intentionally avoid connecting to the real Firebase project, so tests can run locally without touching cloud data.

Covered behavior:

- Firestore document snapshots mapping into `{ id, ...data }` objects
- Focus session write payloads including `createdAt`
- User profile write payloads with safe fallbacks for missing Google profile fields
- Room participant payloads with `Student` fallback and `cameraOn: true`
- Study room creation payloads, including trimmed room names and owner metadata
- Client-side room shape returned after creating a room
- Active room filtering, excluding rooms where `active === false`
- Participant list snapshot mapping
- Joinable room snapshot mapping for active rooms
- Missing or inactive room rejection with a clear error

## Coverage

Coverage shows how much production code was executed by tests.

Current command:

```bash
npm run test:coverage
```

Current thresholds:

- Lines: `90%`
- Functions: `90%`
- Branches: `80%`

The coverage command currently includes:

```text
src/utils/*.js
```

This keeps the first coverage target focused on stable shared logic. Firebase-backed services now delegate their payload and mapping rules into tested utility modules. Direct Firebase reads/writes and React Native UI should be added with mocks or integration tests before being included in coverage thresholds.

## Web Smoke Test

The web smoke test checks whether the local Expo web server returns the app shell.

Start the web app first:

```bash
npm run web
```

Then run this in another terminal:

```bash
npm run test:web:server
```

Default URL:

```text
http://localhost:8081/
```

To test another URL:

```bash
TEST_WEB_URL=http://localhost:19006/ npm run test:web:server
```
