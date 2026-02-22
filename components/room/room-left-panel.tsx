'use client'

import { useState } from 'react'
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Network,
  Puzzle,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Blueprint, BlueprintType } from '@/types/database'

interface RoomLeftPanelProps {
  open: boolean
  blueprints: Blueprint[]
  selectedBlueprintId: string | null
  onSelectBlueprint: (id: string | null) => void
}

const TYPE_TABS: { key: BlueprintType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'foundation', label: 'Foundations' },
  { key: 'system_diagram', label: 'Diagrams' },
  { key: 'feature', label: 'Features' },
]

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-text-tertiary/10 text-text-tertiary',
  in_review: 'bg-accent-warning/10 text-accent-warning',
  approved: 'bg-accent-success/10 text-accent-success',
  implemented: 'bg-accent-cyan/10 text-accent-cyan',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'Review',
  approved: 'Approved',
  implemented: 'Impl',
}

export function RoomLeftPanel({
  open,
  blueprints,
  selectedBlueprintId,
  onSelectBlueprint,
}: RoomLeftPanelProps) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<BlueprintType | 'all'>('all')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['foundation', 'system_diagram', 'feature'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  // Filter blueprints
  const filtered = blueprints.filter((bp) => {
    if (activeTab !== 'all' && bp.blueprint_type !== activeTab) return false
    if (search && !bp.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const foundations = filtered.filter((bp) => bp.blueprint_type === 'foundation')
  const diagrams = filtered.filter((bp) => bp.blueprint_type === 'system_diagram')
  const features = filtered.filter((bp) => bp.blueprint_type === 'feature')

  return (
    <div
      className={cn(
        'flex-shrink-0 border-r border-border-default bg-bg-secondary overflow-hidden transition-all duration-200 ease-in-out',
        open ? 'w-[280px]' : 'w-0'
      )}
    >
      <div className="w-[280px] h-full flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blueprints..."
              className="w-full pl-8 pr-8 py-1.5 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border-default">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Blueprint sections */}
        <div className="flex-1 overflow-y-auto">
          {(activeTab === 'all' || activeTab === 'foundation') && (
            <BlueprintSection
              title="Foundations"
              icon={<FileText className="w-3.5 h-3.5" />}
              count={foundations.length}
              expanded={expandedSections.has('foundation')}
              onToggle={() => toggleSection('foundation')}
              blueprints={foundations}
              selectedId={selectedBlueprintId}
              onSelect={onSelectBlueprint}
            />
          )}

          {(activeTab === 'all' || activeTab === 'system_diagram') && (
            <BlueprintSection
              title="System Diagrams"
              icon={<Network className="w-3.5 h-3.5" />}
              count={diagrams.length}
              expanded={expandedSections.has('system_diagram')}
              onToggle={() => toggleSection('system_diagram')}
              blueprints={diagrams}
              selectedId={selectedBlueprintId}
              onSelect={onSelectBlueprint}
            />
          )}

          {(activeTab === 'all' || activeTab === 'feature') && (
            <BlueprintSection
              title="Feature Blueprints"
              icon={<Puzzle className="w-3.5 h-3.5" />}
              count={features.length}
              expanded={expandedSections.has('feature')}
              onToggle={() => toggleSection('feature')}
              blueprints={features}
              selectedId={selectedBlueprintId}
              onSelect={onSelectBlueprint}
            />
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FileText className="w-8 h-8 text-text-tertiary/40 mb-2" />
              <p className="text-xs text-text-tertiary">
                {search ? 'No blueprints match your search' : 'No blueprints yet'}
              </p>
            </div>
          )}
        </div>

        {/* Footer: New Blueprint */}
        <div className="p-3 border-t border-border-default">
          <button
            disabled
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-accent-cyan/10 text-accent-cyan rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
            title="Create blueprint (Phase 048/050/051)"
          >
            <Plus className="w-3.5 h-3.5" />
            New Blueprint
          </button>
        </div>
      </div>
    </div>
  )
}

interface BlueprintSectionProps {
  title: string
  icon: React.ReactNode
  count: number
  expanded: boolean
  onToggle: () => void
  blueprints: Blueprint[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function BlueprintSection({
  title,
  icon,
  count,
  expanded,
  onToggle,
  blueprints,
  selectedId,
  onSelect,
}: BlueprintSectionProps) {
  return (
    <div className="border-b border-border-default/50">
      {/* Section header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg-tertiary/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-text-tertiary" />
        ) : (
          <ChevronRight className="w-3 h-3 text-text-tertiary" />
        )}
        <span className="text-text-secondary">{icon}</span>
        <span className="text-xs font-medium text-text-primary flex-1 text-left">
          {title}
        </span>
        <span className="text-[10px] text-text-tertiary bg-bg-tertiary rounded-full px-1.5 py-0.5">
          {count}
        </span>
      </button>

      {/* Items */}
      {expanded && (
        <div className="pb-1">
          {blueprints.length === 0 ? (
            <p className="text-[10px] text-text-tertiary px-8 py-2">
              No blueprints in this category
            </p>
          ) : (
            blueprints.map((bp) => (
              <button
                key={bp.id}
                onClick={() => onSelect(bp.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 pl-8 py-1.5 text-left transition-colors',
                  selectedId === bp.id
                    ? 'bg-accent-cyan/10 text-accent-cyan border-l-2 border-accent-cyan'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                )}
              >
                <span className="text-xs truncate flex-1">{bp.title}</span>
                <span
                  className={cn(
                    'text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
                    STATUS_STYLES[bp.status] || ''
                  )}
                >
                  {STATUS_LABELS[bp.status] || bp.status}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
