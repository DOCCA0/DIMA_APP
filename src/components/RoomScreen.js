import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  sendMessage,
  watchMessages,
  watchParticipants,
  watchRooms
} from "../services/roomStore";

export default function RoomScreen({ user, onSessionSaved }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [messageBusy, setMessageBusy] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [facing, setFacing] = useState("front");
  const [busy, setBusy] = useState(false);
  const [joinedAt, setJoinedAt] = useState(null);
  const activeRoomRef = useRef(null);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    return () => {
      if (activeRoomRef.current) {
        leaveRoom(activeRoomRef.current, user.uid).catch(() => {});
      }
    };
  }, [user.uid]);

  useEffect(() => {
    return watchRooms(
      setRooms,
      (error) => Alert.alert("Room sync failed", error.message)
    );
  }, []);

  useEffect(() => {
    if (!activeRoom) {
      setParticipants([]);
      return;
    }

    return watchParticipants(
      activeRoom.id,
      setParticipants,
      (error) => Alert.alert("Participant sync failed", error.message)
    );
  }, [activeRoom]);

  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      setMessageText("");
      return;
    }

    return watchMessages(
      activeRoom.id,
      setMessages,
      (error) => Alert.alert("Chat sync failed", error.message)
    );
  }, [activeRoom]);

  async function handleCreate() {
    const name = roomName.trim();
    if (!name) {
      Alert.alert("Room name required", "Enter a name for your study room.");
      return;
    }

    const cameraAccess = permission?.granted ? permission : await requestPermission();
    if (!cameraAccess.granted) {
      Alert.alert("Camera required", "Enable camera access before entering a live room.");
      return;
    }

    setBusy(true);
    try {
      const room = await createRoom(name, user);
      setActiveRoom(room);
      setJoinedAt(Date.now());
      setRoomName("");
    } catch (error) {
      Alert.alert("Could not create room", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(room) {
    const cameraAccess = permission?.granted ? permission : await requestPermission();
    if (!cameraAccess.granted) {
      Alert.alert("Camera required", "Enable camera access before entering a live room.");
      return;
    }

    setBusy(true);
    try {
      setActiveRoom(await joinRoom(room.id, user));
      setJoinedAt(Date.now());
    } catch (error) {
      Alert.alert("Could not join room", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function exitRoom(saveSession) {
    if (!activeRoom) return;

    setBusy(true);
    try {
      if (saveSession && joinedAt) {
        const minutes = Math.max(1, Math.round((Date.now() - joinedAt) / 60000));
        await onSessionSaved(minutes);
      }
      await leaveRoom(activeRoom, user.uid);
      activeRoomRef.current = null;
      setActiveRoom(null);
      setJoinedAt(null);
    } catch (error) {
      Alert.alert("Could not leave room", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendMessage() {
    const text = messageText.trim();
    if (!text || !activeRoom || messageBusy) return;

    setMessageBusy(true);
    setMessageText("");
    try {
      await sendMessage(activeRoom.id, user, text);
    } catch (error) {
      setMessageText(text);
      Alert.alert("Message not sent", error.message);
    } finally {
      setMessageBusy(false);
    }
  }

  if (activeRoom) {
    return (
      <View>
        <View style={styles.roomTopbar}>
          <View style={styles.roomHeading}>
            <Text style={styles.eyebrow}>LIVE STUDY ROOM</Text>
            <Text style={styles.title} numberOfLines={1}>{activeRoom.name}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => exitRoom(false)}>
            <Ionicons name="exit-outline" size={22} color="#ff8f82" />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraFrame}>
          {permission?.granted ? (
            <CameraView style={styles.camera} facing={facing} mirror={facing === "front"} />
          ) : (
            <View style={styles.permissionView}>
              <Ionicons name="videocam-off-outline" size={34} color="#8793a8" />
              <Text style={styles.permissionText}>Camera permission is required.</Text>
              <TouchableOpacity style={styles.smallButton} onPress={requestPermission}>
                <Text style={styles.smallButtonText}>Enable camera</Text>
              </TouchableOpacity>
            </View>
          )}
          {permission?.granted && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          {permission?.granted && (
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing((value) => value === "front" ? "back" : "front")}
            >
              <Ionicons name="camera-reverse-outline" size={22} color="#f4f7fb" />
            </TouchableOpacity>
          )}
          <Text style={styles.cameraName}>{user.displayName || "You"}</Text>
        </View>

        <View style={styles.participantHeader}>
          <Text style={styles.sectionLabel}>Participants</Text>
          <Text style={styles.countText}>{participants.length}</Text>
        </View>
        <View style={styles.participantGrid}>
          {participants
            .filter((person) => person.id !== user.uid)
            .map((person) => (
              <View key={person.id} style={styles.participantTile}>
                {person.photoURL ? (
                  <Image source={{ uri: person.photoURL }} style={styles.participantAvatar} />
                ) : (
                  <View style={styles.participantFallback}>
                    <Text style={styles.participantInitial}>
                      {(person.displayName || "S").slice(0, 1)}
                    </Text>
                  </View>
                )}
                <Text style={styles.participantName} numberOfLines={1}>
                  {person.displayName || "Student"}
                </Text>
                <Ionicons name="videocam" size={15} color="#75e6b1" />
              </View>
            ))}
        </View>

        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <Text style={styles.sectionLabel}>Room chat</Text>
            <Text style={styles.messageCount}>{messages.length}</Text>
          </View>

          <ScrollView
            ref={chatScrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            nestedScrollEnabled
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {!messages.length && (
              <Text style={styles.chatEmpty}>No messages yet. Say hello!</Text>
            )}
            {messages.map((message) => {
              const isOwn = message.userId === user.uid;
              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    isOwn ? styles.ownMessageBubble : styles.otherMessageBubble
                  ]}
                >
                  <Text style={styles.messageAuthor}>
                    {isOwn ? "You" : message.displayName || "Guest"}
                  </Text>
                  <Text style={styles.messageText}>{message.text}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.messageComposer}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Write a message..."
              placeholderTextColor="#68758a"
              maxLength={500}
              multiline
              style={styles.messageInput}
            />
            <TouchableOpacity
              accessibilityLabel="Send message"
              disabled={!messageText.trim() || messageBusy}
              style={[
                styles.sendButton,
                (!messageText.trim() || messageBusy) && styles.disabled
              ]}
              onPress={handleSendMessage}
            >
              {messageBusy ? (
                <ActivityIndicator size="small" color="#0b0d12" />
              ) : (
                <Ionicons name="send" size={19} color="#0b0d12" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          disabled={busy}
          style={[styles.endButton, busy && styles.disabled]}
          onPress={() => exitRoom(true)}
        >
          <Ionicons name="stop-circle-outline" size={21} color="#0b0d12" />
          <Text style={styles.endButtonText}>End and save session</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.eyebrow}>STUDY TOGETHER</Text>
      <Text style={styles.title}>Live Rooms</Text>

      <View style={styles.createRow}>
        <TextInput
          value={roomName}
          onChangeText={setRoomName}
          placeholder="Room name"
          placeholderTextColor="#68758a"
          maxLength={40}
          style={styles.input}
        />
        <TouchableOpacity
          disabled={busy}
          style={[styles.createButton, busy && styles.disabled]}
          onPress={handleCreate}
        >
          <Ionicons name="add" size={24} color="#0b0d12" />
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>Available now</Text>
        {busy && <ActivityIndicator size="small" color="#75e6b1" />}
      </View>

      {!rooms.length && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={32} color="#68758a" />
          <Text style={styles.emptyTitle}>No active rooms</Text>
          <Text style={styles.emptyText}>Create the first room and start studying.</Text>
        </View>
      )}

      {rooms.map((room) => (
        <View key={room.id} style={styles.roomItem}>
          <View style={styles.roomIcon}>
            <Ionicons name="videocam-outline" size={21} color="#75e6b1" />
          </View>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
            <Text style={styles.roomOwner}>Hosted by {room.ownerName}</Text>
          </View>
          <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(room)}>
            <Ionicons name="enter-outline" size={19} color="#f4f7fb" />
            <Text style={styles.joinText}>Join</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: "#75e6b1",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 5
  },
  title: {
    color: "#f4f7fb",
    fontSize: 26,
    fontWeight: "800"
  },
  createRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  },
  input: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#293140",
    backgroundColor: "#151a23",
    color: "#f4f7fb",
    paddingHorizontal: 14,
    fontSize: 15
  },
  createButton: {
    width: 50,
    minHeight: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#75e6b1"
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 26,
    marginBottom: 10
  },
  sectionLabel: {
    color: "#dce3ee",
    fontSize: 15,
    fontWeight: "800"
  },
  roomItem: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151a23",
    borderWidth: 1,
    borderColor: "#252d3a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  roomIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#1d2b29",
    alignItems: "center",
    justifyContent: "center"
  },
  roomInfo: {
    flex: 1,
    marginHorizontal: 12
  },
  roomName: {
    color: "#f4f7fb",
    fontSize: 15,
    fontWeight: "800"
  },
  roomOwner: {
    color: "#8793a8",
    fontSize: 12,
    marginTop: 4
  },
  joinButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 7,
    paddingHorizontal: 12,
    backgroundColor: "#293140"
  },
  joinText: {
    color: "#f4f7fb",
    fontSize: 13,
    fontWeight: "800"
  },
  emptyState: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#293140",
    borderRadius: 8,
    padding: 20
  },
  emptyTitle: {
    color: "#dce3ee",
    fontWeight: "800",
    marginTop: 10
  },
  emptyText: {
    color: "#8793a8",
    fontSize: 13,
    marginTop: 5,
    textAlign: "center"
  },
  roomTopbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },
  roomHeading: {
    flex: 1,
    marginRight: 12
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#261a1d",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraFrame: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#11151c",
    borderWidth: 1,
    borderColor: "#2b3442"
  },
  camera: {
    width: "100%",
    height: "100%"
  },
  permissionView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  permissionText: {
    color: "#a6b0c0",
    marginTop: 10
  },
  smallButton: {
    marginTop: 14,
    borderRadius: 7,
    backgroundColor: "#293140",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  smallButtonText: {
    color: "#f4f7fb",
    fontWeight: "800"
  },
  liveBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(11,13,18,0.82)",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ff6f61",
    marginRight: 6
  },
  liveText: {
    color: "#f4f7fb",
    fontSize: 11,
    fontWeight: "900"
  },
  flipButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "rgba(11,13,18,0.82)",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraName: {
    position: "absolute",
    left: 12,
    bottom: 12,
    color: "#f4f7fb",
    fontWeight: "800",
    backgroundColor: "rgba(11,13,18,0.72)",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  participantHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10
  },
  countText: {
    color: "#75e6b1",
    fontWeight: "800"
  },
  participantGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  participantTile: {
    width: "48%",
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#151a23",
    borderWidth: 1,
    borderColor: "#252d3a"
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  participantFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#293140",
    alignItems: "center",
    justifyContent: "center"
  },
  participantInitial: {
    color: "#f4f7fb",
    fontWeight: "800"
  },
  participantName: {
    flex: 1,
    color: "#dce3ee",
    fontWeight: "700",
    fontSize: 13
  },
  chatPanel: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#252d3a",
    backgroundColor: "#11151c"
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  messageCount: {
    color: "#75e6b1",
    fontSize: 12,
    fontWeight: "800"
  },
  messageList: {
    maxHeight: 260,
    minHeight: 120
  },
  messageListContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: 8,
    paddingVertical: 4
  },
  chatEmpty: {
    color: "#68758a",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 40
  },
  messageBubble: {
    maxWidth: "84%",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  ownMessageBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#1d4b3c"
  },
  otherMessageBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#252d3a"
  },
  messageAuthor: {
    color: "#75e6b1",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 3
  },
  messageText: {
    color: "#f4f7fb",
    fontSize: 14,
    lineHeight: 19
  },
  messageComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 10
  },
  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#293140",
    backgroundColor: "#151a23",
    color: "#f4f7fb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#75e6b1"
  },
  endButton: {
    minHeight: 52,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#75e6b1",
    marginTop: 18
  },
  endButtonText: {
    color: "#0b0d12",
    fontSize: 15,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.55
  }
});
