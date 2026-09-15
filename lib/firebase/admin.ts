// Server-only Firebase Admin SDK. Bypasses security rules, so it is used
// solely by the registration server action to write new submissions.
import { cert, getApps, getApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function serviceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 is not set");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

export function adminDb() {
  const app = getApps().length
    ? getApp()
    : initializeApp({ credential: cert(serviceAccount()) });
  return getFirestore(app);
}
