'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ColorPicker } from './color-picker'

interface TagWithUsage {
  id: string
  name: string
  color: string
  project_id: string
  created_at: string
  usage_count: number
}

interface TagEditorModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  tag?: TagWithUsage | null
  onTagSaved: (tag: TagWithUsage) => void
}

const TAG_NAME_MAX = 30

export function TagEditorModal({
  isOpen,
  onClose,
  projectId,
  tag,
  onTagSaved,
}: TagEditorModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#808080')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const isEditing = !!tag

  // Reset form when modal opens/closes or tag changes
  useEffect(() => {
    if (isOpen) {
      setName(tag?.name || '')
      setColor(tag?.color || '#808080')
      setErrors({})
      setIsSaving(false)
      // Focus name input after render
      const timer = setTimeout(() => nameRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, tag])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrors({ name: 'Tag name is required' })
      return
    }
    if (trimmedName.length > TAG_NAME_MAX) {
      setErrors({ name: `Tag name must be ${TAG_NAME_MAX} characters or less` })
      return
    }

    setIsSaving(true)
    setErrors({})

    try {
      const method = isEditing ? 'PUT' : 'POST'
      const endpoint = isEditing
        ? `/api/hall/tags/${tag.id}`
        : '/api/hall/tags'

      const body: Record<string, string> = { name: trimmedName, color }
      if (!isEditing) {
        body.projectId = projectId
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409) {
          setErrors({ name: 'A tag with this name already exists' })
        } else {
          setErrors({ form: data.error || 'Failed to save tag' })
        }
        return
      }

      const savedTag = await res.json()
      onTagSaved({
        ...savedTag,
        usage_count: savedTag.usage_count ?? tag?.usage_count ?? 0,
      })
      onClose()
    } catch {
      setErrors({ form: 'An error occurred. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-5">
            {/* Warning for in-use tags */}
            {isEditing && tag && tag.usage_count > 0 && (
              <div className="p-3 bg-accent-warning/10 border border-accent-warning/30 rounded-lg">
                <p className="text-sm text-accent-warning">
                  This tag is used by {tag.usage_count}{' '}
                  {tag.usage_count === 1 ? 'idea' : 'ideas'}. Changes will
                  affect them all.
                </p>
              </div>
            )}

            {/* Tag Name */}
            <div>
              <label
                htmlFor="tag-name"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                Tag Name <span className="text-accent-error">*</span>
              </label>
              <input
                ref={nameRef}
                id="tag-name"
                type="text"
                maxLength={TAG_NAME_MAX}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) {
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.name
                      return next
                    })
                  }
                }}
                placeholder="e.g., Feature, Backend, UX..."
                className={`w-full px-3 py-2 bg-bg-primary border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent disabled:opacity-50 ${
                  errors.name ? 'border-accent-error' : 'border-border-default'
                }`}
                disabled={isSaving}
              />
              <div className="flex justify-between mt-1">
                {errors.name && (
                  <span className="text-xs text-accent-error">
                    {errors.name}
                  </span>
                )}
                <span className="text-xs text-text-tertiary ml-auto">
                  {name.length}/{TAG_NAME_MAX}
                </span>
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Color
              </label>
              <ColorPicker
                value={color}
                onChange={setColor}
                disabled={isSaving}
              />
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Preview
              </label>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: `${color}20`,
                  color: color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {name.trim() || 'Tag Name'}
              </span>
            </div>

            {/* Form error */}
            {errors.form && (
              <div className="p-3 bg-accent-error/10 border border-accent-error/30 rounded-lg">
                <p className="text-sm text-accent-error">{errors.form}</p>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSaving}
              isLoading={isSaving}
            >
              {isEditing ? 'Update Tag' : 'Create Tag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
