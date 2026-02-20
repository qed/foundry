import React, { useState } from 'react';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { ProductModule } from './pages/ProductModule';
import { BuildModule } from './pages/BuildModule';
import { LeaderDashboard } from './pages/LeaderDashboard';
import { SystemsModule } from './pages/SystemsModule';
import { InsightModule } from './pages/InsightModule';
export function App() {
  const [activePage, setActivePage] = useState('home');
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <ProjectDashboard onNavigate={setActivePage} />;
      case 'product':
        return <ProductModule />;
      case 'build':
        return <BuildModule />;
      case 'leader':
        return <LeaderDashboard />;
      case 'systems':
        return <SystemsModule />;
      case 'insight':
        return <InsightModule />;
      default:
        return <ProjectDashboard onNavigate={setActivePage} />;
    }
  };

  if (activePage === 'home') {
    return <HomePage onEnter={() => setActivePage('dashboard')} />;
  }

  return (
    <AppLayout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </AppLayout>);

}
