import { initializeApp,getApp,getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-GKokqMAWxvRYfm83WccQgSqnq04oDT4",
  authDomain: "mock-5e259.firebaseapp.com",
  projectId: "mock-5e259",
  storageBucket: "mock-5e259.firebasestorage.app",
  messagingSenderId: "576412968063",
  appId: "1:576412968063:web:ce32eb9993f26d45df4b4a",
  measurementId: "G-HD8NEVZ1ZW"
};

// Initialize Firebase
const app = !getApps.length? initializeApp(firebaseConfig):getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);