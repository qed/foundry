'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'

interface InviteUserDialogProps {
  orgId: string
  isOpen: boolean
  onClose: () => void
  onInvited: () => void
}

export function InviteUserDialog({ orgId, isOpen, onClose, onInvited }: InviteUserDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleClose() {
    setEmail('')
    setRole('member')
    setError(null)
    setSuccess(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(`/api/orgs/${orgId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send invitation')
        return
      }

      setSuccess(true)
      onInvited()

      // Auto-close after brief delay
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Mail className="w-5 h-5 text-accent-cyan" />
            Invite User
          </h2>
        </DialogHeader>

        {success ? (
          <DialogBody>
            <div className="py-4 text-center">
              <p className="text-sm text-accent-success font-medium">
                Invitation sent to {email}
              </p>
            </div>
          </DialogBody>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    required
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    {role === 'admin'
                      ? 'Admins can manage members, settings, and all projects.'
                      : 'Members can access projects they are added to.'}
                  </p>
                </div>

                {error && (
                  <p className="text-xs text-accent-error">{error}</p>
                )}
              </div>
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
