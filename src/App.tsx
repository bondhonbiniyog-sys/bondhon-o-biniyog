import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [monthlyDeposits, setMonthlyDeposits] = useState<any[]>([]);
  const [lumpsumDeposits, setLumpsumDeposits] = useState<any[]>([]);
  const [lands, setLands] = useState<any[]>([]);
  const [directors, setDirectors] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const safeFetch = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
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

      if (settingsRes?.success && settingsRes.settings) setSettings(settingsRes.settings);
      if (statsRes?.success && statsRes.stats) setStats(statsRes.stats);
      if (membersRes?.success && membersRes.members) setMembers(membersRes.members);
      else {
        try {
          const snap = await getDocs(collection(db, 'members'));
          const fbMembers = snap.docs.map(d => d.data());
          if(fbMembers.length > 0) setMembers(fbMembers);
        } catch(e) {}
      }

      if (monthlyRes?.success && monthlyRes.deposits) setMonthlyDeposits(monthlyRes.deposits);
      else {
        try {
          const snap = await getDocs(collection(db, 'monthly_deposits'));
          setMonthlyDeposits(snap.docs.map(d => d.data()));
        } catch(e) {}
      }

      if (lumpsumRes?.success && lumpsumRes.deposits) setLumpsumDeposits(lumpsumRes.deposits);
      else {
        try {
          const snap = await getDocs(collection(db, 'lumpsum_deposits'));
          setLumpsumDeposits(snap.docs.map(d => d.data()));
        } catch(e) {}
      }

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
    fetchAppData();
  }, [fetchAppData]);

  if (loading) {
    return <div style={{minHeight:'100vh', background:'#111', color:'white', display:'flex', alignItems:'center', justifyContent:'center'}}>লোড হচ্ছে...</div>;
  }

  return (
    <div style={{minHeight:'100vh', background:'#f5f5f5', padding:'20px'}}>
      <h1 style={{fontSize:'24px', fontWeight:'bold'}}>BONDHON O BINIYOG - ঠিক হয়ে গেছে!</h1>
      <p>Members: {members.length}</p>
      <p>Settings loaded: {settings? 'Yes' : 'No'}</p>
      <button onClick={fetchAppData} style={{marginTop:'10px', padding:'10px', background:'black', color:'white'}}>Reload Data</button>
    </div>
  );
}

export default App;
