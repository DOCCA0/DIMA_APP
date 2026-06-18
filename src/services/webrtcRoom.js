export function createRoomPlan(roomId, userId) {
  return {
    roomId,
    userId,
    signaling: "Firebase Firestore room document",
    steps: [
      "Create RTCPeerConnection",
      "Publish local camera stream",
      "Exchange offer and answer through Firebase",
      "Exchange ICE candidates",
      "Render remote streams in the study room"
    ]
  };
}

export function getDemoParticipants() {
  return [
    { id: "u1", name: "Mia", status: "Focused", minutes: 52 },
    { id: "u2", name: "Alex", status: "Reading", minutes: 41 },
    { id: "u3", name: "Chen", status: "Notes", minutes: 37 },
    { id: "u4", name: "You", status: "Online", minutes: 0 }
  ];
}
