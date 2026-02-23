'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Mail, RotateCw, X, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast-container'
import { timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface InvitationData {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  invited_by_name: string
}

interface PendingInvitationsProps {
  orgId: string
  refreshKey: number
}

export function PendingInvitations({ orgId, refreshKey }: PendingInvitationsProps) {
  const { addToast } = useToast()
  const [invitations, setInvitations] = useState<InvitationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch(`/api/orgs/${orgId}/invitations?status=pending`)
      if (!res.ok) return
      const data = await res.json()
      setInvitations(data.invitations || [])
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    async function doFetch() {
      await fetchInvitations()
    }
    doFetch()
  }, [fetchInvitations, refreshKey])

  async function handleResend(id: string) {
    setActionId(id)
    try {
      const res = await fetch(`/api/orgs/${orgId}/invitations/${id}/resend`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to resend')
      }

      addToast('Invitation resent', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to resend', 'error')
    } finally {
      setActionId(null)
    }
  }

  async function handleRevoke(id: string) {
    setActionId(id)
    try {
      const res = await fetch(`/api/orgs/${orgId}/invitations/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke')
      }

      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
      addToast('Invitation revoked', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to revoke', 'error')
    } finally {
      setActionId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
      </div>
    )
  }

  if (invitations.length === 0) return null

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-text-tertiary" />
        <h3 className="text-sm font-medium text-text-secondary">
          Pending Invitations
        </h3>
        <Badge variant="default">{invitations.length}</Badge>
      </div>

      <div className="glass-panel rounded-xl divide-y divide-border-default overflow-hidden">
        {invitations.map((inv) => {
          const expired = isExpired(inv.expires_at)

          return (
            <div
              key={inv.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                expired && 'opacity-60'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-text-tertiary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{inv.email}</p>
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <span className="capitalize">{inv.role}</span>
                  <span>·</span>
                  <span>Invited {timeAgo(inv.created_at)}</span>
                  {expired && (
                    <>
                      <span>·</span>
                      <span className="text-accent-warning">Expired</span>
                    </>
                  )}
                  {!expired && (
                    <>
                      <span>·</span>
                      <Clock className="w-3 h-3 inline" />
                      <span>Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {actionId === inv.id ? (
                  <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
                ) : (
                  <>
                    <button
                      onClick={() => handleResend(inv.id)}
                      className="p-1.5 text-text-tertiary hover:text-accent-cyan rounded transition-colors"
                      title="Resend invitation"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="p-1.5 text-text-tertiary hover:text-accent-error rounded transition-colors"
                      title="Revoke invitation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
