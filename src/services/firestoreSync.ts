import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { SystemSettings, Member, MonthlyDeposit, LumpsumDeposit, LandInvestment } from '../types';

/**
 * Sync system settings to Firestore
 */
export async function syncSettingsToFirestore(settings: SystemSettings) {
  const path = 'settings/main';
  try {
    await setDoc(doc(db, 'settings', 'main'), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch system settings from Firestore
 */
export async function fetchSettingsFromFirestore(): Promise<SystemSettings | null> {
  const path = 'settings/main';
  try {
    const snap = await getDoc(doc(db, 'settings', 'main'));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
    return null;
  } catch (error) {
    console.warn('Could not read settings from Firestore:', error);
    return null;
  }
}

/**
 * Sync member document to Firestore
 */
export async function syncMemberToFirestore(member: Member) {
  const path = `members/${member.member_id}`;
  try {
    await setDoc(doc(db, 'members', member.member_id), member, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync monthly deposit to Firestore
 */
export async function syncMonthlyDepositToFirestore(deposit: MonthlyDeposit) {
  const path = `monthly_deposits/${deposit.deposit_id}`;
  try {
    await setDoc(doc(db, 'monthly_deposits', deposit.deposit_id), deposit, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync lumpsum deposit to Firestore
 */
export async function syncLumpsumDepositToFirestore(deposit: LumpsumDeposit) {
  const path = `lumpsum_deposits/${deposit.lumpsum_id}`;
  try {
    await setDoc(doc(db, 'lumpsum_deposits', deposit.lumpsum_id), deposit, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
