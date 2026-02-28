'use client'

import React, { useState } from 'react'
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Clock,
  User,
  ClipboardCheck,
  AlertCircle,
} from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'

// ---------------------------------------------------------------------------
// Evidence Type Definitions
// ---------------------------------------------------------------------------

interface TextEvidence {
  type: 'text'
  content: string
  source?: 'paste' | 'file'
  fileName?: string
}

interface FileEvidence {
  type: 'file'
  fileName: string
  fileSize?: number
  fileType?: string
  fileUrl?: string
  uploadedAt?: string
}

interface URLEvidence {
  type: 'url'
  url: string
  title?: string
}

interface ChecklistEvidence {
  type: 'checklist'
  items: { label: string; checked: boolean }[]
}

interface ManualEvidence {
  type: 'manual'
  note?: string
}

type EvidenceData = TextEvidence | FileEvidence | URLEvidence | ChecklistEvidence | ManualEvidence

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EvidenceViewerProps {
  /** Raw evidence_data from helix_steps table (JSONB) */
  evidenceData: unknown
  /** The evidence type hint from the step config */
  evidenceType?: 'text' | 'file' | 'url' | 'checklist'
  /** Step key for audit footer */
  stepKey?: string
  /** Timestamp of completion */
  completedAt?: string | null
  /** Submitter display name */
  submitterName?: string | null
  /** Submitter email */
  submitterEmail?: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EvidenceViewer({
  evidenceData,
  evidenceType,
  stepKey,
  completedAt,
  submitterName,
  submitterEmail,
}: EvidenceViewerProps) {
  if (!evidenceData) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-bg-tertiary p-6">
        <div className="flex items-center gap-3 text-text-secondary">
          <AlertCircle size={20} />
          <p className="text-sm">No evidence data available for this step.</p>
        </div>
      </div>
    )
  }

  // Normalize the evidence into a typed shape
  const evidence = normalizeEvidence(evidenceData, evidenceType)

  return (
    <div className="bg-bg-secondary rounded-lg border border-bg-tertiary">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-bg-tertiary">
        <CheckCircle2 size={20} className="text-green-500" />
        <h3 className="text-lg font-semibold text-text-primary">Submitted Evidence</h3>
      </div>

      {/* Metadata */}
      {(completedAt || submitterName) && (
        <div className="px-6 py-4 border-b border-bg-tertiary flex flex-wrap gap-4 text-sm text-text-secondary">
          {completedAt && (
            <span className="flex items-center gap-2">
              <Clock size={14} />
              {new Date(completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          {submitterName && (
            <span className="flex items-center gap-2">
              <User size={14} />
              {submitterName}
              {submitterEmail && (
                <span className="text-text-secondary/60">({submitterEmail})</span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Evidence Content */}
      <div className="p-6">
        {evidence.type === 'text' && <TextEvidenceView evidence={evidence} />}
        {evidence.type === 'file' && <FileEvidenceView evidence={evidence} />}
        {evidence.type === 'url' && <URLEvidenceView evidence={evidence} />}
        {evidence.type === 'checklist' && <ChecklistEvidenceView evidence={evidence} />}
        {evidence.type === 'manual' && <ManualEvidenceView evidence={evidence} />}
      </div>

      {/* Audit Footer */}
      {(stepKey || evidenceType) && (
        <div className="px-6 py-3 border-t border-bg-tertiary bg-bg-primary/50 rounded-b-lg">
          <p className="text-xs text-text-secondary/60">
            {stepKey && <>Step {stepKey}</>}
            {stepKey && evidenceType && <> &middot; </>}
            {evidenceType && <>Type: {evidenceType}</>}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-Viewers
// ---------------------------------------------------------------------------

function TextEvidenceView({ evidence }: { evidence: TextEvidence }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(evidence.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  return (
    <div>
      {evidence.source === 'file' && evidence.fileName && (
        <p className="text-xs text-text-secondary mb-3 flex items-center gap-2">
          <FileText size={14} />
          Source file: {evidence.fileName}
        </p>
      )}

      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-2 rounded bg-bg-tertiary hover:bg-bg-tertiary/80 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <CheckCircle2 size={14} className="text-green-500" />
          ) : (
            <Copy size={14} className="text-text-secondary" />
          )}
        </button>

        <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6 max-h-96 overflow-y-auto">
          <div className="prose prose-sm prose-invert max-w-none pr-8">
            <MarkdownRenderer content={evidence.content} />
          </div>
        </div>
      </div>
    </div>
  )
}

function FileEvidenceView({ evidence }: { evidence: FileEvidence }) {
  return (
    <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-accent-cyan/10 rounded-lg">
          <FileText size={24} className="text-accent-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary truncate">{evidence.fileName}</p>
          {evidence.fileType && (
            <p className="text-xs text-text-secondary mt-1">{evidence.fileType}</p>
          )}
          {evidence.fileSize && (
            <p className="text-xs text-text-secondary mt-1">
              {(evidence.fileSize / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
        {evidence.fileUrl && (
          <a
            href={evidence.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-accent-cyan text-white text-sm rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Download
          </a>
        )}
      </div>
    </div>
  )
}

function URLEvidenceView({ evidence }: { evidence: URLEvidence }) {
  return (
    <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6">
      <a
        href={evidence.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 text-accent-cyan hover:underline"
      >
        <ExternalLink size={18} />
        <span className="truncate">{evidence.title || evidence.url}</span>
      </a>
    </div>
  )
}

function ChecklistEvidenceView({ evidence }: { evidence: ChecklistEvidence }) {
  const checkedCount = evidence.items.filter((i) => i.checked).length
  const totalCount = evidence.items.length

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck size={16} className="text-text-secondary" />
        <p className="text-sm text-text-secondary">
          {checkedCount} of {totalCount} items completed
        </p>
      </div>
      <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-4 space-y-3">
        {evidence.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={item.checked}
              disabled
              className="w-4 h-4 rounded border-bg-tertiary"
            />
            <span
              className={`text-sm ${
                item.checked
                  ? 'text-text-primary line-through opacity-70'
                  : 'text-text-secondary'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ManualEvidenceView({ evidence }: { evidence: ManualEvidence }) {
  return (
    <div className="bg-bg-primary border border-bg-tertiary rounded-lg p-6 text-center">
      <AlertCircle size={24} className="text-yellow-500 mx-auto mb-3" />
      <p className="text-sm text-text-secondary">
        {evidence.note || 'This step was manually reviewed and approved.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Normalizer — Converts raw JSONB evidence_data into typed EvidenceData
// ---------------------------------------------------------------------------

function normalizeEvidence(raw: unknown, typeHint?: string): EvidenceData {
  if (!raw) {
    return { type: 'manual', note: 'No evidence data' }
  }

  // If raw is already typed with a `type` field
  if (typeof raw === 'object' && raw !== null && 'type' in raw) {
    return raw as EvidenceData
  }

  const data = raw as Record<string, unknown>

  // Detect text evidence — has `content` field (from Step 1.1, 1.2, 1.3 patterns)
  if (data.content && typeof data.content === 'string') {
    return {
      type: 'text',
      content: data.content,
      source: data.source as 'paste' | 'file' | undefined,
      fileName: data.fileName as string | undefined,
    }
  }

  // Detect Step 1.1 structured evidence — has `ideaText` field
  if (data.ideaText && typeof data.ideaText === 'string') {
    const parts: string[] = []
    if (data.projectName) parts.push(`# ${data.projectName}`)
    if (data.problemStatement) parts.push(`## Problem Statement\n${data.problemStatement}`)
    if (data.targetUsers) parts.push(`## Target Users\n${data.targetUsers}`)
    if (data.vision) parts.push(`## Vision\n${data.vision}`)
    // Strip HTML tags from TipTap content for markdown display
    const ideaText = (data.ideaText as string).replace(/<[^>]*>/g, '')
    parts.push(`## Project Idea\n${ideaText}`)

    return {
      type: 'text',
      content: parts.join('\n\n'),
    }
  }

  // Detect file evidence
  if (data.fileName && typeof data.fileName === 'string' && !data.content) {
    return {
      type: 'file',
      fileName: data.fileName,
      fileSize: data.fileSize as number | undefined,
      fileType: data.fileType as string | undefined,
      fileUrl: data.fileUrl as string | undefined,
    }
  }

  // Detect URL evidence
  if (data.url && typeof data.url === 'string') {
    return {
      type: 'url',
      url: data.url,
      title: data.title as string | undefined,
    }
  }

  // Detect checklist evidence
  if (Array.isArray(raw)) {
    const isChecklist = raw.every(
      (item) => typeof item === 'object' && item !== null && 'label' in item && 'checked' in item
    )
    if (isChecklist) {
      return {
        type: 'checklist',
        items: raw as { label: string; checked: boolean }[],
      }
    }
  }

  // Detect checklist inside items field
  if (data.items && Array.isArray(data.items)) {
    return {
      type: 'checklist',
      items: data.items as { label: string; checked: boolean }[],
    }
  }

  // Fallback: plain string
  if (typeof raw === 'string') {
    return { type: 'text', content: raw }
  }

  // Last resort: manual
  return { type: 'manual', note: 'Evidence format not recognized' }
}
