import type {
  SystemSettings,
  Member,
  MonthlyDeposit,
  LumpsumDeposit,
  LandInvestment,
  LandShare,
  LandSaleOffer,
  PublicLandSubmission,
  MemberLandProposal,
  Director,
  GalleryItem,
  DashboardStats,
  AppNotification,
} from '../types';

import {
  initialSystemSettings,
  initialMembers,
  initialMonthlyDeposits,
  initialLumpsumDeposits,
  initialLandInvestments,
  initialLandSaleOffers,
  initialPublicLandSubmissions,
  initialMemberLandProposals,
  initialDirectors,
  initialGalleryItems,
  initialAppNotifications,
} from './initialData';

import { db as firestoreDb } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  syncSettingsToFirestore,
  syncMemberToFirestore,
  syncMonthlyDepositToFirestore,
  syncLumpsumDepositToFirestore
} from './firestoreSync';

const DB_KEY = 'bob_app_db_v1';

interface DatabaseSchema {
  settings: SystemSettings;
  members: Member[];
  monthlyDeposits: MonthlyDeposit[];
  lumpsumDeposits: LumpsumDeposit[];
  lands: LandInvestment[];
  saleOffers: LandSaleOffer[];
  submissions: PublicLandSubmission[];
  proposals: MemberLandProposal[];
  directors: Director[];
  gallery: GalleryItem[];
  notifications: AppNotification[];
}

function loadDatabase(): DatabaseSchema {
  if (typeof window === 'undefined') {
    return {
      settings: initialSystemSettings,
      members: initialMembers,
      monthlyDeposits: initialMonthlyDeposits,
      lumpsumDeposits: initialLumpsumDeposits,
      lands: initialLandInvestments,
      saleOffers: initialLandSaleOffers,
      submissions: initialPublicLandSubmissions,
      proposals: initialMemberLandProposals,
      directors: initialDirectors,
      gallery: initialGalleryItems,
      notifications: initialAppNotifications,
    };
  }
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const initial: DatabaseSchema = {
        settings: initialSystemSettings,
        members: initialMembers,
        monthlyDeposits: initialMonthlyDeposits,
        lumpsumDeposits: initialLumpsumDeposits,
        lands: initialLandInvestments,
        saleOffers: initialLandSaleOffers,
        submissions: initialPublicLandSubmissions,
        proposals: initialMemberLandProposals,
        directors: initialDirectors,
        gallery: initialGalleryItems,
        notifications: initialAppNotifications,
      };
      localStorage.setItem(DB_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    return {
      settings: initialSystemSettings,
      members: initialMembers,
      monthlyDeposits: initialMonthlyDeposits,
      lumpsumDeposits: initialLumpsumDeposits,
      lands: initialLandInvestments,
      saleOffers: initialLandSaleOffers,
      submissions: initialPublicLandSubmissions,
      proposals: initialMemberLandProposals,
      directors: initialDirectors,
      gallery: initialGalleryItems,
      notifications: initialAppNotifications,
    };
  }
}

function saveDatabase(db: DatabaseSchema) {
  if (typeof window!== 'undefined') {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {}
  }
}

function calculateLocalStats(db: DatabaseSchema): DashboardStats {
  const approvedMonthly = db.monthlyDeposits.filter((d) => d.status === 'Approved').reduce((sum, d) => sum + d.amount, 0);
  const approvedLumpsum = db.lumpsumDeposits.filter((d) => d.status === 'Approved').reduce((sum, d) => sum + d.amount, 0);
  const totalCapital = approvedMonthly + approvedLumpsum;
  const pendingMonthly = db.monthlyDeposits.filter((d) => d.status === 'Pending');
  const pendingLumpsum = db.lumpsumDeposits.filter((d) => d.status === 'Pending');
  return {
    total_capital: totalCapital,
    total_monthly_capital: approvedMonthly,
    total_lumpsum_capital: approvedLumpsum,
    target_amount: db.settings.target_amount,
    capital_percentage: Math.min(100, Math.round((totalCapital / db.settings.target_amount) * 100)),
    total_members: db.members.length,
    active_members: db.members.filter((m) => m.status === 'Active').length,
    pending_members: db.members.filter((m) => m.status === 'Pending').length,
    blocked_members: db.members.filter((m) => m.status === 'Blocked').length,
    pending_monthly_deposits: pendingMonthly.length,
    pending_lumpsum_deposits: pendingLumpsum.length,
    total_pending_deposits_count: pendingMonthly.length + pendingLumpsum.length,
    total_pending_amount: pendingMonthly.reduce((s,d)=>s+d.amount,0) + pendingLumpsum.reduce((s,d)=>s+d.amount,0),
    active_lands_count: db.lands.filter((l) => l.status === 'Active').length,
    total_land_shares: db.lands.reduce((sum, l) => sum + l.total_shares, 0),
    sold_land_shares: db.lands.reduce((sum, l) => sum + l.sold_shares, 0),
    total_sale_offers: db.saleOffers.length,
    pending_sale_offers: db.saleOffers.filter((o) => o.status === 'Pending').length,
    total_public_submissions: db.submissions.length,
    pending_public_submissions: db.submissions.filter((s) => s.status === 'Pending').length,
    total_member_proposals: db.proposals.length,
    pending_member_proposals: db.proposals.filter((p) => p.status === 'Pending').length,
  };
}

