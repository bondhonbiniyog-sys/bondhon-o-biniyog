import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Member, SystemSettings } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';
import { signInWithGoogle } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (member: Member) => void;
  settings?: SystemSettings | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, settings }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে সঠিক তথ্য দিন।');
        return;
      }

      onLoginSuccess(data.member);
      onClose();
    } catch (err: any) {
      setErrorMessage('সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (Number(regMonthlyTarget) < 1000) {
      setErrorMessage('মাসিক সঞ্চয় টার্গেট সর্বনিম্ন ১,০০০ টাকা হতে হবে।');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regFullName,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
          monthly_target: Math.max(1000, Number(regMonthlyTarget)),
          live_photo_url: livePhotoUrl || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'নিবন্ধন প্রক্রিয়া সম্পন্ন করা সম্ভব হয়নি');
        return;
      }

      setSuccessMessage('আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! অ্যাকাউন্টটি বর্তমানে পেন্ডিং অবস্থায় আছে।');
      setTimeout(() => {
        onLoginSuccess(data.member);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage('সার্ভারের সাথে সংযোগ ত্রুটি');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Firebase Auth
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const user = await signInWithGoogle();
      if (!user || !user.email) {
        throw new Error('Google অ্যাকাউন্ট থেকে কোনো ইমেইল পাওয়া যায়নি।');
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          googleAuth: true,
          full_name: user.displayName || 'Google Member',
          avatar_url: user.photoURL || undefined,
          phone: user.phoneNumber || '+880 1712-345678',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.member) {
        onLoginSuccess(data.member);
        onClose();
      } else {
        setErrorMessage(data.message || 'গুগল সাইন-ইন সম্পন্ন করা যায়নি');
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'গুগল সাইন-ইন প্রক্রিয়া ব্যর্থ হয়েছে');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick demo credentials loader
  const fillDemoCredentials = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setErrorMessage('');
  };

  const logoSrc = settings?.logo_url || '/bob-logo.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="cursor-pointer absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {/* Modal Top Header with Official Logo */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 text-center">
          <div className="w-16 h-16 rounded-2xl p-1 bg-white/10 border-2 border-amber-400/40 mx-auto mb-3 shadow-xl flex items-center justify-center overflow-hidden">
            <img
              src={logoSrc}
              alt="BoB Official Logo"
              className="w-full h-full object-contain rounded-xl"
              onError={(e: any) => {
                e.target.src = '/bob-logo.png';
              }}
            />
          </div>
          <h2 className="text-xl font-bold text-white font-bengali">
            {settings?.project_title || 'বন্ধন ও বিনিয়োগ'}
          </h2>
          <p className="text-xs text-amber-400 font-bengali font-semibold">
            {settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ'}
          </p>

          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-950 p-1 mt-5 border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
              }}
              className={`cursor-pointer flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all font-bengali ${
                activeTab === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-right-to-bracket mr-1.5"></i>
              লগইন করুন
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
              }}
              className={`cursor-pointer flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all font-bengali ${
                activeTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-user-plus mr-1.5"></i>
              নতুন সদস্য নিবন্ধন
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 font-bengali">
              <i className="fa-solid fa-triangle-exclamation text-red-400 text-sm"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 font-bengali">
              <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 font-bengali">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ইমেইল ঠিকানা (Email)
                </label>
                <div className="relative">
                  <i className="fa-regular fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="member@bob.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-english"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  পাসওয়ার্ড (Password)
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-english"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    <span>লগইন হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>লগইন করুন</span>
                  </>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-slate-500 text-[11px]">অথবা</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="cursor-pointer w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition flex items-center justify-center gap-2.5 shadow-md shadow-white/5 border border-slate-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google একাউন্ট দিয়ে সরাসরি সাইন-ইন</span>
              </button>

              {/* Fast Demo One-Click Accounts */}
              <div className="pt-3 border-t border-slate-800">
                <p className="text-[11px] text-slate-400 text-center mb-2.5">
                  সরাসরি টেস্ট করার জন্য ডেমো অ্যাকাউন্ট নির্বাচন করুন:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('admin@bob.com', 'admin123')}
                    className="cursor-pointer p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-left"
                  >
                    <i className="fa-solid fa-shield-halved text-amber-400"></i>
                    <div>
                      <div className="font-bold">অ্যাডমিন আইডি</div>
                      <div className="text-[10px] text-amber-400/80">সজিব মোল্লা</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('sajib@bob.com', 'member123')}
                    className="cursor-pointer p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-left"
                  >
                    <i className="fa-solid fa-user-check text-emerald-400"></i>
                    <div>
                      <div className="font-bold">সক্রিয় সদস্য</div>
                      <div className="text-[10px] text-emerald-400/80">সজিব (সদস্য)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('tanvir@bob.com', 'member123')}
                    className="cursor-pointer p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 flex items-center gap-2 text-left"
                  >
                    <i className="fa-solid fa-user text-blue-400"></i>
                    <div>
                      <div className="font-bold">সদস্য তানভীর</div>
                      <div className="text-[10px] text-blue-400/80">BoB-002</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('rahim@bob.com', 'member123')}
                    className="cursor-pointer p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center gap-2 text-left"
                  >
                    <i className="fa-solid fa-user-clock text-purple-400"></i>
                    <div>
                      <div className="font-bold">পেন্ডিং সদস্য</div>
                      <div className="text-[10px] text-purple-400/80">রহিম (অপেক্ষমাণ)</div>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 font-bengali">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  পূর্ণ নাম (Full Name)
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="যেমন: মোঃ কামরুল ইসলাম"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  মোবাইল নম্বর (Phone)
                </label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+880 1712-000000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none font-english"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ইমেইল ঠিকানা (Email)
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none font-english"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    পাসওয়ার্ড
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none font-english"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      মাসিক সঞ্চয় টার্গেট (৳)
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold">
                      সর্বনিম্ন ১,০০০ টাকা
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={regMonthlyTarget}
                    onChange={(e) => setRegMonthlyTarget(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none font-num"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['1000', '2000', '3000', '5000', '10000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRegMonthlyTarget(amt)}
                        className={`cursor-pointer px-2 py-0.5 rounded text-[10px] font-num transition ${
                          regMonthlyTarget === amt
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ৳ {amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Camera Snapshot Section */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <i className="fa-solid fa-camera text-emerald-400"></i>
                    <span>সদস্য প্রোফাইল ছবি (লাইভ ক্যামেরা)</span>
                  </label>
                  <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ঐচ্ছিক / সুবিধাজনক
                  </span>
                </div>

                {livePhotoUrl ? (
                  <div className="flex items-center gap-3 bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/40">
                    <img
                      src={livePhotoUrl}
                      alt="Captured member photo"
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400 shadow-md shadow-emerald-500/20"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <i className="fa-solid fa-circle-check text-emerald-400"></i>
                        লাইভ ছবি ক্যাপচার সম্পন্ন!
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        প্রোফাইল ও ডিজিটাল সনদে এই ছবি ব্যবহৃত হবে।
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="cursor-pointer text-[11px] text-blue-400 hover:text-blue-300 underline mt-1"
                      >
                        ছবি পরিবর্তন করতে পুনরায় তুলুন
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLivePhotoUrl('')}
                      className="cursor-pointer text-slate-400 hover:text-red-400 p-1 text-xs"
                      title="ছবি মুছুন"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="cursor-pointer flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <i className="fa-solid fa-camera"></i>
                      <span>Take Photo via Live Camera</span>
                    </button>
                    <label className="cursor-pointer py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5">
                      <i className="fa-solid fa-upload"></i>
                      <span>ফাইল আপলোড</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setLivePhotoUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <i className="fa-solid fa-shield-halved text-amber-400 mr-1.5"></i>
                নিবন্ধন শেষে আপনার আবেদনটি অ্যাডমিন অনুমোদনের জন্য স্বয়ংক্রিয়ভাবে পেন্ডিং তালিকায় যুক্ত হবে।
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    <span>প্রসেসিং হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-plus"></i>
                    <span>সদস্যপদ আবেদন দাখিল করুন</span>
                  </>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-slate-500 text-[11px]">অথবা</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="cursor-pointer w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition flex items-center justify-center gap-2.5 shadow-md shadow-white/5 border border-slate-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google একাউন্ট দিয়ে সরাসরি শুরু করুন</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Live Camera Snapshot Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(photo) => {
          setLivePhotoUrl(photo);
          setIsCameraOpen(false);
        }}
      />
    </div>
  );
};
