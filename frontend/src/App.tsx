import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SupportTickets } from './features/support/components/SupportTickets';
import { Sidebar } from './components/shared/Sidebar';
import { Projects } from './features/projects/components/Projects';
import { TurboHosting } from './features/hosting/components/TurboHosting';
import { Dashboard } from './features/dashboard/components/Dashboard';
import { Login } from './features/auth/components/Login';
import { PeriodProvider } from './contexts/PeriodContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTheme } from './hooks/useTheme';
import { queryClient } from './lib/queryClient';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const [currentView, setCurrentView] = useState<'home' | 'projects' | 'overview' | 'billing'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Show main dashboard if authenticated
  return (
    <PeriodProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-auto">
          {currentView === 'home' && (
            <ErrorBoundary>
              <SupportTickets onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
            </ErrorBoundary>
          )}
          {currentView === 'projects' && (
            <ErrorBoundary>
              <Projects onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
            </ErrorBoundary>
          )}
          {currentView === 'overview' && (
            <ErrorBoundary>
              <Dashboard onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
            </ErrorBoundary>
          )}
          {currentView === 'billing' && (
            <ErrorBoundary>
              <TurboHosting onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
            </ErrorBoundary>
          )}
        </main>
      </div>
    </PeriodProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;