import React from 'react';
import { Filter, Search, Plus, SlidersHorizontal } from 'lucide-react';
import { KanbanBoard } from '../components/KanbanBoard';
export function BuildModule() {
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            Build Board
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-48 h-2 bg-background-tertiary rounded-full overflow-hidden">
              <div className="h-full bg-accent-purple w-[38%] rounded-full"></div>
            </div>
            <span className="text-sm text-text-secondary font-mono">
              18 of 47 tasks complete (38%)
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              size={16} />

            <input
              type="text"
              placeholder="Filter tasks..."
              className="bg-background-secondary border border-border rounded-md pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />

          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-background-secondary border border-border rounded-md text-text-secondary hover:text-text-primary hover:border-accent-purple/50 transition-colors">
            <SlidersHorizontal size={16} />
            <span className="text-sm">View</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-md hover:bg-accent-purple/90 transition-colors shadow-glow-sm">
            <Plus size={16} />
            <span className="text-sm font-medium">New Work Order</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0">
        <KanbanBoard />
      </div>
    </div>);

}