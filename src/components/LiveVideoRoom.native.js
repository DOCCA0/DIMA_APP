import {
  LiveKitRoom,
  VideoTrack,
  useConnectionState,
  useTracks
} from "@livekit/react-native";
import { ConnectionState, Track } from "livekit-client";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fetchLiveKitToken } from "../services/livekitToken";

function VideoGrid({ presenceCount }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const connectionState = useConnectionState();

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.heading}>Live video</Text>
        <Text style={styles.count}>{tracks.length || presenceCount}</Text>
      </View>
      <View style={styles.grid}>
        {tracks.map((trackRef) => {
          const participant = trackRef.participant;
          const hasVideo = Boolean(trackRef.publication?.track);
          return (
            <View key={`${participant.identity}-${trackRef.source}`} style={styles.tile}>
              {hasVideo ? (
                <VideoTrack
                  trackRef={trackRef}
                  style={styles.video}
                  objectFit="cover"
                  mirror={participant.isLocal}
                />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.initial}>{(participant.name || participant.identity || "S").slice(0, 1)}</Text>
                  <Text style={styles.cameraOff}>Camera is starting…</Text>
                </View>
              )}
              <Text style={styles.name}>{participant.name || participant.identity}</Text>
            </View>
          );
        })}
        {!tracks.length && (
          <View style={styles.waiting}>
            <ActivityIndicator color="#75e6b1" />
            <Text style={styles.waitingText}>
              {connectionState === ConnectionState.Connected ? "Waiting for camera…" : "Connecting to video room…"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function LiveVideoRoom({ room, user, presenceCount }) {
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCredentials(null);
    setError("");
    fetchLiveKitToken(room, user, controller.signal)
      .then(setCredentials)
      .catch((nextError) => {
        if (nextError.name !== "AbortError") setError(nextError.message);
      });
    return () => controller.abort();
  }, [room.id, user.uid, attempt]);

  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorTitle}>Video connection unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setAttempt((value) => value + 1)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!credentials) {
    return <View style={styles.loading}><ActivityIndicator color="#75e6b1" /><Text style={styles.waitingText}>Getting secure room access…</Text></View>;
  }

  return (
    <LiveKitRoom
      serverUrl={credentials.serverUrl}
      token={credentials.token}
      connect
      audio={false}
      video
      options={{ adaptiveStream: true, dynacast: true }}
      onError={(nextError) => setError(nextError.message)}
    >
      <VideoGrid presenceCount={presenceCount} />
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  heading: { color: "#dce3ee", fontSize: 15, fontWeight: "800" },
  count: { color: "#75e6b1", fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", aspectRatio: 4 / 3, borderRadius: 8, overflow: "hidden", backgroundColor: "#11151c", borderWidth: 1, borderColor: "#2b3442" },
  video: { width: "100%", height: "100%" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  initial: { color: "#f4f7fb", fontSize: 34, fontWeight: "800" },
  cameraOff: { color: "#8793a8", fontSize: 12, marginTop: 8 },
  name: { position: "absolute", left: 8, bottom: 8, color: "#f4f7fb", fontWeight: "800", backgroundColor: "rgba(11,13,18,0.72)", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  waiting: { width: "100%", minHeight: 180, alignItems: "center", justifyContent: "center", backgroundColor: "#11151c", borderRadius: 8 },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center", backgroundColor: "#11151c", borderRadius: 8 },
  waitingText: { color: "#a6b0c0", marginTop: 10 },
  errorBox: { padding: 18, borderRadius: 8, borderWidth: 1, borderColor: "#63343a", backgroundColor: "#261a1d" },
  errorTitle: { color: "#ff8f82", fontWeight: "800" },
  errorText: { color: "#dce3ee", marginTop: 8 },
  retryButton: { alignSelf: "flex-start", marginTop: 12, backgroundColor: "#293140", borderRadius: 7, paddingHorizontal: 14, paddingVertical: 9 },
  retryText: { color: "#f4f7fb", fontWeight: "800" }
});
