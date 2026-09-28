import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { Footer } from './components/Footer';

function App() {
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>({ total_capital: 0, total_monthly_capital: 0, total_lumpsum_capital: 0, capital_percentage: 0 });
  const [lands, setLands] = useState<any[]>([]);
  const [directors, setDirectors] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppData = useCallback(async () => {
    try {
      try { const s = await getDocs(collection(db, 'lands')); setLands(s.docs.map(d=>d.data())); } catch {}
      try { const s = await getDocs(collection(db, 'board_members')); setDirectors(s.docs.map(d=>d.data())); } catch {}
      try { const s = await getDocs(collection(db, 'gallery')); setGallery(s.docs.map(d=>d.data())); } catch {}
      try { const s = await getDocs(collection(db, 'settings')); if(!s.empty) setSettings(s.docs[0].data()); } catch {}
    } finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchAppData(); }, [fetchAppData]);
  if(loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">লোড হচ্ছে...</div>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header settings={settings} />
      <main className="flex-grow">
        <HomePage settings={settings} stats={stats} lands={lands} directors={directors} gallery={gallery} currentUser={null} onOpenAuth={()=>{}} onNavigateTab={()=>{}} onRefreshData={fetchAppData} />
      </main>
      <Footer settings={settings} />
    </div>
  );
}
export default App;
