const DEFAULT_SERVER_URL = "wss://focusroom-1rcm0cq4.livekit.cloud";
const DEFAULT_TOKEN_ENDPOINT = "http://localhost:3001/token";

export async function fetchLiveKitToken(room, user, signal) {
  const endpoint = process.env.EXPO_PUBLIC_LIVEKIT_TOKEN_ENDPOINT || DEFAULT_TOKEN_ENDPOINT;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomName: room.id,
      identity: user.uid,
      name: user.displayName || "Student"
    }),
    signal
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.token) {
    throw new Error(payload.error || `Token server returned ${response.status}.`);
  }

  return {
    token: payload.token,
    serverUrl: payload.serverUrl || process.env.EXPO_PUBLIC_LIVEKIT_URL || DEFAULT_SERVER_URL
  };
}
