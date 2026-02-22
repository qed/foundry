'use client'

import React, { useState, useCallback } from 'react'
import { Toast, type ToastType, type ToastAction } from './toast'

interface ToastMessage {
  id: string
  type: ToastType
  message: string
  action?: ToastAction
}

export interface UseToastReturn {
  toasts: ToastMessage[]
  addToast: (message: string, type: ToastType, duration?: number, action?: ToastAction) => string
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<UseToastReturn | undefined>(undefined)

let toastCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback(
    (message: string, type: ToastType, duration = 5000, action?: ToastAction) => {
      const id = `toast-${++toastCounter}-${Date.now()}`
      setToasts((prev) => [...prev, { id, type, message, action }])

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
      }

      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-md">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={removeToast}
            action={toast.action}
          />
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast(): UseToastReturn {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
