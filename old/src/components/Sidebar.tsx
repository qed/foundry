import React from 'react';
import {
  LayoutDashboard,
  GitBranch,
  Hammer,
  LineChart,
  Settings,
  Users,
  LogOut,
  Activity } from
'lucide-react';
import { motion } from 'framer-motion';
interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}
export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    id: 'product',
    label: 'Product',
    icon: GitBranch
  },
  {
    id: 'build',
    label: 'Build',
    icon: Hammer
  },
  {
    id: 'systems',
    label: 'Systems',
    icon: Settings
  },
  {
    id: 'insight',
    label: 'Insight',
    icon: LineChart
  }];

  const teamMembers = [
  {
    name: 'Sarah Chen',
    initials: 'SC',
    color: 'bg-blue-500'
  },
  {
    name: 'Alex Rivera',
    initials: 'AR',
    color: 'bg-green-500'
  },
  {
    name: 'Jordan Park',
    initials: 'JP',
    color: 'bg-purple-500'
  }];

  return (
    <div className="w-[260px] h-screen bg-background-primary border-r border-border flex flex-col flex-shrink-0 z-20">
      {/* Logo Area */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center shadow-glow">
            <Activity className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-text-primary">
            HELIX{' '}
            <span className="font-light text-text-secondary">FOUNDRY</span>
          </h1>
        </div>
        <div className="mt-4 px-3 py-2 bg-background-secondary rounded border border-border">
          <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">
            Project
          </div>
          <div className="font-semibold text-text-primary flex justify-between items-center">
            MacroBot
            <span className="w-2 h-2 rounded-full bg-accent-success shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group relative overflow-hidden ${isActive ? 'bg-background-secondary text-accent-cyan' : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'}`}>

              {isActive &&
              <motion.div
                layoutId="activeTab"
                className="absolute left-0 top-0 bottom-0 w-1 bg-accent-cyan shadow-[0_0_10px_#00d4ff]" />

              }
              <item.icon
                size={18}
                className={
                isActive ?
                'text-accent-cyan' :
                'text-text-tertiary group-hover:text-text-primary'
                } />

              <span className="font-medium">{item.label}</span>
            </button>);

        })}

        <div className="my-4 border-t border-border/50 mx-3" />

        <button
          onClick={() => onNavigate('leader')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${activePage === 'leader' ? 'bg-accent-purple/10 text-accent-purple border border-accent-purple/20' : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'}`}>

          <Users size={18} />
          <span className="font-medium">Leader View</span>
        </button>
      </nav>

      {/* Footer / Team */}
      <div className="p-4 border-t border-border bg-background-secondary/30">
        <div className="text-xs text-text-tertiary uppercase tracking-wider mb-3 font-semibold">
          Team Online
        </div>
        <div className="flex -space-x-2 mb-4">
          {teamMembers.map((member, i) =>
          <div
            key={i}
            className={`w-8 h-8 rounded-full border-2 border-background-primary flex items-center justify-center text-xs font-bold text-white ${member.color}`}
            title={member.name}>

              {member.initials}
            </div>
          )}
          <div className="w-8 h-8 rounded-full border-2 border-background-primary bg-background-tertiary flex items-center justify-center text-xs text-text-secondary hover:bg-background-secondary cursor-pointer transition-colors">
            +1
          </div>
        </div>
        <div className="flex items-center justify-between text-text-tertiary hover:text-text-secondary cursor-pointer transition-colors">
          <div className="flex items-center gap-2 text-xs">
            <Settings size={14} />
            <span>Project Settings</span>
          </div>
          <LogOut size={14} />
        </div>
      </div>
    </div>);

}