'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TECH_REQ_CATEGORIES, type TechReqCategory } from '@/lib/shop/tech-req-templates'

interface CreateTechnicalRequirementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultCategory?: TechReqCategory
  onSuccess: (docId: string) => void
}

export function CreateTechnicalRequirementDialog({
  open,
  onOpenChange,
  projectId,
  defaultCategory,
  onSuccess,
}: CreateTechnicalRequirementDialogProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TechReqCategory>(defaultCategory || 'auth_security')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setTitle('')
      setCategory(defaultCategory || 'auth_security')
      setError(null)
    }
    onOpenChange(nextOpen)
  }, [onOpenChange, defaultCategory])

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/technical-requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), category }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create')
      }

      const doc = await res.json()
      onSuccess(doc.id)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setIsCreating(false)
    }
  }, [title, category, projectId, onSuccess, handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Technical Requirement</DialogTitle>
          <DialogClose onClick={() => handleOpenChange(false)} />
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TechReqCategory)}
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
            >
              {TECH_REQ_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Secure Password Hashing"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) handleCreate()
              }}
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-accent-error">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} isLoading={isCreating}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
