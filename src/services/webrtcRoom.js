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
