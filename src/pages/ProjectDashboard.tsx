import React from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  Hammer,
  Settings,
  LineChart,
  Clock,
  CheckCircle2,
  ArrowRight,
  Activity } from
'lucide-react';
import { ProgressRing } from '../components/ProgressRing';
interface ProjectDashboardProps {
  onNavigate: (page: string) => void;
}
export function ProjectDashboard({ onNavigate }: ProjectDashboardProps) {
  const modules = [
  {
    id: 'product',
    title: 'Product',
    desc: 'Feature tree & requirements',
    metric: '47 requirements mapped',
    progress: 100,
    icon: GitBranch,
    color: 'text-accent-cyan',
    bg: 'bg-accent-cyan/10',
    border: 'border-accent-cyan/20'
  },
  {
    id: 'build',
    title: 'Build',
    desc: 'Work orders & kanban',
    metric: '18/47 tasks complete',
    progress: 38,
    icon: Hammer,
    color: 'text-accent-purple',
    bg: 'bg-accent-purple/10',
    border: 'border-accent-purple/20'
  },
  {
    id: 'systems',
    title: 'Systems',
    desc: 'Technical blueprints',
    metric: '3 blueprints drafted',
    progress: 15,
    icon: Settings,
    color: 'text-accent-warning',
    bg: 'bg-accent-warning/10',
    border: 'border-accent-warning/20'
  },
  {
    id: 'insight',
    title: 'Insight',
    desc: 'User feedback & triage',
    metric: '0 feedback items',
    progress: 0,
    icon: LineChart,
    color: 'text-accent-success',
    bg: 'bg-accent-success/10',
    border: 'border-accent-success/20'
  }];

  const activityFeed = [
  {
    user: 'Sarah Chen',
    action: 'completed',
    target: 'Login Flow task',
    time: '10m ago'
  },
  {
    user: 'Alex Rivera',
    action: 'updated',
    target: 'Feature Tree',
    time: '45m ago'
  },
  {
    user: 'Refinery Agent',
    action: 'suggested',
    target: '3 new sub-features',
    time: '1h ago'
  },
  {
    user: 'Jordan Park',
    action: 'started',
    target: 'Vector DB Setup',
    time: '2h ago'
  }];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-text-primary">MacroBot</h1>
            <span className="px-2 py-0.5 rounded-full bg-accent-success/10 text-accent-success border border-accent-success/20 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse"></span>
              Sprint Active
            </span>
          </div>
          <p className="text-text-secondary text-lg">AI Leasing Assistant</p>
        </div>

        <div className="bg-background-secondary p-4 rounded-lg border border-border flex items-center gap-6 min-w-[300px]">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary flex items-center gap-2">
                <Clock size={14} /> Sprint Timer
              </span>
              <span className="text-text-primary font-mono">Hour 14 of 30</span>
            </div>
            <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
              <div className="h-full bg-accent-gradient w-[46%] rounded-full shadow-[0_0_10px_rgba(0,212,255,0.4)]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Grid - Modules */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module) =>
          <motion.div
            key={module.id}
            whileHover={{
              scale: 1.02,
              y: -4
            }}
            onClick={() => onNavigate(module.id)}
            className="bg-background-secondary border border-border p-6 rounded-xl cursor-pointer hover:shadow-glow-sm transition-all group relative overflow-hidden">

              <div
              className={`absolute top-0 right-0 p-20 opacity-5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:opacity-10 ${module.bg.replace('/10', '')}`}>
            </div>

              <div className="flex justify-between items-start mb-6">
                <div
                className={`p-3 rounded-lg ${module.bg} ${module.color} border ${module.border}`}>

                  <module.icon size={24} />
                </div>
                <ArrowRight
                className="text-text-tertiary group-hover:text-accent-cyan transition-colors"
                size={20} />

              </div>

              <h3 className="text-xl font-bold text-text-primary mb-1">
                {module.title}
              </h3>
              <p className="text-text-secondary text-sm mb-4">{module.desc}</p>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                  <div
                  className={`h-full rounded-full ${module.color.replace('text-', 'bg-')}`}
                  style={{
                    width: `${module.progress}%`
                  }}>
                </div>
                </div>
                <span className="text-xs font-mono text-text-tertiary">
                  {module.progress}%
                </span>
              </div>
              <p className="mt-2 text-xs text-text-tertiary font-mono">
                {module.metric}
              </p>
            </motion.div>
          )}
        </div>

        {/* Right Column - Stats & Feed */}
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="bg-background-secondary border border-border p-6 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background-primary/50 pointer-events-none"></div>
            <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-6 font-semibold">
              Overall Completion
            </h3>
            <ProgressRing progress={38} size={180} strokeWidth={12} />
            <div className="mt-6 text-center">
              <p className="text-text-tertiary text-sm">16 hours remaining</p>
              <p className="text-accent-cyan text-sm mt-1 font-medium">
                On track to complete
              </p>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-background-secondary border border-border p-6 rounded-xl">
            <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-4 font-semibold flex items-center gap-2">
              <Activity size={14} /> Recent Activity
            </h3>
            <div className="space-y-4">
              {activityFeed.map((item, i) =>
              <div key={i} className="flex gap-3 items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-accent-purple/50"></div>
                  <div>
                    <p className="text-sm text-text-primary">
                      <span className="font-medium text-accent-cyan">
                        {item.user}
                      </span>{' '}
                      <span className="text-text-secondary">{item.action}</span>{' '}
                      {item.target}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {item.time}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>);

}