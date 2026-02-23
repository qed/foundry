'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Key, Eye, EyeOff, Copy, Check, Lock, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast-container'
import { timeAgo } from '@/lib/utils'
import { CreateKeyDialog } from './create-key-dialog'
import { SetupInstructions } from './setup-instructions'

interface AppKeyDisplay {
  id: string
  name: string
  key_preview: string
  environment: string
  description: string | null
  status: 'active' | 'revoked'
  created_by: string
  created_at: string
  revoked_at: string | null
}

const ENV_COLORS: Record<string, string> = {
  production: 'bg-accent-error/15 text-accent-error',
  staging: 'bg-accent-warning/15 text-accent-warning',
  development: 'bg-accent-cyan/15 text-accent-cyan',
  custom: 'bg-bg-tertiary text-text-secondary',
}

interface AppKeySettingsProps {
  projectId: string
}

export function AppKeySettings({ projectId }: AppKeySettingsProps) {
  const [keys, setKeys] = useState<AppKeyDisplay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<AppKeyDisplay | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppKeyDisplay | null>(null)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()

  const fetchKeys = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/projects/${projectId}/app-keys`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setKeys(data.keys || [])
    } catch {
      addToast('Failed to load API keys', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, addToast])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/app-keys/${revokeTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke')
      }
      addToast('API key revoked', 'success')
      setRevokeTarget(null)
      await fetchKeys()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to revoke key', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/app-keys/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      addToast('API key deleted', 'success')
      setDeleteTarget(null)
      await fetchKeys()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete key', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleReveal = (keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(keyId)) {
        next.delete(keyId)
      } else {
        next.add(keyId)
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setRevealedKeys((p) => {
            const updated = new Set(p)
            updated.delete(keyId)
            return updated
          })
        }, 5000)
      }
      return next
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addToast('Copied to clipboard', 'success')
  }

  const canDelete = (key: AppKeyDisplay) => {
    if (key.status !== 'revoked' || !key.revoked_at) return false
    const revokedDate = new Date(key.revoked_at)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return revokedDate <= sevenDaysAgo
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <Key className="w-6 h-6 text-accent-cyan" />
              Feedback API Keys
            </h1>
            <p className="text-text-secondary mt-1">
              Manage API keys for collecting feedback from your deployed applications
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Generate New Key
          </Button>
        </div>

        {/* Key List */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">API Keys</h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-bg-tertiary rounded-lg animate-pulse" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="border border-dashed border-border-default rounded-lg p-8 text-center">
              <Key className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-primary font-medium">No API keys yet</p>
              <p className="text-text-secondary text-sm mt-1">
                Create an app key to start collecting feedback
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="mt-4 gap-2"
                variant="secondary"
              >
                <Plus className="w-4 h-4" />
                Create Your First Key
              </Button>
            </div>
          ) : (
            <div className="border border-border-default rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-tertiary border-b border-border-default">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">
                      Key
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">
                      Environment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {keys.map((key) => (
                    <tr
                      key={key.id}
                      className="hover:bg-bg-tertiary/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-text-primary">
                          {key.name}
                        </div>
                        {key.description && (
                          <div className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                            {key.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono bg-bg-tertiary px-2 py-1 rounded text-text-secondary">
                            {revealedKeys.has(key.id)
                              ? key.key_preview
                              : key.key_preview}
                          </code>
                          <button
                            onClick={() => toggleReveal(key.id)}
                            className="p-1 hover:bg-bg-tertiary rounded transition-colors text-text-tertiary hover:text-text-primary"
                            title={
                              revealedKeys.has(key.id)
                                ? 'Hide key'
                                : 'Reveal key (5 seconds)'
                            }
                          >
                            {revealedKeys.has(key.id) ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(key.key_preview)}
                            className="p-1 hover:bg-bg-tertiary rounded transition-colors text-text-tertiary hover:text-text-primary"
                            title="Copy key preview"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
                            ENV_COLORS[key.environment] || ENV_COLORS.custom
                          }`}
                        >
                          {key.environment}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {key.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-success/15 text-accent-success">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-bg-tertiary text-text-tertiary">
                            <Lock className="w-3 h-3" />
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {timeAgo(key.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {key.status === 'active' && (
                            <button
                              onClick={() => setRevokeTarget(key)}
                              className="px-2 py-1 text-xs font-medium text-accent-error hover:bg-accent-error/10 rounded transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                          {canDelete(key) && (
                            <button
                              onClick={() => setDeleteTarget(key)}
                              className="p-1 text-text-tertiary hover:text-accent-error hover:bg-accent-error/10 rounded transition-colors"
                              title="Delete key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="border-t border-border-default pt-8">
          <SetupInstructions />
        </div>
      </div>

      {/* Create Key Dialog */}
      <CreateKeyDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchKeys}
      />

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogClose onClick={() => setRevokeTarget(null)} />
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-text-secondary text-sm">
              Are you sure you want to revoke{' '}
              <span className="font-medium text-text-primary">
                {revokeTarget?.name}
              </span>
              ?
            </p>
            <div className="p-3 bg-accent-warning/10 border border-accent-warning/20 rounded-lg">
              <p className="text-sm text-accent-warning flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Apps using this key will no longer be able to submit feedback
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setRevokeTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRevoke}
              isLoading={isSubmitting}
            >
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogClose onClick={() => setDeleteTarget(null)} />
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-text-secondary text-sm">
              Are you sure you want to permanently delete{' '}
              <span className="font-medium text-text-primary">
                {deleteTarget?.name}
              </span>
              ?
            </p>
            <div className="p-3 bg-accent-error/10 border border-accent-error/20 rounded-lg">
              <p className="text-sm text-accent-error flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                This action cannot be undone
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isSubmitting}
            >
              Delete Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
