
import React, { useState, useMemo } from 'react';
import { MENU_ITEMS } from '../constants';
import { SubCategory, FullPlannerState, MenuItem, DailyMenu } from '../types';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Zap,
  Ticket
} from 'lucide-react';

const SUB_CATEGORIES: SubCategory[] = ['Zupy', 'Dania', 'Dodatki'];

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Subscription: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  const [subPlanner, setSubPlanner] = useState<FullPlannerState>({});
  const [showAddModal, setShowAddModal] = useState<{ category: SubCategory } | null>(null);
  const [modalSearch, setModalSearch] = useState('');

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

  const getEffectiveSubPlanIds = (date: string, category: SubCategory) => {
    const subDailyIds = MENU_ITEMS.filter(i => i.isSubDaily && (i.category as string) === category).map(i => i.id);
    const scheduledIds = (subPlanner[date] && subPlanner[date][category]) || [];
    return Array.from(new Set([...subDailyIds, ...scheduledIds]));
  };

  const addDishToSubPlan = (dishId: string) => {
    if (!showAddModal) return;
    const { category } = showAddModal;

    const dish = MENU_ITEMS.find(i => i.id === dishId);
    if (dish?.isSubDaily) {
      setShowAddModal(null);
      return;
    }

    setSubPlanner(prev => {
      const dayPlan = prev[selectedDate] || {};
      const catList = dayPlan[category] || [];
      if (catList.includes(dishId)) return prev;

      return {
        ...prev,
        [selectedDate]: {
          ...dayPlan,
          [category]: [...catList, dishId]
        }
      };
    });
    setShowAddModal(null);
    setModalSearch('');
  };

  const removeDishFromSubPlan = (category: string, dishId: string) => {
    setSubPlanner(prev => {
      const dayPlan = prev[selectedDate] || {};
      const catList = dayPlan[category] || [];
      return {
        ...prev,
        [selectedDate]: {
          ...dayPlan,
          [category]: catList.filter(id => id !== dishId)
        }
      };
    });
  };

  const exportSubDayMenu = () => {
    let text = `MENU ABONAMENTOWE - ${selectedDate}\n\n`;

    SUB_CATEGORIES.forEach(cat => {
      const ids = getEffectiveSubPlanIds(selectedDate, cat);
      text += `[${cat.toUpperCase()}]\n`;
      if (ids.length === 0) text += "- Brak pozycji\n";
      ids.forEach(id => {
        const dish = MENU_ITEMS.find(m => m.id === id);
        if (dish) text += `- ${dish.name} ${dish.isVeg ? '(WEGE)' : ''} ${dish.isSubDaily ? '[STAŁE W ABON.]' : ''} | ${dish.portion}\n`;
      });
      text += "\n";
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abonament_${selectedDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredModalItems = useMemo(() => {
    if (!showAddModal) return [];
    return MENU_ITEMS.filter(item =>
      (item.category as string) === showAddModal.category &&
      item.name.toLowerCase().includes(modalSearch.toLowerCase())
    );
  }, [showAddModal, modalSearch]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#4A2C2A] flex items-center gap-2">
              <CalendarIcon size={20} className="text-[#F28D91]" />
              Planer Abonamentowy
            </h2>
            <div className="flex items-center gap-4">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="font-bold text-[#4A2C2A] min-w-[140px] text-center capitalize">
                {currentMonth.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-2">{d}</div>
            ))}
            {daysInMonth.map((day, idx) => {
              const dateStr = getLocalDateString(day);
              const isSelected = selectedDate === dateStr;
              const hasPlan = SUB_CATEGORIES.some(cat => getEffectiveSubPlanIds(dateStr, cat).length > 0);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected
                    ? 'bg-[#F28D91] border-[#F28D91] text-white shadow-md z-10'
                    : 'bg-white border-gray-100 hover:border-[#F28D91] text-gray-700'
                    }`}
                >
                  <span className="text-sm font-bold">{day.getDate()}</span>
                  {hasPlan && (
                    <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#F28D91]'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#C32026] rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/70 mb-2">Abonamenty</h3>
            <div className="text-4xl font-bold mb-4 font-['Playfair_Display']">{selectedDate}</div>
            <p className="opacity-80 text-sm leading-relaxed mb-6">
              Planowanie menu dla klientów abonamentowych. Niektóre pozycje są stałe i wyświetlają się automatycznie.
            </p>
          </div>
          <button
            onClick={exportSubDayMenu}
            className="w-full bg-[#4A2C2A] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
          >
            <Download size={20} /> EKSPORTUJ MENU ABON.
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUB_CATEGORIES.map(cat => {
          const dishIds = getEffectiveSubPlanIds(selectedDate, cat);
          return (
            <div key={cat} className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col min-h-[350px]">
              <div className="p-4 border-b border-gray-50 bg-pink-50/30 rounded-t-3xl flex justify-between items-center">
                <h3 className="font-bold text-[#4A2C2A] flex items-center gap-2 uppercase text-lg tracking-wider">
                  <Ticket size={18} className="text-[#F28D91]" />
                  {cat}
                </h3>
                <span className="text-xs font-bold text-gray-400">{dishIds.length}</span>
              </div>

              <div className="p-4 flex-grow space-y-3 overflow-y-auto max-h-[450px]">
                {dishIds.map(id => {
                  const dish = MENU_ITEMS.find(m => m.id === id);
                  if (!dish) return null;
                  return (
                    <div key={id} className={`group relative p-4 rounded-2xl border transition-all ${dish.isSubDaily ? 'bg-pink-50/50 border-pink-100' : 'bg-gray-50 border-gray-100 hover:border-[#F28D91]'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-grow min-w-0">
                          <div className="text-sm font-bold text-[#4A2C2A] leading-tight flex items-center flex-wrap gap-1">
                            {dish.isSubDaily && (
                              <span title="Stałe w Abonamencie" className="flex items-center">
                                <Zap size={10} className="text-[#F28D91]" />
                              </span>
                            )}
                            {dish.name}
                            {dish.isVeg && <span className="text-[7px] bg-green-100 text-green-700 px-1 rounded uppercase">wege</span>}
                          </div>
                        </div>
                        {!dish.isSubDaily && (
                          <button
                            onClick={() => removeDishFromSubPlan(cat, id)}
                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100 ml-1 flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        {dish.portion}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => {
                    setShowAddModal({ category: cat });
                    setModalSearch('');
                  }}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-300 hover:border-[#F28D91] hover:text-[#F28D91] transition-all group"
                >
                  <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-wider">Dodaj do abonamentu</span>
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
                <h3 className="text-xl font-bold">Abonament: {showAddModal.category}</h3>
                <p className="text-xs opacity-70">Wybierz dania dla klientów z pakietem</p>
              </div>
              <button onClick={() => setShowAddModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder={`Szukaj w kategorii ${showAddModal.category}...`}
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#F28D91] text-sm font-medium transition-all"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2">
              {filteredModalItems.length > 0 ? (
                filteredModalItems.map(dish => {
                  const isAlreadyDaily = dish.isSubDaily;
                  return (
                    <div
                      key={dish.id}
                      onClick={() => !isAlreadyDaily && addDishToSubPlan(dish.id)}
                      className={`p-4 rounded-2xl border flex items-center gap-4 transition-all group ${isAlreadyDaily ? 'bg-gray-50 opacity-60 cursor-not-allowed border-transparent' : 'hover:bg-pink-50 border-transparent hover:border-[#F28D91] cursor-pointer'}`}
                    >
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`font-bold transition-colors ${isAlreadyDaily ? 'text-gray-400' : 'text-[#4A2C2A] group-hover:text-[#F28D91]'}`}>
                            {dish.name}
                          </div>
                          {dish.isVeg && <span className="text-[9px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded uppercase">wege</span>}
                          {dish.isSubDaily && <span className="text-[9px] font-bold bg-[#F28D91] text-white px-1.5 py-0.5 rounded uppercase">stałe abon.</span>}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {dish.portion}
                        </div>
                      </div>
                      {!isAlreadyDaily ? (
                        <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:bg-[#F28D91] group-hover:text-white group-hover:border-[#F28D91] transition-all shadow-sm">
                          <Plus size={20} />
                        </div>
                      ) : (
                        <Zap size={20} className="text-gray-300 mr-2" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-gray-400 italic">Brak dań w tej kategorii.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;
