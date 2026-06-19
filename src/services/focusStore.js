import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../config/firebase";

function sessionsRef(userId) {
  return collection(db, "users", userId, "sessions");
}

export async function loadSessions(userId) {
  const snapshot = await getDocs(
    query(sessionsRef(userId), orderBy("createdAt", "desc"), limit(30))
  );

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveSession(userId, session) {
  const data = {
    mode: session.mode,
    minutes: session.minutes,
    date: session.date,
    createdAt: serverTimestamp()
  };
  const result = await addDoc(sessionsRef(userId), data);
  return { id: result.id, ...data };
}
