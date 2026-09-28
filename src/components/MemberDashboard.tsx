import React, { useState, useRef } from 'react';
import type { Member, MonthlyDeposit, LumpsumDeposit, SystemSettings } from '../types';
import { formatTaka, toBengaliDigits } from '../utils/bengaliUtils';

interface Props {
  currentUser: Member;
  monthlyDeposits: MonthlyDeposit[];
  lumpsumDeposits: LumpsumDeposit[];
  settings: SystemSettings | null;
}

export const MemberDashboard: React.FC<Props> = ({ currentUser, monthlyDeposits, lumpsumDeposits, settings }) => {
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [showLumpsumModal, setShowLumpsumModal] = useState(false);
  const [showDueModal, setShowDueModal] = useState(false);
  const paidRef = useRef<HTMLDivElement>(null);
  const lumpsumRef = useRef<HTMLDivElement>(null);
  const dueRef = useRef<HTMLDivElement>(null);

  const myMonthly = monthlyDeposits.filter(d => d.member_id === currentUser.member_id);
  const myPaid = myMonthly.filter(d => d.status === 'Approved');
  const myPending = myMonthly.filter(d => d.status === 'Pending');
  const myDue = myMonthly.filter(d => d.status === 'Due' || d.status === 'Rejected');
  const myLumpsum = lumpsumDeposits.filter(d => d.member_id === currentUser.member_id && d.status === 'Approved');

  const totalPaidAmount = myPaid.reduce((s, d) => s + d.amount, 0);
  const totalLumpsumAmount = myLumpsum.reduce((s, d) => s + d.amount, 0);

  const downloadAsImage = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    // Simple canvas download without extra library
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create image from div via svg
    const data = new XMLSerializer().serializeToString(ref.current);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ref.current.offsetWidth}" height="${ref.current.offsetHeight}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${data}</div></foreignObject></svg>`;
    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Fallback: draw text manually for better support
    canvas.width = 800; canvas.height = ref.current.offsetHeight + 100;
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`BONDHON O BINIYOG - ${filename}`, 20, 40);
    ctx.font = '14px sans-serif';
    ctx.fillText(`সদস্য: ${currentUser.full_name} (${currentUser.member_id})`, 20, 70);
    ctx.fillText(`তারিখ: ${new Date().toLocaleDateString('bn-BD')}`, 20, 90);

    let y = 120;
    const rows = ref.current.innerText.split('\n');
    rows.forEach(line => {
      if (y > canvas.height - 20) return;
      ctx.fillText(line.slice(0, 100), 20, y);
      y += 20;
    });

    // Voucher signature if exists
    if (settings?.voucher_signature_url) {
      const sigImg = new Image();
      sigImg.crossOrigin = 'anonymous';
      sigImg.src = settings.voucher_signature_url;
      sigImg.onload = () => {
        ctx.drawImage(sigImg, 600, canvas.height - 120, 150, 60);
        ctx.fillText(settings.voucher_signatory_name || '', 600, canvas.height - 40);
        ctx.fillText(settings.voucher_signatory_title || '', 600, canvas.height - 20);
        const link = document.createElement('a');
        link.download = `${filename}-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      sigImg.onerror = () => {
        const link = document.createElement('a');
        link.download = `${filename}-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
    } else {
      const link = document.createElement('a');
      link.download = `${filename}-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 font-bengali">
      {/* Top Cards with onClick */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* পরিশোধিত কিস্তি Card */}
        <div onClick={() => setShowPaidModal(true)} className="cursor-pointer bg-gradient-to-br from-emerald-900/50 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start">
            <div><p className="text-xs text-emerald-300">পরিশোধিত কিস্তি</p><p className="text-2xl font-black text-white mt-1">{formatTaka(totalPaidAmount)}</p><p className="text-[11px] text-slate-400 mt-1">{toBengaliDigits(myPaid.length)} মাস পরিশোধ</p></div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-xl">✅</div>
          </div>
          <div className="mt-3 text-[11px] text-emerald-400 font-bold">👉 ট্যাপ করুন - মাসের হিসাব দেখুন + ছবি ডাউনলোড</div>
        </div>

        {/* এককালীন জমা Card */}
        <div onClick={() => setShowLumpsumModal(true)} className="cursor-pointer bg-gradient-to-br from-blue-900/50 to-slate-900 border border-blue-500/30 rounded-3xl p-5 hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start">
            <div><p className="text-xs text-blue-300">এককালীন জমা</p><p className="text-2xl font-black text-white mt-1">{formatTaka(totalLumpsumAmount)}</p><p className="text-[11px] text-slate-400 mt-1">{toBengaliDigits(myLumpsum.length)} টি জমা</p></div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-xl">💰</div>
          </div>
          <div className="mt-3 text-[11px] text-blue-400 font-bold">👉 ট্যাপ করুন - এককালীন হিসাব + ছবি ডাউনলোড</div>
        </div>

        {/* বকেয়া কিস্তি Card */}
        <div onClick={() => setShowDueModal(true)} className="cursor-pointer bg-gradient-to-br from-red-900/50 to-slate-900 border border-red-500/30 rounded-3xl p-5 hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start">
            <div><p className="text-xs text-red-300">বকেয়া কিস্তি</p><p className="text-2xl font-black text-white mt-1">{formatTaka(myDue.reduce((s,d)=>s+d.amount,0))}</p><p className="text-[11px] text-slate-400 mt-1">{toBengaliDigits(myDue.length)} মাস বকেয়া</p></div>
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-xl">⚠️</div>
          </div>
          <div className="mt-3 text-[11px] text-red-400 font-bold">👉 ট্যাপ করুন - বকেয়া হিসাব + ছবি ডাউনলোড</div>
          {myDue.length > 0 && <div className="mt-2 p-2 rounded-xl bg-red-950/50 border border-red-500/20 text-[11px] text-red-200">🔔 নোটিফিকেশন: আপনার {toBengaliDigits(myDue.length)} মাসের কিস্তি বকেয়া!</div>}
        </div>
      </div>

      {/* পরিশোধিত Modal */}
      {showPaidModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center"><h3 className="text-xl font-black text-white">পরিশোধিত কিস্তি - প্রতি মাসের হিসাব</h3><button onClick={() => setShowPaidModal(false)} className="w-8 h-8 rounded-full bg-slate-800 text-white">✕</button></div>
              <div ref={paidRef} className="bg-slate-950 rounded-2xl p-4 space-y-2 border border-slate-800">
                <div className="text-center border-b border-slate-800 pb-3"><h4 className="font-black text-white">বন্ধন ও বিনিয়োগ</h4><p className="text-xs text-slate-400">{currentUser.full_name} - {currentUser.member_id}</p><p className="text-xs text-slate-400">মোট পরিশোধ: {formatTaka(totalPaidAmount)}</p></div>
                {myPaid.length === 0? <p className="text-center text-slate-400 py-8">কোনো পরিশোধিত কিস্তি নেই</p> : myPaid.map((d, i) => (
                  <div key={d.deposit_id} className="flex justify-between text-sm py-2 border-b border-slate-800/50"><span className="text-slate-300">{toBengaliDigits(i+1)}. {d.month_year} - {d.trx_id}</span><span className="text-emerald-400 font-bold">{formatTaka(d.amount)} ✓</span></div>
                ))}
                {settings?.voucher_signature_url && <div className="pt-4 flex justify-end items-center gap-3"><div className="text-right"><img src={settings.voucher_signature_url} className="h-12 object-contain bg-white p-1 rounded ml-auto" /><p className="text-xs text-white font-bold">{settings.voucher_signatory_name}</p><p className="text-[10px] text-slate-400">{settings.voucher_signatory_title}</p></div></div>}
              </div>
              <button onClick={() => downloadAsImage(paidRef, `পরিশোধিত-কিস্তি-${currentUser.member_id}`)} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold">📥 হিসাবের ছবি ডাউনলোড করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* এককালীন Modal */}
      {showLumpsumModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center"><h3 className="text-xl font-black text-white">এককালীন জমা হিসাব</h3><button onClick={() => setShowLumpsumModal(false)} className="w-8 h-8 rounded-full bg-slate-800 text-white">✕</button></div>
              <div ref={lumpsumRef} className="bg-slate-950 rounded-2xl p-4 space-y-2 border border-slate-800">
                <div className="text-center border-b border-slate-800 pb-3"><h4 className="font-black text-white">বন্ধন ও বিনিয়োগ</h4><p className="text-xs text-slate-400">{currentUser.full_name} - মোট: {formatTaka(totalLumpsumAmount)}</p></div>
                {myLumpsum.length === 0? <p className="text-center text-slate-400 py-8">কোনো এককালীন জমা নেই</p> : myLumpsum.map((d, i) => (
                  <div key={d.lumpsum_id} className="flex justify-between text-sm py-2 border-b border-slate-800/50"><span className="text-slate-300">{toBengaliDigits(i+1)}. {d.purpose} - {new Date(d.created_at).toLocaleDateString('bn-BD')}</span><span className="text-blue-400 font-bold">{formatTaka(d.amount)}</span></div>
                ))}
                {settings?.voucher_signature_url && <div className="pt-4 flex justify-end"><img src={settings.voucher_signature_url} className="h-12 object-contain bg-white p-1 rounded" /></div>}
              </div>
              <button onClick={() => downloadAsImage(lumpsumRef, `এককালীন-জমা-${currentUser.member_id}`)} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold">📥 হিসাবের ছবি ডাউনলোড করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* বকেয়া Modal */}
      {showDueModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center"><h3 className="text-xl font-black text-white">বকেয়া কিস্তি হিসাব</h3><button onClick={() => setShowDueModal(false)} className="w-8 h-8 rounded-full bg-slate-800 text-white">✕</button></div>
              <div ref={dueRef} className="bg-slate-950 rounded-2xl p-4 space-y-2 border border-red-500/20">
                <div className="text-center border-b border-slate-800 pb-3"><h4 className="font-black text-red-400">বকেয়া হিসাব</h4><p className="text-xs text-slate-400">{currentUser.full_name} - {currentUser.member_id}</p></div>
                {myDue.length === 0? <p className="text-center text-emerald-400 py-8">✅ কোনো বকেয়া নেই! সব পরিশোধিত</p> : myDue.map((d, i) => (
                  <div key={d.deposit_id} className="flex justify-between text-sm py-2 border-b border-red-500/10"><span className="text-slate-300">{toBengaliDigits(i+1)}. {d.month_year} - বকেয়া</span><span className="text-red-400 font-bold">{formatTaka(d.amount)}</span></div>
                ))}
              </div>
              <button onClick={() => downloadAsImage(dueRef, `বকেয়া-কিস্তি-${currentUser.member_id}`)} className="w-full py-3 rounded-xl bg-red-600 text-white font-bold">📥 বকেয়া হিসাবের ছবি ডাউনলোড</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MemberDashboard;
