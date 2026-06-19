import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export function syncUserProfile(user) {
  return setDoc(
    doc(db, "users", user.uid),
    {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      lastLoginAt: serverTimestamp()
    },
    { merge: true }
  );
}
