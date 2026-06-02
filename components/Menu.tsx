
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
  UtensilsCrossed,
  Edit2
} from 'lucide-react';
import DishFormModal from './DishFormModal';
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

const CATEGORIES: MenuCategory[] = ['Zupy', 'Dodatki', 'Dania', 'Pierogi', 'Sałatki'];

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Menu: React.FC<MenuProps> = ({ apiEndpoint, mode }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  const isSubscriptionMode = mode === "subscription";
  const [planner, setPlanner] = useState<FullPlannerState>({});
  const [showAddModal, setShowAddModal] = useState<{ category: MenuCategory } | null>(null);

  // Data State
  const [availableDishes, setAvailableDishes] = useState<MenuItem[]>([]);
  // Multi-select & Edit
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch Menu Items
  const fetchMenuItems = () => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        setAvailableDishes(data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'pl')));
      })
      .catch(err => console.error('Failed to load menu items', err));
  };

  React.useEffect(() => {
    fetchMenuItems();
  }, []);

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
    // If planner has saved state, use it as source of truth for order
    if (planner[date] && planner[date][category]) {
      return planner[date][category];
    }
    return [];
  };

  const fillDailyPlan = () => {
    if (!confirm('Czy na pewno chcesz uzupełnić stałe pozycje dla tego dnia?')) return;

    // Group automatic items by category
    const updates: any = { ...planner[selectedDate] };

    // Determine categories based on mode
    const cats = isSubscriptionMode ? ['Zupy', 'Dania', 'Dodatki'] : CATEGORIES;

    cats.forEach((cat: any) => {
      const currentIds = updates[cat] || [];
      const automaticIds = !isSubscriptionMode
        ? availableDishes
          .filter(i => i.isDaily && i.category === cat)
          .sort((a, b) => (a.dailyOrder ?? 9999) - (b.dailyOrder ?? 9999))
          .map(i => i.id)
        : availableDishes
          .filter(i => i.isSubDaily && i.category === cat)
          .sort((a, b) => (a.subDailyOrder ?? 9999) - (b.subDailyOrder ?? 9999))
          .map(i => i.id);

      // Merge unique
      const merged = Array.from(new Set([...currentIds, ...automaticIds]));
      updates[cat] = merged;
    });

    setPlanner(prev => ({
      ...prev,
      [selectedDate]: updates
    }));
  };

  const clearDayPlan = () => {
    if (!confirm(`Czy na pewno wyczyścić cały plan na dzień ${selectedDate}?`)) return;
    setPlanner(prev => ({
      ...prev,
      [selectedDate]: {}
    }));
  };

  const getFontSize = (count: number) => {
    if (count > 10) return 'text-sm';
    if (count > 7) return 'text-base';
    if (count > 5) return 'text-lg';
    return 'text-xl';
  };

  const addSelectedDishesToPlan = () => {
    if (!showAddModal) return;
    const { category } = showAddModal;

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
        ...prev[selectedDate],
        [category]: newList
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

    // 1. Filter
    const filtered = availableDishes.filter(item => {
      const matchCat = item.category === showAddModal.category;
      const matchSearch = item.name.toLowerCase().includes(modalSearch.toLowerCase());
      return matchCat && matchSearch;
    });

    // 2. Sort
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [showAddModal, modalSearch, availableDishes]);

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
    ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-5";

  // Helper to remove price/weight info from names for Subscription Export
  const cleanDishName = (name: string) => {
    return name
      .replace(/\s*\(\s*\d+\s*szt\.?\s*\)/gi, '') // Specific remove for (Xszt)
      .replace(/\s*\d+([.,]\d+)?\s*(zł|zl|g|ml|kg|szt\.?)\s*/gi, '') // Remove prices & units
      .replace(/\s*\(\s*\)\s*/g, '') // Remove empty parens
      .replace(/\s+-\s+$/, '') // Remove trailing dash
      .trim();
  };


  return (
    <>
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

                  <div className="grid grid-cols-3 gap-8 items-start w-full px-8">
                    {/* ZUPY */}
                    <div className="flex flex-col gap-4">
                      <h3 className="text-4xl mb-4 text-white text-center opacity-90 font-serif tracking-wider font-bold">Zupy</h3>
                      <ul className="space-y-0 font-sans font-light tracking-wide text-2xl">
                        {getEffectiveDayPlanIds(selectedDate, 'Zupy').map(id => {
                          const item = availableDishes.find(i => i.id === id);
                          if (!item) return null;
                          return (
                            <li key={id} className="text-white/90 text-left py-2 border-b border-white/20 last:border-0 font-bold block">
                              {cleanDishName(item.name)}
                              {item.isVeg && <span className="text-[#C32026] text-[0.7em] font-black ml-2 align-middle">WEGE</span>}
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
                          const item = availableDishes.find(i => i.id === id);
                          if (!item) return null;
                          return (
                            <li key={id} className="text-white/90 text-left py-2 border-b border-white/20 last:border-0 font-bold block">
                              {cleanDishName(item.name)}

                              {item.isVeg && <span className="text-[#C32026] text-[0.7em] font-black ml-2 align-middle">WEGE</span>}
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
                          const item = availableDishes.find(i => i.id === id);
                          if (!item) return null;
                          return (
                            <li key={id} className="text-white/90 text-left py-2 border-b border-white/20 last:border-0 font-bold block">
                              {cleanDishName(item.name)}
                              {item.isVeg && <span className="text-[#C32026] text-[0.7em] font-black ml-2 align-middle">WEGE</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 text-center pb-4">
                    <p className="text-2xl text-white/90 font-sans tracking-wide mb-4">
                      oraz dowolna surówka (130g) i kompot wieloowocowy
                    </p>
                  </div>

                  {/* Stopka z grafiką abonamentową (USUNIĘTO) */}
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
                                const item = availableDishes.find(i => i.id === id);
                                if (!item) return null;
                                return (
                                  <li key={id} className="grid grid-cols-[1fr_auto] gap-4 items-end border-b border-white/10 pb-1">
                                    <div className="text-left min-w-0">
                                      <span className="text-white/90 font-bold leading-tight decoration-clone">
                                        {item.name}
                                        {item.isVeg && <span className="text-[#C32026] text-[0.7em] font-black ml-2 align-middle">WEGE</span>}
                                      </span>
                                    </div>
                                    <span className="text-white/90 text-right whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
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
                              const item = availableDishes.find(i => i.id === id);
                              if (!item) return null;
                              return (
                                <li key={id} className="grid grid-cols-[1fr_auto] gap-4 items-end border-b border-white/10 pb-1">
                                  <div className="text-left min-w-0">
                                    <span className="text-white/90 font-bold leading-tight decoration-clone">
                                      {item.name}
                                      {item.isVeg && <span className="text-[#C32026] text-[0.7em] font-black ml-2 align-middle">WEGE</span>}
                                    </span>
                                  </div>
                                  <span className="text-white/90 text-right whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
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
                                const item = availableDishes.find(i => i.id === id);
                                if (!item) return null;
                                return (
                                  <li key={id} className="grid grid-cols-[1fr_auto] gap-4 items-end border-b border-white/10 pb-1">
                                    <div className="text-left min-w-0">
                                      <span className="text-white/90 font-bold leading-tight decoration-clone">
                                        {item.name}
                                        {item.isVeg && <span className="text-[#C32026] text-[0.7em] font-black ml-2 align-middle">WEGE</span>}
                                      </span>
                                    </div>
                                    <span className="text-white/90 text-right whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
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
                                const item = availableDishes.find(i => i.id === id);
                                if (!item) return null;
                                return (
                                  <li key={id} className="grid grid-cols-[1fr_auto] gap-4 items-end border-b border-white/10 pb-1">
                                    <div className="text-left min-w-0">
                                      <span className="text-white/80 font-bold leading-tight decoration-clone">
                                        {item.name}
                                        {item.isVeg && <span className="text-[#C32026] text-[0.7em] font-black ml-2 align-middle">WEGE</span>}
                                      </span>
                                    </div>
                                    <span className="text-white/80 text-right whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
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
                                const item = availableDishes.find(i => i.id === id);
                                if (!item) return null;
                                return (
                                  <li key={id} className="grid grid-cols-[1fr_auto] gap-4 items-end border-b border-white/10 pb-1">
                                    <div className="text-left min-w-0">
                                      <span className="text-white/80 font-bold leading-tight decoration-clone">
                                        {item.name}
                                        {item.isVeg && <span className="text-[#C32026] text-xs ml-2 font-black align-middle">WEGE</span>}
                                      </span>
                                    </div>
                                    <span className="text-white/80 text-right whitespace-nowrap">{item.price.toFixed(2)}zł/{item.portion}</span>
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
                if (!day) return <div key={`empty-${idx}`} className="h-12 border border-transparent" />;

                const dateStr = getLocalDateString(day);
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

              <div className="flex gap-2 mb-4">
                <button onClick={fillDailyPlan} className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all border border-white/10 group">
                  <Zap size={16} className="text-[#F28D91] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] opacity-80 group-hover:opacity-100">UZUPEŁNIJ</span>
                </button>
                <button onClick={clearDayPlan} className="flex-1 bg-white/10 hover:bg-red-900/50 py-3 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all border border-white/10 hover:border-red-500/30 group">
                  <Trash2 size={16} className="text-red-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] opacity-80 group-hover:opacity-100">WYCZYŚĆ</span>
                </button>
              </div>

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
                            <div className={`group relative p-3 rounded-2xl border transition-all ${(dish.isDaily && !isSubscriptionMode) || (dish.isSubDaily && isSubscriptionMode) ? 'bg-red-50 border-[#C32026] shadow-[0_0_10px_rgba(195,32,38,0.1)]' : 'bg-gray-50 border-gray-100 hover:border-[#C32026]'}`}>
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex-grow min-w-0">
                                  <div className="text-xs font-bold text-[#4A2C2A] leading-tight flex items-center flex-wrap gap-1">
                                    {dish.isDaily && !isSubscriptionMode && <Zap size={10} className="text-[#C32026]" />}
                                    {dish.isSubDaily && isSubscriptionMode && <Zap size={10} className="text-[#F28D91]" />}
                                    {dish.name}
                                    {dish.isVeg && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded uppercase tracking-wider ml-1">WEGE</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 opacity-100 transition-opacity">
                                  {/* No Arrows - pure Drag and Drop */}
                                  <button
                                    onClick={() => { setEditingDish(dish); setIsEditModalOpen(true); }}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                    title="Edytuj w bazie"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  {/* Only show delete if NOT an automatic daily dish for current mode */}

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

                  <button onClick={() => { setShowAddModal({ category: cat }); setModalSearch(''); setSelectedDishIds(new Set()); }} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-400 hover:border-[#C32026] hover:text-[#C32026] transition-all group">
                    <Plus size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Dodaj</span>
                  </button>
                </div>
              </div >
            );
          })}
        </div >
      </div>

      {
        showAddModal && (
          <div className="fixed inset-0 top-0 left-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-6 bg-[#4A2C2A] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Wybierz {showAddModal.category}</h3>
                  <p className="text-xs opacity-70">Dodaj do menu na {selectedDate}</p>
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
                        <div className="font-bold text-[#4A2C2A]">{dish.name}</div>
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
        )
      }

      {/* Edit Modal */}
      <DishFormModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingDish(null); }}
        initialData={editingDish}
        onSave={() => {
          fetchMenuItems();
        }}
      />
    </>
  );
};

export default Menu;
