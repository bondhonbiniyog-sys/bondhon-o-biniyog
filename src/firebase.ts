import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import rawConfig from '../firebase-applet-config.json';

// Only keep standard Firebase keys, ignore custom keys
const firebaseConfig = {
  apiKey: (rawConfig as any).apiKey,
  authDomain: (rawConfig as any).authDomain,
  projectId: (rawConfig as any).projectId,
  storageBucket: (rawConfig as any).storageBucket,
  messagingSenderId: (rawConfig as any).messagingSenderId,
  appId: (rawConfig as any).appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Custom Database ID from your config
const dbId = (rawConfig as any).firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleAuthProvider);
  return result.user;
};
export const signOutFromFirebase = async () => await signOut(auth);
