
import React, { useState, useMemo, useRef } from 'react';
import { MENU_ITEMS, BANNER_IMAGE_SRC } from '../constants';
import { MenuCategory, FullPlannerState } from '../types';
import { toPng, toJpeg } from 'html-to-image';
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
  ArrowDownToLine,
  Copy,
  Edit2,
  Ticket,
  Printer
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableDishRow } from './SortableDishRow';
import { MenuItem } from '../types';
import DishFormModal from './DishFormModal';

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
  const [subscriptionPlanner, setSubscriptionPlanner] = useState<FullPlannerState>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Modals & Search
  const [showAddModal, setShowAddModal] = useState<{ category: MenuCategory } | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  // New state for available dishes (fetched from API)
  const [availableDishes, setAvailableDishes] = useState<MenuItem[]>([]);
  // Multiple selection state
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());
  // Dish Editing in Board
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Export States
  const [isExportingDania, setIsExportingDania] = useState(false);
  const [isExportingZupy, setIsExportingZupy] = useState(false);
  const daniaExportRef = useRef<HTMLDivElement>(null);
  const zupyExportRef = useRef<HTMLDivElement>(null);

  // Fetch Data (Board JSON) & Menu Items
  React.useEffect(() => {
    // 1. Fetch Board Plan
    fetch('/api/board-planner')
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) setPlanner(data);
      })
      .catch(err => console.error('Failed to load board planner', err))
      .finally(() => setIsLoaded(true));

    fetch('/api/subscription-planner')
      .then(res => res.json())
      .then(data => {
        if (data) setSubscriptionPlanner(data);
      })
      .catch(err => console.error('Failed to load sub planner', err));

    // 2. Fetch Menu Items using shared logic
    fetchMenuItems();
  }, []);

  const fetchMenuItems = () => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        // Sort alphabetically
        setAvailableDishes(data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'pl')));
      })
      .catch(err => console.error('Failed to load available dishes', err));
  };

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
    // Calculate padding for start of month (Mon=0, Sun=6)
    const firstDay = date.getDay(); // 0 is Sunday
    const padding = (firstDay + 6) % 7;

    for (let i = 0; i < padding; i++) {
      days.push(null);
    }

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
    // If we have a specific order/list saved in planner, use it (it serves as the source of truth for order)
    if (planner[date] && planner[date][category]) {
      return planner[date][category];
    }
    return [];
  };

  const clearDayPlan = () => {
    if (!confirm(`Czy na pewno wyczyścić cały plan na dzień ${selectedDate}?`)) return;
    setPlanner(prev => ({
      ...prev,
      [selectedDate]: {}
    }));
  };

  const addSelectedDishesToPlan = () => {
    if (!showAddModal) return;
    const { category } = showAddModal;

    // Get current effective list (to preserve existing order and items)
    const currentList = getEffectiveDayPlanIds(selectedDate, category);

    const newIds = Array.from(selectedDishIds).filter(id => !currentList.includes(id));

    if (newIds.length === 0) {
      setShowAddModal(null);
      return;
    }

    setPlanner(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [category]: [...currentList, ...newIds]
      }
    }));
    setShowAddModal(null);
    setModalSearch('');
    setSelectedDishIds(new Set());
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, category: MenuCategory) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = getEffectiveDayPlanIds(selectedDate, category);
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        setPlanner(prev => ({
          ...prev,
          [selectedDate]: {
            ...(prev[selectedDate] || {}),
            [category]: newItems
          }
        }));
      }
    }
  };

  const toggleDishSelection = (id: string, isDaily: boolean) => {
    // Allows manual selection even if daily
    const newSet = new Set(selectedDishIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDishIds(newSet);
  };

  const removeDishFromPlan = (category: string, dishId: string) => {
    const list = getEffectiveDayPlanIds(selectedDate, category as MenuCategory);
    const newList = list.filter(id => id !== dishId);

    setPlanner(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [category]: newList
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

      const dataUrl = await toJpeg(ref.current, { cacheBust: true, pixelRatio: 2, width: 1920, backgroundColor: '#000000' });
      const link = document.createElement('a');
      link.download = `${filename}_${selectedDate}.jpg`;
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

    // 1. Filter
    const filtered = availableDishes.filter(item => {
      const matchCat = item.category === showAddModal.category;
      const matchSearch = item.name.toLowerCase().includes(modalSearch.toLowerCase());
      return matchCat && matchSearch;
    });

    // 2. Sort
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [showAddModal, modalSearch, availableDishes]);



  const allCategories: MenuCategory[] = ['Zupy', 'Dania', 'Dodatki'];

  const isDishInSubscription = (date: string, category: MenuCategory, dishId: string) => {
    if (!subscriptionPlanner[date]) return false;
    const subIds = subscriptionPlanner[date][category];
    return Array.isArray(subIds) && subIds.includes(dishId);
  };

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
        <div ref={daniaExportRef} style={{ width: '1920px', height: '1080px' }} className="bg-black text-white p-12 flex flex-col font-sans relative overflow-hidden">
          {/* Header */}
          <h1 className="text-8xl font-['Playfair_Display'] font-bold mb-4 uppercase tracking-wider text-white border-b-4 border-white pb-4">
            DANIA GŁÓWNE:
          </h1>

          <div className="flex-grow flex gap-12 h-full">
            {/* Col 1 */}
            <div className="w-1/2 flex flex-col gap-0 border-r border-white/20 pr-12 h-full">
              {col1.map(id => {
                const item = availableDishes.find(i => i.id === id);
                if (!item) return null;
                const isSub = isDishInSubscription(selectedDate, 'Dania', id);

                // Dynamic font sizing based on count
                const count = ids.length;
                let containerClass = "py-4";
                let nameSize = "text-4xl";
                let metaSize = "text-3xl";
                let priceSize = "text-4xl";

                if (count > 20) {
                  containerClass = "py-2";
                  nameSize = "text-3xl";
                  metaSize = "text-2xl";
                  priceSize = "text-3xl";
                }
                if (count > 26) {
                  containerClass = "py-1";
                  nameSize = "text-2xl";
                  metaSize = "text-xl";
                  priceSize = "text-2xl";
                }

                return (
                  <div key={id} className={`border-b border-white flex flex-col justify-center ${containerClass}`}>
                    <div className="flex justify-between items-end mb-1 w-full">
                      <div className="flex-1 mr-4">
                        <span className={`${nameSize} font-bold uppercase tracking-wide leading-tight ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>
                          {item.name} <span className={`${metaSize} font-normal normal-case ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>({item.portion})</span>
                          {item.isVeg && <span className={`${metaSize} font-bold text-green-500 ml-3`}>WEGE</span>}
                        </span>
                      </div>
                      <span className={`text-right ${priceSize} font-bold whitespace-nowrap mb-1 ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>{item.price.toFixed(2)} zł</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Col 2 */}
            <div className="w-1/2 flex flex-col gap-0 relative h-full">
              {col2.map(id => {
                const item = availableDishes.find(i => i.id === id);
                if (!item) return null;
                const isSub = isDishInSubscription(selectedDate, 'Dania', id);

                // Dynamic font sizing based on count (Same as Col 1)
                const count = ids.length;
                let containerClass = "py-4";
                let nameSize = "text-4xl";
                let metaSize = "text-3xl";
                let priceSize = "text-4xl";

                if (count > 20) {
                  containerClass = "py-2";
                  nameSize = "text-3xl";
                  metaSize = "text-2xl";
                  priceSize = "text-3xl";
                }
                if (count > 26) {
                  containerClass = "py-1";
                  nameSize = "text-2xl";
                  metaSize = "text-xl";
                  priceSize = "text-2xl";
                }

                return (
                  <div key={id} className={`border-b border-white flex flex-col justify-center ${containerClass}`}>
                    <div className="flex justify-between items-end mb-1 w-full">
                      <div className="flex-1 mr-4">
                        <span className={`${nameSize} font-bold uppercase tracking-wide leading-tight ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>
                          {item.name} <span className={`${metaSize} font-normal normal-case ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>({item.portion})</span>
                          {item.isVeg && <span className={`${metaSize} font-bold text-green-500 ml-3`}>WEGE</span>}
                        </span>
                      </div>
                      <span className={`text-right ${priceSize} font-bold whitespace-nowrap mb-1 ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>{item.price.toFixed(2)} zł</span>
                    </div>
                  </div>
                );
              })}

              {/* LEGEND - BOTTOM RIGHT OF RIGHT COLUMN */}
              <div className="absolute bottom-4 right-0 text-right">
                <span className="text-4xl font-extrabold text-[#F4D03F]">ŻÓŁTY - DANIA ABONAMENTOWE</span>
              </div>
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
        <div ref={zupyExportRef} style={{ width: '1920px', height: '1080px' }} className="bg-black text-white p-12 flex flex-col font-sans overflow-hidden">
          <div className="flex-grow flex gap-16 h-full">

            {/* ZUPY COLUMN */}
            <div className="w-1/2 flex flex-col h-full">
              <h1 className="text-8xl font-['Playfair_Display'] font-bold mb-4 uppercase tracking-wider text-white border-b-4 border-white pb-4">
                ZUPY:
              </h1>
              <div className="flex flex-col gap-0">
                {zupyIds.map(id => {
                  const item = availableDishes.find(i => i.id === id);
                  if (!item) return null;
                  const isSub = isDishInSubscription(selectedDate, 'Zupy', id);
                  // Font scaling for Zupy
                  const count = zupyIds.length;
                  let containerClass = "py-4";
                  let nameSize = "text-4xl";
                  let metaSize = "text-3xl";

                  if (count > 8) { containerClass = "py-2"; }
                  if (count > 12) { containerClass = "py-1"; nameSize = "text-3xl"; metaSize = "text-2xl"; }


                  return (
                    <div key={id} className={`border-b border-white flex flex-col ${containerClass}`}>
                      <div className="flex justify-between items-end mb-1 w-full">
                        <div className="flex flex-col flex-1 mr-4">
                          <span className={`${nameSize} font-bold uppercase tracking-wide leading-tight ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>
                            {item.name} <span className={`${metaSize} font-normal normal-case ${isSub ? 'text-[#F4D03F]' : 'text-white/80'}`}>({item.portion})</span>
                          </span>
                          {item.isVeg && <span className={`${metaSize} font-bold text-green-500 mt-1`}>WEGE</span>}
                        </div>
                        <span className={`text-right ${nameSize} font-bold whitespace-nowrap mb-1 ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>{item.price.toFixed(2)} zł</span>
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
                DODATKI:
              </h1>
              <div className="flex flex-col gap-0">
                {dodatkiIds.map(id => {
                  const item = availableDishes.find(i => i.id === id);
                  if (!item) return null;
                  const isSub = isDishInSubscription(selectedDate, 'Dodatki', id);
                  // Font scaling for Dodatki matches Zupy logic roughly or independent
                  const count = dodatkiIds.length;
                  let containerClass = "py-4";
                  let nameSize = "text-4xl";
                  let metaSize = "text-3xl";

                  if (count > 8) { containerClass = "py-2"; }
                  if (count > 12) { containerClass = "py-1"; nameSize = "text-3xl"; metaSize = "text-2xl"; }


                  return (
                    <div key={id} className={`border-b border-white flex flex-col ${containerClass}`}>
                      <div className="flex justify-between items-end mb-1 w-full">
                        <div className="flex flex-col flex-1 mr-4">
                          <span className={`${nameSize} font-bold uppercase tracking-wide leading-tight ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>
                            {item.name} <span className={`${metaSize} font-normal normal-case ${isSub ? 'text-[#F4D03F]' : 'text-white/80'}`}>({item.portion})</span>
                          </span>
                          {item.isVeg && <span className={`${metaSize} font-bold text-green-500 mt-1`}>WEGE</span>}
                        </div>
                        <span className={`text-right ${nameSize} font-bold whitespace-nowrap mb-1 ${isSub ? 'text-[#F4D03F]' : 'text-white'}`}>{item.price.toFixed(2)} zł</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* LEGEND - BOTTOM RIGHT (Absolute within the layout container) */}
          <div className="absolute bottom-12 right-12">
            <span className="text-4xl font-extrabold text-[#F4D03F]">ŻÓŁTY - DANIA ABONAMENTOWE</span>
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
              Kalendarz Menu TV
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
              if (!day) return <div key={`empty-${idx}`} className="h-12 border border-transparent" />;
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
              Zarządzanie TV
            </h3>
            <div className="text-4xl font-bold mb-4 font-['Playfair_Display']">{selectedDate}</div>

            <div className="flex gap-2 mb-8">
              <button
                onClick={handleImportFromMenu}
                className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all border border-white/10 text-center"
              >
                <ArrowDownToLine size={16} /> PRZENIEŚ Z MENU
              </button>
              <button
                onClick={clearDayPlan}
                className="flex-1 bg-white/10 hover:bg-red-900/50 py-3 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all border border-white/10 hover:border-red-500/30 text-center"
              >
                <Trash2 size={16} className="text-red-400" /> WYCZYŚĆ DZIEŃ
              </button>
            </div>
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, cat)}
                >
                  <SortableContext
                    items={dishIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {dishIds.map((id, index) => {
                      const dish = availableDishes.find(m => m.id === id);
                      if (!dish) return null;
                      return (
                        <SortableDishRow key={id} id={id}>
                          <div className={`group relative p-3 rounded-2xl border transition-all ${dish.isDaily ? 'bg-red-50 border-[#C32026] shadow-[0_0_10px_rgba(195,32,38,0.1)]' : 'bg-gray-50 border-gray-100 hover:border-[#C32026]'}`}>
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex-grow min-w-0">
                                <div className="text-xs font-bold text-[#4A2C2A] leading-tight flex items-center flex-wrap gap-1">
                                  {dish.isDaily && <Zap size={10} className="text-[#C32026]" />}
                                  {dish.name}
                                  {dish.isVeg && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded uppercase tracking-wider ml-1">WEGE</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0 opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setEditingDish(dish); setIsEditModalOpen(true); }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                  title="Edytuj w bazie"
                                >
                                  <Edit2 size={12} />
                                </button>

                                <button onClick={() => removeDishFromPlan(cat, id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all">
                                  <Trash2 size={12} />
                                </button>

                              </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                              <span>{dish.portion}</span>
                              <span className="text-[#C32026] font-bold">{dish.price.toFixed(2)} zł</span>
                            </div>
                          </div>
                        </SortableDishRow>
                      );
                    })}
                  </SortableContext>
                </DndContext>
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
            <div className="p-6 bg-[#4A2C2A] text-white flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold">Wybierz {showAddModal.category}</h3>
                <p className="text-xs opacity-70">Zaznacz dania, które chcesz dodać (lub edytuj bazę).</p>
              </div>
              <button onClick={() => { setShowAddModal(null); setSelectedDishIds(new Set()); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="relative mb-2">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" autoFocus placeholder={`Szukaj...`} value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#C32026] text-sm font-medium transition-all" />
              </div>

            </div>
            <div className="p-4 overflow-y-auto space-y-2 flex-grow">
              {filteredModalItems.length > 0 ? filteredModalItems.map(dish => {
                const isSelected = selectedDishIds.has(dish.id);
                return (
                  <div key={dish.id}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${dish.isDaily ? 'bg-amber-50 border-amber-200' : isSelected ? 'bg-red-50 border-[#C32026]' : 'border-gray-100 hover:border-gray-300'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDishSelection(dish.id, dish.isDaily)}
                      className={`w-5 h-5 rounded cursor-pointer ${dish.isDaily ? 'text-amber-500 focus:ring-amber-500' : 'text-[#C32026] focus:ring-[#C32026]'}`}
                    />
                    {dish.isDaily && <div className="w-5 flex justify-center"><Zap size={16} className="text-amber-500" /></div>}

                    <div className="flex-grow cursor-pointer" onClick={() => toggleDishSelection(dish.id, dish.isDaily)}>
                      <div className="font-bold text-[#4A2C2A] flex items-center gap-2">
                        {dish.name}
                        {dish.isSubDaily && (
                          <span title="Stałe w Abonamencie" className="flex items-center gap-1 text-[9px] font-bold bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded uppercase border border-pink-200">
                            <Ticket size={8} className="text-pink-600" /> W Abon.
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{dish.portion} | {dish.price.toFixed(2)} zł</div>
                    </div>


                  </div>
                )
              }) : <div className="text-center py-16 text-gray-400 italic">Brak dań w tej kategorii.</div>}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
              <div className="text-xs font-bold text-gray-500">Zaznaczono: {selectedDishIds.size}</div>
              <button
                onClick={addSelectedDishesToPlan}
                disabled={selectedDishIds.size === 0}
                className="bg-[#C32026] text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                Dodaj Zaznaczone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Board Context) */}
      <DishFormModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingDish(null); }}
        initialData={editingDish}
        onSave={(_) => {
          fetchMenuItems(); // Refresh available items
          // Ideally we'd also refresh 'planner' state if we wanted live updates, but names are fetched by ID so it works
        }}
      />

    </div>
  );
};

export default Board;
