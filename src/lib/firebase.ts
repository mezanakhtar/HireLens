import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "interview-coach-ai-4fd53.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "interview-coach-ai-4fd53",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "interview-coach-ai-4fd53.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "758020551482",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:758020551482:web:9eb3558cc3372c38a21603",
};

export const isFirebaseConfigured = !!firebaseConfig.apiKey;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
export default app;
