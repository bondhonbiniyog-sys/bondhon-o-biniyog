import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { Footer } from './components/Footer';

function App() {
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>({ total_capital: 0, total_monthly_capital: 0, total_lumpsum_capital: 0, capital_percentage: 0, target_amount: 10000000 });
  const [lands, setLands] = useState<any[]>([]);
  const [directors, setDirectors] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState('home');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAppData = useCallback(async () => {
    try {
      const tryFetch = async (names: string[]) => {
        for (let name of names) {
          try {
            const snap = await getDocs(collection(db, name));
            if (!snap.empty) return snap.docs.map(d => ({ id: d.id,...d.data() }));
          } catch {}
        }
        return [];
      };
      const landsData = await tryFetch(['lands', 'land_investments', 'landInvestments', 'projects']);
      const directorsData = await tryFetch(['board_members', 'directors', 'team', 'BoardMembers']);
      const galleryData = await tryFetch(['gallery', 'gallery_items', 'Gallery']);

      setLands(landsData);
      setDirectors(directorsData);
      setGallery(galleryData);

      try {
        const sSnap = await getDocs(collection(db, 'settings'));
        if (!sSnap.empty) {
          const s = sSnap.docs[0].data();
          setSettings(s);
          if (s.total_capital) {
            setStats((prev: any) => ({...prev, total_capital: s.total_capital }));
          }
        }
      } catch {}

      if (landsData.length > 0) {
        const total = landsData.reduce((sum: number, l: any) => sum + (l.sold_shares || 0) * (l.share_price || 50000), 0);
        if (total > 0) setStats((p: any) => ({...p, total_capital: total, capital_percentage: 15 }));
      }

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppData(); }, [fetchAppData]);

  // FIX: Tab change হলে Scroll করবে
  useEffect(() => {
    if (currentTab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const map: any = {
      projects: 'projects-section',
      calculator: 'roi-section',
      directors: 'directors-section',
      gallery: 'gallery-section',
    };
    const targetId = map[currentTab];
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [currentTab]);

  const handleOpenAuth = () => setShowAuth(true);
  const handleLogout = () => { setCurrentUser(null); setCurrentTab('home'); };
  const handleNavigateTab = (tab: string) => setCurrentTab(tab);

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">লোড হচ্ছে...</div>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        settings={settings}
        pendingApprovalsCount={0}
        unreadNotificationsCount={0}
        onOpenNotifications={() => {}}
        onOpenGoogleDrive={() => window.open('https://drive.google.com', '_blank')}
      />

      <main className="flex-grow">
        <HomePage
          settings={settings}
          stats={stats}
          lands={lands}
          directors={directors}
          gallery={gallery}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onNavigateTab={handleNavigateTab}
          onRefreshData={fetchAppData}
        />
        {/* ROI calculator anchor for Header */}
        <div id="roi-section"></div>
        <div id="directors-section"></div>
        <div id="gallery-section"></div>
      </main>

      <Footer settings={settings} />

      {showAuth && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-2 text-center">লগইন / নিবন্ধন</h3>
            <p className="text-sm text-slate-400 mb-6 text-center">আপনার Firebase Auth ঠিক আছে। এখানে আপনার আসল Login Form বসবে।</p>

            <div className="space-y-3">
              <input placeholder="মোবাইল / ইমেইল" className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
              <input placeholder="পাসওয়ার্ড" type="password" className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
              <button
                onClick={() => {
                  setCurrentUser({ full_name: 'ডেমো সদস্য', member_id: 'BoB-001', avatar_url: '', role: 'Member' });
                  setShowAuth(false);
                  setCurrentTab('dashboard');
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
              >
                ডেমো লগইন (টেস্ট)
              </button>
              <button onClick={() => setShowAuth(false)} className="w-full py-2 rounded-xl bg-slate-700 text-white text-sm">বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
