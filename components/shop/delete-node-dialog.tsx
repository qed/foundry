'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type DeleteOption = 'delete_only' | 'delete_subtree' | 'reparent_children'

interface DeleteNodeDialogProps {
  open: boolean
  nodeTitle: string
  childCount: number
  onClose: () => void
  onConfirm: (option: DeleteOption) => void
  isDeleting: boolean
}

export function DeleteNodeDialog({
  open,
  nodeTitle,
  childCount,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteNodeDialogProps) {
  const [selected, setSelected] = useState<DeleteOption>('delete_only')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border-default rounded-xl shadow-xl max-w-[400px] w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-error" />
            <h3 className="text-sm font-semibold text-text-primary">Confirm Deletion</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-text-primary mb-4">
            Are you sure you want to delete <strong>&ldquo;{nodeTitle}&rdquo;</strong>?
          </p>

          {childCount > 0 && (
            <>
              <p className="text-xs text-text-secondary mb-3">
                This node has {childCount} child node{childCount > 1 ? 's' : ''}.
              </p>
              <fieldset className="space-y-2.5 mb-2">
                {([
                  { value: 'delete_only' as const, label: 'Delete this node only', desc: 'Children move to root level' },
                  { value: 'delete_subtree' as const, label: 'Delete entire subtree', desc: `Remove node and all ${childCount} descendant${childCount > 1 ? 's' : ''}` },
                  { value: 'reparent_children' as const, label: 'Reparent children', desc: 'Move children up one level' },
                ]).map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors',
                      selected === opt.value
                        ? 'border-accent-cyan bg-accent-cyan/5'
                        : 'border-border-default hover:bg-bg-tertiary'
                    )}
                  >
                    <input
                      type="radio"
                      name="deleteOption"
                      value={opt.value}
                      checked={selected === opt.value}
                      onChange={() => setSelected(opt.value)}
                      className="mt-0.5 accent-accent-cyan"
                    />
                    <div>
                      <span className="text-xs font-medium text-text-primary">{opt.label}</span>
                      <p className="text-[10px] text-text-tertiary mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </fieldset>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onConfirm(childCount > 0 ? selected : 'delete_only')}
            isLoading={isDeleting}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
