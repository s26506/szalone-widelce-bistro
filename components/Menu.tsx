
interface MenuProps {
  apiEndpoint: string;
  mode: 'daily' | 'subscription';
}

import React, { useState, useMemo, useRef } from 'react';
import { MENU_ITEMS, BANNER_IMAGE_SRC, SUBSCRIPTION_FOOTER_SRC } from '../constants';
import { MenuCategory, FullPlannerState, MenuItem, DailyMenu } from '../types';
import { toPng } from 'html-to-image';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Zap,
  Loader2,
  UtensilsCrossed
} from 'lucide-react';

const CATEGORIES: MenuCategory[] = ['Zupy', 'Dodatki', 'Dania', 'Pierogi', 'Sałatki'];

const Menu: React.FC<MenuProps> = ({ apiEndpoint, mode }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const isSubscriptionMode = mode === "subscription";
  const [planner, setPlanner] = useState<FullPlannerState>({});
  const [showAddModal, setShowAddModal] = useState<{ category: MenuCategory } | null>(null);

  // Persistence
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    fetch(apiEndpoint)
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setPlanner(data);
        }
      })
      .catch(err => console.error('Failed to load planner', err))
      .finally(() => setIsLoaded(true));
  }, []);

  React.useEffect(() => {
    if (!isLoaded) return;

    fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planner)
    }).catch(err => console.error('Failed to save planner', err));
  }, [planner, isLoaded]);
  const [modalSearch, setModalSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };

  const getEffectiveDayPlanIds = (date: string, category: MenuCategory) => {
    // Only include automatic "Daily" items if NOT in Subscription Mode
    const dailyIds = !isSubscriptionMode
      ? MENU_ITEMS.filter(i => i.isDaily && i.category === category).map(i => i.id)
      : [];

    const scheduledIds = (planner[date] && planner[date][category]) || [];
    return Array.from(new Set([...dailyIds, ...scheduledIds]));
  };

  const getFontSize = (count: number) => {
    if (count > 10) return 'text-sm';
    if (count > 7) return 'text-base';
    if (count > 5) return 'text-lg';
    return 'text-xl';
  };

  const addDishToPlan = (dishId: string) => {
    if (!showAddModal) return;
    setPlanner(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [showAddModal.category]: [...(prev[selectedDate]?.[showAddModal.category] || []), dishId]
      }
    }));
    setShowAddModal(null);
    setModalSearch('');
  };

  const removeDishFromPlan = (category: string, dishId: string) => {
    setPlanner(prev => ({
      ...prev,
      [selectedDate]: {
        ...prev[selectedDate],
        [category]: prev[selectedDate][category].filter(id => id !== dishId)
      }
    }));
  };

  const exportAsImage = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);

    try {
      // 1. Poczekaj na załadowanie fontów
      await document.fonts.ready;

      // 2. Preload obrazka bannera (czekamy aż się załaduje w DOM)
      const images = Array.from(exportRef.current.getElementsByTagName('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      // 3. Krótkie opóźnienie dla pewności renderowania stylów
      await new Promise(resolve => setTimeout(resolve, 800));

      const node = exportRef.current;

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 4,
        backgroundColor: '#1a1a1a',
        width: 1200,
        // height removed to allow auto-grow
        skipAutoScale: true,
      });

      const link = document.createElement('a');
      link.download = `menu_szalone_widelce_${selectedDate}.png`;
      link.href = dataUrl;
      link.click();

    } catch (err: any) {
      console.error('Błąd eksportu:', err);
      let msg = 'Wystąpił nieznany błąd.';
      if (typeof err === 'object') {
        msg = err.message || JSON.stringify(err);
      }
      alert(`Nie udało się wygenerować obrazu.\n${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredModalItems = useMemo(() => {
    if (!showAddModal) return [];
    return MENU_ITEMS.filter(item =>
      item.category === showAddModal.category &&
      item.name.toLowerCase().includes(modalSearch.toLowerCase())
    );
  }, [showAddModal, modalSearch]);

  // Calculate IDs for display
  const zupyIds = getEffectiveDayPlanIds(selectedDate, 'Zupy');
  const dodatkiIds = getEffectiveDayPlanIds(selectedDate, 'Dodatki');
  const daniaIds = getEffectiveDayPlanIds(selectedDate, 'Dania');
  const pierogiIds = getEffectiveDayPlanIds(selectedDate, 'Pierogi');
  const salatkiIds = getEffectiveDayPlanIds(selectedDate, 'Sałatki');

  // Global font scaling calculation
  const allCounts = [
    zupyIds.length,
    dodatkiIds.length,
    daniaIds.length,
    pierogiIds.length,
    salatkiIds.length
  ];
  const maxCount = Math.max(...allCounts);

  const fontClass = useMemo(() => {
    if (maxCount > 13) return 'text-sm';
    if (maxCount > 10) return 'text-base';
    if (maxCount > 8) return 'text-lg';
    return 'text-xl';
  }, [maxCount]);

  // Filter categories and determine grid layout
  const displayedCategories: MenuCategory[] = isSubscriptionMode
    ? ['Zupy', 'Dania', 'Dodatki']
    : CATEGORIES;

  const gridColsClass = isSubscriptionMode
    ? "grid-cols-1 md:grid-cols-3"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-5";

  // Helper to remove price/weight info from names for Subscription Export
  const cleanDishName = (name: string) => {
    return name
      .replace(/\s*\d+([.,]\d+)?\s*(zł|zl|g|ml|kg|szt\.?)\s*/gi, '') // Remove prices & units
      .replace(/\s*\(\s*\)\s*/g, '') // Remove empty parens
      .replace(/\s+-\s+$/, '') // Remove trailing dash
      .trim();
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/*
        ------------------------------------------------------------
        SZABLON EKSPORTU
        Przesunięty poza ekran, ale z pełnym renderowaniem layoutu
        aby pomiary wysokości (offsetHeight) były poprawne.
        ------------------------------------------------------------
      */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div ref={exportRef} style={{ width: '1200px', minHeight: '850px' }} className="flex flex-col bg-[#222]">

          {/* GÓRNY PASEK - ZDJĘCIE */}
          <div className="h-[210px] relative w-full overflow-hidden border-b-4 border-white shrink-0 bg-[#4A2C2A]">
            <img
              src={BANNER_IMAGE_SRC}
              alt="Banner Szalone Widelce"
              className="w-full h-full object-cover"
            />
          </div>

          {/* TABLICA KREDOWA */}
          <div className="flex-grow flex flex-col pt-8 px-10 pb-4 text-white relative" style={{
            background: `
              radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 60%),
              linear-gradient(#2a2a2a, #1a1a1a)
            `,
            fontFamily: "'Dancing Script', cursive"
          }}>

            {isSubscriptionMode ? (
              /* --- UKŁAD ABONAMENTOWY (3 KOLUMNY: ZUPY, DANIA, DODATKI) --- */
              <div className="flex flex-col h-full items-center">
                <div className="text-center mb-8 w-full">
                  {/* Zmniejszony nagłówek, bez pogrubienia */}
                  <h2 className="text-4xl text-white/95 font-serif tracking-wider drop-shadow-lg mb-1">
                    Dziś w ramach obiadu abonamentowego
                  </h2>
                  <h2 className="text-4xl text-white/95 font-serif tracking-wider drop-shadow-lg">
                    proponujemy:
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-12 items-start w-full px-8">
                  {/* ZUPY */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-4xl mb-4 text-white text-center opacity-90 font-serif tracking-wider font-bold">Zupy</h3>
                    <ul className="space-y-0 font-sans font-light tracking-wide text-2xl">
                      {getEffectiveDayPlanIds(selectedDate, 'Zupy').map(id => {
                        const item = MENU_ITEMS.find(i => i.id === id);
                        if (!item) return null;
                        return (
                          <li key={id} className="text-white/90 text-center py-2 border-b border-white/20 last:border-0 font-bold">
                            {cleanDishName(item.name)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* DANIA */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-4xl mb-4 text-white text-center opacity-90 font-serif tracking-wider font-bold">Dania</h3>
                    <ul className="space-y-0 font-sans font-light tracking-wide text-2xl">
                      {getEffectiveDayPlanIds(selectedDate, 'Dania').map(id => {
                        const item = MENU_ITEMS.find(i => i.id === id);
                        if (!item) return null;
                        return (
                          <li key={id} className="text-white/90 text-center py-2 border-b border-white/20 last:border-0 font-bold">
                            {cleanDishName(item.name)}
                            {item.portion && (item.portion.includes('szt') || item.portion.includes('szt.')) && (
                              <span className="font-normal opacity-80 text-lg ml-2">({item.portion})</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* DODATKI */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-4xl mb-4 text-white text-center opacity-90 font-serif tracking-wider font-bold">Dodatki</h3>
                    <ul className="space-y-0 font-sans font-light tracking-wide text-2xl">
                      {getEffectiveDayPlanIds(selectedDate, 'Dodatki').map(id => {
                        const item = MENU_ITEMS.find(i => i.id === id);
                        if (!item) return null;
                        return (
                          <li key={id} className="text-white/90 text-center py-2 border-b border-white/20 last:border-0 font-bold">
                            {cleanDishName(item.name)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 text-center pb-4">
                  <p className="text-2xl text-white/90 font-sans tracking-wide mb-4">
                    oraz dowolna surówka (150g) i kompot wieloowocowy
                  </p>
                </div>

                {/* Stopka z grafiką abonamentową */}
                <div className="mt-auto w-full flex justify-center pb-8">
                  <div className="w-[300px] h-[350px] relative opacity-90"> {/* Placeholder size, adjusted to be vertical */}
                    <img
                      src={SUBSCRIPTION_FOOTER_SRC}
                      className="w-full h-full object-contain"
                      alt="Grafika Abonament"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* --- UKŁAD STANDARDOWY (DAILY MENU) --- */
              <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-8 auto-rows-min">
                {(() => {
                  // Obliczanie danych do wyświetlenia
                  const zupyIds = getEffectiveDayPlanIds(selectedDate, 'Zupy');
                  const dodatkiIds = getEffectiveDayPlanIds(selectedDate, 'Dodatki');
                  const daniaIds = getEffectiveDayPlanIds(selectedDate, 'Dania');
                  const pierogiIds = getEffectiveDayPlanIds(selectedDate, 'Pierogi');
                  const salatkiIds = getEffectiveDayPlanIds(selectedDate, 'Sałatki');

                  const allCounts = [zupyIds.length, dodatkiIds.length, daniaIds.length, pierogiIds.length, salatkiIds.length];
                  const maxCount = Math.max(...allCounts);

                  const getGlobalFontSize = (count: number) => {
                    if (count > 13) return 'text-sm';
                    if (count > 10) return 'text-base';
                    if (count > 8) return 'text-lg';
                    return 'text-xl';
                  };
                  const fontClass = getGlobalFontSize(maxCount);

                  return (
                    <>
                      {/* LEWA KOLUMNA - Wiersz 1: Zupy */}
                      <div className="flex flex-col gap-8 col-start-1 row-start-1">
                        <div className="relative">
                          <h3 className="text-4xl mb-4 text-white text-center opacity-90 font-serif tracking-wider font-bold">Zupy</h3>
                          <ul className={`space-y-2 font-sans font-light tracking-wide pl-4 ${fontClass}`}>
                            {zupyIds.map(id => {
                              const item = MENU_ITEMS.find(i => i.id === id);
                              if (!item) return null;
                              return (
                                <li key={id} className="flex justify-between items-end border-b border-white/10 pb-1">
                                  <span className="text-white/90 font-bold">
                                    {item.name}
                                    {item.isVeg && <span className="text-[#C32026] text-xs ml-2 font-black">WEGE</span>}
                                  </span>
                                  <span className="text-white/90 ml-4 whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>

                      {/* ŚRODKOWA KOLUMNA - Wiersze 1 i 2: Dania */}
                      <div className="flex flex-col items-center pt-0 col-start-2 row-start-1 row-span-2">
                        <div className="flex flex-col items-center mb-2 relative">
                          <span className="text-4xl text-white/90 font-normal tracking-wider mb-2" style={{ fontFamily: "'Dancing Script', cursive" }}>co dziś na obiad?...</span>
                          <div className="h-4"></div>
                          <h3 className="text-4xl text-white mb-2 tracking-wider drop-shadow-lg font-serif font-bold">Dania</h3>
                        </div>

                        <ul className={`w-full space-y-2 px-4 font-sans font-light tracking-wide ${fontClass}`}>
                          {daniaIds.map(id => {
                            const item = MENU_ITEMS.find(i => i.id === id);
                            if (!item) return null;
                            return (
                              <li key={id} className="flex justify-between items-end border-b border-white/10 pb-1">
                                <span className="text-white/90 text-left font-bold">
                                  {item.name}
                                  {item.isVeg && <span className="text-[#C32026] text-sm ml-2 font-black">WEGE</span>}
                                </span>
                                <span className="text-white/90 ml-4 whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* PRAWA KOLUMNA - Wiersz 1: Pierogi */}
                      <div className="flex flex-col gap-8 col-start-3 row-start-1">
                        <div className="relative">
                          <h3 className="text-4xl mb-4 text-white text-center opacity-90 font-serif tracking-wider font-bold">Pierogi</h3>
                          <ul className={`space-y-2 font-sans font-light tracking-wide pr-4 ${fontClass}`}>
                            {pierogiIds.map(id => {
                              const item = MENU_ITEMS.find(i => i.id === id);
                              if (!item) return null;
                              return (
                                <li key={id} className="flex justify-between items-end border-b border-white/10 pb-1">
                                  <span className="text-white/90 font-bold">
                                    {item.name}
                                    {item.isVeg && <span className="text-[#C32026] text-xs ml-2 font-black">WEGE</span>}
                                  </span>
                                  <span className="text-white/90 ml-4 whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>

                      {/* LEWA KOLUMNA - Wiersz 2: Dodatki */}
                      <div className="flex flex-col gap-8 col-start-1 row-start-2">
                        <div className="relative">
                          <h3 className="text-4xl mb-4 text-white text-center opacity-90 font-serif tracking-wider font-bold">Dodatki</h3>
                          <ul className={`space-y-2 font-sans font-light tracking-wide pl-4 ${fontClass}`}>
                            {dodatkiIds.map(id => {
                              const item = MENU_ITEMS.find(i => i.id === id);
                              if (!item) return null;
                              return (
                                <li key={id} className="flex justify-between items-end border-b border-white/10 pb-1">
                                  <span className="text-white/80 font-bold">
                                    {item.name}
                                    {item.isVeg && <span className="text-[#C32026] text-xs ml-2 font-black">WEGE</span>}
                                  </span>
                                  <span className="text-white/80 ml-4 whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>

                      {/* PRAWA KOLUMNA - Wiersz 2: Sałatki */}
                      <div className="flex flex-col gap-8 col-start-3 row-start-2">
                        <div className="relative">
                          <h3 className="text-4xl mb-4 text-white text-center opacity-90 font-serif tracking-wider font-bold">Sałatki</h3>
                          <ul className={`space-y-2 font-sans font-light tracking-wide pr-4 ${fontClass}`}>
                            {salatkiIds.map(id => {
                              const item = MENU_ITEMS.find(i => i.id === id);
                              if (!item) return null;
                              return (
                                <li key={id} className="flex justify-between items-end border-b border-white/10 pb-1">
                                  <span className="text-white/80 font-bold">
                                    {item.name}
                                    {item.isVeg && <span className="text-[#C32026] text-xs ml-2 font-black">WEGE</span>}
                                  </span>
                                  <span className="text-white/80 ml-4 whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="mt-auto"></div>

          </div>
        </div>
      </div>

      {/* PANEL ADMINA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#4A2C2A] flex items-center gap-2">
              <CalendarIcon size={20} className="text-[#C32026]" />
              {isSubscriptionMode ? 'Kalendarz Abonamentowy' : 'Kalendarz Menu'}
            </h2>
            <div className="flex items-center gap-4">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
              <span className="font-bold text-[#4A2C2A] min-w-[140px] text-center capitalize">{currentMonth.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-2">{d}</div>
            ))}
            {daysInMonth.map((day, idx) => {
              const dateStr = day.toISOString().split('T')[0];
              const isSelected = selectedDate === dateStr;
              const hasPlan = displayedCategories.some(cat => getEffectiveDayPlanIds(dateStr, cat).length > 0);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-[#C32026] border-[#C32026] text-white shadow-md z-10' : 'bg-white border-gray-100 hover:border-[#C32026] text-gray-700'}`}
                >
                  <span className="text-sm font-bold">{day.getDate()}</span>
                  {hasPlan && <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#C32026]'}`} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#4A2C2A] rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#F28D91] mb-2">
              {isSubscriptionMode ? 'Eksport Abonament' : 'Eksport Menu'}
            </h3>
            <div className="text-4xl font-bold mb-4 font-['Playfair_Display']">{selectedDate}</div>
            <p className="opacity-70 text-sm leading-relaxed mb-6">Pobierz gotową grafikę z tablicą i logo. Idealna na Facebooka.</p>

          </div>
          <button
            onClick={exportAsImage}
            disabled={isExporting}
            className="w-full bg-[#C32026] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" /> : <ImageIcon size={20} />}
            {isExporting ? 'GENEROWANIE...' : 'POBIERZ PNG'}
          </button>
        </div>
      </div>

      {/* PLANER KATEGORII */}
      <div className={`grid gap-4 ${gridColsClass}`}>
        {displayedCategories.map(cat => {
          const dishIds = getEffectiveDayPlanIds(selectedDate, cat);
          return (
            <div key={cat} className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
              <div className="p-4 border-b border-gray-50 bg-gray-50/50 rounded-t-3xl flex justify-between items-center">
                <h3 className="font-bold text-[#4A2C2A] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C32026]" />
                  {cat}
                </h3>
                <span className="text-xs font-bold text-gray-400">{dishIds.length}</span>
              </div>

              <div className="p-3 flex-grow space-y-2 overflow-y-auto max-h-[500px]">
                {dishIds.map(id => {
                  const dish = MENU_ITEMS.find(m => m.id === id);
                  if (!dish) return null;
                  return (
                    <div key={id} className={`group relative p-3 rounded-2xl border transition-all ${dish.isDaily ? 'bg-red-50/50 border-red-100' : 'bg-gray-50 border-gray-100 hover:border-[#C32026]'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-grow min-w-0">
                          <div className="text-xs font-bold text-[#4A2C2A] leading-tight flex items-center flex-wrap gap-1">
                            {dish.isDaily && <Zap size={10} className="text-[#C32026]" />}
                            {dish.name}
                          </div>
                        </div>
                        {!dish.isDaily && (
                          <button onClick={() => removeDishFromPlan(cat, id)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100 ml-1 flex-shrink-0">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                        <span>{dish.portion}</span>
                        <span className="text-[#C32026] font-bold">{dish.price.toFixed(2)} zł</span>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => { setShowAddModal({ category: cat }); setModalSearch(''); }} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-400 hover:border-[#C32026] hover:text-[#C32026] transition-all group">
                  <Plus size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Dodaj</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 bg-[#4A2C2A] text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Wybierz {showAddModal.category}</h3>
                <p className="text-xs opacity-70">Dodaj do menu na {selectedDate}</p>
              </div>
              <button onClick={() => setShowAddModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" autoFocus placeholder={`Szukaj...`} value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#C32026] text-sm font-medium transition-all" />
              </div>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {filteredModalItems.length > 0 ? filteredModalItems.map(dish => (
                <div key={dish.id} onClick={() => !dish.isDaily && addDishToPlan(dish.id)} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all group ${dish.isDaily ? 'bg-gray-50 opacity-60 cursor-not-allowed' : 'hover:bg-red-50 border-transparent hover:border-[#C32026] cursor-pointer'}`}>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`font-bold transition-colors ${dish.isDaily ? 'text-gray-400' : 'text-[#4A2C2A] group-hover:text-[#C32026]'}`}>{dish.name}</div>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span className="font-medium">{dish.portion}</span>
                      <span className={`${dish.isDaily ? 'text-gray-400' : 'text-[#C32026] font-bold'}`}>{dish.price.toFixed(2)} zł</span>
                    </div>
                  </div>
                  {!dish.isDaily && <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:bg-[#C32026] group-hover:text-white transition-all shadow-sm"><Plus size={20} /></div>}
                </div>
              )) : <div className="text-center py-16 text-gray-400 italic">Brak dań w tej kategorii.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
