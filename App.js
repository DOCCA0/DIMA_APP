import React, { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  AppState,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as KeepAwake from "expo-keep-awake";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import RoomScreen from "./src/components/RoomScreen";
import { loadSessions, saveSession } from "./src/services/focusStore";
import {
  signInAsGuest,
  signInWithGoogleToken,
  signInWithGoogleWeb,
  signOutGoogle,
  watchAuthState
} from "./src/services/googleAuth";
import { syncUserProfile } from "./src/services/userStore";
import "./src/livekitSetup";

WebBrowser.maybeCompleteAuthSession();

const DAILY_GOAL = 180;
const MODE_MINUTES = [25, 45, 60, 90];
const TABS = [
  { name: "Lock", icon: "timer-outline" },
  { name: "Room", icon: "videocam-outline" },
  { name: "Dashboard", icon: "stats-chart-outline" }
];
const GOOGLE_CLIENT_IDS = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "missing-web-client-id",
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "missing-android-client-id",
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "missing-ios-client-id"
};

export default function App() {
  const [tab, setTab] = useState("Lock");
  const [sessions, setSessions] = useState([]);
  const [selectedMinutes, setSelectedMinutes] = useState(45);
  const [remaining, setRemaining] = useState(45 * 60);
  const [running, setRunning] = useState(false);
  const [displayName, setDisplayName] = useState("Student");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [dataBusy, setDataBusy] = useState(false);
  const sessionStartedAt = useRef(null);
  const timerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const interruptedRef = useRef(false);
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest(
    GOOGLE_CLIENT_IDS
  );

  useEffect(() => {
    return watchAuthState(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setSessions([]);
        setRunning(false);
        setAuthReady(true);
        return;
      }

      if (nextUser.displayName) setDisplayName(nextUser.displayName);
      setDataBusy(true);
      try {
        await syncUserProfile(nextUser);
        setSessions(await loadSessions(nextUser.uid));
      } catch (error) {
        Alert.alert("Data sync failed", error.message);
      } finally {
        setDataBusy(false);
        setAuthReady(true);
      }
    });
  }, []);

  useEffect(() => {
    if (googleResponse?.type !== "success") return;

    const idToken = googleResponse.params.id_token;
    if (!idToken) {
      Alert.alert("Google sign-in failed", "Google did not return an ID token.");
      return;
    }

    setAuthBusy(true);
    signInWithGoogleToken(idToken)
      .catch((error) => Alert.alert("Google sign-in failed", error.message))
      .finally(() => setAuthBusy(false));
  }, [googleResponse]);

  useEffect(() => {
    if (!running) return;

    timerRef.current = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [running]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const leftForeground = appStateRef.current === "active" && nextState !== "active";

      if (running && leftForeground) {
        clearInterval(timerRef.current);
        sessionStartedAt.current = null;
        interruptedRef.current = true;
        setRunning(false);
        setRemaining(selectedMinutes * 60);
      }

      if (nextState === "active" && interruptedRef.current) {
        interruptedRef.current = false;
        Alert.alert("Session reset", "The app left the foreground, so the timer was cleared.");
      }

      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [running, selectedMinutes]);

  useEffect(() => {
    const tag = "focusroom-timer";

    if (user && tab === "Lock") {
      KeepAwake.activateKeepAwakeAsync(tag).catch(() => {});
    } else {
      KeepAwake.deactivateKeepAwake(tag).catch(() => {});
    }

    return () => {
      KeepAwake.deactivateKeepAwake(tag).catch(() => {});
    };
  }, [tab, user]);

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
    sessionStartedAt.current = Date.now();
    setRunning(true);
  }

  async function finishLockSession() {
    clearInterval(timerRef.current);
    setRunning(false);
    const elapsed = sessionStartedAt.current
      ? Math.max(1, Math.round((Date.now() - sessionStartedAt.current) / 60000))
      : selectedMinutes;
    sessionStartedAt.current = null;
    const session = {
      mode: "Focus Timer",
      minutes: elapsed,
      date: new Date().toISOString().slice(0, 10)
    };
    try {
      const saved = await saveSession(user.uid, session);
      setSessions((current) => [saved, ...current]);
      Alert.alert("Session saved", `${elapsed} minutes added to your dashboard.`);
    } catch (error) {
      Alert.alert("Session save failed", error.message);
    }
  }

  async function saveRoomSession(minutes) {
    const session = {
      mode: "Study Room",
      minutes,
      date: new Date().toISOString().slice(0, 10)
    };
    const saved = await saveSession(user.uid, session);
    setSessions((current) => [saved, ...current]);
  }

  async function handleGoogleLogin() {
    setAuthBusy(true);
    try {
      if (Platform.OS === "web") {
        await signInWithGoogleWeb();
        return;
      }

      const clientId = Platform.select({
        android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      });

      if (!clientId) {
        Alert.alert(
          "Google Client ID missing",
          "Add the platform OAuth Client ID to your .env file, then restart Expo."
        );
        return;
      }

      await promptGoogle();
    } catch (error) {
      Alert.alert("Google sign-in failed", error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleLogout() {
    setAuthBusy(true);
    try {
      await signOutGoogle();
    } catch (error) {
      Alert.alert("Sign-out failed", error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGuestLogin() {
    setAuthBusy(true);
    try {
      await signInAsGuest();
    } catch (error) {
      Alert.alert("Guest sign-in failed", error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  if (!authReady || !user) {
    return (
      <SafeAreaView style={styles.safe}>
        <ExpoStatusBar style="light" />
        <View style={styles.loginShell}>
          <Text style={styles.loginLogo}>FocusRoom</Text>
          <Text style={styles.loginTitle}>
            {authReady ? "Sign in to continue" : "Checking account..."}
          </Text>
          <Text style={styles.loginText}>
            Sign in with Google or continue as a guest to save your focus sessions.
          </Text>
          {authReady && (
            <>
              <TouchableOpacity
                disabled={authBusy || (!googleRequest && Platform.OS !== "web")}
                style={[styles.googleButton, authBusy && styles.disabledButton]}
                onPress={handleGoogleLogin}
              >
                <Text style={styles.googleMark}>G</Text>
                <Text style={styles.googleButtonText}>
                  {authBusy ? "Please wait..." : "Continue with Google"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={authBusy}
                style={[styles.guestButton, authBusy && styles.disabledButton]}
                onPress={handleGuestLogin}
              >
                <Ionicons name="person-outline" size={20} color="#f4f7fb" />
                <Text style={styles.guestButtonText}>Continue as guest</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>FocusRoom</Text>
            <Text style={styles.subtle}>Lock in, study together, track progress.</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Open account"
            style={styles.headerProfile}
            onPress={() => setTab("Account")}
          >
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.headerAvatarText}>{displayName.slice(0, 1)}</Text>
              </View>
            )}
            <View style={[styles.syncDot, dataBusy && styles.syncingDot]} />
          </TouchableOpacity>
        </View>

        {tab !== "Account" && (
          <View style={styles.tabs}>
            {TABS.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.tab, tab === item.name && styles.activeTab]}
                onPress={() => setTab(item.name)}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={tab === item.name ? "#75e6b1" : "#68758a"}
                />
                <Text style={[styles.tabText, tab === item.name && styles.activeTabText]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {tab === "Lock" && (
            <View>
              <Text style={styles.sectionTitle}>Focus Timer</Text>
              <View style={styles.timerPanel}>
                <Text style={styles.timer}>{formatTime(remaining)}</Text>
                <Text style={styles.panelText}>
                  {running ? "Focus session is active." : "Choose a study length and start focusing."}
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
                <Ionicons
                  name={running ? "stop-circle-outline" : "play-outline"}
                  size={21}
                  color={running ? "#f4f7fb" : "#0b0d12"}
                />
                <Text style={[styles.primaryButtonText, running && styles.stopButtonText]}>
                  {running ? "Finish Session" : "Start Focus Session"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {tab === "Room" && (
            <RoomScreen user={user} onSessionSaved={saveRoomSession} />
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
              {!sessions.length && (
                <View style={styles.emptyPanel}>
                  <Text style={styles.emptyText}>No focus sessions yet.</Text>
                </View>
              )}
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
              <View style={styles.accountHeading}>
                <TouchableOpacity
                  accessibilityLabel="Back"
                  style={styles.backButton}
                  onPress={() => setTab("Lock")}
                >
                  <Ionicons name="chevron-back" size={23} color="#f4f7fb" />
                </TouchableOpacity>
                <Text style={styles.accountTitle}>Account</Text>
              </View>
              <View style={styles.formPanel}>
                <View style={styles.profileRow}>
                  {user.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{displayName.slice(0, 1)}</Text>
                    </View>
                  )}
                  <View style={styles.profileText}>
                    <Text style={styles.profileName}>
                      {user.displayName || (user.isAnonymous ? "Guest" : "Google user")}
                    </Text>
                    <Text style={styles.subtle}>
                      {user.email || "Anonymous account"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  disabled={authBusy || (!googleRequest && Platform.OS !== "web")}
                  style={[styles.googleButton, authBusy && styles.disabledButton]}
                  onPress={handleGoogleLogout}
                >
                  <Text style={styles.googleMark}>G</Text>
                  <Text style={styles.googleButtonText}>
                    {authBusy ? "Please wait..." : "Sign out"}
                  </Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: "#0b0d12"
  },
  shell: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14
  },
  loginShell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center"
  },
  loginLogo: {
    color: "#75e6b1",
    fontSize: 38,
    fontWeight: "800",
    marginBottom: 28
  },
  loginTitle: {
    color: "#f4f7fb",
    fontSize: 25,
    fontWeight: "800"
  },
  loginText: {
    color: "#8793a8",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 10
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f4f7fb"
  },
  subtle: {
    color: "#8793a8",
    fontSize: 13,
    marginTop: 4
  },
  headerProfile: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#303949",
    padding: 2
  },
  headerAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 18
  },
  headerAvatarFallback: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#293140",
    alignItems: "center",
    justifyContent: "center"
  },
  headerAvatarText: {
    color: "#f4f7fb",
    fontWeight: "800"
  },
  syncDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0b0d12",
    backgroundColor: "#75e6b1"
  },
  syncingDot: {
    backgroundColor: "#6ea8fe"
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#11151c",
    borderWidth: 1,
    borderColor: "#232a36",
    borderRadius: 8,
    padding: 4,
    marginBottom: 18
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 6
  },
  activeTab: {
    backgroundColor: "#1a202a"
  },
  tabText: {
    color: "#68758a",
    fontWeight: "700",
    fontSize: 10
  },
  activeTabText: {
    color: "#dce3ee"
  },
  content: {
    paddingBottom: 40
  },
  sectionTitle: {
    fontSize: 25,
    color: "#f4f7fb",
    fontWeight: "800",
    marginBottom: 14
  },
  timerPanel: {
    backgroundColor: "#141922",
    borderWidth: 1,
    borderColor: "#283140",
    borderRadius: 8,
    padding: 24,
    marginBottom: 14
  },
  timer: {
    color: "#f4f7fb",
    fontSize: 56,
    fontWeight: "800",
    textAlign: "center"
  },
  panelText: {
    color: "#8793a8",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: "center"
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
    backgroundColor: "#141922",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#283140"
  },
  selectedChip: {
    backgroundColor: "#1d2b29",
    borderColor: "#75e6b1"
  },
  chipText: {
    color: "#9aa6b8",
    fontWeight: "800"
  },
  selectedChipText: {
    color: "#75e6b1"
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: "#75e6b1",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10
  },
  stopButton: {
    backgroundColor: "#d96058"
  },
  primaryButtonText: {
    color: "#0b0d12",
    fontWeight: "900",
    fontSize: 16
  },
  stopButtonText: {
    color: "#f4f7fb"
  },
  infoPanel: {
    backgroundColor: "#141922",
    borderWidth: 1,
    borderColor: "#252d3a",
    borderRadius: 8,
    padding: 16,
    marginTop: 16
  },
  infoTitle: {
    color: "#dce3ee",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8
  },
  infoLine: {
    color: "#8793a8",
    fontSize: 14,
    lineHeight: 22
  },
  emptyPanel: {
    backgroundColor: "#141922",
    borderWidth: 1,
    borderColor: "#252d3a",
    borderRadius: 8,
    padding: 18,
    marginTop: 10,
    alignItems: "center"
  },
  emptyText: {
    color: "#8793a8",
    fontSize: 14
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  statCard: {
    flex: 1,
    backgroundColor: "#141922",
    borderWidth: 1,
    borderColor: "#252d3a",
    borderRadius: 8,
    padding: 14
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f4f7fb"
  },
  progressPanel: {
    backgroundColor: "#141922",
    borderWidth: 1,
    borderColor: "#252d3a",
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
    color: "#6ea8fe",
    fontWeight: "800"
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#242b37",
    borderRadius: 5,
    overflow: "hidden",
    marginVertical: 10
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#75e6b1"
  },
  listTitle: {
    color: "#dce3ee",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 10
  },
  sessionItem: {
    minHeight: 64,
    backgroundColor: "#141922",
    borderWidth: 1,
    borderColor: "#252d3a",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sessionMode: {
    color: "#dce3ee",
    fontWeight: "800"
  },
  sessionMinutes: {
    color: "#75e6b1",
    fontWeight: "800",
    fontSize: 16
  },
  formPanel: {
    backgroundColor: "#141922",
    borderWidth: 1,
    borderColor: "#252d3a",
    borderRadius: 8,
    padding: 16
  },
  accountHeading: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a202a",
    borderWidth: 1,
    borderColor: "#303949",
    marginRight: 12
  },
  accountTitle: {
    color: "#f4f7fb",
    fontSize: 25,
    fontWeight: "800"
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  profileText: {
    flex: 1,
    marginLeft: 12
  },
  profileName: {
    color: "#f4f7fb",
    fontSize: 17,
    fontWeight: "800"
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#293140"
  },
  avatarText: {
    color: "#f4f7fb",
    fontSize: 20,
    fontWeight: "800"
  },
  googleButton: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#303949",
    backgroundColor: "#1a202a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16
  },
  googleMark: {
    color: "#6ea8fe",
    fontSize: 20,
    fontWeight: "900",
    marginRight: 10
  },
  googleButtonText: {
    color: "#f4f7fb",
    fontSize: 15,
    fontWeight: "800"
  },
  guestButton: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#293140",
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#151a23"
  },
  guestButtonText: {
    color: "#f4f7fb",
    fontSize: 15,
    fontWeight: "800"
  },
  disabledButton: {
    opacity: 0.55
  }
});
