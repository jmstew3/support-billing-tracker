import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import { Projects } from './components/Projects';
import { HostingBilling } from './components/HostingBilling';
import { BillingOverview } from './components/BillingOverview';
import { PeriodProvider } from './contexts/PeriodContext';

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'projects' | 'overview' | 'billing'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <PeriodProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />
        <main className="flex-1 overflow-auto">
          {currentView === 'home' && <Dashboard onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />}
          {currentView === 'projects' && <Projects onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />}
          {currentView === 'overview' && <BillingOverview onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />}
          {currentView === 'billing' && <HostingBilling onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />}
        </main>
      </div>
    </PeriodProvider>
  );
}

export default App;