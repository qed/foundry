'use client'

import { useState, useCallback } from 'react'
import { FileText, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeatureTree } from './feature-tree'
import { TreeSearchFilter, type FilterInfo } from './tree-search-filter'
import type { FeatureStatus, FeatureLevel } from '@/types/database'

const ALL_STATUSES: FeatureStatus[] = ['not_started', 'in_progress', 'complete', 'blocked']
const ALL_LEVELS: FeatureLevel[] = ['epic', 'feature', 'sub_feature', 'task']

interface ShopLeftPanelProps {
  open: boolean
  projectId: string
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
}

export function ShopLeftPanel({
  open,
  projectId,
  selectedNodeId,
  onSelectNode,
}: ShopLeftPanelProps) {
  const isOverviewSelected = selectedNodeId === 'product-overview'

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<FeatureStatus[]>([...ALL_STATUSES])
  const [selectedLevels, setSelectedLevels] = useState<FeatureLevel[]>([...ALL_LEVELS])
  const [filterInfo, setFilterInfo] = useState<FilterInfo | null>(null)

  const isFiltering =
    searchQuery.length > 0 ||
    selectedStatuses.length < 4 ||
    selectedLevels.length < 4

  const handleFilterInfo = useCallback((info: FilterInfo) => {
    setFilterInfo(info)
  }, [])

  return (
    <div
      className={cn(
        'flex-shrink-0 border-r border-border-default bg-bg-secondary overflow-hidden transition-all duration-200 ease-in-out',
        open ? 'w-[280px]' : 'w-0'
      )}
    >
      <div className="w-[280px] h-full flex flex-col">
        {/* Search & Filter */}
        <TreeSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatuses={selectedStatuses}
          onStatusChange={setSelectedStatuses}
          selectedLevels={selectedLevels}
          onLevelChange={setSelectedLevels}
          filterInfo={filterInfo}
          isFiltering={isFiltering}
        />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Product Overview - pinned */}
          <div className="p-3 border-b border-border-default">
            <button
              onClick={() => onSelectNode('product-overview')}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
                isOverviewSelected
                  ? 'bg-accent-cyan/10 text-text-primary font-semibold'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              )}
            >
              <FileText
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isOverviewSelected ? 'text-accent-cyan' : 'text-accent-cyan'
                )}
              />
              <span className="truncate">Product Overview</span>
            </button>
          </div>

          {/* Feature Tree */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Feature Tree
              </span>
            </div>

            <FeatureTree
              projectId={projectId}
              selectedNodeId={isOverviewSelected ? null : selectedNodeId}
              onSelectNode={onSelectNode}
              searchQuery={searchQuery}
              selectedStatuses={selectedStatuses}
              selectedLevels={selectedLevels}
              onFilterInfo={handleFilterInfo}
            />
          </div>

          {/* Technical Requirements section - collapsed */}
          <div className="border-t border-border-default p-3">
            <button className="w-full flex items-center gap-2 text-xs font-medium text-text-tertiary uppercase tracking-wider hover:text-text-secondary transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
              Technical Requirements
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
