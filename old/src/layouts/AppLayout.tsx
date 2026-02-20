import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Menu } from 'lucide-react';
interface AppLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}
export function AppLayout({
  children,
  activePage,
  onNavigate
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-background-primary overflow-hidden text-text-primary font-sans selection:bg-accent-cyan/30 selection:text-accent-cyan">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, slide-in drawer */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar activePage={activePage} onNavigate={handleNavigate} />
      </div>

      <main className="flex-1 h-full overflow-hidden relative flex flex-col w-full">
        {/* Mobile header bar */}
        <div className="flex items-center gap-3 p-3 border-b border-border/50 md:hidden bg-background-secondary/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-background-tertiary text-text-secondary"
          >
            <Menu size={20} />
          </button>
          <h1 className="font-bold text-sm tracking-tight text-text-primary">
            HELIX <span className="font-light text-text-secondary">FOUNDRY</span>
          </h1>
        </div>

        {/* Top subtle gradient line — desktop only */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent absolute top-0 z-10 hidden md:block" />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth">
          <div className="max-w-[1600px] mx-auto h-full">{children}</div>
        </div>
      </main>
    </div>);

}
