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

      // 1. Settings
      if (settingsRes?.success && settingsRes.settings) {
        setSettings(settingsRes.settings);
      } else {
        const fbSettings = await fetchSettingsFromFirestore();
        if (fbSettings) setSettings(fbSettings);
      }

      if (statsRes?.success && statsRes.stats) setStats(statsRes.stats);

      // 2. Members - Firebase Fallback
      if (membersRes?.success && membersRes.members) {
        setMembers(membersRes.members);
      } else {
        try {
          const snap = await getDocs(collection(db, 'members'));
          const fbMembers = snap.docs.map(d => d.data() as Member);
          if(fbMembers.length > 0) {
            setMembers(fbMembers);
            // Auto stats বানানো
            setStats(prev => ({
              total_amount_collected: fbMembers.reduce((s,m) => s + (m.total_paid || 0), 0),
              total_members: fbMembers.length,
              active_members: fbMembers.length,
              total_pending: 0,
              pending_monthly_deposits: 0,
              pending_lumpsum_deposits: 0,
             ...(prev || {})
            } as any));
          }
        } catch(e) { console.log('members fetch error', e) }
      }

      // 3. Monthly Deposits - Firebase Fallback
      if (monthlyRes?.success && monthlyRes.deposits) {
        setMonthlyDeposits(monthlyRes.deposits);
      } else {
        try {
          const snap = await getDocs(collection(db, 'monthly_deposits'));
          setMonthlyDeposits(snap.docs.map(d => d.data() as MonthlyDeposit));
        } catch(e) {}
      }

      // 4. Lumpsum - Firebase Fallback
      if (lumpsumRes?.success && lumpsumRes.deposits) {
        setLumpsumDeposits(lumpsumRes.deposits);
      } else {
        try {
          const snap = await getDocs(collection(db, 'lumpsum_deposits'));
          setLumpsumDeposits(snap.docs.map(d => d.data() as LumpsumDeposit));
        } catch(e) {}
      }

      if (landsRes?.success && landsRes.lands) setLands(landsRes.lands);
      else {
        try {
          const snap = await getDocs(collection(db, 'lands'));
          setLands(snap.docs.map(d => d.data() as LandInvestment));
        } catch(e) {}
      }

      if (directorsRes?.success && directorsRes.directors) setDirectors(directorsRes.directors);
      if (galleryRes?.success && galleryRes.gallery) setGallery(galleryRes.gallery);
      if (notifRes?.success && notifRes.notifications) setNotifications(notifRes.notifications);

    } catch (err) {
      console.error('Error fetching app data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
export default App;
