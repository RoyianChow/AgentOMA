import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if config keys are valid to prevent compile-time crashes when env keys are missing
const isConfigured = 
  typeof process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "string" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "undefined" &&
  typeof process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "string" &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "" &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "undefined";

let app;
let db: any = null;
let auth: any = null;

if (isConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (err) {
    console.warn("Firebase initialization failed:", err);
  }
}

export { db, auth };
