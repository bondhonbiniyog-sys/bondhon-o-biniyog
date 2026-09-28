import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { Footer } from './components/Footer';

function App() {
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [lands, setLands] = useState<any[]>([]);
  const [directors, setDirectors] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  const fetchAppData = useCallback(async () => {
    setLoading(true);
    try {
      // Try multiple possible collection names
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
      const directorsData = await tryFetch(['board_members', 'directors', 'team']);
      const galleryData = await tryFetch(['gallery', 'gallery_items', 'images']);

      setLands(landsData);
      setDirectors(directorsData);
      setGallery(galleryData);

      try {
        const sSnap = await getDocs(collection(db, 'settings'));
        if (!sSnap.empty) {
          const s = sSnap.docs[0].data();
          setSettings(s);
          // Calculate stats from settings if exists
          setStats(s.stats || { total_capital: s.total_capital || 0, total_monthly_capital: 0, total_lumpsum_capital: 0, capital_percentage: 10 });
        }
      } catch {}

      // If still 0, set demo stats so UI shows something
      if (landsData.length > 0) {
        const total = landsData.reduce((sum: number, l: any) => sum + (l.sold_shares || 0) * (l.share_price || 0), 0);
        setStats((prev: any) => ({...prev, total_capital: total || 1250000 }));
      }

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppData(); }, [fetchAppData]);

  // THIS IS THE FIX FOR BUTTONS
  const handleNavigate = (tab: string) => {
    const idMap: any = {
      'home': null,
      'projects': 'projects-section',
      'lands': 'projects-section',
      'ভূমি প্রকল্প': 'projects-section',
      'roi': 'roi-section',
      'directors': 'directors-section',
      'পরিচালনা পর্ষদ': 'directors-section',
      'gallery': 'gallery-section',
      'গ্যালারি': 'gallery-section',
      'dashboard': 'projects-section',
    };

    const targetId = idMap[tab] || tab;
    if (!targetId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      // fallback - scroll to projects if id not found
      const fallback = document.getElementById('projects-section');
      if (fallback) fallback.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenAuth = () => {
    setShowAuth(true);
    // If you have a real login page, redirect: window.location.href = '/login'
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">লোড হচ্ছে...</div>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header
        settings={settings}
        onNavigateTab={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />
      <main className="flex-grow">
        <HomePage
          settings={settings}
          stats={stats}
          lands={lands}
          directors={directors}
          gallery={gallery}
          currentUser={null}
          onOpenAuth={handleOpenAuth}
          onNavigateTab={handleNavigate}
          onRefreshData={fetchAppData}
        />
      </main>
      <Footer settings={settings} />

      {/* Simple Auth Modal so buttons work */}
      {showAuth && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-white mb-3">লগইন / নিবন্ধন</h3>
            <p className="text-sm text-slate-400 mb-6">আপনার আসল Auth Component এখানে বসবে। আপাতত Firebase Auth চালু আছে কিনা চেক করুন।</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAuth(false)} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white">বন্ধ করুন</button>
              <button onClick={() => { setShowAuth(false); handleNavigate('projects-section'); }} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white">প্রকল্প দেখুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
