import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyC_434VWbzScytrgkCslZTiTil-S5BoSaQ",
  authDomain: "app-room-6c5f2.firebaseapp.com",
  projectId: "app-room-6c5f2",
  storageBucket: "app-room-6c5f2.firebasestorage.app",
  messagingSenderId: "200861104370",
  appId: "1:200861104370:web:adf819ffafc487bfa2386b",
  measurementId: "G-G1RTGSLYMN"
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
