'use client'

import { useState, useCallback } from 'react'
import { FileText, Download, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeatureTree } from './feature-tree'
import { TreeSearchFilter, type FilterInfo } from './tree-search-filter'
import { ExportTreeDialog } from './export-tree-dialog'
import { ImportTreeDialog } from './import-tree-dialog'
import { ExportAllDialog } from './export-all-dialog'
import { TechnicalRequirementsSection } from './technical-requirements-section'
import type { FeatureStatus, FeatureLevel } from '@/types/database'

const ALL_STATUSES: FeatureStatus[] = ['not_started', 'in_progress', 'complete', 'blocked']
const ALL_LEVELS: FeatureLevel[] = ['epic', 'feature', 'sub_feature', 'task']

interface ShopLeftPanelProps {
  open: boolean
  projectId: string
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
  onTreeChange?: () => void
  onTreeImported?: () => void
  refreshTrigger?: number
  onBlueprintAction?: (featureNodeId: string, action: 'view' | 'create') => void
}

export function ShopLeftPanel({
  open,
  projectId,
  selectedNodeId,
  onSelectNode,
  onTreeChange,
  onTreeImported,
  refreshTrigger,
  onBlueprintAction,
}: ShopLeftPanelProps) {
  const isOverviewSelected = selectedNodeId === 'product-overview'
  const techReqDocId = selectedNodeId?.startsWith('tech-req:') ? selectedNodeId.slice(9) : null

  // Dialog states
  const [showExportTree, setShowExportTree] = useState(false)
  const [showImportTree, setShowImportTree] = useState(false)
  const [showExportAll, setShowExportAll] = useState(false)

  const handleImportTreeSuccess = useCallback(() => {
    onTreeImported?.()
  }, [onTreeImported])

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
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setShowImportTree(true)}
                  title="Import Tree"
                  className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowExportTree(true)}
                  title="Export Tree"
                  className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <FeatureTree
              projectId={projectId}
              selectedNodeId={isOverviewSelected || techReqDocId ? null : selectedNodeId}
              onSelectNode={onSelectNode}
              searchQuery={searchQuery}
              selectedStatuses={selectedStatuses}
              selectedLevels={selectedLevels}
              onFilterInfo={handleFilterInfo}
              onTreeChange={onTreeChange}
              refreshTrigger={refreshTrigger}
              onBlueprintAction={onBlueprintAction}
            />
          </div>

          {/* Export All */}
          <div className="border-t border-border-default p-3">
            <button
              onClick={() => setShowExportAll(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
            >
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Export All Requirements</span>
            </button>
          </div>

          {/* Technical Requirements */}
          <TechnicalRequirementsSection
            projectId={projectId}
            selectedDocId={techReqDocId}
            onSelectDocument={(docId) => onSelectNode(`tech-req:${docId}`)}
          />
        </div>

        {/* Dialogs */}
        <ExportTreeDialog
          open={showExportTree}
          onOpenChange={setShowExportTree}
          projectId={projectId}
        />
        <ImportTreeDialog
          open={showImportTree}
          onOpenChange={setShowImportTree}
          projectId={projectId}
          onImportSuccess={handleImportTreeSuccess}
        />
        <ExportAllDialog
          open={showExportAll}
          onOpenChange={setShowExportAll}
          projectId={projectId}
        />
      </div>
    </div>
  )
}
