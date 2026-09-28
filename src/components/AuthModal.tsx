import React, { useState } from 'react';
import type { Member, SystemSettings } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';
import { signInWithGoogle, db } from '../firebase';
import { collection, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (member: Member) => void;
  settings?: SystemSettings | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, settings }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('admin@bob.com');
  const [loginPassword, setLoginPassword] = useState('Admin@123');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regMonthlyTarget, setRegMonthlyTarget] = useState('1000');
  const [livePhotoUrl, setLivePhotoUrl] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // ✅ FIX: Login - Direct Firestore
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(''); setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'members'));
      const members = snap.docs.map(d => d.data() as Member);

      // Default admin bypass for first time
      if (loginEmail === 'admin@bob.com' && loginPassword === 'Admin@123') {
        let admin = members.find(m => m.email === 'admin@bob.com');
        if (!admin) {
          admin = {
            member_id: 'ADMIN-001', full_name: 'System Admin', email: 'admin@bob.com',
            role: 'Admin', phone: '01700000000', has_accepted_terms: true,
            status: 'Approved', join_date: new Date().toISOString(),
          } as any;
        }
        onLoginSuccess(admin); onClose(); return;
      }

      const member = members.find(m => m.email?.toLowerCase() === loginEmail.toLowerCase());
      if (!member) throw new Error('এই ইমেইলে কোনো সদস্য পাওয়া যায়নি!');

      // @ts-ignore check password if exists
      if (member.password && member.password!== loginPassword) throw new Error('পাসওয়ার্ড ভুল!');

      onLoginSuccess(member); onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি');
    } finally { setIsLoading(false); }
  };

  // ✅ FIX: Register - Direct Firestore
  const handleRegister = async (e) => {
  e.preventDefault();
  if(Number(regMonthlyTarget) < 1000){
    alert('সর্বনিম্ন ১০০০ টাকা');
    return;
  }
  setIsLoading(true);
  // ... বাকি Code
    try {
      const newMember = {
        member_id: `BOB-${Date.now()}`,
        full_name: regFullName, email: regEmail, phone: regPhone,
        password: regPassword, monthly_target: Number(regMonthlyTarget),
        live_photo_url: livePhotoUrl, role: 'Member', status: 'Pending',
        has_accepted_terms: false, join_date: new Date().toISOString(),
      };
      await setDoc(doc(db, 'members', newMember.member_id), newMember);
      setSuccessMessage('আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! পেন্ডিং অবস্থায় আছে।');
      setTimeout(() => { onLoginSuccess(newMember as any); onClose(); }, 1200);
    } catch (err: any) {
      setErrorMessage('নিবন্ধন ব্যর্থ: ' + err.message);
    } finally { setIsLoading(false); }
  };

  // ✅ FIX: Google Auth - Direct Firestore
  const handleGoogleAuth = async () => {
    setIsLoading(true); setErrorMessage('');
    try {
      const cred = await signInWithGoogle();
      const gUser = cred.user;
      if (!gUser.email) throw new Error('Google Email পাওয়া যায়নি');

      const snap = await getDocs(collection(db, 'members'));
      const members = snap.docs.map(d => d.data() as Member);
      let member = members.find(m => m.email === gUser.email);

      if (!member) {
        const newM = {
          member_id: `BOB-${Date.now()}`, full_name: gUser.displayName || 'Google Member',
          email: gUser.email, phone: gUser.phoneNumber || '', role: 'Member',
          status: 'Pending', has_accepted_terms: false, join_date: new Date().toISOString(),
          avatar_url: gUser.photoURL || '',
        };
        await setDoc(doc(db, 'members', newM.member_id), newM);
        member = newM as any;
      }
      onLoginSuccess(member); onClose();
    } catch (err: any) {
      if (err.code!== 'auth/popup-closed-by-user') setErrorMessage(err.message);
    } finally { setIsLoading(false); }
  };

  const fillDemo = (email: string, pass: string) => { setLoginEmail(email); setLoginPassword(pass); setErrorMessage(''); };
  const logoSrc = settings?.logo_url || '/bob-logo.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2"><i className="fa-solid fa-xmark"></i></button>
        <div className="p-6 border-b border-slate-800 text-center">
          <div className="w-16 h-16 rounded-2xl p-1 bg-white/10 border-2 border-amber-400/40 mx-auto mb-3 flex items-center justify-center overflow-hidden">
            <img src={logoSrc} alt="BoB" className="w-full h-full object-contain" onError={(e:any)=>e.target.src='/bob-logo.png'} />
          </div>
          <h2 className="text-xl font-bold text-white font-bengali">{settings?.project_title || 'বন্ধন ও বিনিয়োগ'}</h2>
          <div className="flex rounded-xl bg-slate-950 p-1 mt-5 border border-slate-800">
            <button onClick={()=>setActiveTab('login')} className={`flex-1 py-2 text-xs font-semibold rounded-lg ${activeTab==='login'?'bg-blue-600 text-white':'text-slate-400'}`}>লগইন করুন</button>
            <button onClick={()=>setActiveTab('register')} className={`flex-1 py-2 text-xs font-semibold rounded-lg ${activeTab==='register'?'bg-emerald-600 text-white':'text-slate-400'}`}>নতুন নিবন্ধন</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {errorMessage && <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs">{errorMessage}</div>}
          {successMessage && <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs">{successMessage}</div>}

          {activeTab==='login'?(
            <form onSubmit={handleLogin} className="space-y-4 font-bengali">
              <input type="email" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="admin@bob.com" className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
              <input type="password" required value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
              <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm">{isLoading?'লগইন হচ্ছে...':'লগইন করুন'}</button>
              <button type="button" onClick={handleGoogleAuth} className="w-full py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-xs flex items-center justify-center gap-2"><span>Google দিয়ে সাইন-ইন</span></button>
              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800">
                <button type="button" onClick={()=>fillDemo('admin@bob.com','Admin@123')} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">অ্যাডমিন আইডি</button>
                <button type="button" onClick={()=>fillDemo('sajib@bob.com','member123')} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">সক্রিয় সদস্য</button>
              </div>
            </form>
          ):(
            <form onSubmit={handleRegister} className="space-y-3 font-bengali">
              <input type="text" required value={regFullName} onChange={e=>setRegFullName(e.target.value)} placeholder="পূর্ণ নাম" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
              <input type="tel" required value={regPhone} onChange={e=>setRegPhone(e.target.value)} placeholder="+880 1712-000000" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
              <input type="email" required value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="name@example.com" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
              <input type="password" required value={regPassword} onChange={e=>setRegPassword(e.target.value)} placeholder="পাসওয়ার্ড" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
              <input type="number" min="1000" required value={regMonthlyTarget} onChange={e=>setRegMonthlyTarget(e.target.value)} placeholder="মাসিক টার্গেট" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm" />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm">{isLoading?'প্রসেসিং...':'আবেদন দাখিল করুন'}</button>
            </form>
          )}
        </div>
      </div>
      <CameraCaptureModal isOpen={isCameraOpen} onClose={()=>setIsCameraOpen(false)} onCapture={(p)=>{setLivePhotoUrl(p); setIsCameraOpen(false);}} />
    </div>
  );
};
