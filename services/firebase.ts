import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAy9VhjOIylUrHUqTpTWRtiV9C6u7xUUa4",
  authDomain: "wallet-3728d.firebaseapp.com",
  projectId: "wallet-3728d",
  storageBucket: "wallet-3728d.firebasestorage.app",
  messagingSenderId: "492048855196",
  appId: "1:492048855196:web:b77fa34fdde1d3bba2bd59",
  measurementId: "G-7RLWZFYM3L"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