export async function handleLocalApi(urlPath: string, method: string = 'GET', body?: any): Promise<{ status: number; data: any }> {
  const url = new URL(urlPath, 'http://localhost');
  const pathname = url.pathname;
  const methodUpper = method.toUpperCase();
  const db = loadDatabase();

  if (pathname === '/api/settings') {
    if (methodUpper === 'GET') {
      return { status: 200, data: { success: true, settings: db.settings } };
    }
    if (methodUpper === 'PUT' || methodUpper === 'POST') {
      db.settings = {...db.settings,...body };
      saveDatabase(db);
      syncSettingsToFirestore(db.settings);
      return { status: 200, data: { success: true, message: 'Settings updated', settings: db.settings } };
    }
  }

  if (pathname === '/api/stats') {
    return { status: 200, data: { success: true, stats: calculateLocalStats(db) } };
  }

  // Auth login/register same as before - add sync on new member
  if (pathname === '/api/auth/login' && methodUpper === 'POST') {
    const { email, password, googleAuth, full_name, avatar_url, phone } = body || {};
    if (!email) return { status: 400, data: { success: false, message: 'ইমেইল প্রয়োজন' } };
    let member = db.members.find((m) => m.email.toLowerCase() === email.toLowerCase());
    if (googleAuth) {
      if (!member) {
        const isOwnerAdmin = email.toLowerCase() === 'bondhon.biniyog@gmail.com' || email.toLowerCase() === 'admin@bob.com';
        const newMember: Member = {
          member_id: `BoB-${String(db.members.length + 1).padStart(3, '0')}`,
          full_name: full_name || (isOwnerAdmin? 'বন্ধন ও বিনিয়োগ অ্যাডমিন' : 'Google Member'),
          email: email.toLowerCase(),
          phone: phone || '+880 1712-345678',
          password_hash: 'firebase_oauth_session',
          role: isOwnerAdmin? 'Admin' : 'Member',
          status: 'Active',
          monthly_target: 5000,
          total_monthly_paid: 0,
          total_lumpsum_paid: 0,
          grand_total_paid: 0,
          due_installments: 0,
          owned_shares: 0,
          has_accepted_terms: true,
          avatar_url: avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          joined_date: new Date().toISOString().split('T')[0],
        };
        db.members.push(newMember);
        saveDatabase(db);
        syncMemberToFirestore(newMember);
        member = newMember;
      }
      if (member.status === 'Blocked') return { status: 403, data: { success: false, message: 'অ্যাকাউন্ট স্থগিত' } };
      const { password_hash,...safeMember } = member;
      return { status: 200, data: { success: true, member: safeMember } };
    }
    if (!password) return { status: 400, data: { success: false, message: 'ইমেইল ও পাসওয়ার্ড প্রয়োজন' } };
    if (!member) return { status: 401, data: { success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি' } };
    if (member.password_hash!== password) return { status: 401, data: { success: false, message: 'ভুল পাসওয়ার্ড' } };
    const { password_hash,...safeMember } = member;
    return { status: 200, data: { success: true, member: safeMember } };
  }

  if (pathname === '/api/auth/register' && methodUpper === 'POST') {
    const { full_name, email, phone, password, monthly_target, live_photo_url } = body || {};
    if (!full_name ||!email ||!phone ||!password) return { status: 400, data: { success: false, message: 'সকল তথ্য পূরণ করুন' } };
    const exists = db.members.find((m) => m.email.toLowerCase() === email.toLowerCase());
    if (exists) return { status: 409, data: { success: false, message: 'এই ইমেইলে অ্যাকাউন্ট আছে' } };
    const nextId = `BoB-${String(db.members.length + 1).padStart(3, '0')}`;
    const newMember: Member = {
      member_id: nextId, full_name, email, phone, password_hash: password, live_photo_url, role: 'Member', status: 'Pending',
      monthly_target: Math.max(1000, Number(monthly_target) || 1000), total_monthly_paid: 0, total_lumpsum_paid: 0, grand_total_paid: 0, due_installments: 0, owned_shares: 0, has_accepted_terms: false,
      avatar_url: live_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name)}`, joined_date: new Date().toISOString().split('T')[0],
    };
    db.members.push(newMember);
    saveDatabase(db);
    syncMemberToFirestore(newMember);
    const { password_hash: _,...safeMember } = newMember;
    return { status: 201, data: { success: true, message: 'নিবন্ধন সম্পন্ন', member: safeMember } };
  }

  if (pathname === '/api/members') {
    if (methodUpper === 'GET') {
      const safeMembers = db.members.map(({ password_hash,...m }) => m);
      return { status: 200, data: { success: true, members: safeMembers } };
    }
    if (methodUpper === 'POST') {
      const data = body || {};
      const nextId = `BoB-${String(db.members.length + 1).padStart(3, '0')}`;
      const newMember: Member = {
        member_id: nextId, full_name: data.full_name, email: data.email, phone: data.phone, password_hash: data.password || 'member123',
        role: data.role || 'Member', status: data.status || 'Active', monthly_target: Number(data.monthly_target) || 5000,
        total_monthly_paid: Number(data.total_monthly_paid) || 0, total_lumpsum_paid: Number(data.total_lumpsum_paid) || 0,
        grand_total_paid: (Number(data.total_monthly_paid) || 0) + (Number(data.total_lumpsum_paid) || 0),
        due_installments: Number(data.due_installments) || 0, owned_shares: Number(data.owned_shares) || 0, has_accepted_terms: true,
        avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.full_name)}`,
        joined_date: new Date().toISOString().split('T')[0],
      };
      db.members.push(newMember);
      saveDatabase(db);
      syncMemberToFirestore(newMember);
      const { password_hash: _,...safeMember } = newMember;
      return { status: 201, data: { success: true, member: safeMember } };
    }
  }

  const memberMatch = pathname.match(/^\/api\/members\/([^/]+)$/);
  if (memberMatch) {
    const id = memberMatch[1];
    const index = db.members.findIndex((m) => m.member_id === id);
    if (index === -1) return { status: 404, data: { success: false, message: 'Member not found' } };
    if (methodUpper === 'PUT' || methodUpper === 'PATCH') {
      const updates = body || {};
      let newMemberId = db.members[index].member_id;
      if (updates.member_id && updates.member_id!== id) {
        const exists = db.members.find((m) => m.member_id === updates.member_id);
        if (exists) return { status: 400, data: { success: false, message: 'এই আইডি বিদ্যমান' } };
        newMemberId = updates.member_id;
      }
      const totalMonthly = updates.total_monthly_paid!== undefined? Number(updates.total_monthly_paid) : db.members[index].total_monthly_paid;
      const totalLumpsum = updates.total_lumpsum_paid!== undefined? Number(updates.total_lumpsum_paid) : db.members[index].total_lumpsum_paid;
      db.members[index] = {
       ...db.members[index],...updates, member_id: newMemberId,
        total_monthly_paid: totalMonthly, total_lumpsum_paid: totalLumpsum, grand_total_paid: totalMonthly + totalLumpsum,
      };
      saveDatabase(db);
      syncMemberToFirestore(db.members[index]);
      const { password_hash: _,...safeMember } = db.members[index];
      return { status: 200, data: { success: true, message: 'সদস্য হালনাগাদ হয়েছে', member: safeMember } };
    }
    if (methodUpper === 'DELETE') {
      db.members.splice(index, 1);
      saveDatabase(db);
      return { status: 200, data: { success: true, message: 'সদস্য মুছে ফেলা হয়েছে' } };
    }
  }

  if (pathname === '/api/deposits/monthly') {
    if (methodUpper === 'GET') {
      const member_id = url.searchParams.get('member_id');
      let filtered = [...db.monthlyDeposits];
      if (member_id) filtered = filtered.filter((d) => d.member_id === member_id);
      return { status: 200, data: { success: true, deposits: filtered } };
    }
    if (methodUpper === 'POST') {
      const { member_id, month_year, amount, payment_method, trx_id, voucher_url } = body || {};
      const member = db.members.find((m) => m.member_id === member_id);
      const newDeposit: MonthlyDeposit = {
        deposit_id: `MD-${month_year?.replace('-', '') || '2026'}-${String(db.monthlyDeposits.length + 1).padStart(3, '0')}`,
        member_id, member_name: member? member.full_name : 'Unknown', month_year, amount: Number(amount), payment_method, trx_id,
        voucher_url: voucher_url || '', status: 'Pending', submitted_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      db.monthlyDeposits.unshift(newDeposit);
      saveDatabase(db);
      syncMonthlyDepositToFirestore(newDeposit);
      return { status: 201, data: { success: true, deposit: newDeposit } };
    }
  }

  const monthlyStatusMatch = pathname.match(/^\/api\/deposits\/monthly\/([^/]+)\/status$/);
  if (monthlyStatusMatch && (methodUpper === 'PUT' || methodUpper === 'PATCH')) {
    const id = monthlyStatusMatch[1];
    const deposit = db.monthlyDeposits.find((d) => d.deposit_id === id);
    if (!deposit) return { status: 404, data: { success: false, message: 'Deposit not found' } };
    const oldStatus = deposit.status;
    deposit.status = body?.status || deposit.status;
    deposit.admin_note = body?.admin_note || deposit.admin_note;
    const member = db.members.find((m) => m.member_id === deposit.member_id);
    if (member) {
      if (oldStatus!== 'Approved' && deposit.status === 'Approved') {
        member.total_monthly_paid += deposit.amount;
        member.grand_total_paid += deposit.amount;
        if (member.due_installments > 0) member.due_installments -= 1;
      }
      syncMemberToFirestore(member);
    }
    saveDatabase(db);
    syncMonthlyDepositToFirestore(deposit);
    return { status: 200, data: { success: true, deposit } };
  }

  if (pathname === '/api/deposits/lumpsum') {
    if (methodUpper === 'GET') {
      return { status: 200, data: { success: true, deposits: db.lumpsumDeposits } };
    }
    if (methodUpper === 'POST') {
      const { member_id, purpose, amount, target_land_id, payment_method, trx_id, voucher_url } = body || {};
      const member = db.members.find((m) => m.member_id === member_id);
      const newDeposit: LumpsumDeposit = {
        lumpsum_id: `LS-2026-${String(db.lumpsumDeposits.length + 1).padStart(3, '0')}`,
        member_id, member_name: member? member.full_name : 'Unknown', purpose, amount: Number(amount), target_land_id,
        target_land_name: 'Land Fund', payment_method, trx_id, voucher_url: voucher_url || '', status: 'Pending',
        submitted_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      db.lumpsumDeposits.unshift(newDeposit);
      saveDatabase(db);
      syncLumpsumDepositToFirestore(newDeposit);
      return { status: 201, data: { success: true, deposit: newDeposit } };
    }
  }

  const lumpsumStatusMatch = pathname.match(/^\/api\/deposits\/lumpsum\/([^/]+)\/status$/);
  if (lumpsumStatusMatch && (methodUpper === 'PUT' || methodUpper === 'PATCH')) {
    const id = lumpsumStatusMatch[1];
    const deposit = db.lumpsumDeposits.find((d) => d.lumpsum_id === id);
    if (!deposit) return { status: 404, data: { success: false, message: 'Deposit not found' } };
    const oldStatus = deposit.status;
    deposit.status = body?.status || deposit.status;
    const member = db.members.find((m) => m.member_id === deposit.member_id);
    if (member) {
      if (oldStatus!== 'Approved' && deposit.status === 'Approved') {
        member.total_lumpsum_paid += deposit.amount;
        member.grand_total_paid += deposit.amount;
      }
      syncMemberToFirestore(member);
    }
    saveDatabase(db);
    syncLumpsumDepositToFirestore(deposit);
    return { status: 200, data: { success: true, deposit } };
  }

  if (pathname === '/api/lands') {
    if (methodUpper === 'GET') return { status: 200, data: { success: true, lands: db.lands } };
    if (methodUpper === 'POST') {
      const data = body || {};
      const nextId = `LAND-${String(db.lands.length + 1).padStart(2, '0')}`;
      const newLand: LandInvestment = {
        land_id: nextId, land_name: data.land_name, location: data.location, area_size: data.area_size,
        purchase_price: Number(data.purchase_price) || 0, current_valuation: Number(data.current_valuation) || 0,
        total_shares: Number(data.total_shares) || 50, share_price: Number(data.share_price) || 100000,
        sold_shares: Number(data.sold_shares) || 0, monthly_installment: Number(data.monthly_installment) || 5000,
        status: data.status || 'Active', images: data.images || [], description: data.description || '', features: data.features || [], shares_detail: [],
      };
      db.lands.push(newLand);
      saveDatabase(db);
      try { await setDoc(doc(firestoreDb, 'lands', newLand.land_id), newLand, { merge: true }); } catch(e){}
      return { status: 201, data: { success: true, land: newLand } };
    }
  }

  // বাকি routes আগের মতই থাকবে (directors, gallery, notifications etc)
  if (pathname === '/api/directors' && methodUpper === 'GET') return { status: 200, data: { success: true, directors: db.directors } };
  if (pathname === '/api/gallery' && methodUpper === 'GET') return { status: 200, data: { success: true, gallery: db.gallery } };
  if (pathname === '/api/notifications') {
    let list = [...db.notifications];
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { status: 200, data: { success: true, notifications: list } };
  }

  return { status: 404, data: { success: false, message: 'Route not found' } };
}
