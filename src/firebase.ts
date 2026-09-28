import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// FIXED: আগের initializeFirestore ভুল ছিল
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app);

export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleAuthProvider);
  return result.user;
}
export async function signOutFromFirebase() {
  await signOut(auth);
}
