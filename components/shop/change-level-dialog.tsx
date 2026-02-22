'use client'

import { useState } from 'react'
import { ArrowUpDown, X, FolderOpen, Puzzle, Layers, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { FeatureLevel } from '@/types/database'

interface ChangeLevelDialogProps {
  open: boolean
  nodeTitle: string
  currentLevel: FeatureLevel
  hasChildren: boolean
  onClose: () => void
  onConfirm: (newLevel: FeatureLevel) => void
  isChanging: boolean
}

const LEVEL_OPTIONS: { value: FeatureLevel; label: string; icon: typeof FolderOpen }[] = [
  { value: 'epic', label: 'Epic', icon: FolderOpen },
  { value: 'feature', label: 'Feature', icon: Puzzle },
  { value: 'sub_feature', label: 'Sub-feature', icon: Layers },
  { value: 'task', label: 'Task', icon: CheckCircle2 },
]

const LEVEL_ORDER: Record<FeatureLevel, number> = {
  epic: 0,
  feature: 1,
  sub_feature: 2,
  task: 3,
}

export function ChangeLevelDialog({
  open,
  nodeTitle,
  currentLevel,
  hasChildren,
  onClose,
  onConfirm,
  isChanging,
}: ChangeLevelDialogProps) {
  const [selected, setSelected] = useState<FeatureLevel>(currentLevel)

  if (!open) return null

  const currentOrder = LEVEL_ORDER[currentLevel]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border-default rounded-xl shadow-xl max-w-[360px] w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-accent-cyan" />
            <h3 className="text-sm font-semibold text-text-primary">Change Level</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-xs text-text-secondary mb-3">
            Change <strong className="text-text-primary">&ldquo;{nodeTitle}&rdquo;</strong> from{' '}
            <span className="capitalize">{currentLevel.replace('_', '-')}</span> to:
          </p>

          <div className="space-y-1.5">
            {LEVEL_OPTIONS.map((opt) => {
              const optOrder = LEVEL_ORDER[opt.value]
              const isCurrent = opt.value === currentLevel
              // Only allow single-step transitions
              const isAllowed = Math.abs(optOrder - currentOrder) === 1
              // Task is not allowed if node has children
              const isBlocked = opt.value === 'task' && hasChildren
              const disabled = isCurrent || !isAllowed || isBlocked
              const Icon = opt.icon

              return (
                <button
                  key={opt.value}
                  onClick={() => !disabled && setSelected(opt.value)}
                  disabled={disabled}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors',
                    isCurrent
                      ? 'border-border-default bg-bg-tertiary cursor-default'
                      : disabled
                        ? 'border-border-default/50 opacity-40 cursor-not-allowed'
                        : selected === opt.value
                          ? 'border-accent-cyan bg-accent-cyan/5'
                          : 'border-border-default hover:bg-bg-tertiary cursor-pointer'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isCurrent ? 'text-text-tertiary' : 'text-text-secondary')} />
                  <span className="text-xs font-medium text-text-primary">{opt.label}</span>
                  {isCurrent && (
                    <span className="text-[10px] text-text-tertiary ml-auto">Current</span>
                  )}
                  {isBlocked && !isCurrent && (
                    <span className="text-[10px] text-accent-error ml-auto">Has children</span>
                  )}
                </button>
              )
            })}
          </div>

          {selected !== currentLevel && (
            <p className="text-[10px] text-text-tertiary mt-3">
              Children levels will be adjusted automatically.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isChanging}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(selected)}
            isLoading={isChanging}
            disabled={selected === currentLevel || isChanging}
          >
            Change Level
          </Button>
        </div>
      </div>
    </div>
  )
}
