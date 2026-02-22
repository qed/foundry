'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { WorkOrderPriority } from '@/types/database'

interface PrioritySelectorProps {
  currentPriority: WorkOrderPriority
  onSelect: (priority: WorkOrderPriority) => void
  onClose: () => void
}

const OPTIONS: { value: WorkOrderPriority; label: string; dot: string }[] = [
  { value: 'critical', label: 'Critical', dot: 'bg-accent-error' },
  { value: 'high', label: 'High', dot: 'bg-accent-warning' },
  { value: 'medium', label: 'Medium', dot: 'bg-accent-cyan' },
  { value: 'low', label: 'Low', dot: 'bg-text-tertiary' },
]

export function PrioritySelector({
  currentPriority,
  onSelect,
  onClose,
}: PrioritySelectorProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-30 mt-1 w-36 bg-bg-secondary border border-border-default rounded-lg shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              onSelect(opt.value)
              onClose()
            }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
              currentPriority === opt.value
                ? 'text-accent-cyan bg-accent-cyan/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', opt.dot)} />
            <span className="text-xs">{opt.label}</span>
            {currentPriority === opt.value && (
              <span className="ml-auto text-accent-cyan text-xs">&#10003;</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
