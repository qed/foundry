/**
 * Utility functions for Step Output Summary Cards.
 * Pure functions for preview generation, icon selection, and status determination.
 */

import type { LucideIcon } from 'lucide-react'
import { FolderOpen, BookOpen, FileText, CheckCircle2, File } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type EvidenceType =
  | 'documentation_inventory'
  | 'knowledge_capture'
  | 'documentation_files'
  | 'documentation_verification'

export type StepStatus = 'complete' | 'in_progress' | 'incomplete'

// ─── Icon Selection ──────────────────────────────────────────────────────────

const EVIDENCE_ICON_MAP: Record<EvidenceType, LucideIcon> = {
  documentation_inventory: FolderOpen,
  knowledge_capture: BookOpen,
  documentation_files: FileText,
  documentation_verification: CheckCircle2,
}

/**
 * Get the icon for an evidence type.
 */
export function getEvidenceIcon(evidenceType: string): LucideIcon {
  return EVIDENCE_ICON_MAP[evidenceType as EvidenceType] ?? File
}

// ─── Preview Generation ─────────────────────────────────────────────────────

/**
 * Generate a compact preview string from evidence data.
 */
export function generatePreview(evidenceData: Record<string, unknown>): string {
  const type = evidenceData.evidence_type as string | undefined

  switch (type) {
    case 'documentation_inventory': {
      const categories = evidenceData.categories as Array<Record<string, unknown>> | undefined
      if (!categories) return 'No inventory data'
      const checked = categories.filter((c) => c.exists).length
      return `${categories.length} categories, ${checked} with content`
    }

    case 'knowledge_capture': {
      const sections = evidenceData.sections as Record<string, { content: string }> | undefined
      if (!sections) return 'No knowledge data'
      const total = Object.keys(sections).length
      const withContent = Object.values(sections).filter(
        (s) => s.content && s.content.replace(/<[^>]*>/g, '').trim().length >= 50
      ).length
      const totalChars = evidenceData.total_characters as number | undefined
      if (totalChars) {
        return `${withContent} of ${total} sections, ${totalChars.toLocaleString()} chars`
      }
      return `${withContent} of ${total} sections`
    }

    case 'documentation_files': {
      const totalFiles = evidenceData.total_files as number | undefined
      const totalSize = evidenceData.total_size_bytes as number | undefined
      if (totalFiles === undefined) return 'No files'
      const sizeStr = totalSize ? `, ${formatBytes(totalSize)}` : ''
      return `${totalFiles} file${totalFiles !== 1 ? 's' : ''}${sizeStr}`
    }

    case 'documentation_verification': {
      const verification = evidenceData.verification as Record<string, unknown> | undefined
      if (!verification) return 'No verification data'
      const complete = verification.categories_complete as number
      const partial = verification.categories_partial as number
      const missing = verification.categories_missing as number
      const gaps = partial + missing
      if (gaps > 0) {
        return `${complete} complete, ${gaps} gap${gaps !== 1 ? 's' : ''} acknowledged`
      }
      return `${complete} categories complete`
    }

    default:
      return 'Evidence data'
  }
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Format a timestamp as relative time ("2 hours ago") or absolute date.
 */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) return 'Just now'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a timestamp as a full date string for tooltips.
 */
export function formatAbsoluteTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ─── Status ──────────────────────────────────────────────────────────────────

/**
 * Determine the display status for a step.
 */
export function getStepStatus(stepStatus: string): StepStatus {
  if (stepStatus === 'complete') return 'complete'
  if (stepStatus === 'active') return 'in_progress'
  return 'incomplete'
}

/**
 * Get the evidence type label for display.
 */
export function getEvidenceTypeLabel(evidenceType: string): string {
  const labels: Record<string, string> = {
    documentation_inventory: 'Documentation Inventory',
    knowledge_capture: 'Knowledge Capture',
    documentation_files: 'Documentation Files',
    documentation_verification: 'Documentation Verification',
  }
  return labels[evidenceType] ?? 'Evidence'
}
