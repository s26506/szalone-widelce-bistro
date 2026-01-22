
import React, { useState } from 'react';
import { TabType } from './types';
import Header from './components/Header';
import Menu from './components/Menu';
import Subscription from './components/Subscription';
import Board from './components/Board';
import Dishes from './components/Dishes';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.MENU);

  const renderContent = () => {
    switch (activeTab) {
      case TabType.MENU:
        return <Menu key="daily" mode="daily" apiEndpoint="/api/planner" />;
      case TabType.ABONAMENT:
      case TabType.ABONAMENT:
        return <Menu key="subscription" mode="subscription" apiEndpoint="/api/subscription-planner" />;
      case TabType.TABLICA:
        return <Board />;
      case TabType.DANIA:
        return <Dishes />;
      default:
        return <Menu key="default" mode="daily" apiEndpoint="/api/planner" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-red-200">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
