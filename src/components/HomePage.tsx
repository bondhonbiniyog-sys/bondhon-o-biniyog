import React, { useState } from 'react';
import type {
  LandInvestment,
  Director,
  GalleryItem,
  SystemSettings,
  DashboardStats,
  Member,
} from '../types';
import { formatTaka, toBengaliDigits } from '../utils/bengaliUtils';
import { ShareholdersModal } from './ShareholdersModal';
import { RoiCalculator } from './RoiCalculator';
import { LandBuyModal } from './LandBuyModal';
import { LandSellModal } from './LandSellModal';

interface HomePageProps {
  settings: SystemSettings | null;
  stats?: DashboardStats | null;
  lands: LandInvestment[];
  directors: Director[];
  gallery?: GalleryItem[];
  currentUser?: Member | null;
  onOpenAuth?: () => void;
  onNavigateTab?: (tab: string) => void;
  onRefreshData?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  settings = null,
  stats = null,
  lands = [],
  directors = [],
  gallery = [],
  currentUser = null,
  onOpenAuth = () => {},
  onNavigateTab = () => {},
  onRefreshData = () => {},
}) => {
  const [selectedLandForShareholders, setSelectedLandForShareholders] = useState<LandInvestment | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedLandForBuy, setSelectedLandForBuy] = useState<LandInvestment | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});
  const [selectedGalleryCat, setSelectedGalleryCat] = useState<string>('All');
  const [previewImage, setPreviewImage] = useState<GalleryItem | null>(null);

  const handlePrevImage = (landId: string, totalImages: number) => {
    setCarouselIndices((prev) => {
      const current = prev[landId] || 0;
      return {...prev, [landId]: (current - 1 + totalImages) % totalImages };
    });
  };

  const handleNextImage = (landId: string, totalImages: number) => {
    setCarouselIndices((prev) => {
      const current = prev[landId] || 0;
      return {...prev, [landId]: (current + 1) % totalImages };
    });
  };

  // SAFE FIX - gallery undefined হলেও crash করবে না
  const safeGallery = gallery || [];
  const safeLands = lands || [];
  const safeDirectors = directors || [];
  const safeStats = stats || { total_capital: 0, total_monthly_capital: 0, total_lumpsum_capital: 0, capital_percentage: 0, target_amount: 10000000 };

  const categories = ['All',...Array.from(new Set((safeGallery || []).map((g: any) => g.category).filter(Boolean)))];
  const filteredGallery = selectedGalleryCat === 'All'? safeGallery : safeGallery.filter((g: any) => g.category === selectedGalleryCat);

  return (
    <div className="space-y-20 pb-16 font-bengali">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:py-20 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {settings?.banner_ad_active && settings.banner_ad_text && (
            <div className="mb-10 p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-emerald-950/80 border-2 border-amber-400/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md overflow-hidden relative">
              <div className="flex-1 space-y-2 text-center md:text-left">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-950 px-3 py-1 rounded-full border border-amber-400/50 font-bengali">
                  {settings.banner_ad_badge || 'বিশেষ বিজ্ঞাপন'}
                </span>
                <p className="text-sm sm:text-base font-bold text-white leading-relaxed font-bengali">{settings.banner_ad_text}</p>
              </div>
            </div>
          )}

          <div className="text-center max-w-3xl mx-auto space-y-6 mb-12">
            <div className="inline-flex flex-col items-center justify-center mb-1">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white p-1 border-4 border-amber-400/60 shadow-2xl overflow-hidden">
                <img src={settings?.logo_url || '/bob-logo.png'} alt="BoB" className="w-full h-full object-contain" onError={(e: any) => { e.target.src = '/logo.png'; }} />
              </div>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              {settings?.hero_title || <>যৌথ বিনিয়োগে ভূমির মালিকানা, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-300 to-amber-300">নিশ্চিত ভবিষ্যৎ</span></>}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {settings?.hero_subtitle || settings?.project_vision || 'বন্ধন ও বিনিয়োগ (BoB) হলো একটি বিশ্বস্ত সমবায় ভূমি বিনিয়োগ উদ্যোগ।'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-w-4xl mx-auto backdrop-blur-md">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 space-y-2">
                <span className="text-xs sm:text-sm text-slate-400 block font-medium">সর্বমোট সংগৃহীত মূলধন:</span>
                <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-amber-300 font-num tracking-tight">
                  {formatTaka(safeStats?.total_capital || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LANDS */}
      <section id="projects-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-10">আমাদের বর্তমান ভূমি প্রকল্পসমূহ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {safeLands.map((land) => {
            const currentImgIndex = carouselIndices[land.land_id] || 0;
            const images = land.images && land.images.length > 0? land.images : ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'];
            const availableShares = (land.total_shares || 0) - (land.sold_shares || 0);
            return (
              <div key={land.land_id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                <div className="relative h-60 overflow-hidden bg-slate-950">
                  <img src={images[currentImgIndex]} alt={land.land_name} className="w-full h-full object-cover" />
                  <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-slate-950/85 text-xs font-bold text-amber-300 border border-amber-400/30">{land.land_id}</div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{land.land_name}</h3>
                    <p className="text-xs text-slate-300 mt-2">{land.location}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedLandForShareholders(land)} className="cursor-pointer flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold">শেয়ারহোল্ডার</button>
                    <button onClick={() => { setSelectedLandForBuy(land); setIsBuyModalOpen(true); }} className="cursor-pointer flex-1 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold">কিনতে চাই</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* DIRECTORS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black text-white text-center mb-10">পরিচালনা পর্ষদ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {safeDirectors.map((dir: any) => (
            <div key={dir.director_id || dir.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center">
              <img src={dir.photo_url} alt={dir.name} className="w-24 h-24 mx-auto mb-4 rounded-2xl object-cover border-2 border-emerald-500/60" />
              <h3 className="text-lg font-bold text-white">{dir.name}</h3>
              <p className="text-xs text-emerald-400">{dir.designation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      {safeGallery.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-white mb-6">ফটো গ্যালারি</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedGalleryCat(cat)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${selectedGalleryCat === cat? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{cat === 'All'? 'সকল ছবি' : cat}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGallery.map((item: any) => (
              <div key={item.id} onClick={() => setPreviewImage(item)} className="cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-56">
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedLandForShareholders && <ShareholdersModal land={selectedLandForShareholders} onClose={() => setSelectedLandForShareholders(null)} />}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <img src={previewImage.image_url} alt={previewImage.title} className="max-h-[75vh] w-auto rounded-lg" />
        </div>
      )}
      <LandBuyModal isOpen={isBuyModalOpen} onClose={() => { setIsBuyModalOpen(false); setSelectedLandForBuy(null); }} selectedLand={selectedLandForBuy} onOfferSubmitted={() => onRefreshData && onRefreshData()} />
      <LandSellModal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} onSubmissionSuccess={() => onRefreshData && onRefreshData()} />
    </div>
  );
};
