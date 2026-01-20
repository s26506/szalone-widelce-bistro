
import React, { useState } from 'react';
import { MENU_ITEMS } from '../constants';
import { Layout, Type, Save, UtensilsCrossed } from 'lucide-react';

const Board: React.FC = () => {
  const [mainDishId, setMainDishId] = useState(MENU_ITEMS[0].id);
  const [promoText, setPromoText] = useState('Tylko dzisiaj! Zrazy z ogórkiem w super cenie.');

  const selectedDish = MENU_ITEMS.find(i => i.id === mainDishId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Configuration Form */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-[#4A2C2A] flex items-center gap-2">
          <Layout size={24} className="text-[#C32026]" />
          Konfiguracja Tablicy
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <UtensilsCrossed size={14} /> Wybierz Danie Dnia
            </label>
            <select 
              value={mainDishId}
              onChange={(e) => setMainDishId(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C32026] outline-none font-medium"
            >
              {MENU_ITEMS.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Type size={14} /> Tekst Promocyjny
            </label>
            <textarea 
              value={promoText}
              onChange={(e) => setPromoText(e.target.value)}
              className="w-full p-3 h-32 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C32026] outline-none font-medium resize-none"
              placeholder="Wpisz tekst który pojawi się na tablicy..."
            />
          </div>
        </div>

        <button className="w-full bg-[#C32026] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg">
          <Save size={20} /> Opublikuj na ekranach
        </button>
      </div>

      {/* Preview Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Podgląd na żywo</h3>
        <div className="pattern-bg rounded-3xl p-10 text-white min-h-[400px] flex flex-col items-center justify-center text-center relative shadow-2xl border-4 border-[#C32026]/20">
           <div className="bg-[#C32026] px-4 py-1 mb-6 rounded-full text-xs font-bold uppercase tracking-[0.3em]">
             Danie Dnia
           </div>
           <h3 className="text-5xl font-['Playfair_Display'] font-bold mb-6">{selectedDish?.name}</h3>
           <p className="text-xl italic opacity-90 max-w-sm mb-8 leading-relaxed">
             "{promoText}"
           </p>
           <div className="text-3xl font-bold text-[#F28D91]">
             {selectedDish?.price} zł
           </div>
        </div>
      </div>
    </div>
  );
};

export default Board;
