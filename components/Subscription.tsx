
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
  Ticket,
  Edit2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import DishFormModal from './DishFormModal';

const SUB_CATEGORIES: SubCategory[] = ['Zupy', 'Dania', 'Dodatki', 'Pierogi'];

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


  // New state for available dishes (fetched from API)
  const [availableDishes, setAvailableDishes] = useState<MenuItem[]>([]);
  // Multiple selection state
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set());
  // Dish Editing
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch Data
  React.useEffect(() => {
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
    // If we have a specific order/list saved in planner, use it
    if (subPlanner[date] && subPlanner[date][category] && subPlanner[date][category].length > 0) {
      return subPlanner[date][category];
    }
    // Otherwise return just defaults (Daily items for Subscription)
    return availableDishes
      .filter(i => i.isSubDaily && (i.category as string) === category)
      .sort((a, b) => (a.subDailyOrder ?? 9999) - (b.subDailyOrder ?? 9999))
      .map(i => i.id);
  };

  const addSelectedDishesToSubPlan = () => {
    if (!showAddModal) return;
    const { category } = showAddModal;

    // Get current effective list
    const currentList = getEffectiveSubPlanIds(selectedDate, category);

    const newIds = Array.from(selectedDishIds).filter(id => !currentList.includes(id));

    if (newIds.length === 0) {
      setShowAddModal(null);
      return;
    }

    setSubPlanner(prev => ({
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

  const moveDish = (category: SubCategory, index: number, direction: 'up' | 'down') => {
    const list = getEffectiveSubPlanIds(selectedDate, category);
    if (!list || list.length < 2) return;

    const newList = [...list];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newList.length) return;

    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];

    setSubPlanner(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [category]: newList
      }
    }));
  };

  const toggleDishSelection = (id: string, isSubDaily: boolean) => {
    // Allows manual selection even if subDaily
    const newSet = new Set(selectedDishIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDishIds(newSet);
  };

  const removeDishFromSubPlan = (category: string, dishId: string) => {
    const list = getEffectiveSubPlanIds(selectedDate, category as SubCategory);
    const newList = list.filter(id => id !== dishId);

    setSubPlanner(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [category]: newList
      }
    }));
  };

  const exportSubDayMenu = () => {
    let text = `MENU ABONAMENTOWE - ${selectedDate}\n\n`;

    SUB_CATEGORIES.forEach(cat => {
      const ids = getEffectiveSubPlanIds(selectedDate, cat);
      text += `[${cat.toUpperCase()}]\n`;
      if (ids.length === 0) text += "- Brak pozycji\n";
      ids.forEach(id => {
        const dish = availableDishes.find(m => m.id === id);
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
    return availableDishes.filter(item => {
      const matchCat = (item.category as string) === showAddModal.category;
      const matchSearch = item.name.toLowerCase().includes(modalSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [showAddModal, modalSearch, availableDishes]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
                {dishIds.map((id, index) => {
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
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Reordering */}
                          <div className="flex flex-col gap-0.5 mr-1">
                            <button
                              onClick={() => moveDish(cat, index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 text-gray-300 hover:text-[#F28D91] disabled:opacity-20 disabled:hover:text-gray-300 transition-colors"
                            >
                              <ArrowUp size={10} />
                            </button>
                            <button
                              onClick={() => moveDish(cat, index, 'down')}
                              disabled={index === dishIds.length - 1}
                              className="p-0.5 text-gray-300 hover:text-[#F28D91] disabled:opacity-20 disabled:hover:text-gray-300 transition-colors"
                            >
                              <ArrowDown size={10} />
                            </button>
                          </div>

                          <button
                            onClick={() => { setEditingDish(dish); setIsEditModalOpen(true); }}
                            className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all"
                            title="Edytuj w bazie"
                          >
                            <Edit2 size={12} />
                          </button>
                          {!dish.isSubDaily && (
                            <button onClick={() => removeDishFromSubPlan(cat, id)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
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
                    // Clean selection
                    setSelectedDishIds(new Set());
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
              <button onClick={() => { setShowAddModal(null); setSelectedDishIds(new Set()); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="relative mb-2">
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

            <div className="p-4 overflow-y-auto space-y-2 flex-grow">
              {filteredModalItems.length > 0 ? (
                filteredModalItems.map(dish => {
                  const isAlreadyDaily = dish.isSubDaily; // "Already Daily" in THIS planner (Subscription)
                  const isMenuDaily = dish.isDaily; // Constant in the OTHER planner (Menu)
                  const isSelected = selectedDishIds.has(dish.id);
                  return (
                    <div
                      key={dish.id}
                      className={`p-4 rounded-2xl border flex items-center gap-4 transition-all group ${isAlreadyDaily ? 'bg-pink-50 border-pink-200' : isSelected ? 'bg-pink-50 border-[#F28D91]' : 'border-gray-100 hover:border-[#F28D91] cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDishSelection(dish.id, dish.isSubDaily)}
                        className={`w-5 h-5 rounded cursor-pointer ${isAlreadyDaily ? 'text-pink-500 focus:ring-pink-500' : 'text-[#F28D91] focus:ring-[#F28D91]'}`}
                      />
                      {isAlreadyDaily && <div className="w-5 flex justify-center"><Zap size={16} className="text-gray-400" /></div>}

                      <div className="flex-grow cursor-pointer" onClick={() => !isAlreadyDaily && toggleDishSelection(dish.id, dish.isSubDaily)}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`font-bold transition-colors ${isAlreadyDaily ? 'text-gray-400' : 'text-[#4A2C2A]'}`}>
                            {dish.name}
                          </div>
                          {dish.isVeg && <span className="text-[9px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded uppercase">wege</span>}
                          {dish.isSubDaily && <span className="text-[9px] font-bold bg-[#F28D91] text-white px-1.5 py-0.5 rounded uppercase">stałe abon.</span>}
                          {isMenuDaily && (
                            <span title="Stałe w Menu Głównym" className="flex items-center gap-1 text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase border border-orange-200">
                              <Zap size={8} className="text-orange-600" /> W Menu
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {dish.portion}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-gray-400 italic">Brak dań w tej kategorii.</div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
              <div className="text-xs font-bold text-gray-500">Zaznaczono: {selectedDishIds.size}</div>
              <button
                onClick={addSelectedDishesToSubPlan}
                disabled={selectedDishIds.size === 0}
                className="bg-[#C32026] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                Dodaj Zaznaczone
              </button>
            </div>
          </div>
        </div>
      )}

      <DishFormModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingDish(null); }}
        initialData={editingDish}
        onSave={() => {
          fetchMenuItems();
        }}
      />
    </div>
  );
};

export default Subscription;
