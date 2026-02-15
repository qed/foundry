import React from 'react';
import { Sidebar } from '../components/Sidebar';
interface AppLayoutProps {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}
export function AppLayout({
  children,
  activePage,
  onNavigate
}: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background-primary overflow-hidden text-text-primary font-sans selection:bg-accent-cyan/30 selection:text-accent-cyan">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <main className="flex-1 h-full overflow-hidden relative flex flex-col">
        {/* Top subtle gradient line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent absolute top-0 z-10" />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 scroll-smooth">
          <div className="max-w-[1600px] mx-auto h-full">{children}</div>
        </div>
      </main>
    </div>);

}