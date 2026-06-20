require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { AccessToken } = require("livekit-server-sdk");

const app = express();
const port = Number(process.env.LIVEKIT_TOKEN_PORT || 3001);
const serverUrl = process.env.LIVEKIT_URL || "wss://focusroom-1rcm0cq4.livekit.cloud";

app.use(cors());
app.use(express.json({ limit: "8kb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true, serverUrl });
});

app.post("/token", async (request, response) => {
  const { roomName, identity, name } = request.body || {};
  if (!roomName || !identity) {
    return response.status(400).json({ error: "roomName and identity are required." });
  }
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return response.status(503).json({ error: "LiveKit API credentials are not configured on the token server." });
  }

  try {
    const accessToken = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity: String(identity), name: String(name || "Student"), ttl: "2h" }
    );
    accessToken.addGrant({
      roomJoin: true,
      room: String(roomName),
      canPublish: true,
      canSubscribe: true
    });
    response.json({ token: await accessToken.toJwt(), serverUrl });
  } catch (error) {
    console.error("Could not create LiveKit token:", error);
    response.status(500).json({ error: "Could not create a room token." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`LiveKit token server listening on http://0.0.0.0:${port}`);
});
