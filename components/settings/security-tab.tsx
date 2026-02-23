'use client'

import { useState } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'
import { cn } from '@/lib/utils'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
]

export function SecurityTab() {
  const { addToast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(newPassword))
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0
  const canSubmit = allRulesPass && passwordsMatch

  async function handleChangePassword() {
    if (!canSubmit) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      addToast('Password changed successfully', 'success')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to change password', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Change Password</h2>

        <div className="space-y-4 max-w-md">
          {/* New password */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password rules */}
          {newPassword.length > 0 && (
            <div className="space-y-1.5">
              {PASSWORD_RULES.map((rule) => {
                const passes = rule.test(newPassword)
                return (
                  <div key={rule.label} className="flex items-center gap-2 text-xs">
                    {passes ? (
                      <Check className="w-3.5 h-3.5 text-accent-success" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-text-tertiary" />
                    )}
                    <span className={cn(passes ? 'text-accent-success' : 'text-text-tertiary')}>
                      {rule.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 pr-10 bg-bg-secondary border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent',
                  confirmPassword.length > 0 && !passwordsMatch
                    ? 'border-accent-error'
                    : 'border-border-default'
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-accent-error">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              isLoading={isSaving}
              disabled={!canSubmit}
              size="sm"
            >
              Change Password
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
