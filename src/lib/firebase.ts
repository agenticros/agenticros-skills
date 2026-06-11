import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getAuth, GithubAuthProvider } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Firebase web SDK config — these values are public by design.
// See: https://firebase.google.com/docs/projects/api-keys
export const firebaseConfig = {
  apiKey: "AIzaSyDeGGl4oXiAKuxIBG9f0RBpEmxt_qSgvGY",
  authDomain: "agenticros.firebaseapp.com",
  projectId: "agenticros",
  storageBucket: "agenticros.firebasestorage.app",
  messagingSenderId: "540777021143",
  appId: "1:540777021143:web:8a280f631ac8dcf758fa92",
  measurementId: "G-ZD9TN0RXBT",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");

// Only initialize Analytics in a supported browser context.
void isAnalyticsSupported().then((ok) => {
  if (ok && typeof window !== "undefined") {
    getAnalytics(app);
  }
});

// GitHub-only auth: configure the provider once, with the scopes we need.
//   read:user  — username, avatar, id
//   public_repo — to verify the submitter has push/admin on the repo
export const githubProvider = new GithubAuthProvider();
githubProvider.addScope("read:user");
githubProvider.addScope("public_repo");
githubProvider.setCustomParameters({ allow_signup: "true" });

// Wire emulators when running locally with `npm run emulators`.
const useEmulators =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
  import.meta.env.VITE_USE_EMULATORS === "true";

if (useEmulators) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  console.info("[firebase] connected to local emulators");
}
