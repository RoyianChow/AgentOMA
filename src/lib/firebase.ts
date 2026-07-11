// TEMPORARY — scheduled for deletion.
//
// Firebase is being removed from the stack (see docs/COMPLIANCE.md). Firebase
// Authentication has already been removed: better-auth is the sole identity
// layer (Part 0), so this file no longer imports `firebase/auth`.
//
// Firestore (`db`) remains only because the pharmacist and audit dashboards
// still read their mock queue from it. Both pages are rebuilt on authenticated
// server actions in a later step; at that point this file, the `firebase`
// dependency, and the NEXT_PUBLIC_FIREBASE_* variables are all deleted, and the
// last `process.env` reads in the app disappear with them.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
// Loosely typed on purpose: the consuming dashboard pages gate on a boolean and
// are left untouched until their server-action rebuild. Kept as-is to avoid
// churn in code that is scheduled for deletion.
let db: any = null;

if (isConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.warn("Firebase initialization failed:", err);
  }
}

export { db };
