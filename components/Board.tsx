
import React, { useState, useMemo, useRef } from 'react';
import { MENU_ITEMS, BANNER_IMAGE_SRC } from '../constants';
import { MenuCategory, FullPlannerState } from '../types';
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
  UtensilsCrossed,
  Printer,
  ArrowDownToLine,
  Copy
} from 'lucide-react';

// Helper for local date string YYYY-MM-DD
const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Board: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  const [planner, setPlanner] = useState<FullPlannerState>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Modals & Search
  const [showAddModal, setShowAddModal] = useState<{ category: MenuCategory } | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  // Export States
  const [isExportingDania, setIsExportingDania] = useState(false);
  const [isExportingZupy, setIsExportingZupy] = useState(false);
  const daniaExportRef = useRef<HTMLDivElement>(null);
  const zupyExportRef = useRef<HTMLDivElement>(null);

  // Fetch Data (Board JSON)
  React.useEffect(() => {
    fetch('/api/board-planner')
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) setPlanner(data);
      })
      .catch(err => console.error('Failed to load board planner', err))
      .finally(() => setIsLoaded(true));
  }, []);

  // Auto-save
  React.useEffect(() => {
    if (!isLoaded) return;
    fetch('/api/board-planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planner)
    }).catch(err => console.error('Failed to save board planner', err));
  }, [planner, isLoaded]);

  const handleImportFromMenu = async () => {
    if (!confirm(`Czy na pewno chcesz pobrać menu z dnia ${selectedDate}? Nadpisze to obecny układ tablicy dla tego dnia.`)) return;
    try {
      const res = await fetch('/api/planner');
      const menuData = await res.json();
      const dayMenu = menuData[selectedDate];
      if (!dayMenu) {
        alert('Brak zaplanowanego menu w tym dniu.');
        return;
      }
      const relevantCategories: MenuCategory[] = ['Zupy', 'Dania', 'Dodatki'];
      const newDayPlan: any = {};
      relevantCategories.forEach(cat => {
        if (dayMenu[cat]) {
          newDayPlan[cat] = dayMenu[cat];
        } else {
          newDayPlan[cat] = [];
        }
      });
      setPlanner(prev => ({ ...prev, [selectedDate]: newDayPlan }));
      alert('Pobrano dane z Menu!');
    } catch (e) {
      console.error(e);
      alert('Błąd pobierania danych z menu.');
    }
  };

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
    const dailyIds = MENU_ITEMS.filter(i => i.isDaily && i.category === category).map(i => i.id);
    const scheduledIds = (planner[date] && planner[date][category]) || [];
    return Array.from(new Set([...dailyIds, ...scheduledIds]));
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

  const handleExport = async (ref: React.RefObject<HTMLDivElement>, filename: string, setLoading: (v: boolean) => void) => {
    if (!ref.current) return;
    setLoading(true);
    try {
      await document.fonts.ready;
      const images = Array.from(ref.current.getElementsByTagName('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
      }));
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2, width: 1920 });
      const link = document.createElement('a');
      link.download = `${filename}_${selectedDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Błąd eksportu');
    } finally {
      setLoading(false);
    }
  };

  const filteredModalItems = useMemo(() => {
    if (!showAddModal) return [];
    return MENU_ITEMS.filter(item =>
      item.category === showAddModal.category &&
      item.name.toLowerCase().includes(modalSearch.toLowerCase())
    );
  }, [showAddModal, modalSearch]);

  const allCategories: MenuCategory[] = ['Zupy', 'Dania', 'Dodatki'];

  // --- NEW EXPORT RENDERERS (LANDSCAPE 1920x1080) ---

  // 1. DANIA GŁÓWNE EXPORT
  const renderDaniaExport = () => {
    const ids = getEffectiveDayPlanIds(selectedDate, 'Dania');
    // Split into 2 columns
    const half = Math.ceil(ids.length / 2);
    const col1 = ids.slice(0, half);
    const col2 = ids.slice(half);

    return (
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div ref={daniaExportRef} style={{ width: '1920px', height: '1080px' }} className="bg-black text-white p-12 flex flex-col font-sans relative">
          {/* Header */}
          <h1 className="text-8xl font-['Playfair_Display'] font-bold mb-8 uppercase tracking-wider text-white border-b-4 border-white pb-4">
            DANIA GŁÓWNE
          </h1>

          <div className="flex-grow flex gap-12">
            {/* Col 1 */}
            <div className="w-1/2 flex flex-col gap-0 border-r border-white/20 pr-12">
              {col1.map(id => {
                const item = MENU_ITEMS.find(i => i.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="border-b border-white py-4 flex flex-col">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-4xl font-bold uppercase tracking-wide">{item.name} <span className="text-3xl font-normal normal-case">({item.portion})</span></span>
                    </div>
                    <div className="text-right text-4xl font-bold">{item.price.toFixed(2)} zł</div>
                  </div>
                );
              })}
            </div>
            {/* Col 2 */}
            <div className="w-1/2 flex flex-col gap-0">
              {col2.map(id => {
                const item = MENU_ITEMS.find(i => i.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="border-b border-white py-4 flex flex-col">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-4xl font-bold uppercase tracking-wide">{item.name} <span className="text-3xl font-normal normal-case">({item.portion})</span></span>
                    </div>
                    <div className="text-right text-4xl font-bold">{item.price.toFixed(2)} zł</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. ZUPY I DODATKI EXPORT
  const renderZupyExport = () => {
    const zupyIds = getEffectiveDayPlanIds(selectedDate, 'Zupy');
    const dodatkiIds = getEffectiveDayPlanIds(selectedDate, 'Dodatki');

    return (
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div ref={zupyExportRef} style={{ width: '1920px', height: '1080px' }} className="bg-black text-white p-12 flex flex-col font-sans">
          <div className="flex-grow flex gap-16 h-full">

            {/* ZUPY COLUMN */}
            <div className="w-1/2 flex flex-col h-full">
              <h1 className="text-8xl font-['Playfair_Display'] font-bold mb-4 uppercase tracking-wider text-white border-b-4 border-white pb-4">
                ZUPY
              </h1>
              <div className="flex flex-col gap-0">
                {zupyIds.map(id => {
                  const item = MENU_ITEMS.find(i => i.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="border-b border-white py-4 flex flex-col">
                      <div className="flex justify-between items-baseline mb-2 flex-wrap">
                        <span className="text-4xl font-bold uppercase tracking-wide mr-4">{item.name} <span className="text-3xl font-normal normal-case text-white/80">({item.portion})</span></span>
                        <span className="text-right text-4xl font-bold ml-auto">{item.price.toFixed(2)} zł</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="w-px bg-white/30 h-full"></div>

            {/* DODATKI COLUMN */}
            <div className="w-1/2 flex flex-col h-full">
              <h1 className="text-8xl font-['Playfair_Display'] font-bold mb-4 uppercase tracking-wider text-white border-b-4 border-white pb-4">
                DODATKI
              </h1>
              <div className="flex flex-col gap-0">
                {dodatkiIds.map(id => {
                  const item = MENU_ITEMS.find(i => i.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="border-b border-white py-4 flex flex-col">
                      <div className="flex justify-between items-baseline mb-2 flex-wrap">
                        <span className="text-4xl font-bold uppercase tracking-wide mr-4">{item.name} <span className="text-3xl font-normal normal-case text-white/80">({item.portion})</span></span>
                        <span className="text-right text-4xl font-bold ml-auto">{item.price.toFixed(2)} zł</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Hidden Export Nodes */}
      {renderDaniaExport()}
      {renderZupyExport()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#4A2C2A] flex items-center gap-2">
              <CalendarIcon size={20} className="text-[#C32026]" />
              Kalendarz Tablic Menu
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
              const dateStr = getLocalDateString(day);
              const isSelected = selectedDate === dateStr;
              const hasPlan = allCategories.some(cat => getEffectiveDayPlanIds(dateStr, cat).length > 0);
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

        {/* Action Panel */}
        <div className="bg-[#4A2C2A] rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#F28D91] mb-2">
              Zarządzanie Tablicą
            </h3>
            <div className="text-4xl font-bold mb-4 font-['Playfair_Display']">{selectedDate}</div>

            <button
              onClick={handleImportFromMenu}
              className="w-full bg-white/10 hover:bg-white/20 mb-8 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border border-white/10"
            >
              <ArrowDownToLine size={16} /> PRZENIEŚ Z MENU
            </button>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleExport(daniaExportRef, 'Tablica_Dania', setIsExportingDania)}
              disabled={isExportingDania}
              className="w-full bg-[#C32026] py-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isExportingDania ? <Loader2 className="animate-spin" size={24} /> : <Printer size={24} />}
              POBIERZ DANIA (TV)
            </button>

            <button
              onClick={() => handleExport(zupyExportRef, 'Tablica_ZupyDodatki', setIsExportingZupy)}
              disabled={isExportingZupy}
              className="w-full bg-white text-[#4A2C2A] py-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isExportingZupy ? <Loader2 className="animate-spin" size={24} /> : <Printer size={24} />}
              POBIERZ ZUPY (TV)
            </button>
          </div>
        </div>
      </div>

      {/* Categories Grid (Bottom) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {allCategories.map(cat => {
          const dishIds = getEffectiveDayPlanIds(selectedDate, cat);
          return (
            <div key={cat} className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
              <div className="p-4 border-b border-gray-50 bg-gray-50/50 rounded-t-3xl flex justify-between items-center">
                <h3 className="font-bold text-[#4A2C2A] flex items-center gap-2 text-lg">
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

      {/* Add Modal (Reused) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 bg-[#4A2C2A] text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Wybierz {showAddModal.category}</h3>
                <p className="text-xs opacity-70">Dodaj do tablicy na {selectedDate}</p>
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
                <div key={dish.id} onClick={() => !dish.isDaily && addDishToPlan(dish.id)} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all group ${dish.isDaily ? 'bg-gray-50 opacity-60 cursor-not-allowed' : 'hover:bg-red-50 border-transparent hover:border-[#C32026] cursor-pointer'}`}
                >
                  <div className="flex-grow">
                    <div className="font-bold text-[#4A2C2A]">{dish.name}</div>
                    <div className="text-xs text-gray-500">{dish.portion} | {dish.price.toFixed(2)} zł</div>
                  </div>
                  {!dish.isDaily && <Plus size={20} className="text-gray-300 group-hover:text-[#C32026]" />}
                </div>
              )) : <div className="text-center py-16 text-gray-400 italic">Brak dań w tej kategorii.</div>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Board;
