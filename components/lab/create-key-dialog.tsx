'use client'

import { useState } from 'react'
import { Copy, Check, AlertTriangle } from 'lucide-react'
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

interface CreateKeyDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateKeyDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: CreateKeyDialogProps) {
  const [step, setStep] = useState<'form' | 'created'>('form')
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState('production')
  const [description, setDescription] = useState('')
  const [createdKey, setCreatedKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()

  const resetForm = () => {
    setStep('form')
    setName('')
    setEnvironment('production')
    setDescription('')
    setCreatedKey('')
    setCopied(false)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/app-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          environment,
          description: description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create key')
      }

      const data = await res.json()
      setCreatedKey(data.key_value)
      setStep('created')
      onCreated()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create key', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyKey = () => {
    navigator.clipboard.writeText(createdKey)
    setCopied(true)
    addToast('Key copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
              <DialogClose onClick={handleClose} />
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <DialogBody className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    App Name <span className="text-accent-error">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Mobile App, Web App"
                    className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Environment
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Description{' '}
                    <span className="text-text-tertiary font-normal">(optional)</span>
                  </label>
                  <textarea
                    maxLength={500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Notes about this key..."
                    rows={3}
                    className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan"
                  />
                </div>
              </DialogBody>

              <DialogFooter>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!name.trim() || isSubmitting}
                  isLoading={isSubmitting}
                >
                  Generate Key
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <div className="p-3 bg-accent-warning/10 border border-accent-warning/20 rounded-lg">
                <p className="text-sm text-accent-warning font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Save this key now
                </p>
                <p className="text-xs text-accent-warning/80 mt-1 ml-6">
                  You won&apos;t be able to see it again for security reasons.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Your API Key
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-xs font-mono text-accent-cyan break-all select-all">
                    {createdKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary hover:text-text-primary flex-shrink-0"
                    title="Copy key"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-accent-success" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-xs text-text-secondary space-y-1.5">
                <p className="font-medium text-text-primary">Next steps:</p>
                <ol className="space-y-1 list-decimal list-inside text-text-secondary">
                  <li>Copy the key above</li>
                  <li>Add it to your app&apos;s environment variables</li>
                  <li>Use it in the X-App-Key header when submitting feedback</li>
                </ol>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
