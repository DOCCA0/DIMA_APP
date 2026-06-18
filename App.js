import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { clearSessions, loadSessions, saveSession } from "./src/services/focusStore";
import { createRoomPlan, getDemoParticipants } from "./src/services/webrtcRoom";

const DAILY_GOAL = 180;
const MODE_MINUTES = [25, 45, 60, 90];

export default function App() {
  const [tab, setTab] = useState("Lock");
  const [sessions, setSessions] = useState([]);
  const [selectedMinutes, setSelectedMinutes] = useState(45);
  const [remaining, setRemaining] = useState(45 * 60);
  const [running, setRunning] = useState(false);
  const [roomJoined, setRoomJoined] = useState(false);
  const [displayName, setDisplayName] = useState("Student");
  const timerRef = useRef(null);

  useEffect(() => {
    loadSessions().then(setSessions);
  }, []);

  useEffect(() => {
    if (!running) return;

    timerRef.current = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0) {
      finishLockSession();
    }
  }, [remaining, running]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const total = sessions.reduce((sum, item) => sum + item.minutes, 0);
    const todayMinutes = sessions
      .filter((item) => item.date === today)
      .reduce((sum, item) => sum + item.minutes, 0);
    const progress = Math.min(100, Math.round((todayMinutes / DAILY_GOAL) * 100));
    return { total, todayMinutes, progress, count: sessions.length };
  }, [sessions]);

  function startLockSession() {
    setRemaining(selectedMinutes * 60);
    setRunning(true);
  }

  async function finishLockSession() {
    clearInterval(timerRef.current);
    setRunning(false);
    const session = {
      id: Date.now().toString(),
      mode: "Phone Lock",
      minutes: selectedMinutes,
      date: new Date().toISOString().slice(0, 10)
    };
    const next = await saveSession(session);
    setSessions(next);
    Alert.alert("Session saved", `${selectedMinutes} minutes added to your dashboard.`);
  }

  async function saveRoomSession() {
    const session = {
      id: Date.now().toString(),
      mode: "Study Room",
      minutes: 50,
      date: new Date().toISOString().slice(0, 10)
    };
    setSessions(await saveSession(session));
    setRoomJoined(false);
  }

  async function resetDemoData() {
    setSessions(await clearSessions());
  }

  const roomPlan = createRoomPlan("focus-room-101", displayName);

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>FocusRoom</Text>
            <Text style={styles.subtle}>Lock in, study together, track progress.</Text>
          </View>
          <View style={styles.syncBadge}>
            <Text style={styles.syncText}>Synced</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {["Lock", "Room", "Dashboard", "Account"].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.tab, tab === item && styles.activeTab]}
              onPress={() => setTab(item)}
            >
              <Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {tab === "Lock" && (
            <View>
              <Text style={styles.sectionTitle}>Phone Lock Mode</Text>
              <View style={styles.timerPanel}>
                <Text style={styles.timer}>{formatTime(remaining)}</Text>
                <Text style={styles.panelText}>
                  {running ? "Focus mode is active. Keep the app open and stay away from distractions." : "Choose a study length and start a locked focus session."}
                </Text>
              </View>

              <View style={styles.optionRow}>
                {MODE_MINUTES.map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    disabled={running}
                    style={[styles.minuteChip, selectedMinutes === minutes && styles.selectedChip]}
                    onPress={() => {
                      setSelectedMinutes(minutes);
                      setRemaining(minutes * 60);
                    }}
                  >
                    <Text style={[styles.chipText, selectedMinutes === minutes && styles.selectedChipText]}>
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, running && styles.stopButton]}
                onPress={running ? finishLockSession : startLockSession}
              >
                <Text style={styles.primaryButtonText}>{running ? "Finish Session" : "Start Focus Lock"}</Text>
              </TouchableOpacity>
            </View>
          )}

          {tab === "Room" && (
            <View>
              <Text style={styles.sectionTitle}>Live Video Study Room</Text>
              <View style={styles.roomHeader}>
                <View>
                  <Text style={styles.roomName}>Room 101</Text>
                  <Text style={styles.subtle}>Peer-to-peer room with Firebase signaling.</Text>
                </View>
                <TouchableOpacity
                  style={roomJoined ? styles.leaveButton : styles.joinButton}
                  onPress={() => setRoomJoined((value) => !value)}
                >
                  <Text style={styles.roomButtonText}>{roomJoined ? "Leave" : "Join"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.videoGrid}>
                {getDemoParticipants().map((person) => (
                  <View key={person.id} style={[styles.videoTile, person.name === "You" && styles.selfTile]}>
                    <View style={styles.cameraDot} />
                    <Text style={styles.videoInitial}>{person.name.slice(0, 1)}</Text>
                    <Text style={styles.videoName}>{person.name}</Text>
                    <Text style={styles.videoStatus}>{person.status} - {person.minutes}m</Text>
                  </View>
                ))}
              </View>

              {roomJoined && (
                <TouchableOpacity style={styles.primaryButton} onPress={saveRoomSession}>
                  <Text style={styles.primaryButtonText}>End and Save 50m</Text>
                </TouchableOpacity>
              )}

              <View style={styles.infoPanel}>
                <Text style={styles.infoTitle}>WebRTC Flow</Text>
                {roomPlan.steps.map((step, index) => (
                  <Text key={step} style={styles.infoLine}>{index + 1}. {step}</Text>
                ))}
              </View>
            </View>
          )}

          {tab === "Dashboard" && (
            <View>
              <Text style={styles.sectionTitle}>Focus Dashboard</Text>
              <View style={styles.statsRow}>
                <StatCard label="Today" value={`${stats.todayMinutes}m`} />
                <StatCard label="Total" value={`${stats.total}m`} />
                <StatCard label="Sessions" value={stats.count} />
              </View>

              <View style={styles.progressPanel}>
                <View style={styles.progressHeader}>
                  <Text style={styles.infoTitle}>Daily Goal</Text>
                  <Text style={styles.progressText}>{stats.progress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${stats.progress}%` }]} />
                </View>
                <Text style={styles.subtle}>{stats.todayMinutes} / {DAILY_GOAL} minutes</Text>
              </View>

              <Text style={styles.listTitle}>Recent Sessions</Text>
              {sessions.map((item) => (
                <View key={item.id} style={styles.sessionItem}>
                  <View>
                    <Text style={styles.sessionMode}>{item.mode}</Text>
                    <Text style={styles.subtle}>{item.date}</Text>
                  </View>
                  <Text style={styles.sessionMinutes}>{item.minutes}m</Text>
                </View>
              ))}
            </View>
          )}

          {tab === "Account" && (
            <View>
              <Text style={styles.sectionTitle}>Account and Data Sync</Text>
              <View style={styles.formPanel}>
                <Text style={styles.inputLabel}>Display name</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={styles.input}
                  placeholder="Your name"
                />
                <Text style={styles.panelText}>
                  Demo account is ready for Firebase Auth and Firestore sync. Local storage is used for this course prototype.
                </Text>
              </View>

              <View style={styles.infoPanel}>
                <Text style={styles.infoTitle}>Sync Design</Text>
                <Text style={styles.infoLine}>Auth: Firebase email or Google sign-in.</Text>
                <Text style={styles.infoLine}>Data: focus sessions saved to Firestore by user id.</Text>
                <Text style={styles.infoLine}>Rooms: Firebase stores offers, answers, and ICE candidates.</Text>
              </View>

              <TouchableOpacity style={styles.secondaryButton} onPress={resetDemoData}>
                <Text style={styles.secondaryButtonText}>Reset Demo Data</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.subtle}>{label}</Text>
    </View>
  );
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f7fb"
  },
  shell: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: "#182033"
  },
  subtle: {
    color: "#687083",
    fontSize: 13,
    marginTop: 4
  },
  syncBadge: {
    backgroundColor: "#dff4ea",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  syncText: {
    color: "#18764a",
    fontWeight: "700"
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e6ebf4",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6
  },
  activeTab: {
    backgroundColor: "#ffffff"
  },
  tabText: {
    color: "#687083",
    fontWeight: "700",
    fontSize: 12
  },
  activeTabText: {
    color: "#182033"
  },
  content: {
    paddingBottom: 40
  },
  sectionTitle: {
    fontSize: 24,
    color: "#182033",
    fontWeight: "800",
    marginBottom: 14
  },
  timerPanel: {
    backgroundColor: "#182033",
    borderRadius: 8,
    padding: 24,
    marginBottom: 14
  },
  timer: {
    color: "#ffffff",
    fontSize: 54,
    fontWeight: "800",
    textAlign: "center"
  },
  panelText: {
    color: "#687083",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  minuteChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d7deea"
  },
  selectedChip: {
    backgroundColor: "#2f6fed",
    borderColor: "#2f6fed"
  },
  chipText: {
    color: "#3b4356",
    fontWeight: "800"
  },
  selectedChipText: {
    color: "#ffffff"
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: "#2f6fed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10
  },
  stopButton: {
    backgroundColor: "#df5d4f"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 14
  },
  roomName: {
    color: "#182033",
    fontSize: 18,
    fontWeight: "800"
  },
  joinButton: {
    backgroundColor: "#2f6fed",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  leaveButton: {
    backgroundColor: "#df5d4f",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  roomButtonText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  videoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  videoTile: {
    width: "48.5%",
    aspectRatio: 0.9,
    backgroundColor: "#202b3f",
    borderRadius: 8,
    padding: 12,
    justifyContent: "flex-end"
  },
  selfTile: {
    backgroundColor: "#244f45"
  },
  cameraDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#61d394"
  },
  videoInitial: {
    position: "absolute",
    top: "35%",
    alignSelf: "center",
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "800"
  },
  videoName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  videoStatus: {
    color: "#c8d2e4",
    marginTop: 4,
    fontSize: 12
  },
  infoPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginTop: 16
  },
  infoTitle: {
    color: "#182033",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8
  },
  infoLine: {
    color: "#4e586d",
    fontSize: 14,
    lineHeight: 22
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 14
  },
  statValue: {
    fontSize: 23,
    fontWeight: "800",
    color: "#182033"
  },
  progressPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  progressText: {
    color: "#2f6fed",
    fontWeight: "800"
  },
  progressTrack: {
    height: 12,
    backgroundColor: "#e6ebf4",
    borderRadius: 6,
    overflow: "hidden",
    marginVertical: 10
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#61b779"
  },
  listTitle: {
    color: "#182033",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 10
  },
  sessionItem: {
    minHeight: 64,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sessionMode: {
    color: "#182033",
    fontWeight: "800"
  },
  sessionMinutes: {
    color: "#2f6fed",
    fontWeight: "800",
    fontSize: 16
  },
  formPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16
  },
  inputLabel: {
    color: "#182033",
    fontWeight: "800",
    marginBottom: 8
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#d7deea",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#182033",
    fontSize: 16
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c7d0df",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16
  },
  secondaryButtonText: {
    color: "#3b4356",
    fontWeight: "800"
  }
});
