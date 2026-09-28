import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const subscribeToMembers = (cb: any) => {
  return onSnapshot(collection(db, 'members'), snap => cb(snap.docs.map(d => ({id: d.id,...d.data() as any}))));
};
export const subscribeToMonthlyDeposits = (cb: any) => {
  return onSnapshot(collection(db, 'monthly_deposits'), snap => cb(snap.docs.map(d => d.data())));
};
export const subscribeToLumpsumDeposits = (cb: any) => {
  return onSnapshot(collection(db, 'lumpsum_deposits'), snap => cb(snap.docs.map(d => d.data())));
};
export const subscribeToSettings = (cb: any) => {
  return onSnapshot(collection(db, 'settings'), snap => {
    if(!snap.empty) cb(snap.docs[0].data());
  });
};
export const seedInitialFirestoreDataIfEmpty = async () => { return true; };
