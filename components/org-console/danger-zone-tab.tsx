'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast-container'
import type { Organization } from '@/types/database'

interface DangerZoneTabProps {
  org: Organization
  orgSlug: string
}

export function DangerZoneTab({ org }: DangerZoneTabProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (confirmText !== org.slug) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/orgs/${org.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete organization')
      }

      addToast('Organization deleted', 'success')
      router.push('/dashboard')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error')
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-6 border border-accent-error/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-error flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              Delete organization
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Permanently delete <strong className="text-text-primary">{org.name}</strong> and
              all of its projects, data, and member associations. This action cannot be undone.
            </p>
            <Button variant="danger" onClick={() => setShowConfirm(true)}>
              Delete this organization
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={() => { setShowConfirm(false); setConfirmText('') }}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-text-primary">Delete organization</h2>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-text-secondary">
              This cannot be undone. All projects and data will be permanently deleted.
            </p>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Type <strong className="text-text-primary">{org.slug}</strong> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={org.slug}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-error focus:border-transparent"
                autoFocus
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowConfirm(false); setConfirmText('') }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              disabled={confirmText !== org.slug}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
