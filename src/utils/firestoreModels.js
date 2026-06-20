function mapDocs(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function buildSessionData(session, timestampFactory) {
  return {
    mode: session.mode,
    minutes: session.minutes,
    date: session.date,
    createdAt: timestampFactory()
  };
}

function buildUserProfileData(user, timestampFactory) {
  return {
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    lastLoginAt: timestampFactory()
  };
}

function buildParticipantData(user, timestampFactory) {
  return {
    displayName: user.displayName || "Student",
    photoURL: user.photoURL || "",
    joinedAt: timestampFactory(),
    cameraOn: true
  };
}

function buildRoomData(name, user, timestampFactory) {
  return {
    name: name.trim(),
    ownerId: user.uid,
    ownerName: user.displayName || "Student",
    active: true,
    participantCount: 1,
    createdAt: timestampFactory()
  };
}

function buildCreatedRoom(roomId, name, user) {
  return {
    id: roomId,
    name: name.trim(),
    ownerId: user.uid,
    active: true
  };
}

function mapActiveRooms(snapshot) {
  return mapDocs(snapshot).filter((item) => item.active !== false);
}

function mapParticipants(snapshot) {
  return mapDocs(snapshot);
}

function mapJoinableRoomSnapshot(snapshot) {
  if (!snapshot.exists() || snapshot.data().active === false) {
    throw new Error("This room is no longer available.");
  }

  return { id: snapshot.id, ...snapshot.data() };
}

module.exports = {
  buildCreatedRoom,
  buildParticipantData,
  buildRoomData,
  buildSessionData,
  buildUserProfileData,
  mapActiveRooms,
  mapDocs,
  mapJoinableRoomSnapshot,
  mapParticipants
};
