import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { SystemSettings, Member, MonthlyDeposit, LumpsumDeposit, LandInvestment } from '../types';

// --- পুরানো Sync ফাংশনগুলো থাকবে ---
export async function syncSettingsToFirestore(settings: SystemSettings) {
  const path = 'settings/main';
  try {
    await setDoc(doc(db, 'settings', 'main'), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchSettingsFromFirestore(): Promise<SystemSettings | null> {
  const path = 'settings/main';
  try {
    const snap = await getDoc(doc(db, 'settings', 'main'));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function syncMemberToFirestore(member: Member) {
  await setDoc(doc(db, 'members', member.member_id), member, { merge: true });
}
export async function syncMonthlyDepositToFirestore(deposit: MonthlyDeposit) {
  await setDoc(doc(db, 'monthly_deposits', deposit.deposit_id), deposit, { merge: true });
}
export async function syncLumpsumDepositToFirestore(deposit: LumpsumDeposit) {
  await setDoc(doc(db, 'lumpsum_deposits', deposit.lumpsum_id), deposit, { merge: true });
}

// --- নতুন ২ টা কাজের Real-time ফাংশন ---

// ১. Admin Settings আপডেট করলে সবার মোবাইলে Auto আসবে
export function subscribeToSettings(callback: (settings: SystemSettings) => void) {
  return onSnapshot(doc(db, 'settings', 'main'), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as SystemSettings);
    }
  });
}

// ২. Admin Member/Deposit আপডেট করলে সবার মোবাইলে Auto আসবে
export function subscribeToMembers(callback: (members: Member[]) => void) {
  const q = query(collection(db, 'members'));
  return onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map(d => d.data() as Member);
    callback(members);
  });
}

export function subscribeToMonthlyDeposits(callback: (data: MonthlyDeposit[]) => void) {
  return onSnapshot(collection(db, 'monthly_deposits'), (snapshot) => {
    callback(snapshot.docs.map(d => d.data() as MonthlyDeposit));
  });
}
// Refresh করলে সব Member Firestore থেকে আনবে
export async function fetchAllMembersFromFirestore(): Promise<Member[]> {
  try {
    const snap = await getDocs(collection(db, 'members'));
    return snap.docs.map(d => d.data() as Member);
  } catch (error) {
    console.warn('Could not read members:', error);
    return [];
  }
}

// Refresh করলে সব Monthly Deposit আনবে
export async function fetchAllDepositsFromFirestore(): Promise<MonthlyDeposit[]> {
  try {
    const snap = await getDocs(collection(db, 'monthly_deposits'));
    return snap.docs.map(d => d.data() as MonthlyDeposit);
  } catch (error) {
    return [];
  }
}
