'use client'

import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types/database'

interface TagFilterProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  tags: Tag[]
}

export function TagFilter({ selectedTagIds, onChange, tags }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleToggleTag = (tagId: string) => {
    const newIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]
    onChange(newIds)
  }

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'appearance-none bg-bg-secondary border rounded-lg px-3 py-1.5 text-sm text-text-primary',
          'focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent',
          'flex items-center gap-2',
          selectedTagIds.length > 0
            ? 'border-accent-cyan/50'
            : 'border-border-default'
        )}
      >
        Tags
        {selectedTagIds.length > 0 && (
          <span className="bg-accent-cyan text-bg-primary rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-medium px-1">
            {selectedTagIds.length}
          </span>
        )}
        <svg
          className={cn(
            'w-3.5 h-3.5 text-text-tertiary transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 w-64 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50">
          {/* Search within tags */}
          <div className="p-2 border-b border-border-default">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-bg-primary border border-border-default rounded text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
              />
            </div>
          </div>

          {/* Tag list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredTags.length > 0 ? (
              filteredTags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-bg-tertiary/50 cursor-pointer text-sm transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => handleToggleTag(tag.id)}
                    className="w-3.5 h-3.5 rounded border-border-default accent-accent-cyan"
                  />
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-text-primary truncate">
                    {tag.name}
                  </span>
                </label>
              ))
            ) : (
              <p className="px-3 py-3 text-text-tertiary text-sm text-center">
                {tags.length === 0
                  ? 'No tags in this project'
                  : 'No tags match'}
              </p>
            )}
          </div>

          {/* Select/Deselect all */}
          {tags.length > 0 && (
            <div className="border-t border-border-default px-3 py-2 flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => onChange(tags.map((t) => t.id))}
                className="text-accent-cyan hover:text-accent-cyan/80 font-medium transition-colors"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-text-tertiary hover:text-text-secondary font-medium transition-colors"
              >
                Deselect all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
