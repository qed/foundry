'use client'

import { cn } from '@/lib/utils'

interface OnlineIndicatorProps {
  isOnline: boolean
  showLabel?: boolean
  className?: string
}

export function OnlineIndicator({ isOnline, showLabel = false, className }: OnlineIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          isOnline ? 'bg-accent-success' : 'bg-text-tertiary'
        )}
        aria-label={isOnline ? 'Online' : 'Offline'}
      />
      {showLabel && (
        <span className="text-xs text-text-tertiary">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  )
}
