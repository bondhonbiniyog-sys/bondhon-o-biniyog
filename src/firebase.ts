import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB...",
  authDomain: "bondhon-o-biniyog.firebaseapp.com",
  projectId: "bondhon-o-biniyog",
  storageBucket: "bondhon-o-biniyog.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// আপনার যদি firebaseConfig অন্য জায়গায় থাকে তাহলে শুধু নিচের 3 লাইন রাখেন
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
