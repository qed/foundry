'use client'

import { cn } from '@/lib/utils'
import { EntityTypeIcon, getEntityTypeLabel } from './entity-type-icon'
import { ConnectionTypeIcon } from './connection-type-icon'
import { ConfidenceBar } from './confidence-bar'
import type { GraphEntityType, EntityConnectionType } from '@/types/database'

export interface ConnectionSuggestion {
  target_type: GraphEntityType
  target_id: string
  target_name: string
  connection_type: EntityConnectionType
  confidence: number
  evidence: string[]
  method: 'mention' | 'name_match'
}

const CONNECTION_TYPE_OPTIONS: { value: EntityConnectionType; label: string }[] = [
  { value: 'references', label: 'References' },
  { value: 'implements', label: 'Implements' },
  { value: 'depends_on', label: 'Depends On' },
  { value: 'relates_to', label: 'Relates To' },
  { value: 'derived_from', label: 'Derived From' },
  { value: 'complements', label: 'Complements' },
  { value: 'conflicts_with', label: 'Conflicts With' },
]

interface SuggestionCardProps {
  suggestion: ConnectionSuggestion
  checked: boolean
  onToggle: (checked: boolean) => void
  onChangeType: (newType: EntityConnectionType) => void
}

export function SuggestionCard({
  suggestion,
  checked,
  onToggle,
  onChangeType,
}: SuggestionCardProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        checked
          ? 'border-accent-cyan/40 bg-accent-cyan/5'
          : 'border-border-default bg-bg-secondary'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <label className="flex items-center mt-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only"
          />
          <div
            className={cn(
              'w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0',
              checked
                ? 'bg-accent-cyan border-accent-cyan'
                : 'border-border-default bg-bg-tertiary'
            )}
          >
            {checked && (
              <svg className="w-3 h-3 text-bg-primary" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </label>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Entity info */}
          <div className="flex items-center gap-2 mb-1.5">
            <EntityTypeIcon type={suggestion.target_type} className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">
              {suggestion.target_name}
            </span>
            <span className="text-[10px] text-text-tertiary flex-shrink-0">
              {getEntityTypeLabel(suggestion.target_type)}
            </span>
          </div>

          {/* Confidence */}
          <ConfidenceBar confidence={suggestion.confidence} className="mb-2" />

          {/* Connection type selector */}
          <div className="flex items-center gap-2 mb-2">
            <ConnectionTypeIcon type={suggestion.connection_type} className="w-3 h-3 flex-shrink-0" />
            <select
              value={suggestion.connection_type}
              onChange={(e) => onChangeType(e.target.value as EntityConnectionType)}
              className="text-xs bg-bg-tertiary border border-border-default rounded px-1.5 py-0.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan/50"
            >
              {CONNECTION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {suggestion.method === 'mention' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple font-medium">
                @mention
              </span>
            )}
          </div>

          {/* Evidence snippets */}
          {suggestion.evidence.length > 0 && (
            <div className="space-y-1">
              {suggestion.evidence.slice(0, 2).map((snippet, i) => (
                <p key={i} className="text-[11px] text-text-tertiary leading-relaxed line-clamp-2 italic">
                  &ldquo;{snippet}&rdquo;
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
