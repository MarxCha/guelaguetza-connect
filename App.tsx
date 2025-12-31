import React, { useState, lazy, Suspense } from 'react';
import Navigation from './components/Navigation';
import HomeView from './components/HomeView';
import TransportView from './components/TransportView';
import StoriesView from './components/StoriesView';
import ChatAssistant from './components/ChatAssistant';
import ProgramView from './components/ProgramView';
import { ViewState } from './types';

// Lazy load ARScanner for code splitting
const ARScanner = lazy(() => import('./components/ARScanner'));

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);

  const renderView = () => {
    switch (currentView) {
      case ViewState.HOME:
        return <HomeView setView={setCurrentView} />;
      case ViewState.TRANSPORT:
        return <TransportView />;
      case ViewState.AR_SCANNER:
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full">Cargando AR...</div>}>
            <ARScanner />
          </Suspense>
        );
      case ViewState.STORIES:
        return <StoriesView />;
      case ViewState.CHAT:
        return <ChatAssistant />;
      case ViewState.PROGRAM:
        return <ProgramView />;
      default:
        return <HomeView setView={setCurrentView} />;
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-white relative shadow-2xl overflow-hidden flex flex-col font-sans">
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        {renderView()}
      </div>
      <Navigation currentView={currentView} setView={setCurrentView} />
    </div>
  );
};

export default App;
