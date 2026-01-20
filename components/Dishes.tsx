
import React, { useState } from 'react';
import { MENU_ITEMS } from '../constants';
import { Plus, Edit2, Trash2, Search, Leaf, Zap, Ticket } from 'lucide-react';

const Dishes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dishes, setDishes] = useState<typeof MENU_ITEMS>([]);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  // Form State
  const [newDish, setNewDish] = useState({
    name: '',
    category: 'Dania',
    price: '',
    portionQuantity: '',
    portionUnit: 'g', // Default unit
    isDaily: false,
    isSubDaily: false
  });

  const fetchDishes = () => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        // Sort alphabetically by name
        const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'pl'));
        setDishes(sorted);
      })
      .catch(err => console.error('Failed to load menu:', err));
  };

  // Load initial data from API
  React.useEffect(() => {
    fetchDishes();
  }, []);

  const handleSaveDish = async () => {
    if (!newDish.name || !newDish.price || !newDish.portionQuantity) {
      alert('Wypełnij wszystkie pola!');
      return;
    }

    try {
      const url = '/api/menu';
      const method = editingDishId ? 'PUT' : 'POST';
      // Concatenate quantity and unit (lowercase, no space)
      const portion = `${newDish.portionQuantity}${newDish.portionUnit.toLowerCase()}`;

      const body = {
        ...(editingDishId ? { id: editingDishId } : {}),
        name: newDish.name,
        category: newDish.category,
        price: parseFloat(newDish.price),
        portion: portion,
        isDaily: newDish.isDaily,
        isSubDaily: newDish.isSubDaily,
        isVeg: false
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setIsAddModalOpen(false);
        setEditingDishId(null);
        setNewDish({ name: '', category: 'Dania', price: '', portionQuantity: '', portionUnit: 'g', isDaily: false, isSubDaily: false });
        fetchDishes(); // Refresh list without reload
      } else {
        alert('Błąd zapisu');
      }
    } catch (e) {
      console.error(e);
      alert('Błąd połączenia');
    }
  };

  const handleEdit = (item: any) => {
    setEditingDishId(item.id);

    // Parse portion string (e.g., "400g" -> "400", "g")
    const match = item.portion.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    const quantity = match ? match[1] : item.portion;
    const unit = match ? match[2] : '';

    setNewDish({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      portionQuantity: quantity,
      portionUnit: unit || 'g',
      isDaily: !!item.isDaily,
      isSubDaily: !!item.isSubDaily
    });
    setIsAddModalOpen(true);
  };

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
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-[#4A2C2A] mb-6">
              {editingDishId ? 'Edytuj Danie' : 'Dodaj Nowe Danie'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nazwa Dania</label>
                <input
                  type="text"
                  value={newDish.name}
                  onChange={e => setNewDish({ ...newDish, name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C32026] outline-none"
                  placeholder="np. Kotlet Schabowy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Kategoria</label>
                  <select
                    value={newDish.category}
                    onChange={e => setNewDish({ ...newDish, category: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C32026] outline-none"
                  >
                    {['Zupy', 'Dania', 'Dodatki', 'Pierogi', 'Sałatki'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cena (zł)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDish.price}
                    onChange={e => setNewDish({ ...newDish, price: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C32026] outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Porcja</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDish.portionQuantity}
                    onChange={e => setNewDish({ ...newDish, portionQuantity: e.target.value })}
                    className="flex-1 p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C32026] outline-none"
                    placeholder="Ilość (np. 400)"
                  />
                  <select
                    value={newDish.portionUnit}
                    onChange={e => setNewDish({ ...newDish, portionUnit: e.target.value })}
                    className="w-24 p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C32026] outline-none"
                  >
                    {/* Standard units */}
                    {['g', 'ml', 'szt', 'kg', 'l'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    {/* Fallback for others if editing */}
                    {!['g', 'ml', 'szt', 'kg', 'l'].includes(newDish.portionUnit) && (
                      <option value={newDish.portionUnit}>{newDish.portionUnit}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDish.isDaily}
                    onChange={e => setNewDish({ ...newDish, isDaily: e.target.checked })}
                    className="w-5 h-5 rounded text-[#C32026] focus:ring-[#C32026]"
                  />
                  <span className="text-sm font-medium text-gray-700">Stałe w Menu</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDish.isSubDaily}
                    onChange={e => setNewDish({ ...newDish, isSubDaily: e.target.checked })}
                    className="w-5 h-5 rounded text-[#C32026] focus:ring-[#C32026]"
                  />
                  <span className="text-sm font-medium text-gray-700">Stałe w Abon.</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingDishId(null);
                  setNewDish({ name: '', category: 'Dania', price: '', portionQuantity: '', portionUnit: 'g', isDaily: false, isSubDaily: false });
                }}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveDish}
                className="flex-1 py-3 bg-[#C32026] hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all"
              >
                {editingDishId ? 'Zaktualizuj' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/50">
        <div>
          <h2 className="text-3xl font-bold text-[#4A2C2A]">Baza Wszystkich Dań</h2>
          <p className="text-gray-500">Zarządzaj statusem dań w menu głównym oraz abonamentowym.</p>
        </div>
        <button
          onClick={() => {
            setEditingDishId(null);
            setNewDish({ name: '', category: 'Dania', price: '', portionQuantity: '', portionUnit: 'g', isDaily: false, isSubDaily: false });
            setIsAddModalOpen(true);
          }}
          className="bg-[#C32026] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-md active:scale-95"
        >
          <Plus size={20} /> Dodaj Nowe Danie
        </button>
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
