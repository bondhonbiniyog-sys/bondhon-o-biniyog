import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// আপনার আগের firebaseConfig এখানে থাকবে, Change করবেন না
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "bondhon-o-biniyog.firebaseapp.com",
  projectId: "bondhon-o-biniyog",
  storageBucket: "bondhon-o-biniyog.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// --- এই 4টা Missing ছিল, এটাই Fix ---
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export const signOutFromFirebase = async () => {
  return await signOut(auth);
};

export const handleFirestoreError = (error: any, operation?: any) => {
  console.error('Firestore Error:', operation, error);
  return error;
};

export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete'
}

export default app;
