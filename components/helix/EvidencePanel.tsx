'use client'

import React, { useState, useCallback } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { HelixStep } from '@/types/database'

interface EvidencePanelProps {
  step: HelixStep
  stepKey: string
  evidenceType: 'text' | 'file' | 'url' | 'checklist'
  onComplete: (evidence: unknown) => Promise<void>
  isLoading?: boolean
  isLocked?: boolean
  error?: string
}

export default function EvidencePanel({
  step,
  stepKey,
  evidenceType,
  onComplete,
  isLoading = false,
  isLocked = false,
  error,
}: EvidencePanelProps) {
  const [evidence, setEvidence] = useState<unknown>(step.evidence_data || null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const isComplete = step.status === 'complete'

  const validateEvidence = useCallback((): boolean => {
    setValidationError(null)

    if (!evidence) {
      setValidationError('Evidence is required to complete this step')
      return false
    }

    switch (evidenceType) {
      case 'text':
        if (typeof evidence !== 'string' || evidence.trim().length < 50) {
          setValidationError('Text evidence must be at least 50 characters')
          return false
        }
        break
      case 'file':
        if (typeof evidence !== 'object' || !(evidence as Record<string, unknown>)?.fileName) {
          setValidationError('File must be uploaded')
          return false
        }
        break
      case 'url':
        try {
          new URL(evidence as string)
        } catch {
          setValidationError('Please enter a valid URL')
          return false
        }
        break
      case 'checklist':
        if (!Array.isArray(evidence) || evidence.length === 0) {
          setValidationError('At least one item must be checked')
          return false
        }
        if (!evidence.every((item: { checked: boolean }) => item.checked)) {
          setValidationError('All items must be checked')
          return false
        }
        break
    }

    return true
  }, [evidence, evidenceType])

  const handleComplete = async () => {
    if (!validateEvidence()) return

    try {
      setLocalError(null)
      await onComplete(evidence)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to complete step')
    }
  }

  if (isComplete) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle2 size={24} className="text-green-500" />
          <h3 className="text-lg font-semibold text-text-primary">Step Complete</h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Evidence submitted on{' '}
          {step.completed_at
            ? new Date(step.completed_at).toLocaleDateString()
            : 'unknown date'}
        </p>
        <div className="p-4 bg-green-900/20 border border-green-800/30 rounded-lg">
          <p className="text-sm text-green-300">
            This step has been completed. Evidence is stored and can be reviewed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6 sticky top-20">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Submit Evidence</h3>

      {isLocked ? (
        <div className="p-4 bg-yellow-900/20 border border-yellow-800/30 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-yellow-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-300">Step is Locked</p>
            <p className="text-xs text-yellow-400/80 mt-1">
              Complete the previous step to unlock this one.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Evidence Type Renderer */}
          <div className="mb-6">
            {evidenceType === 'text' && (
              <TextEvidenceInput
                value={evidence as string}
                onChange={setEvidence}
                placeholder="Write your response here (minimum 50 characters)..."
              />
            )}

            {evidenceType === 'file' && (
              <FileEvidenceInput value={evidence} onChange={setEvidence} />
            )}

            {evidenceType === 'url' && (
              <URLEvidenceInput
                value={evidence as string}
                onChange={setEvidence}
                placeholder="https://example.com/..."
              />
            )}

            {evidenceType === 'checklist' && (
              <ChecklistEvidenceInput
                value={evidence as { label: string; checked: boolean }[]}
                onChange={setEvidence}
                items={['Item 1', 'Item 2', 'Item 3', 'Item 4']}
              />
            )}
          </div>

          {/* Validation Error */}
          {(validationError || localError || error) && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800/30 rounded-lg flex gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-300">Error</p>
                <p className="text-sm text-red-400/80 mt-1">
                  {validationError || localError || error}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleComplete}
            disabled={isLoading || !evidence}
            className="w-full px-4 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={20} className="animate-spin" />}
            Mark as Complete
          </button>

          <p className="text-xs text-text-secondary mt-3 text-center">
            Once submitted, evidence cannot be edited.
          </p>
        </>
      )}
    </div>
  )
}

// Evidence Type Input Components

function TextEvidenceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const charCount = value?.length || 0

  return (
    <div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-64 p-4 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
      />
      <p className={`text-xs mt-2 ${charCount >= 50 ? 'text-green-500' : 'text-text-secondary'}`}>
        {charCount} / 50 characters (minimum)
      </p>
    </div>
  )
}

function FileEvidenceInput({
  value,
  onChange,
}: {
  value: unknown
  onChange: (value: unknown) => void
}) {
  const fileData = value as { fileName?: string; fileSize?: number } | null

  const handleFileChange = (file: File) => {
    onChange({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
      fileUrl: URL.createObjectURL(file),
    })
  }

  return (
    <div>
      <div className="border-2 border-dashed border-bg-tertiary rounded-lg p-6 text-center hover:border-accent-cyan transition-colors">
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileChange(e.target.files[0])
          }}
          className="hidden"
          id={`file-input-evidence`}
        />
        <label
          htmlFor={`file-input-evidence`}
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <p className="text-sm font-medium text-text-primary">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-text-secondary">PDF, DOCX, TXT, or MD files</p>
        </label>
      </div>
      {fileData?.fileName && (
        <div className="mt-3 p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
          <p className="text-sm text-green-300 font-medium">{fileData.fileName}</p>
          <p className="text-xs text-green-400/80 mt-1">
            {((fileData.fileSize || 0) / 1024).toFixed(2)} KB
          </p>
        </div>
      )}
    </div>
  )
}

function URLEvidenceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      type="url"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-bg-primary border border-bg-tertiary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
    />
  )
}

function ChecklistEvidenceInput({
  value = [],
  onChange,
  items,
}: {
  value: { label: string; checked: boolean }[]
  onChange: (value: { label: string; checked: boolean }[]) => void
  items: string[]
}) {
  const checklist =
    value.length > 0 ? value : items.map((item) => ({ label: item, checked: false }))

  const handleToggle = (idx: number) => {
    const updated = [...checklist]
    updated[idx] = { ...updated[idx], checked: !updated[idx].checked }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {checklist.map((item, idx) => (
        <label key={idx} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => handleToggle(idx)}
            className="w-5 h-5 rounded border-bg-tertiary"
          />
          <span
            className={`text-sm ${item.checked ? 'text-text-primary font-medium' : 'text-text-secondary'}`}
          >
            {item.label}
          </span>
        </label>
      ))}
    </div>
  )
}
