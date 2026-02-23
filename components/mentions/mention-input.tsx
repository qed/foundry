'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { MentionDropdown } from './mention-dropdown'
import { buildMentionString } from '@/lib/mentions/parse'
import type { MentionMatch } from '@/lib/mentions/types'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  projectId: string
  placeholder?: string
  rows?: number
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export function MentionInput({
  value,
  onChange,
  projectId,
  placeholder,
  rows = 3,
  className,
  onKeyDown: externalOnKeyDown,
}: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [matches, setMatches] = useState<MentionMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [mentionStart, setMentionStart] = useState(-1)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Search mentions API
  const searchMentions = useCallback(async (query: string) => {
    if (!projectId) return
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/mentions/search?q=${encodeURIComponent(query)}&limit=10`
      )
      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches || [])
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Debounced search
  useEffect(() => {
    if (!showDropdown) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchMentions(mentionQuery)
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [mentionQuery, showDropdown, searchMentions])

  // Calculate dropdown position based on textarea caret
  const updateDropdownPosition = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const rect = textarea.getBoundingClientRect()
    const parentRect = textarea.offsetParent?.getBoundingClientRect() || rect

    // Position below the textarea with a small offset
    setDropdownPos({
      top: rect.bottom - parentRect.top + 4,
      left: rect.left - parentRect.left,
    })
  }, [])

  // Detect @ trigger in input
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0
    onChange(newValue)

    // Find if we're in a mention context (@ followed by text, no space before @)
    const textBefore = newValue.substring(0, cursorPos)
    const atIndex = textBefore.lastIndexOf('@')

    if (atIndex >= 0) {
      // Check @ is at start or preceded by whitespace
      const charBefore = atIndex > 0 ? textBefore[atIndex - 1] : ' '
      if (charBefore === ' ' || charBefore === '\n' || atIndex === 0) {
        const query = textBefore.substring(atIndex + 1)
        // No spaces in query (simple word matching)
        if (!query.includes(' ') && query.length <= 30) {
          setMentionStart(atIndex)
          setMentionQuery(query)
          setSelectedIndex(0)
          setShowDropdown(true)
          updateDropdownPosition()
          return
        }
      }
    }

    setShowDropdown(false)
  }, [onChange, updateDropdownPosition])

  // Select a mention from dropdown
  const handleSelect = useCallback((match: MentionMatch) => {
    const textarea = textareaRef.current
    if (!textarea || mentionStart < 0) return

    const cursorPos = textarea.selectionStart || 0
    const mentionStr = buildMentionString(match.name, match.type, match.id)

    // Replace @query with the mention string
    const before = value.substring(0, mentionStart)
    const after = value.substring(cursorPos)
    const newValue = before + mentionStr + ' ' + after

    onChange(newValue)
    setShowDropdown(false)
    setMentionStart(-1)

    // Focus back on textarea after a tick
    requestAnimationFrame(() => {
      const newPos = mentionStart + mentionStr.length + 1
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
    })
  }, [value, mentionStart, onChange])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, matches.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        handleSelect(matches[selectedIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowDropdown(false)
        return
      }
    }

    // Pass through to external handler
    externalOnKeyDown?.(e)
  }, [showDropdown, matches, selectedIndex, handleSelect, externalOnKeyDown])

  const dismissDropdown = useCallback(() => {
    setShowDropdown(false)
  }, [])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {showDropdown && (
        <MentionDropdown
          matches={matches}
          selectedIndex={selectedIndex}
          position={dropdownPos}
          onSelect={handleSelect}
          onDismiss={dismissDropdown}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
