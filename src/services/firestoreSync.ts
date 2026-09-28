import { collection, doc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// --- Subscribe Functions ---
export const subscribeToMembers = (cb: any) => {
  return onSnapshot(collection(db, 'members'), snap => cb(snap.docs.map(d => ({id: d.id,...d.data() as any}))));
};

export const subscribeToMonthlyDeposits = (cb: any) => {
  return onSnapshot(collection(db, 'monthly_deposits'), snap => cb(snap.docs.map(d => ({id: d.id,...d.data() as any}))));
};

export const subscribeToLumpsumDeposits = (cb: any) => {
  return onSnapshot(collection(db, 'lumpsum_deposits'), snap => cb(snap.docs.map(d => ({id: d.id,...d.data() as any}))));
};

export const subscribeToSettings = (cb: any) => {
  return onSnapshot(collection(db, 'settings'), snap => {
    if (!snap.empty) cb(snap.docs[0].data());
  });
};

export const seedInitialFirestoreDataIfEmpty = async () => {
  return true;
};

// --- Sync Functions - এগুলা Missing ছিল ---
export const syncSettingsToFirestore = async (settings: any) => {
  try {
    await setDoc(doc(db, 'settings', 'main'), settings, { merge: true });
    return true;
  } catch (e) { console.error(e); return false; }
};

export const syncMemberToFirestore = async (member: any) => {
  try {
    const id = member.id || member.member_id || Date.now().toString();
    await setDoc(doc(db, 'members', id), member, { merge: true });
    return true;
  } catch (e) { console.error(e); return false; }
};

export const syncMonthlyDepositToFirestore = async (deposit: any) => {
  try {
    const id = deposit.id || Date.now().toString();
    await setDoc(doc(db, 'monthly_deposits', id), deposit, { merge: true });
    return true;
  } catch (e) { console.error(e); return false; }
};

export const syncLumpsumDepositToFirestore = async (deposit: any) => {
  try {
    const id = deposit.id || Date.now().toString();
    await setDoc(doc(db, 'lumpsum_deposits', id), deposit, { merge: true });
    return true;
  } catch (e) { console.error(e); return false; }
};

// Extra - অন্য File গুলা যদি চায়
export const syncLandToFirestore = async (land: any) => {
  const id = land.id || land.land_id || Date.now().toString();
  await setDoc(doc(db, 'lands', id), land, { merge: true });
};
