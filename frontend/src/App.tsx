import { useState } from 'react';
import { SupportTickets } from './components/Support/SupportTickets';
import { Sidebar } from './components/shared/Sidebar';
import { Projects } from './components/Projects/Projects';
import { TurboHosting } from './components/Hosting/TurboHosting';
import { Dashboard } from './components/Dashboard/Dashboard';
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
          {currentView === 'home' && <SupportTickets onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />}
          {currentView === 'projects' && <Projects onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />}
          {currentView === 'overview' && <Dashboard onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />}
          {currentView === 'billing' && <TurboHosting onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />}
        </main>
      </div>
    </PeriodProvider>
  );
}

export default App;