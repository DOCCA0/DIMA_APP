import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { auth } from "../config/firebase";

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogleToken(idToken) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export function signInWithGoogleWeb() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutGoogle() {
  return signOut(auth);
}
