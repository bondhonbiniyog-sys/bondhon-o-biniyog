import React, { useState, useEffect, useCallback } from 'react';
import type {
  SystemSettings,
  Member,
  MonthlyDeposit,
  LumpsumDeposit,
  LandInvestment,
  Director,
  GalleryItem,
  DashboardStats,
  AppNotification,
} from './types';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { NoticeTicker } from './components/NoticeTicker';
import { HomePage } from './components/HomePage';
import { UserDashboard } from './components/UserDashboard';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { TermsModal } from './components/TermsModal';
import { RoiCalculator } from './components/RoiCalculator';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { GoogleDriveExplorerModal } from './components/GoogleDriveExplorerModal';
import { initialSystemSettings } from './services/initialData';
import { auth, signOutFromFirebase } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
// Firebase থেকে Refresh এ আনার জন্য
import { fetchSettingsFromFirestore } from './services/firestoreSync';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(initialSystemSettings);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [monthlyDeposits, setMonthlyDeposits] = useState<MonthlyDeposit[]>([]);
  const [lumpsumDeposits, setLumpsumDeposits] = useState<LumpsumDeposit[]>([]);
  const [lands, setLands] = useState<LandInvestment[]>([]);
  const [directors, setDirectors] = useState<Director[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showGlobalDriveModal, setShowGlobalDriveModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setCurrentTab('admin');
    }
  }, []);

  const safeFetch = async (url: string) => {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  };

  const fetchAppData = useCallback(async () => {
    try {
      const [
        settingsRes,
        statsRes,
        membersRes,
        monthlyRes,
        lumpsumRes,
        landsRes,
        directorsRes,
        galleryRes,
        notifRes,
      ] = await Promise.all([
        safeFetch('/api/settings'),
        safeFetch('/api/stats'),
        safeFetch('/api/members'),
        safeFetch('/api/deposits/monthly'),
        safeFetch('/api/deposits/lumpsum'),
        safeFetch('/api/lands'),
        safeFetch('/api/directors'),
        safeFetch('/api/gallery'),
        safeFetch(`/api/notifications${currentUser? `?member_id=${currentUser.member_id}` : ''}`),
      ]);

      // 1. Settings - API না পেলে Firebase থেকে আনবে (Refresh দিলে আসবে)
      if (settingsRes?.success && settingsRes.settings) {
        setSettings(settingsRes.settings);
      } else {
        const fbSettings = await fetchSettingsFromFirestore();
        if (fbSettings) setSettings(fbSettings);
      }

      if (statsRes?.success && statsRes.stats) setStats(statsRes.stats);

      // 2. Members - API না পেলে Firebase থেকে আনবে
      if (membersRes?.success && membersRes.members) {
        setMembers(membersRes.members);
        if (currentUser) {
          const freshUser = membersRes.members.find((m: Member) => m.member_id === currentUser.member_id);
          if (freshUser) {
            setCurrentUser(freshUser);
            localStorage.setItem('bob_logged_user', JSON.stringify(freshUser));
          }
        }
      } else {
        try {
          const snap = await getDocs(collection(db, 'members'));
          const fbMembers = snap.docs.map(d => d.data() as Member);
          if(fbMembers.length > 0) setMembers(fbMembers);
        } catch(e) {}
      }

      if (monthlyRes?.success && monthlyRes.deposits) setMonthlyDeposits(monthlyRes.deposits);
      if (lumpsumRes?.success && lumpsumRes.deposits) setLumpsumDeposits(lumpsumRes.deposits);
      if (landsRes?.success && landsRes.lands) setLands(landsRes.lands);
      if (directorsRes?.success && directorsRes.directors) setDirectors(directorsRes.directors);
      if (galleryRes?.success && galleryRes.gallery) setGallery(galleryRes.gallery);
      if (notifRes?.success && notifRes.notifications) setNotifications(notifRes.notifications);
    } catch (err) {
      console.error('Error fetching app data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const cached = localStorage.getItem('bob_logged_user');
    if (cached) {
      try {
        const user = JSON.parse(cached);
        setCurrentUser(user);
        if (!user.has_accepted_terms) setShowTermsModal(true);
      } catch (e) {
        localStorage.removeItem('bob_logged_user');
      }
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email &&!localStorage.getItem('bob_logged_user')) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: firebaseUser.email,
              googleAuth: true,
              full_name: firebaseUser.displayName || 'Google Member',
              avatar_url: firebaseUser.photoURL || undefined,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.member) {
            setCurrentUser(data.member);
            localStorage.setItem('bob_logged_user', JSON.stringify(data.member));
          }
        } catch (e) {
          console.error('Firebase Auth sync error:', e);
        }
      }
    });
    fetchAppData();
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (member: Member) => {
    setCurrentUser(member);
    localStorage.setItem('bob_logged_user', JSON.stringify(member));
    if (!member.has_accepted_terms) setShowTermsModal(true);
    if (member.role === 'Admin') setCurrentTab('admin');
    else setCurrentTab('dashboard');
    fetchAppData();
  };

  const handleLogout = async () => {
    try { await signOutFromFirebase(); } catch (e) {}
    setCurrentUser(null);
    localStorage.removeItem('bob_logged_user');
    setCurrentTab('home');
  };

  const handleTermsAccepted = () => {
    if (currentUser) {
      const updated = {...currentUser, has_accepted_terms: true };
      setCurrentUser(updated);
      localStorage.setItem('bob_logged_user', JSON.stringify(updated));
    }
    setShowTermsModal(false);
  };

  const handleNavigateTab = (tab: string) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pendingCount = (stats?.pending_monthly_deposits || 0) + (stats?.pending_lumpsum_deposits || 0);
  const unreadNotificationsCount = notifications.filter((n) => currentUser && (!n.read_by ||!n.read_by.includes(currentUser.member_id))).length;

  const handleMarkNotificationRead = async (id: string) => {
    if (!currentUser) return;
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: id, member_id: currentUser.member_id }),
      });
      setNotifications((prev) => prev.map((n) => n.id === id? {...n, read_by: [...(n.read_by || []), currentUser.member_id] } : n));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} settings={settings} />}
      <Header currentTab={currentTab} setCurrentTab={handleNavigateTab} currentUser={currentUser} onOpenAuth={() => setShowAuthModal(true)} onLogout={handleLogout} settings={settings} pendingApprovalsCount={pendingCount} unreadNotificationsCount={unreadNotificationsCount} onOpenNotifications={() => setShowNotificationCenter(true)} onOpenGoogleDrive={() => setShowGlobalDriveModal(true)} />
      <NoticeTicker notice={settings?.notice_bengali || ''} />
      <main className="flex-1">
        {currentTab === 'home' && <HomePage settings={settings} stats={stats} lands={lands} directors={directors} gallery={gallery} currentUser={currentUser} onOpenAuth={() => setShowAuthModal(true)} onNavigateTab={handleNavigateTab} onRefreshData={fetchAppData} />}
        {currentTab === 'projects' && <div className="py-12"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center font-bengali"><span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-2 inline-block">Investment Portfolio</span><h1 className="text-3xl sm:text-4xl font-black text-white">আমাদের চলমান ভূমি প্রকল্পসমূহ</h1></div><HomePage settings={settings} stats={stats} lands={lands} directors={directors} gallery={gallery} currentUser={currentUser} onOpenAuth={() => setShowAuthModal(true)} onNavigateTab={handleNavigateTab} /></div>}
        {currentTab === 'calculator' && <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><RoiCalculator lands={lands} onBookShare={(land) => { if (currentUser) handleNavigateTab('dashboard'); else setShowAuthModal(true); }} /></div>}
        {currentTab === 'directors' && <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-bengali"><div className="text-center max-w-2xl mx-auto mb-12 space-y-3"><h1 className="text-3xl sm:text-4xl font-black text-white">দায়িত্বপ্রাপ্ত পরিচালনা কমিটি</h1></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{directors.map((dir) => (<div key={dir.director_id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-xl flex flex-col justify-between space-y-4"><div><div className="relative w-28 h-28 mx-auto mb-4"><img src={dir.photo_url} alt={dir.name} className="w-full h-full rounded-2xl object-cover border-2 border-emerald-500/60 shadow-lg" /></div><h3 className="text-xl font-bold text-white mb-1">{dir.name}</h3><p className="text-xs text-emerald-400 font-semibold mb-3">{dir.designation}</p><p className="text-xs text-slate-400 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800">"{dir.message}"</p></div></div>))}</div></div>}
        {currentTab === 'gallery' && <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-bengali"><div className="text-center max-w-2xl mx-auto mb-12 space-y-3"><h1 className="text-3xl sm:text-4xl font-black text-white">সরেজমিন পরিদর্শন ও কার্যক্রমের আলোকচিত্র</h1></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{gallery.map((item) => (<div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"><div className="relative h-60 overflow-hidden"><img src={item.image_url} alt={item.title} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80"></div><div className="absolute bottom-3 left-3 right-3 text-white"><h4 className="text-sm font-bold leading-snug">{item.title}</h4></div></div></div>))}</div></div>}
        {currentTab === 'dashboard' && (currentUser? <UserDashboard currentUser={currentUser} monthlyDeposits={monthlyDeposits} lumpsumDeposits={lumpsumDeposits} lands={lands} settings={settings} notifications={notifications} onOpenNotifications={() => setShowNotificationCenter(true)} onRefreshData={fetchAppData} /> : <div className="max-w-md mx-auto px-4 py-20 text-center font-bengali"><div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-4 text-2xl"><i className="fa-solid fa-user-lock"></i></div><h2 className="text-2xl font-bold text-white mb-2">ড্যাশবোর্ডে প্রবেশের জন্য লগইন করুন</h2><button onClick={() => setShowAuthModal(true)} className="cursor-pointer px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition inline-flex items-center gap-2"><span>লগইন করুন</span></button></div>)}
        {currentTab === 'admin' && <AdminPanel currentUser={currentUser} stats={stats} settings={settings} members={members} monthlyDeposits={monthlyDeposits} lumpsumDeposits={lumpsumDeposits} lands={lands} directors={directors} onRefreshData={fetchAppData} onOpenAuth={() => setShowAuthModal(true)} />}
      </main>
      <Footer settings={settings} onNavigate={handleNavigateTab} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} settings={settings} />
      {showTermsModal && currentUser && <TermsModal member={currentUser} onAccept={handleTermsAccepted} onClose={() => setShowTermsModal(false)} />}
      <NotificationCenterModal isOpen={showNotificationCenter} onClose={() => setShowNotificationCenter(false)} notifications={notifications} currentMemberId={currentUser?.member_id} onMarkRead={handleMarkNotificationRead} onNavigateTab={handleNavigateTab} />
      <GoogleDriveExplorerModal isOpen={showGlobalDriveModal} onClose={() => setShowGlobalDriveModal(false)} />
    </div>
  );
}
