// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAy9VhjOIylUrHUqTpTWRtiV9C6u7xUUa4",
  authDomain: "wallet-3728d.firebaseapp.com",
  projectId: "wallet-3728d",
  storageBucket: "wallet-3728d.firebasestorage.app",
  messagingSenderId: "492048855196",
  appId: "1:492048855196:web:b77fa34fdde1d3bba2bd59",
  measurementId: "G-7RLWZFYM3L",
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const globalForFirebase = globalThis as unknown as {
  __FIREBASE_AUTH__?: ReturnType<typeof initializeAuth>;
};

export const auth =
  globalForFirebase.__FIREBASE_AUTH__ ??
  (globalForFirebase.__FIREBASE_AUTH__ = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  }));

export const db = getFirestore(app);
