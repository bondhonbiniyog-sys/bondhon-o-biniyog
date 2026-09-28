import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import Header from './components/Header';
import HomePage from './components/HomePage';
import Footer from './components/Footer';

function App() {
  const [settings, setSettings] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [lands, setLands] = useState<any[]>([]);
  const [directors, setDirectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const safeFetch = async (url: string) => {
    try { const r = await fetch(url); if(!r.ok) return null; return await r.json(); } catch { return null; }
  };

  const fetchAppData = useCallback(async () => {
    try {
      const [sRes, mRes, lRes, dRes] = await Promise.all([
        safeFetch('/api/settings'),
        safeFetch('/api/members'),
        safeFetch('/api/lands'),
        safeFetch('/api/directors'),
      ]);
      if(sRes?.settings) setSettings(sRes.settings);
      if(mRes?.members) setMembers(mRes.members);
      else { const snap = await getDocs(collection(db, 'members')); setMembers(snap.docs.map(d=>d.data())); }
      if(lRes?.lands) setLands(lRes.lands);
      else { try { const snap = await getDocs(collection(db, 'lands')); setLands(snap.docs.map(d=>d.data())); } catch {} }
      if(dRes?.directors) setDirectors(dRes.directors);
      else { try { const snap = await getDocs(collection(db, 'board_members')); setDirectors(snap.docs.map(d=>d.data())); } catch {} }
    } finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchAppData(); }, [fetchAppData]);

  if(loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">লোড হচ্ছে...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header settings={settings} />
      <main className="flex-grow">
        <HomePage settings={settings} members={members} lands={lands} directors={directors} />
      </main>
      <Footer settings={settings} />
    </div>
  );
}
export default App;
