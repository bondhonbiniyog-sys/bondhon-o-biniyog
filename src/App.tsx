import React, { useState, useEffect, useCallback } from 'react';
import type {
  SystemSettings, Member, MonthlyDeposit, LumpsumDeposit,
  LandInvestment, Director, GalleryItem, DashboardStats, AppNotification,
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
import {
  initialSystemSettings, initialMembers, initialMonthlyDeposits,
  initialLumpsumDeposits, initialLandInvestments,
} from './services/initialData';
import { auth, db, signOutFromFirebase } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import {
  subscribeToMembers, subscribeToMonthlyDeposits,
  subscribeToLumpsumDeposits, subscribeToSettings,
  seedInitialFirestoreDataIfEmpty,
} from './services/firestoreSync';

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

  // ✅ FIX: API Call বাদ - Direct Firestore থেকে Data
  const fetchAppData = useCallback(async () => {
    try {
      const tryFetch = async (names: string[]) => {
        for (let name of names) {
          try {
            const snap = await getDocs(collection(db, name));
            if (!snap.empty) return snap.docs.map(d => ({ id: d.id,...d.data() } as any));
          } catch {}
        }
        return [];
      };

      const [landsData, directorsData, galleryData, membersData, notifData] = await Promise.all([
        tryFetch(['lands', 'land_investments', 'projects']),
        tryFetch(['board_members', 'directors', 'team']),
        tryFetch(['gallery', 'gallery_items']),
        tryFetch(['members']),
        tryFetch(['notifications']),
      ]);

      setLands(landsData as any);
      setDirectors(directorsData as any);
      setGallery(galleryData as any);
      setMembers(membersData as any);
      setNotifications(notifData as any);

      // Settings
      try {
        const sSnap = await getDocs(collection(db, 'settings'));
        if (!sSnap.empty) setSettings(sSnap.docs[0].data() as SystemSettings);
      } catch {}

      // Stats calculation
      if (membersData.length > 0) {
        setStats({
          total_members: membersData.length,
          pending_monthly_deposits: 0,
          pending_lumpsum_deposits: 0,
          total_capital: landsData.reduce((sum: number, l: any) => sum + (l.sold_shares || 0) * (l.share_price || 50000), 0),
        } as any);
      }

      // Sync current user
      const cached = localStorage.getItem('bob_logged_user');
      if (cached && membersData.length > 0) {
        const parsed = JSON.parse(cached);
        const fresh = (membersData as any).find((m: any) => m.member_id === parsed.member_id);
        if (fresh) {
          setCurrentUser(fresh);
          localStorage.setItem('bob_logged_user', JSON.stringify(fresh));
        }
      }

    } catch (err) {
      console.error('Error fetching app data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/admin') setCurrentTab('admin');

    const cached = localStorage.getItem('bob_logged_user');
    if (cached) {
      try {
        const user = JSON.parse(cached);
        setCurrentUser(user);
        if (!user.has_accepted_terms) setShowTermsModal(true);
      } catch { localStorage.removeItem('bob_logged_user'); }
    }

    // ✅ FIX: Firebase Auth - API POST বাদ, Direct Firestore Lookup
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email &&!localStorage.getItem('bob_logged_user')) {
        try {
          const snap = await getDocs(collection(db, 'members'));
          const member = snap.docs.map(d => d.data() as Member).find(m => m.email === firebaseUser.email);
          if (member) {
            setCurrentUser(member);
            localStorage.setItem('bob_logged_user', JSON.stringify(member));
          }
        } catch (e) { console.error('Firebase Auth sync error:', e); }
      }
    });

    const unsubscribeMembers = subscribeToMembers((liveMembers) => {
      setMembers(liveMembers);
      const curCached = localStorage.getItem('bob_logged_user');
      if (curCached) {
        try {
          const parsed = JSON.parse(curCached);
          const liveCurrent = liveMembers.find((m) => m.member_id === parsed.member_id);
          if (liveCurrent) {
            setCurrentUser(liveCurrent);
            localStorage.setItem('bob_logged_user', JSON.stringify(liveCurrent));
          }
        } catch {}
      }
    });
    const unsubscribeMonthly = subscribeToMonthlyDeposits(setMonthlyDeposits);
    const unsubscribeLumpsum = subscribeToLumpsumDeposits(setLumpsumDeposits);
    const unsubscribeSettings = subscribeToSettings(setSettings);

    fetchAppData();
    // @ts-ignore - old function signature compatibility
    seedInitialFirestoreDataIfEmpty(initialMembers, initialSystemSettings, initialMonthlyDeposits, initialLumpsumDeposits, initialLandInvestments);

    return () => {
      unsubscribeAuth(); unsubscribeMembers(); unsubscribeMonthly();
      unsubscribeLumpsum(); unsubscribeSettings();
    };
  }, [fetchAppData]);

  const handleLoginSuccess = (member: Member) => {
    setCurrentUser(member);
    localStorage.setItem('bob_logged_user', JSON.stringify(member));
    if (!member.has_accepted_terms) setShowTermsModal(true);
    setCurrentTab(member.role === 'Admin'? 'admin' : 'dashboard');
    fetchAppData();
  };

  const handleLogout = async () => {
    try { await signOutFromFirebase(); } catch {}
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
      await updateDoc(doc(db, 'notifications', id), { read_by: arrayUnion(currentUser.member_id) });
      setNotifications((prev) => prev.map((n) => n.id === id? {...n, read_by: [...(n.read_by || []), currentUser.member_id] } : n));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} settings={settings} />}
      <Header
        currentTab={currentTab} setCurrentTab={handleNavigateTab}
        currentUser={currentUser} onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout} settings={settings}
        pendingApprovalsCount={pendingCount}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setShowNotificationCenter(true)}
        onOpenGoogleDrive={() => setShowGlobalDriveModal(true)}
      />
      <NoticeTicker notice={settings?.notice_bengali || ''} />
      <main className="flex-1">
        {currentTab === 'home' && <HomePage settings={settings} stats={stats} lands={lands} directors={directors} gallery={gallery} currentUser={currentUser} onOpenAuth={() => setShowAuthModal(true)} onNavigateTab={handleNavigateTab} onRefreshData={fetchAppData} />}
        {currentTab === 'projects' && <div className="py-12"><HomePage settings={settings} stats={stats} lands={lands} directors={directors} gallery={gallery} currentUser={currentUser} onOpenAuth={() => setShowAuthModal(true)} onNavigateTab={handleNavigateTab} /></div>}
        {currentTab === 'calculator' && <div className="max-w-7xl mx-auto px-4 py-12"><RoiCalculator lands={lands} onBookShare={() => currentUser? handleNavigateTab('dashboard') : setShowAuthModal(true)} /></div>}
        {currentTab === 'directors' && <div className="max-w-7xl mx-auto px-4 py-12"><HomePage settings={settings} stats={stats} lands={lands} directors={directors} gallery={gallery} currentUser={currentUser} onOpenAuth={() => setShowAuthModal(true)} onNavigateTab={handleNavigateTab} /></div>}
        {currentTab === 'gallery' && <div className="max-w-7xl mx-auto px-4 py-12"><HomePage settings={settings} stats={stats} lands={lands} directors={directors} gallery={gallery} currentUser={currentUser} onOpenAuth={() => setShowAuthModal(true)} onNavigateTab={handleNavigateTab} /></div>}
        {currentTab === 'dashboard' && (currentUser? <UserDashboard currentUser={currentUser} monthlyDeposits={monthlyDeposits} lumpsumDeposits={lumpsumDeposits} lands={lands} settings={settings} notifications={notifications} onOpenNotifications={() => setShowNotificationCenter(true)} onRefreshData={fetchAppData} onUpdateUser={setCurrentUser} /> : <div className="max-w-md mx-auto px-4 py-20 text-center"><button onClick={() => setShowAuthModal(true)} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white">লগইন করুন</button></div>)}
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
