'use client'

import type { GateCheckResult } from '@/lib/helix/gate-check'
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react'

interface GateCheckAlertProps {
  result: GateCheckResult
  onDismiss?: () => void
}

export function GateCheckAlert({ result, onDismiss }: GateCheckAlertProps) {
  if (result.allowed && result.warnings.length === 0) {
    return (
      <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-400">All checks passed</p>
          <p className="text-xs text-text-secondary mt-0.5">
            No blockers or warnings found.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-text-secondary hover:text-text-primary text-xs"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Blockers */}
      {result.blockers.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">
                {result.blockers.length} Blocker{result.blockers.length > 1 ? 's' : ''}
              </p>
              <ul className="mt-1 space-y-1">
                {result.blockers.map((blocker, i) => (
                  <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">-</span>
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-400">
                {result.warnings.length} Warning{result.warnings.length > 1 ? 's' : ''}
              </p>
              <ul className="mt-1 space-y-1">
                {result.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                    <span className="text-yellow-400 mt-0.5">-</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reason summary */}
      {result.reason && result.blockers.length === 0 && (
        <div className="p-3 bg-bg-tertiary border border-border-default rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">{result.reason}</p>
          </div>
        </div>
      )}

      {onDismiss && (
        <div className="flex justify-end">
          <button
            onClick={onDismiss}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
