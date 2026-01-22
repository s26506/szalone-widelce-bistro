import React, { useState } from 'react';
import { MENU_ITEMS } from '../constants';
import { Plus, Edit2, Trash2, Search, Leaf, Zap, Ticket, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import DishFormModal from './DishFormModal';

const Dishes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dishes, setDishes] = useState<typeof MENU_ITEMS>([]);
  const [editingDish, setEditingDish] = useState<typeof MENU_ITEMS[0] | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'popularity-desc' | 'popularity-asc'>('asc');

  // Stats State
  const [plannerData, setPlannerData] = useState<any>({});
  // Default to last 14 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const fetchDishes = () => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        // Calculate stats first if needed, but we do it on render or memo
        // Just set raw data
        sortAndSetDishes(data, sortOrder);
      })
      .catch(err => console.error('Failed to load menu:', err));
  };

  const fetchPlanner = () => {
    fetch('/api/planner')
      .then(res => res.json())
      .then(data => setPlannerData(data))
      .catch(err => console.error('Failed to load planner data', err));
  };

  const getUsageCount = (dishId: string) => {
    let count = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    Object.keys(plannerData).forEach(dateStr => {
      const date = new Date(dateStr);
      if (date >= start && date <= end) {
        const dayPlan = plannerData[dateStr];
        Object.values(dayPlan).forEach((dishIds: any) => {
          if (Array.isArray(dishIds) && dishIds.includes(dishId)) {
            count++;
          }
        });
      }
    });
    return count;
  };

  const getEffectiveUsageCount = (item: any) => {
    // Exclude daily items from stats as requested
    if (item.isDaily) return 0;
    return getUsageCount(item.id);
  };

  const sortAndSetDishes = (items: any[], order: string) => {
    let sorted = [...items];
    switch (order) {
      case 'asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
        break;
      case 'desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'pl'));
        break;
      case 'popularity-desc':
        sorted.sort((a, b) => getEffectiveUsageCount(b) - getEffectiveUsageCount(a));
        break;
      case 'popularity-asc':
        sorted.sort((a, b) => getEffectiveUsageCount(a) - getEffectiveUsageCount(b));
        break;
    }
    setDishes(sorted);
  };

  // Re-sort when dependencies change
  React.useEffect(() => {
    // We need to pass current dishes state to sort to avoid re-fetching, 
    // but simplified: just re-sort current 'dishes' if available, otherwise fetch will handle it.
    if (dishes.length > 0) {
      sortAndSetDishes(dishes, sortOrder);
    }
  }, [sortOrder, plannerData, startDate, endDate]);

  // Initial Load
  React.useEffect(() => {
    fetchPlanner();
    fetchDishes();
    // Use interval to refresh planner data occasionally? No need for now.
  }, []);

  const handleEdit = (item: any) => {
    setEditingDish(item);
    setIsAddModalOpen(true);
  };

  // Handling click outside could be added here for perfection, 
  // but for now a simple toggle is enough.



  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć danie: ${name}?`)) return;

    try {
      const response = await fetch(`/api/menu?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchDishes();
      } else {
        alert('Nie udało się usunąć dania.');
      }
    } catch (e) {
      console.error(e);
      alert('Bład połączenia/usuwania');
    }
  };

  const filteredDishes = dishes.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500 relative">
      {/* ADD MODAL */}
      <DishFormModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingDish(null); }}
        initialData={editingDish}
        onSave={fetchDishes}
      />

      <div className="p-8 border-b border-gray-100 bg-gray-50/50">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-[#4A2C2A]">Baza Wszystkich Dań</h2>
          <p className="text-gray-500">Zarządzaj statusem dań w menu głównym oraz abonamentowym.</p>
        </div>

        <div className="flex flex-col xl:flex-row items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="bg-white text-gray-600 px-4 py-3 rounded-xl font-bold flex items-center gap-2 border border-gray-200 hover:bg-gray-50 transition-all shadow-sm active:scale-95 min-w-[180px] justify-between"
              >
                <span className="flex items-center gap-2">
                  {sortOrder === 'asc' && <><ArrowDownAZ size={20} /> Nazwa A-Z</>}
                  {sortOrder === 'desc' && <><ArrowUpAZ size={20} /> Nazwa Z-A</>}
                  {sortOrder === 'popularity-desc' && <><Zap size={20} className="text-yellow-500" /> Najpopularniejsze</>}
                  {sortOrder === 'popularity-asc' && <><Zap size={20} className="text-gray-400" /> Najrzadsze</>}
                </span>
              </button>

              {isSortMenuOpen && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 space-y-1">
                    <button onClick={() => { setSortOrder('asc'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors ${sortOrder === 'asc' ? 'bg-red-50 text-[#C32026]' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <ArrowDownAZ size={18} /> Nazwa A-Z
                    </button>
                    <button onClick={() => { setSortOrder('desc'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors ${sortOrder === 'desc' ? 'bg-red-50 text-[#C32026]' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <ArrowUpAZ size={18} /> Nazwa Z-A
                    </button>
                    <button onClick={() => { setSortOrder('popularity-desc'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors ${sortOrder === 'popularity-desc' ? 'bg-red-50 text-[#C32026]' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <Zap size={18} className="text-yellow-500" /> Najpopularniejsze
                    </button>
                    <button onClick={() => { setSortOrder('popularity-asc'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors ${sortOrder === 'popularity-asc' ? 'bg-red-50 text-[#C32026]' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <Zap size={18} className="text-gray-400" /> Najrzadsze
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase">Statystyki od:</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm font-bold text-[#4A2C2A] outline-none" />
              <span className="text-gray-400">-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm font-bold text-[#4A2C2A] outline-none" />
            </div>
          </div>

          <div className="flex-grow"></div>

          <button
            onClick={() => {
              setEditingDish(null);
              setIsAddModalOpen(true);
            }}
            className="bg-[#C32026] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-md active:scale-95 w-full md:w-auto justify-center"
          >
            <Plus size={20} /> Dodaj Nowe Danie
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Szukaj po nazwie, kategorii lub typie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-[#C32026] focus:bg-white transition-all font-medium"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100">
                <th className="pb-4 px-4">Nazwa i Status</th>
                <th className="pb-4 px-4">Kategoria</th>
                <th className="pb-4 px-4">Gramatura</th>
                <th className="pb-4 px-4 text-center">Stałe Menu</th>
                <th className="pb-4 px-4 text-center w-32">Wystąpienia<br /><span className="text-[9px] font-normal opacity-70">w wybranym okresie</span></th>
                <th className="pb-4 px-4 text-center">Stałe Abon.</th>
                <th className="pb-4 px-4 text-right">Cena</th>
                <th className="pb-4 px-4 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDishes.map(item => (
                <tr key={item.id} className="group hover:bg-red-50/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#4A2C2A]">{item.name}</span>
                      {item.isVeg && (
                        <span className="flex items-center gap-1 text-[9px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          <Leaf size={10} /> WEGE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium text-gray-600 text-sm">{item.portion}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      {item.isDaily ? (
                        <div title="Stałe w Menu">
                          <Zap size={18} className="text-[#C32026]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-gray-200" />
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {!item.isDaily && (
                      <span className={`inline-flex items-center justify-center min-w-[30px] h-8 px-2 rounded-full text-xs font-bold ${getUsageCount(item.id) > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
                        {getUsageCount(item.id)}
                      </span>
                    )}
                    {item.isDaily && <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      {item.isSubDaily ? (
                        <div title="Stałe w Abonamencie">
                          <Ticket size={18} className="text-[#F28D91]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-gray-200" />
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-[#C32026] whitespace-nowrap">{item.price.toFixed(2)} zł</td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edytuj"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Usuń"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDishes.length === 0 && (
          <div className="text-center py-20 text-gray-400 italic">Baza danych jest pusta lub brak wyników wyszukiwania.</div>
        )}
      </div>
    </div>
  );
};

export default Dishes;
