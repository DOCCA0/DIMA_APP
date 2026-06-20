const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildCreatedRoom,
  buildParticipantData,
  buildRoomData,
  buildSessionData,
  buildUserProfileData,
  mapActiveRooms,
  mapDocs,
  mapJoinableRoomSnapshot,
  mapParticipants
} = require("../src/utils/firestoreModels");

const timestamp = () => "server-time";

function snapshotFrom(items) {
  return {
    docs: items.map(([id, data]) => ({
      id,
      data: () => data
    }))
  };
}

test("mapDocs returns Firestore document ids with document data", () => {
  const snapshot = snapshotFrom([
    ["session-1", { minutes: 45 }],
    ["session-2", { minutes: 25 }]
  ]);

  assert.deepEqual(mapDocs(snapshot), [
    { id: "session-1", minutes: 45 },
    { id: "session-2", minutes: 25 }
  ]);
});

test("buildSessionData keeps the public session payload and adds createdAt", () => {
  assert.deepEqual(
    buildSessionData({ mode: "Focus Timer", minutes: 45, date: "2026-06-20" }, timestamp),
    {
      mode: "Focus Timer",
      minutes: 45,
      date: "2026-06-20",
      createdAt: "server-time"
    }
  );
});

test("buildUserProfileData normalizes optional Google profile fields", () => {
  assert.deepEqual(buildUserProfileData({ uid: "u1" }, timestamp), {
    displayName: "",
    email: "",
    photoURL: "",
    lastLoginAt: "server-time"
  });
});

test("buildParticipantData uses Student fallback and turns camera on", () => {
  assert.deepEqual(buildParticipantData({ uid: "u1" }, timestamp), {
    displayName: "Student",
    photoURL: "",
    joinedAt: "server-time",
    cameraOn: true
  });
});

test("buildRoomData trims names and stores owner metadata", () => {
  assert.deepEqual(
    buildRoomData("  Biology sprint  ", { uid: "u1", displayName: "Rui" }, timestamp),
    {
      name: "Biology sprint",
      ownerId: "u1",
      ownerName: "Rui",
      active: true,
      createdAt: "server-time"
    }
  );
});

test("buildCreatedRoom returns the client room shape after create", () => {
  assert.deepEqual(buildCreatedRoom("room-1", "  Math  ", { uid: "u1" }), {
    id: "room-1",
    name: "Math",
    ownerId: "u1",
    active: true
  });
});

test("mapActiveRooms filters rooms marked inactive", () => {
  const snapshot = snapshotFrom([
    ["room-1", { name: "A", active: true }],
    ["room-2", { name: "B", active: false }],
    ["room-3", { name: "C" }]
  ]);

  assert.deepEqual(mapActiveRooms(snapshot), [
    { id: "room-1", name: "A", active: true },
    { id: "room-3", name: "C" }
  ]);
});

test("mapParticipants maps participant snapshots", () => {
  const snapshot = snapshotFrom([["u1", { displayName: "Rui", cameraOn: true }]]);

  assert.deepEqual(mapParticipants(snapshot), [
    { id: "u1", displayName: "Rui", cameraOn: true }
  ]);
});

test("mapJoinableRoomSnapshot returns active room data", () => {
  const snapshot = {
    id: "room-1",
    exists: () => true,
    data: () => ({ name: "Study", active: true })
  };

  assert.deepEqual(mapJoinableRoomSnapshot(snapshot), {
    id: "room-1",
    name: "Study",
    active: true
  });
});

test("mapJoinableRoomSnapshot rejects missing or inactive rooms", () => {
  assert.throws(
    () => mapJoinableRoomSnapshot({ exists: () => false, data: () => ({}) }),
    /no longer available/
  );
  assert.throws(
    () => mapJoinableRoomSnapshot({ exists: () => true, data: () => ({ active: false }) }),
    /no longer available/
  );
});
