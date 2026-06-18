import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "focusroom.sessions";

export async function loadSessions() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : seedSessions();
}

export async function saveSession(session) {
  const sessions = await loadSessions();
  const next = [session, ...sessions].slice(0, 30);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearSessions() {
  await AsyncStorage.removeItem(KEY);
  return seedSessions();
}

function seedSessions() {
  return [
    { id: "s1", mode: "Phone Lock", minutes: 45, date: todayLabel(-1) },
    { id: "s2", mode: "Study Room", minutes: 60, date: todayLabel(-2) },
    { id: "s3", mode: "Phone Lock", minutes: 30, date: todayLabel(-3) }
  ];
}

function todayLabel(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
