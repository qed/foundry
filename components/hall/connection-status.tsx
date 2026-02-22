'use client'

import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  isConnected: boolean
  className?: string
}

export function ConnectionStatus({ isConnected, className }: ConnectionStatusProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected
            ? 'bg-accent-success shadow-[0_0_4px] shadow-accent-success/50'
            : 'bg-accent-error shadow-[0_0_4px] shadow-accent-error/50'
        )}
      />
      <span className="text-[11px] text-text-tertiary">
        {isConnected ? 'Synced' : 'Offline'}
      </span>
    </div>
  )
}
