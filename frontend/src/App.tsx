import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import { Projects } from './components/Projects';
import { HostingBilling } from './components/HostingBilling';
import { BillingOverview } from './components/BillingOverview';
import { PeriodProvider } from './contexts/PeriodContext';

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'projects' | 'overview' | 'billing'>('overview');

  return (
    <PeriodProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />
        <main className="flex-1 overflow-auto">
          {currentView === 'home' && <Dashboard />}
          {currentView === 'projects' && <Projects />}
          {currentView === 'overview' && <BillingOverview />}
          {currentView === 'billing' && <HostingBilling />}
        </main>
      </div>
    </PeriodProvider>
  );
}

export default App;