import React from 'react';
import { ProgressRing } from '../components/ProgressRing';
import { CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
const epics = [
{
  name: 'Conversational AI Engine',
  completed: 5,
  total: 8,
  status: 'on-track'
},
{
  name: 'FAQ Knowledge Base',
  completed: 4,
  total: 6,
  status: 'on-track'
},
{
  name: 'Website Scraping Pipeline',
  completed: 3,
  total: 7,
  status: 'at-risk'
},
{
  name: 'Smart Handoff System',
  completed: 2,
  total: 5,
  status: 'on-track'
},
{
  name: 'Conversation Logging',
  completed: 3,
  total: 4,
  status: 'on-track'
},
{
  name: 'Admin Dashboard',
  completed: 1,
  total: 6,
  status: 'blocked'
}];

const milestones = [
'User Authentication Flow completed',
'Vector Database Integration verified',
'Initial Intent Model trained (85% accuracy)',
'Scraper prototype successful on 3 test sites'];

export function LeaderDashboard() {
  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            MacroBot Project Status
          </h1>
          <p className="text-text-secondary">Executive Overview</p>
        </div>
        <div className="px-3 py-1 bg-background-tertiary border border-border rounded text-xs font-mono text-text-secondary uppercase tracking-wider">
          Read Only View
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        {/* Main Progress Card */}
        <div className="md:col-span-1 bg-background-secondary border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-cyan to-accent-purple"></div>
          <ProgressRing progress={38} size={200} strokeWidth={16} />
          <div className="mt-6">
            <h3 className="text-2xl font-bold text-text-primary">
              38% Complete
            </h3>
            <p className="text-text-secondary mt-1">18 of 47 tasks done</p>
          </div>
          <div className="mt-6 pt-6 border-t border-border w-full flex justify-between text-sm">
            <div className="text-left">
              <p className="text-text-tertiary">Time Elapsed</p>
              <p className="text-text-primary font-mono">14h 00m</p>
            </div>
            <div className="text-right">
              <p className="text-text-tertiary">Remaining</p>
              <p className="text-text-primary font-mono">16h 00m</p>
            </div>
          </div>
        </div>

        {/* Epic Breakdown */}
        <div className="md:col-span-2 bg-background-secondary border border-border rounded-xl p-6">
          <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-accent-cyan" />
            Epic Progress
          </h3>
          <div className="space-y-5">
            {epics.map((epic, i) =>
            <div key={i} className="group">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-text-primary">
                    {epic.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-tertiary font-mono">
                      {epic.completed}/{epic.total}
                    </span>
                    {epic.status === 'on-track' &&
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent-success/10 text-accent-success border border-accent-success/20 uppercase tracking-wider">
                        On Track
                      </span>
                  }
                    {epic.status === 'at-risk' &&
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent-warning/10 text-accent-warning border border-accent-warning/20 uppercase tracking-wider">
                        At Risk
                      </span>
                  }
                    {epic.status === 'blocked' &&
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent-error/10 text-accent-error border border-accent-error/20 uppercase tracking-wider">
                        Blocked
                      </span>
                  }
                  </div>
                </div>
                <div className="w-full h-2 bg-background-primary rounded-full overflow-hidden">
                  <div
                  className={`h-full rounded-full transition-all duration-1000 ${epic.status === 'blocked' ? 'bg-accent-error' : epic.status === 'at-risk' ? 'bg-accent-warning' : 'bg-accent-cyan'}`}
                  style={{
                    width: `${epic.completed / epic.total * 100}%`
                  }}>
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Milestones */}
      <div className="bg-background-secondary border border-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <CheckCircle2 size={20} className="text-accent-success" />
          Recent Milestones
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {milestones.map((milestone, i) =>
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded bg-background-tertiary/30 border border-border/50">

              <div className="mt-1 min-w-[16px]">
                <CheckCircle2 size={16} className="text-accent-success" />
              </div>
              <span className="text-text-secondary text-sm">{milestone}</span>
            </div>
          )}
        </div>
      </div>
    </div>);

}