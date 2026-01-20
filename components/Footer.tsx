
import React from 'react';
import { ShieldCheck, HardDrive, Clock } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-100 py-6 border-t border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-xs font-semibold uppercase tracking-widest">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-green-500" />
              Połączenie bezpieczne
            </div>
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-blue-500" />
              Baza danych: online
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock size={14} />
            Ostatnia synchronizacja: przed chwilą
          </div>
          
          <div>
            &copy; 2024 Szalone Widelce ERP
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
