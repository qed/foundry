import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'px-4 py-2 bg-bg-secondary border border-border-default rounded-lg text-text-primary placeholder-text-tertiary',
            'focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-accent-error focus:ring-accent-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-accent-error">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-text-tertiary">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
