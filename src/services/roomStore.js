import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp
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
  const room = doc(collection(db, "studyRooms"));
  const participantRef = doc(db, "studyRooms", room.id, "participants", user.uid);

  await runTransaction(db, async (transaction) => {
    transaction.set(room, {
      name: name.trim(),
      ownerId: user.uid,
      ownerName: user.displayName || "Student",
      active: true,
      participantCount: 1,
      createdAt: serverTimestamp()
    });
    transaction.set(participantRef, participantData(user));
  });

  return { id: room.id, name: name.trim(), ownerId: user.uid, active: true };
}

export async function joinRoom(roomId, user) {
  const roomRef = doc(db, "studyRooms", roomId);
  const participantRef = doc(db, "studyRooms", roomId, "participants", user.uid);

  return runTransaction(db, async (transaction) => {
    const [roomSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(participantRef)
    ]);

    if (!roomSnapshot.exists() || roomSnapshot.data().active === false) {
      throw new Error("This room is no longer available.");
    }

    if (!participantSnapshot.exists()) {
      const currentCount = roomSnapshot.data().participantCount;
      transaction.set(participantRef, participantData(user));
      transaction.update(roomRef, {
        participantCount: Number.isInteger(currentCount) ? currentCount + 1 : 1
      });
    }

    return { id: roomSnapshot.id, ...roomSnapshot.data() };
  });
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
  const roomRef = doc(db, "studyRooms", room.id);
  const participantRef = doc(db, "studyRooms", room.id, "participants", userId);

  await runTransaction(db, async (transaction) => {
    const [roomSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(participantRef)
    ]);

    if (!roomSnapshot.exists() || !participantSnapshot.exists()) return;

    const currentCount = roomSnapshot.data().participantCount;
    transaction.delete(participantRef);

    if (!Number.isInteger(currentCount) || currentCount <= 1) {
      transaction.delete(roomRef);
    } else {
      transaction.update(roomRef, { participantCount: currentCount - 1 });
    }
  });
}
