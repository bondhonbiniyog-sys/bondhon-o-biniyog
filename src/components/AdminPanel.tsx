import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  Member,
  MonthlyDeposit,
  LumpsumDeposit,
  LandInvestment,
  SystemSettings,
  DashboardStats,
  LandSaleOffer,
  PublicLandSubmission,
  MemberLandProposal,
  Director,
} from '../types';
import { formatTaka, toBengaliDigits } from '../utils/bengaliUtils';
import { GoogleDriveExplorerModal } from './GoogleDriveExplorerModal';
import { syncMemberToFirestore, syncSettingsToFirestore } from '../services/firestoreSync';
import { doc, deleteDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminPanelProps {
  currentUser: Member | null;
  stats: DashboardStats | null;
  settings: SystemSettings | null;
  members: Member[];
  monthlyDeposits: MonthlyDeposit[];
  lumpsumDeposits: LumpsumDeposit[];
  lands: LandInvestment[];
  directors?: Director[];
  onRefreshData: () => void;
  onOpenAuth: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  stats,
  settings,
  members,
  monthlyDeposits,
  lumpsumDeposits,
  lands,
  directors = [],
  onRefreshData,
  onOpenAuth,
}) => {
  const [adminTab, setAdminTab] = useState<'pending' | 'members' | 'lands' | 'directors' | 'payments' | 'ads_ticker' | 'branding_contact' | 'voucher_signature' | 'marketplace' | 'admin_security'>('pending');
  const [offers, setOffers] = useState<LandSaleOffer[]>([]);
  const [submissions, setSubmissions] = useState<PublicLandSubmission[]>([]);
  const [proposals, setProposals] = useState<MemberLandProposal[]>([]);
  const [marketSection, setMarketSection] = useState<'offers' | 'submissions' | 'proposals'>('offers');
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);

  // ✅ FIXED: No /api - Direct Firestore
  const fetchMarketplaceData = async () => {
    try {
      setIsLoadingExtra(true);
      const [offersSnap, subsSnap, propsSnap] = await Promise.all([
        getDocs(collection(db, 'buy_offers')).catch(()=>({ docs: [] } as any)),
        getDocs(collection(db, 'land_submissions')).catch(()=>({ docs: [] } as any)),
        getDocs(collection(db, 'member_proposals')).catch(()=>({ docs: [] } as any)),
      ]);
      setOffers(offersSnap.docs.map((d:any) => ({ id: d.id,...d.data() })) as any);
      setSubmissions(subsSnap.docs.map((d:any) => ({ id: d.id,...d.data() })) as any);
      setProposals(propsSnap.docs.map((d:any) => ({ id: d.id,...d.data() })) as any);

      if (offersSnap.docs.length === 0) {
        const alt = await getDocs(collection(db, 'marketplace_offers')).catch(()=>({ docs: [] } as any));
        if (alt.docs.length > 0) setOffers(alt.docs.map((d:any) => ({ id: d.id,...d.data() })) as any);
      }
    } catch (err) {
      console.error('Marketplace load error:', err);
    } finally {
      setIsLoadingExtra(false);
    }
  };

  useEffect(() => { fetchMarketplaceData(); }, []);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Blocked'>('All');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('member123');
  const [newMemberRole, setNewMemberRole] = useState<'Member' | 'Admin'>('Member');
  const [newMemberStatus, setNewMemberStatus] = useState<'Active' | 'Pending' | 'Blocked'>('Active');
  const [newMemberTarget, setNewMemberTarget] = useState(5000);
  const [newMemberShares, setNewMemberShares] = useState(0);
  const [newMemberAvatar, setNewMemberAvatar] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [originalMemberId, setOriginalMemberId] = useState<string>('');
  const [memberToChangePassword, setMemberToChangePassword] = useState<Member | null>(null);
  const [newPasswordForMember, setNewPasswordForMember] = useState<string>('');
  const [confirmPasswordForMember, setConfirmPasswordForMember] = useState<string>('');
  const [memberPasswordLoading, setMemberPasswordLoading] = useState<boolean>(false);
  const [showAdminDriveModal, setShowAdminDriveModal] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || 'admin@bob.com');
  const [adminMemberId, setAdminMemberId] = useState(currentUser?.member_id || 'BoB-001');
  const [adminFullName, setAdminFullName] = useState(currentUser?.full_name || 'সজিব মোল্লা (অ্যাডমিন)');
  const [adminPhone, setAdminPhone] = useState(currentUser?.phone || '+880 1712-345678');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminCredLoading, setAdminCredLoading] = useState(false);
  const [adminCredMsg, setAdminCredMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddLandModal, setShowAddLandModal] = useState(false);
  const [editingLand, setEditingLand] = useState<LandInvestment | null>(null);
  const [newLandName, setNewLandName] = useState('');
  const [newLandLocation, setNewLandLocation] = useState('');
  const [newLandArea, setNewLandArea] = useState('');
  const [newLandPrice, setNewLandPrice] = useState(5000000);
  const [newLandShares, setNewLandShares] = useState(50);
  const [newLandSharePrice, setNewLandSharePrice] = useState(100000);
  const [newLandMonthlyInstallment, setNewLandMonthlyInstallment] = useState(5000);
  const [newLandImage, setNewLandImage] = useState('');
  const [newLandDescription, setNewLandDescription] = useState('');
  const [showAssignShareModal, setShowAssignShareModal] = useState(false);
  const [assignLandId, setAssignLandId] = useState(lands[0]?.land_id || '');
  const [assignMemberId, setAssignMemberId] = useState(members[0]?.member_id || '');
  const [assignShareCount, setAssignShareCount] = useState(1);
  const [assignCertNo, setAssignCertNo] = useState('');
  const [directorsList, setDirectorsList] = useState<Director[]>(directors || []);
  const [showAddDirectorModal, setShowAddDirectorModal] = useState(false);
  const [editingDirector, setEditingDirector] = useState<Director | null>(null);
  const [dirName, setDirName] = useState('');
  const [dirDesignation, setDirDesignation] = useState('');
  const [dirPhone, setDirPhone] = useState('');
  const [dirEmail, setDirEmail] = useState('');
  const [dirPhoto, setDirPhoto] = useState('');
  const [dirMessage, setDirMessage] = useState('');
  const [dirOrder, setDirOrder] = useState(1);
  useEffect(() => { if (directors && directors.length > 0) setDirectorsList(directors); }, [directors]);
  const [payBankName, setPayBankName] = useState(settings?.payment_bank_name || 'BRAC Bank PLC');
  const [payBankAccountName, setPayBankAccountName] = useState(settings?.payment_bank_account_name || 'BONDHON O BINIYOG');
  const [payBankAccountNo, setPayBankAccountNo] = useState(settings?.payment_bank_account_no || '1501-2049-88001');
  const [payBankBranch, setPayBankBranch] = useState(settings?.payment_bank_branch || 'বসুন্ধরা শাখা');
  const [payBankRouting, setPayBankRouting] = useState(settings?.payment_bank_routing || '060261789');
  const [payBkashNo, setPayBkashNo] = useState(settings?.payment_bkash_no || '01712-345678');
  const [payNagadNo, setPayNagadNo] = useState(settings?.payment_nagad_no || '01890-123456');
  const [payRocketNo, setPayRocketNo] = useState(settings?.payment_rocket_no || '01712-345678-0');
  const [payInstructions, setPayInstructions] = useState(settings?.payment_instructions || '');
  const [adActive, setAdActive] = useState<boolean>(settings?.banner_ad_active?? true);
  const [adBadge, setAdBadge] = useState(settings?.banner_ad_badge || 'বিশেষ বিজ্ঞাপন');
  const [adText, setAdText] = useState(settings?.banner_ad_text || '');
  const [adImage, setAdImage] = useState(settings?.banner_ad_image || '');
  const [adValidity, setAdValidity] = useState(settings?.banner_ad_validity || '৩০ অক্টোবর ২০২৬ পর্যন্ত');
  const [adActionText, setAdActionText] = useState(settings?.banner_ad_action_text || 'এখনই অফারটি গ্রহণ করুন');
  const [callCtaPhone, setCallCtaPhone] = useState(settings?.call_cta_phone || settings?.contact_phone_1 || '+880 1712-345678');
  const [callCtaText, setCallCtaText] = useState(settings?.call_cta_text || 'সরাসরি কল করুন');
  const [callCtaTiming, setCallCtaTiming] = useState(settings?.call_cta_timing || 'সকাল ৯টা থেকে রাত ১০টা');
  const [contactWhatsapp, setContactWhatsapp] = useState(settings?.contact_whatsapp || '+880 1712-345678');
  const [contactAddress, setContactAddress] = useState(settings?.contact_address || 'বসুন্ধরা, ঢাকা-১২২৯');
  const [voucherSignatureUrl, setVoucherSignatureUrl] = useState(settings?.voucher_signature_url || '');
  const [voucherSignatoryName, setVoucherSignatoryName] = useState(settings?.voucher_signatory_name || 'সজিব মোল্লা');
  const [voucherSignatoryTitle, setVoucherSignatoryTitle] = useState(settings?.voucher_signatory_title || 'ব্যবস্থাপনা পরিচালক');
  const [voucherSealText, setVoucherSealText] = useState(settings?.voucher_seal_text || 'বন্ধন ও বিনিয়োগ অনুমোদিত');
  const [cmsLogoUrl, setCmsLogoUrl] = useState(settings?.logo_url || '/bob-logo.png');
  const [cmsProjectTitle, setCmsProjectTitle] = useState(settings?.project_title || 'বন্ধন ও বিনিয়োগ');
  const [cmsSlogan, setCmsSlogan] = useState(settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ');
  const [cmsHeroTitle, setCmsHeroTitle] = useState(settings?.hero_title || 'যৌথ বিনিয়োগে ভূমির মালিকানা');
  const [cmsHeroSubtitle, setCmsHeroSubtitle] = useState(settings?.hero_subtitle || '');
  const [cmsNotice, setCmsNotice] = useState(settings?.notice_bengali || '');
  const [cmsTarget, setCmsTarget] = useState(settings?.target_amount || 10000000);
  const [cmsVision, setCmsVision] = useState(settings?.project_vision || '');
  const [cmsPhone1, setCmsPhone1] = useState(settings?.contact_phone_1 || '');
  const [cmsPhone2, setCmsPhone2] = useState(settings?.contact_phone_2 || '');
  const [cmsEmail, setCmsEmail] = useState(settings?.contact_email || '');
  const [cmsLead, setCmsLead] = useState(settings?.management_lead || 'সজিব মোল্লা');
  const [cmsLeadDesignation, setCmsLeadDesignation] = useState(settings?.management_lead_designation || 'ব্যবস্থাপনা পরিচালক');

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('ফাইলের সাইজ সর্বোচ্চ ৫ মেগাবাইট'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setter(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  if (!currentUser || currentUser.role!== 'Admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center font-bengali">
        <h2 className="text-2xl font-bold text-white mb-2">অ্যাডমিন প্রবেশাধিকার সংরক্ষিত</h2>
        <button onClick={onOpenAuth} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white">অ্যাডমিন লগইন করুন</button>
      </div>
    );
  }

  const pendingMonthly = monthlyDeposits.filter((d) => d.status === 'Pending');
  const pendingLumpsum = lumpsumDeposits.filter((d) => d.status === 'Pending');
  const totalPendingCount = pendingMonthly.length + pendingLumpsum.length;

  const handleUpdateMonthlyStatus = async (depositId: string, status: 'Approved' | 'Rejected') => {
    setActionLoading(true);
    try {
      const dep = monthlyDeposits.find(d => d.deposit_id === depositId);
      if(dep){
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'monthly_deposits', depositId), {...dep, status }, { merge: true });
        showNotification(`মাসিক কিস্তি ${status} হয়েছে! Firebase এ গেছে!`);
        onRefreshData();
      }
    } catch (err) { showNotification('স্ট্যাটাস আপডেট ব্যর্থ', 'error'); } finally { setActionLoading(false); }
  };
  const handleUpdateLumpsumStatus = async (lumpsumId: string, status: 'Approved' | 'Rejected') => {
    setActionLoading(true);
    try {
      const dep = lumpsumDeposits.find(d => d.lumpsum_id === lumpsumId);
      if(dep){
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'lumpsum_deposits', lumpsumId), {...dep, status }, { merge: true });
        showNotification(`এককালীন বিনিয়োগ ${status} হয়েছে!`);
        onRefreshData();
      }
    } catch (err) { showNotification('স্ট্যাটাস আপডেট ব্যর্থ', 'error'); } finally { setActionLoading(false); }
  };

  const handleUpdateMemberStatus = async (memberId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const member = members.find(m => m.member_id === memberId);
      if(member){
        const updated = {...member, status: newStatus as any };
        await syncMemberToFirestore(updated);
        showNotification(`সদস্য স্ট্যাটাস ${newStatus} - Firebase এ চলে গেছে!`);
        onRefreshData();
      }
    } catch (err) { showNotification('আপডেট ব্যর্থ', 'error'); } finally { setActionLoading(false); }
  };

  const handleSaveMemberEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setActionLoading(true);
    try {
      await syncMemberToFirestore(editingMember);
      showNotification('সদস্যের তথ্য Firebase এ সংরক্ষিত হয়েছে!');
      setEditingMember(null);
      onRefreshData();
    } catch (err) { showNotification('আপডেট ব্যর্থ', 'error'); } finally { setActionLoading(false); }
  };

  const handleQuickPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToChangePassword) return;
    setMemberPasswordLoading(true);
    try {
      const updated = {...memberToChangePassword, password: newPasswordForMember } as any;
      await syncMemberToFirestore(updated);
      showNotification(`পাসওয়ার্ড Firebase এ সংরক্ষিত হয়েছে!`);
      setMemberToChangePassword(null);
      onRefreshData();
    } catch (err) { showNotification('ব্যর্থ', 'error'); } finally { setMemberPasswordLoading(false); }
  };

  const handleAdminCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCredLoading(true);
    try {
      const updated = {...currentUser, member_id: adminMemberId, email: adminEmail, full_name: adminFullName, phone: adminPhone } as Member;
      await syncMemberToFirestore(updated);
      localStorage.setItem('bob_logged_user', JSON.stringify(updated));
      setAdminCredMsg({ type: 'success', text: 'অ্যাডমিন তথ্য Firebase এ সংরক্ষিত!' });
      onRefreshData();
    } catch (err) { setAdminCredMsg({ type: 'error', text: 'ত্রুটি' }); } finally { setAdminCredLoading(false); }
  };

  const handleCreateLand = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const landId = `LAND-${Date.now()}`;
      const newLand = {
        land_id: landId,
        land_name: newLandName,
        location: newLandLocation,
        area_size: newLandArea,
        purchase_price: Number(newLandPrice),
        total_shares: Number(newLandShares),
        share_price: Number(newLandSharePrice),
        sold_shares: 0,
        images: [newLandImage || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800']
      };
      await setDoc(doc(db, 'lands', landId), newLand as any);
      showNotification('নতুন ভূমি প্রকল্প Firebase এ যুক্ত হয়েছে!');
      setShowAddLandModal(false);
      onRefreshData();
    } catch (err) { showNotification('ব্যর্থ', 'error'); } finally { setActionLoading(false); }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const newId = `BoB-${String(members.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`;
      const newMember: any = {
        member_id: newId,
        full_name: newMemberName,
        email: newMemberEmail,
        phone: newMemberPhone,
        role: newMemberRole,
        status: newMemberStatus,
        monthly_target: Number(newMemberTarget) || 5000,
        owned_shares: Number(newMemberShares) || 0,
        avatar_url: newMemberAvatar || `https://i.pravatar.cc/150?u=${newId}`,
        total_paid: 0,
        grand_total_paid: 0,
        has_accepted_terms: true,
        join_date: new Date().toISOString(),
      };
      await syncMemberToFirestore(newMember);
      showNotification('নতুন সদস্য Firebase এ যুক্ত হয়েছে!');
      setShowAddMemberModal(false);
      setNewMemberName(''); setNewMemberEmail(''); setNewMemberPhone('');
      onRefreshData();
    } catch (err) { showNotification('ত্রুটি', 'error'); } finally { setActionLoading(false); }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`"${memberName}" কে মুছে ফেলবেন?`)) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'members', memberId));
      showNotification(`সদস্য "${memberName}" Firebase থেকে মুছে ফেলা হয়েছে!`);
      onRefreshData();
    } catch (err) { showNotification('মুছতে ব্যর্থ', 'error'); } finally { setActionLoading(false); }
  };

  const handleUpdateLand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLand) return;
    setActionLoading(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'lands', editingLand.land_id), editingLand as any, { merge: true });
      showNotification('ভূমি তথ্য Firebase এ আপডেট হয়েছে!');
      setEditingLand(null);
      onRefreshData();
    } catch (err) { showNotification('ব্যর্থ', 'error'); } finally { setActionLoading(false); }
  };

  const handleCreateDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const id = `DIR-${Date.now()}`;
      const newDir = { director_id: id, name: dirName, designation: dirDesignation, phone: dirPhone, email: dirEmail, photo_url: dirPhoto, message: dirMessage, order: Number(dirOrder) };
      await setDoc(doc(db, 'directors', id), newDir as any);
      showNotification('পরিচালক Firebase এ যুক্ত!');
      setShowAddDirectorModal(false);
      onRefreshData();
    } catch (err) { showNotification('ব্যর্থ', 'error'); } finally { setActionLoading(false); }
  };

  const handleOfferStatus = async (id: string, status: 'Approved' | 'Rejected', type: 'offers' | 'submissions' | 'proposals') => {
    setActionLoading(true);
    try {
      const colName = type === 'offers'? 'buy_offers' : type === 'submissions'? 'land_submissions' : 'member_proposals';
      await updateDoc(doc(db, colName, id), { status });
      showNotification(`প্রস্তাব ${status} হয়েছে!`);
      fetchMarketplaceData();
    } catch (e) { showNotification('আপডেট ব্যর্থ', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleSaveSettingsSection = async (customPayload?: Record<string, any>, successText?: string) => {
    setActionLoading(true);
    try {
      const payload = customPayload || {
        logo_url: cmsLogoUrl, project_title: cmsProjectTitle, slogan_bengali: cmsSlogan,
        hero_title: cmsHeroTitle, hero_subtitle: cmsHeroSubtitle, notice_bengali: cmsNotice,
        target_amount: Number(cmsTarget), project_vision: cmsVision,
        contact_phone_1: cmsPhone1, contact_phone_2: cmsPhone2, contact_whatsapp: contactWhatsapp,
        contact_email: cmsEmail, contact_address: contactAddress, call_cta_phone: callCtaPhone,
        call_cta_text: callCtaText, call_cta_timing: callCtaTiming, management_lead: cmsLead,
        management_lead_designation: cmsLeadDesignation, banner_ad_active: adActive,
        banner_ad_badge: adBadge, banner_ad_text: adText, banner_ad_image: adImage,
        banner_ad_validity: adValidity, banner_ad_action_text: adActionText,
        voucher_signature_url: voucherSignatureUrl, voucher_signatory_name: voucherSignatoryName,
        voucher_signatory_title: voucherSignatoryTitle, voucher_seal_text: voucherSealText,
        payment_bank_name: payBankName, payment_bank_account_name: payBankAccountName,
        payment_bank_account_no: payBankAccountNo, payment_bank_branch: payBankBranch,
        payment_bank_routing: payBankRouting, payment_bkash_no: payBkashNo,
        payment_nagad_no: payNagadNo, payment_rocket_no: payRocketNo, payment_instructions: payInstructions,
      };
      await syncSettingsToFirestore(payload as any);
      showNotification(successText || 'Firebase এ Settings Save হয়েছে!');
      onRefreshData();
    } catch (err) { showNotification('ত্রুটি', 'error'); } finally { setActionLoading(false); }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase()) || m.member_id.toLowerCase().includes(memberSearch.toLowerCase()) || m.phone.includes(memberSearch);
    const matchesStatus = memberStatusFilter === 'All'? true : m.status === memberStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-bengali">
      {notification && <div className={`p-4 rounded-2xl border text-sm ${notification.type === 'success'? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200' : 'bg-red-950/80 border-red-500/60 text-red-200'}`}>{notification.text}</div>}

      <div className="bg-gradient-to-r from-slate-900 to-amber-950/50 border border-amber-500/30 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <h1 className="text-2xl font-black text-white">অ্যাডমিন প্যানেল - Firebase Live ✅</h1>
          <div className="flex gap-2">
            <button onClick={async () => {
              if(!confirm(`${members.length} জনকে Firebase এ Upload করবেন?`)) return;
              setActionLoading(true);
              for(const m of members){ await syncMemberToFirestore(m); }
              setActionLoading(false);
              showNotification(`${members.length} জন Firebase এ গেছে!`);
              onRefreshData();
            }} className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs animate-pulse">🔥 সব Firebase এ পাঠান ({members.length})</button>
            <button onClick={onRefreshData} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs">রিফ্রেশ</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><span className="text-xs text-slate-400">মোট সদস্য</span><div className="text-xl font-black text-blue-400">{members.length} জন</div></div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><span className="text-xs text-slate-400">পেন্ডিং ভাউচার</span><div className="text-xl font-black text-amber-400">{totalPendingCount} টি</div></div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><span className="text-xs text-slate-400">ভূমি প্রকল্প</span><div className="text-xl font-black text-emerald-400">{lands.length} টি</div></div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><span className="text-xs text-slate-400">ক্রয় প্রস্তাব</span><div className="text-xl font-black text-purple-400">{offers.length} টি</div></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button onClick={() => setAdminTab('pending')} className={`px-3 py-2 rounded-xl text-xs font-bold ${adminTab === 'pending'? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>ভাউচার ({totalPendingCount})</button>
        <button onClick={() => setAdminTab('members')} className={`px-3 py-2 rounded-xl text-xs font-bold ${adminTab === 'members'? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>সদস্য ({members.length})</button>
        <button onClick={() => setAdminTab('lands')} className={`px-3 py-2 rounded-xl text-xs font-bold ${adminTab === 'lands'? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>ভূমি</button>
        <button onClick={() => { setAdminTab('marketplace'); fetchMarketplaceData(); }} className={`px-3 py-2 rounded-xl text-xs font-bold ${adminTab === 'marketplace'? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>ক্রয়-বিক্রয় প্রস্তাব ({offers.length})</button>
        <button onClick={() => setAdminTab('payments')} className={`px-3 py-2 rounded-xl text-xs font-bold ${adminTab === 'payments'? 'bg-teal-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>পেমেন্ট</button>
        <button onClick={() => setAdminTab('ads_ticker')} className={`px-3 py-2 rounded-xl text-xs font-bold ${adminTab === 'ads_ticker'? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>বিজ্ঞাপন</button>
        <button onClick={() => setAdminTab('branding_contact')} className={`px-3 py-2 rounded-xl text-xs font-bold ${adminTab === 'branding_contact'? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>লগো ও কল</button>
        <button onClick={() => setAdminTab('admin_security')} className={`px-3 py-2 rounded-xl text-xs font-bold ${adminTab === 'admin_security'? 'bg-red-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>এডমিন আইডি</button>
      </div>

      {adminTab === 'marketplace' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">জমি ক্রয়-বিক্রয় প্রস্তাব - Firebase Live</h3>
          {isLoadingExtra? <div className="text-center py-10 text-slate-400">লোড হচ্ছে...</div> :
            offers.length === 0? <div className="text-center py-10 text-slate-400">কোনো ক্রয় প্রস্তাব নেই</div> :
            offers.map((o:any) => (
              <div key={o.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-white font-bold">{o.buyer_name} - {o.land_name}</div>
                  <div className="text-xs text-slate-400">{o.mobile} | ৳ {o.proposed_price?.toLocaleString()} | {o.status}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>handleOfferStatus(o.id,'Approved','offers')} className="px-3 py-1 bg-emerald-600 text-white rounded text-xs">Approve</button>
                  <button onClick={()=>handleOfferStatus(o.id,'Rejected','offers')} className="px-3 py-1 bg-red-600/20 text-red-300 rounded text-xs">Reject</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {adminTab === 'members' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex justify-between gap-4">
            <h3 className="text-xl font-bold text-white">সদস্য তালিকা - Firebase Live</h3>
            <div className="flex gap-2">
              <input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="Search..." className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white w-40" />
              <button onClick={()=>setShowAddMemberModal(true)} className="px-3 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">+ নতুন সদস্য</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-slate-800 text-slate-400"><th className="pb-3">নাম</th><th className="pb-3">স্ট্যাটাস</th><th className="pb-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMembers.map((m) => (
                  <tr key={m.member_id}><td className="py-3"><div className="font-bold text-white">{m.full_name}</div><div className="text-blue-400 text-[11px]">{m.member_id}</div></td><td className="py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] ${m.status==='Active'?'bg-emerald-500/10 text-emerald-400':'bg-amber-500/10 text-amber-400'}`}>{m.status}</span></td><td className="py-3 text-right"><div className="flex justify-end gap-1">{m.status==='Pending' && <button onClick={()=>handleUpdateMemberStatus(m.member_id,'Active')} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs">অনুমোদন</button>}<button onClick={()=>setEditingMember(m)} className="p-1.5 rounded bg-slate-800 text-slate-400">✏️</button><button onClick={()=>handleDeleteMember(m.member_id,m.full_name)} className="p-1.5 rounded bg-slate-800 text-red-400">🗑️</button></div></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'pending' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">পেন্ডিং কিস্তি ({pendingMonthly.length})</h3>
          {pendingMonthly.map((m) => (
            <div key={m.deposit_id} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl mb-2">
              <div><div className="text-white font-bold">{m.member_name}</div><div className="text-xs text-slate-400">{m.month_year} - {formatTaka(m.amount)}</div></div>
              <div className="flex gap-2"><button onClick={()=>handleUpdateMonthlyStatus(m.deposit_id,'Approved')} className="px-3 py-1 bg-emerald-600 text-white rounded text-xs">অনুমোদন</button><button onClick={()=>handleUpdateMonthlyStatus(m.deposit_id,'Rejected')} className="px-3 py-1 bg-red-600/20 text-red-300 rounded text-xs">বাতিল</button></div>
            </div>
          ))}
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">নতুন সদস্য - Firebase</h3>
            <input value={newMemberName} onChange={e=>setNewMemberName(e.target.value)} placeholder="নাম" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
            <input value={newMemberEmail} onChange={e=>setNewMemberEmail(e.target.value)} placeholder="ইমেইল" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
            <input value={newMemberPhone} onChange={e=>setNewMemberPhone(e.target.value)} placeholder="ফোন" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
            <div className="flex gap-2"><button onClick={handleCreateMember} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">যোগ করুন</button><button onClick={()=>setShowAddMemberModal(false)} className="flex-1 py-2 bg-slate-800 text-white rounded-xl text-sm">বাতিল</button></div>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">সদস্য সম্পাদনা - Firebase</h3>
            <input value={editingMember.full_name} onChange={e=>setEditingMember({...editingMember, full_name: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
            <input value={editingMember.email} onChange={e=>setEditingMember({...editingMember, email: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
            <select value={editingMember.status} onChange={e=>setEditingMember({...editingMember, status: e.target.value as any})} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"><option value="Active">Active</option><option value="Pending">Pending</option><option value="Blocked">Blocked</option></select>
            <div className="flex gap-2"><button onClick={handleSaveMemberEdits} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Save Firebase</button><button onClick={()=>setEditingMember(null)} className="flex-1 py-2 bg-slate-800 text-white rounded-xl text-sm">বাতিল</button></div>
          </div>
        </div>
      )}

      <GoogleDriveExplorerModal isOpen={showAdminDriveModal} onClose={()=>setShowAdminDriveModal(false)} />
    </div>
  );
};
export default AdminPanel;
