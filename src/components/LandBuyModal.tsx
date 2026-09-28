import React, { useState, useEffect } from 'react';
import type { LandInvestment } from '../types';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface Props {
  isOpen: boolean; onClose: () => void;
  selectedLand: LandInvestment | null; onOfferSubmitted: () => void;
}

export const LandBuyModal: React.FC<Props> = ({ isOpen, onClose, selectedLand, onOfferSubmitted }) => {
  const [buyerName, setBuyerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(()=>{ if(selectedLand?.public_asking_price) setProposedPrice(String(selectedLand.public_asking_price)); },[selectedLand]);
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMessage(''); setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'buy_offers'), {
        land_id: selectedLand?.land_id || 'GENERAL',
        land_name: selectedLand?.land_name || 'General Buy Offer',
        buyer_name: buyerName, mobile, address, email,
        proposed_price: Number(proposedPrice), notes,
        status: 'Pending', created_at: new Date().toISOString(),
      });
      setIsSuccess(true); onOfferSubmitted();
      setTimeout(()=>{ setIsSuccess(false); onClose(); setBuyerName(''); setMobile(''); setAddress(''); setEmail(''); setNotes(''); },2000);
    } catch (err:any) { setErrorMessage('Error: '+err.message); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-blue-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-bold text-base">জমি ক্রয়ের প্রস্তাব (I Want to Buy)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="p-6">
          {isSuccess?(
            <div className="py-8 text-center"><div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-3xl"><i className="fa-solid fa-circle-check"></i></div><h4 className="text-white font-bold mt-3">প্রস্তাব সফলভাবে জমা হয়েছে!</h4></div>
          ):(
            <form onSubmit={handleSubmit} className="space-y-3">
              {selectedLand && <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white">{selectedLand.land_name} - {selectedLand.location}</div>}
              {errorMessage && <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs">{errorMessage}</div>}
              <input required value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="পূর্ণ নাম" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
              <input required value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="মোবাইল" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
              <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="ঠিকানা" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="ইমেইল (ঐচ্ছিক)" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
              <input required type="number" value={proposedPrice} onChange={e=>setProposedPrice(e.target.value)} placeholder="প্রস্তাবিত মূল্য" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="মন্তব্য" rows={2} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"></textarea>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">বাতিল</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">{isSubmitting?'জমা হচ্ছে...':'প্রস্তাব দাখিল করুন'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
