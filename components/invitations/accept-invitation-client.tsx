'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, Mail, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOptionalAuth } from '@/lib/auth/context'

interface InvitationInfo {
  email: string
  organization_name: string
  role: string
  inviter_name: string
  expires_at: string
  status: string
}

interface AcceptInvitationClientProps {
  token: string
}

export function AcceptInvitationClient({ token }: AcceptInvitationClientProps) {
  const router = useRouter()
  const auth = useOptionalAuth()
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; orgSlug?: string } | null>(null)

  useEffect(() => {
    async function doFetch() {
      try {
        const res = await fetch(`/api/invitations/validate-token?token=${token}`)
        const data = await res.json()
        setIsValid(data.valid)
        setInvitation(data.invitation)
      } catch {
        setIsValid(false)
      } finally {
        setIsLoading(false)
      }
    }
    doFetch()
  }, [token])

  async function handleAccept() {
    setIsAccepting(true)
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Failed to accept invitation' })
        return
      }

      setResult({
        success: true,
        message: data.message,
        orgSlug: data.org_slug,
      })
    } catch {
      setResult({ success: false, message: 'Something went wrong. Please try again.' })
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
      </div>
    )
  }

  // Success state
  if (result?.success) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-accent-success" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">You&apos;re in!</h1>
          <p className="text-sm text-text-secondary mb-6">{result.message}</p>
          <Button
            onClick={() => router.push(result.orgSlug ? `/org/${result.orgSlug}` : '/')}
          >
            Go to Organization
          </Button>
        </div>
      </div>
    )
  }

  // Error state after accepting
  if (result && !result.success) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-error/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6 text-accent-error" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Unable to accept</h1>
          <p className="text-sm text-text-secondary mb-6">{result.message}</p>
          <Button variant="secondary" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  // Invalid/expired invitation
  if (!isValid || !invitation) {
    const isExpired = invitation?.status === 'expired'
    const isRevoked = invitation?.status === 'revoked'
    const isAccepted = invitation?.status === 'accepted'

    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-error/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6 text-accent-error" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">
            {isExpired ? 'Invitation Expired' : isRevoked ? 'Invitation Revoked' : isAccepted ? 'Already Accepted' : 'Invalid Invitation'}
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            {isExpired
              ? 'This invitation has expired. Please ask the admin to send a new one.'
              : isRevoked
                ? 'This invitation has been revoked by the admin.'
                : isAccepted
                  ? 'This invitation has already been accepted.'
                  : 'This invitation link is not valid.'}
          </p>
          <Button variant="secondary" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!auth?.user) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel rounded-xl p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-accent-cyan" />
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-1">You&apos;re invited!</h1>
            <p className="text-sm text-text-secondary">
              <strong className="text-text-primary">{invitation.inviter_name}</strong> invited you to join{' '}
              <strong className="text-text-primary">{invitation.organization_name}</strong>
            </p>
          </div>

          <div className="bg-bg-secondary rounded-lg p-4 mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Role</span>
              <span className="text-text-primary capitalize">{invitation.role}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Email</span>
              <span className="text-text-primary">{invitation.email}</span>
            </div>
          </div>

          <p className="text-xs text-text-tertiary text-center mb-4">
            Please sign in with <strong>{invitation.email}</strong> to accept this invitation.
          </p>

          <Button
            className="w-full"
            onClick={() => router.push(`/login?redirect=/invitations/${token}`)}
          >
            Sign In to Accept
          </Button>
        </div>
      </div>
    )
  }

  // Logged in — show accept UI
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-accent-cyan" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-1">You&apos;re invited!</h1>
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{invitation.inviter_name}</strong> invited you to join{' '}
            <strong className="text-text-primary">{invitation.organization_name}</strong>
          </p>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Organization</span>
            <span className="text-text-primary font-medium">{invitation.organization_name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Your role</span>
            <span className="flex items-center gap-1.5 text-text-primary capitalize">
              {invitation.role === 'admin' ? (
                <Shield className="w-3.5 h-3.5 text-accent-purple" />
              ) : (
                <User className="w-3.5 h-3.5 text-text-tertiary" />
              )}
              {invitation.role}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Invited by</span>
            <span className="text-text-primary">{invitation.inviter_name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Expires</span>
            <span className="text-text-tertiary">
              {new Date(invitation.expires_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleAccept}
          isLoading={isAccepting}
        >
          Accept Invitation
        </Button>
      </div>
    </div>
  )
}
