
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MenuItem } from '../types';

interface DishFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: MenuItem | null;
    onSave: (savedItem: MenuItem) => void; // Callback to refresh data after save
}

const DishFormModal: React.FC<DishFormModalProps> = ({ isOpen, onClose, initialData, onSave }) => {
    const [newDish, setNewDish] = useState({
        name: '',
        category: 'Dania',
        price: '',
        portionQuantity: '',
        portionUnit: 'g',
        isDaily: false,
        isSubDaily: false,
        isVeg: false
    });

    useEffect(() => {
        if (initialData) {
            // Parse portion string (e.g., "400g" -> "400", "g")
            const match = initialData.portion.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
            const quantity = match ? match[1] : initialData.portion;
            const unit = match ? match[2] : '';

            setNewDish({
                name: initialData.name,
                category: initialData.category,
                price: initialData.price.toString(),
                portionQuantity: quantity,
                portionUnit: unit || 'g',
                isDaily: !!initialData.isDaily,
                isSubDaily: !!initialData.isSubDaily,
                isVeg: !!initialData.isVeg
            });
        } else {
            // Reset for add mode
            setNewDish({ name: '', category: 'Dania', price: '', portionQuantity: '', portionUnit: 'g', isDaily: false, isSubDaily: false, isVeg: false });
        }
    }, [initialData, isOpen]);

    const handleSave = async () => {
        if (!newDish.name || !newDish.price || !newDish.portionQuantity) {
            alert('Wypełnij wszystkie pola!');
            return;
        }

        try {
            const url = '/api/menu';
            const method = initialData ? 'PUT' : 'POST';
            const portion = `${newDish.portionQuantity}${newDish.portionUnit.toLowerCase()}`;

            const body = {
                ...(initialData ? { id: initialData.id } : {}),
                name: newDish.name.trim().charAt(0).toUpperCase() + newDish.name.trim().slice(1),
                category: newDish.category,
                price: parseFloat(newDish.price),
                portion: portion,
                isDaily: newDish.isDaily,
                isSubDaily: newDish.isSubDaily,
                isVeg: newDish.isVeg
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                // Return the actual item from server to ensure we have the ID and latest state
                const responseData = await response.json();
                const savedItem = responseData.item || { ...body }; // Fallback if server doesn't return item
                onSave(savedItem);
                onClose();
            } else {
                alert('Błąd zapisu');
            }
        } catch (e) {
            console.error(e);
            alert('Błąd połączenia');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-[#4A2C2A]">
                        {initialData ? 'Edytuj Danie' : 'Dodaj Nowe Danie'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                </div>

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
                                onChange={e => {
                                    const newCat = e.target.value;
                                    setNewDish(prev => ({
                                        ...prev,
                                        category: newCat,
                                        isSubDaily: !['Zupy', 'Dania', 'Dodatki'].includes(newCat) ? false : prev.isSubDaily
                                    }));
                                }}
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
                                placeholder="Ilość"
                            />
                            <select
                                value={newDish.portionUnit}
                                onChange={e => setNewDish({ ...newDish, portionUnit: e.target.value })}
                                className="w-24 p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#C32026] outline-none"
                            >
                                {['g', 'ml', 'szt', 'kg', 'l'].map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
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
                        <label className={`flex items-center gap-2 ${['Zupy', 'Dania', 'Dodatki'].includes(newDish.category) ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                            <input
                                type="checkbox"
                                checked={newDish.isSubDaily}
                                onChange={e => setNewDish({ ...newDish, isSubDaily: e.target.checked })}
                                disabled={!['Zupy', 'Dania', 'Dodatki'].includes(newDish.category)}
                                className="w-5 h-5 rounded text-[#C32026] focus:ring-[#C32026]"
                            />
                            <span className="text-sm font-medium text-gray-700">Stałe w Abon.</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newDish.isVeg}
                                onChange={e => setNewDish({ ...newDish, isVeg: e.target.checked })}
                                className="w-5 h-5 rounded text-green-600 focus:ring-green-600"
                            />
                            <span className="text-sm font-bold text-green-700">WEGE</span>
                        </label>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3 bg-[#C32026] hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all"
                    >
                        {initialData ? 'Zaktualizuj' : 'Zapisz'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DishFormModal;
