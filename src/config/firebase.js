import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

export const firebaseConfig = {
  apiKey: "AIzaSyBjaaDXLSlJ871_gSTLaOo-rHKOqktQHa0",
  authDomain: "focusroom-cb3b4.firebaseapp.com",
  projectId: "focusroom-cb3b4",
  storageBucket: "focusroom-cb3b4.firebasestorage.app",
  messagingSenderId: "10490770360",
  appId: "1:10490770360:web:4cdb981e6db9f8b950954d",
  measurementId: "G-3051DMDVCJ"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth() {
  if (Platform.OS === "web") return getAuth(app);

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);

export const syncCollections = {
  users: "users",
  sessions: "focusSessions",
  rooms: "studyRooms"
};
