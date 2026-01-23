
import React from 'react';
import { TabType } from '../types';
import { LayoutDashboard, UtensilsCrossed, CalendarCheck, Presentation, Database } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { type: TabType.MENU, icon: <CalendarCheck size={18} /> },
    { type: TabType.ABONAMENT, icon: <LayoutDashboard size={18} /> },
    { type: TabType.TABLICA, icon: <Presentation size={18} />, label: 'MENU TV' },
    { type: TabType.DANIA, icon: <Database size={18} /> },
  ];

  return (
    <header className="bg-[#4A2C2A] text-white shadow-xl border-b-4 border-[#C32026]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between py-4">
          {/* Admin Logo Section */}
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="bg-white p-2 rounded-lg">
              <div className="text-[#4A2C2A] font-bold flex flex-col items-center leading-none">
                <span className="text-[10px] italic font-['Playfair_Display'] text-[#C32026]">szalone</span>
                <div className="flex items-center gap-1">
                  <span className="text-xl tracking-tighter">WIDELCE</span>
                  <UtensilsCrossed size={16} className="text-[#C32026]" />
                </div>
              </div>
            </div>
            <div className="h-8 w-px bg-white/20 hidden md:block" />
            <div className="hidden md:block">
              <span className="text-xs uppercase tracking-[0.3em] font-light text-[#F28D91]">Panel Pracownika</span>
            </div>
          </div>

          {/* Admin Navigation */}
          <nav className="flex flex-wrap justify-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-semibold uppercase tracking-wider ${activeTab === tab.type
                    ? 'bg-[#C32026] text-white'
                    : 'text-white/70 hover:bg-white/10'
                  }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.type}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
