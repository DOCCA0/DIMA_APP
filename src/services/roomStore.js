import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../config/firebase";

function participantData(user) {
  return {
    displayName: user.displayName || "Student",
    photoURL: user.photoURL || "",
    joinedAt: serverTimestamp(),
    cameraOn: true
  };
}

export function watchRooms(callback, onError) {
  const roomsQuery = query(
    collection(db, "studyRooms"),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  return onSnapshot(
    roomsQuery,
    (snapshot) => {
      const rooms = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.active !== false);
      callback(rooms);
    },
    onError
  );
}

export async function createRoom(name, user) {
  const room = await addDoc(collection(db, "studyRooms"), {
    name: name.trim(),
    ownerId: user.uid,
    ownerName: user.displayName || "Student",
    active: true,
    createdAt: serverTimestamp()
  });

  await setDoc(
    doc(db, "studyRooms", room.id, "participants", user.uid),
    participantData(user)
  );

  return { id: room.id, name: name.trim(), ownerId: user.uid, active: true };
}

export async function joinRoom(roomId, user) {
  const roomRef = doc(db, "studyRooms", roomId);
  const snapshot = await getDoc(roomRef);
  if (!snapshot.exists() || snapshot.data().active === false) {
    throw new Error("This room is no longer available.");
  }

  await setDoc(
    doc(db, "studyRooms", roomId, "participants", user.uid),
    participantData(user)
  );

  return { id: snapshot.id, ...snapshot.data() };
}

export function watchParticipants(roomId, callback, onError) {
  return onSnapshot(
    collection(db, "studyRooms", roomId, "participants"),
    (snapshot) => {
      callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    onError
  );
}

export function watchMessages(roomId, callback, onError) {
  const messagesQuery = query(
    collection(db, "studyRooms", roomId, "messages"),
    orderBy("createdAt", "desc"),
    limit(100)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .reverse()
      );
    },
    onError
  );
}

export async function sendMessage(roomId, user, text) {
  const message = text.trim();
  if (!message) return;

  await addDoc(collection(db, "studyRooms", roomId, "messages"), {
    userId: user.uid,
    displayName: user.displayName || "Guest",
    text: message,
    createdAt: serverTimestamp()
  });
}

export async function leaveRoom(room, userId) {
  await deleteDoc(doc(db, "studyRooms", room.id, "participants", userId));
  if (room.ownerId === userId) {
    await updateDoc(doc(db, "studyRooms", room.id), { active: false });
  }
}
