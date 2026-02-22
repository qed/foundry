'use client'

import React, { useEffect } from 'react'
import { X, Check, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastProps {
  id: string
  type: ToastType
  message: string
  onClose: (id: string) => void
  duration?: number
  action?: ToastAction
}

const typeConfig = {
  success: {
    bg: 'bg-accent-success/10 border-accent-success/30',
    text: 'text-accent-success',
    icon: Check,
  },
  error: {
    bg: 'bg-accent-error/10 border-accent-error/30',
    text: 'text-accent-error',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-accent-cyan/10 border-accent-cyan/30',
    text: 'text-accent-cyan',
    icon: Info,
  },
  warning: {
    bg: 'bg-accent-warning/10 border-accent-warning/30',
    text: 'text-accent-warning',
    icon: AlertCircle,
  },
}

export function Toast({ id, type, message, onClose, duration = 5000, action }: ToastProps) {
  useEffect(() => {
    if (duration === 0) return

    const timer = setTimeout(() => onClose(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm',
        config.bg
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', config.text)} />
      <p className="flex-1 text-text-primary">{message}</p>
      {action && (
        <button
          onClick={() => {
            action.onClick()
            onClose(id)
          }}
          className="px-3 py-1 text-sm font-medium text-accent-cyan hover:bg-accent-cyan/10 rounded transition-colors shrink-0"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:bg-white/10 rounded transition-colors text-text-secondary"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
