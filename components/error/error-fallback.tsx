'use client'

import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  moduleName?: string
}

export function ErrorFallback({ error, reset, moduleName }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-accent-error/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-accent-error" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">
            Something went wrong
          </h2>
          <p className="text-sm text-text-secondary">
            {moduleName
              ? `An error occurred in ${moduleName}. Please try again or navigate elsewhere.`
              : 'An unexpected error occurred. Please try again or navigate elsewhere.'}
          </p>
        </div>

        {isDev && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 mx-auto text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            Error details
          </button>
        )}

        {isDev && showDetails && (
          <div className="bg-accent-error/5 border border-accent-error/20 rounded-lg p-4 text-left">
            <p className="text-xs font-mono text-accent-error break-all">
              {error.message}
            </p>
            {error.stack && (
              <pre className="text-[10px] font-mono text-text-tertiary mt-2 overflow-x-auto max-h-32 whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {error.digest && (
          <p className="text-[10px] text-text-tertiary font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="primary" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Try Again
          </Button>
          <Button
            onClick={() => { window.location.href = '/' }}
            variant="secondary"
            size="sm"
          >
            <Home className="w-3.5 h-3.5 mr-1.5" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}
