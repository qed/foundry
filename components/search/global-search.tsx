'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react'
import { useProject } from '@/lib/context/project-context'
import { useOrg } from '@/lib/context/org-context'
import { EntityTypeIcon } from '@/components/knowledge-graph/entity-type-icon'
import { cn } from '@/lib/utils'
import type { GraphEntityType } from '@/types/database'
import { Spinner } from '@/components/ui/spinner'

interface SearchResult {
  type: GraphEntityType
  id: string
  name: string
  excerpt: string
  status?: string
  secondary?: string
}

interface ResultGroup {
  type: GraphEntityType
  label: string
  results: SearchResult[]
  total: number
}

// Custom event to trigger search open
export const OPEN_GLOBAL_SEARCH = 'open-global-search'

export function openGlobalSearch() {
  window.dispatchEvent(new CustomEvent(OPEN_GLOBAL_SEARCH))
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<ResultGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const { project } = useProject()
  const { org } = useOrg()

  const flatResults = groups.flatMap((g) => g.results)
  const totalResults = flatResults.length

  // Listen for Cmd+K and custom event
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    function handleCustomOpen() {
      setOpen(true)
    }
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener(OPEN_GLOBAL_SEARCH, handleCustomOpen)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener(OPEN_GLOBAL_SEARCH, handleCustomOpen)
    }
  }, [])

  // Focus input when opening, clear when closing
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      document.body.style.overflow = ''
      setQuery('')
      setGroups([])
      setSelectedIndex(-1)
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setGroups([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setGroups(data.groups || [])
    } catch {
      setGroups([])
    } finally {
      setIsLoading(false)
    }
  }, [project.id])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setGroups([])
      setSelectedIndex(-1)
      return
    }
    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      doSearch(query.trim())
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  const navigateTo = useCallback((result: SearchResult) => {
    const base = `/org/${org.slug}/project/${project.id}`
    let url = base
    switch (result.type) {
      case 'idea':
        url = `${base}/hall?selected=${result.id}`
        break
      case 'feature':
        url = `${base}/shop?selected=${result.id}`
        break
      case 'blueprint':
        url = `${base}/room?selected=${result.id}`
        break
      case 'work_order':
        url = `${base}/floor?selected=${result.id}`
        break
      case 'feedback':
        url = `${base}/lab?selected=${result.id}`
        break
      case 'artifact':
        url = `${base}/artifacts?selected=${result.id}`
        break
    }
    setOpen(false)
    router.push(url)
  }, [org.slug, project.id, router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < totalResults - 1 ? prev + 1 : 0))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalResults - 1))
      return
    }
    if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < totalResults) {
      e.preventDefault()
      navigateTo(flatResults[selectedIndex])
      return
    }
  }, [selectedIndex, totalResults, flatResults, navigateTo])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll('[data-search-item]')
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!open) return null

  let flatIndex = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-[90%] max-w-2xl bg-bg-secondary rounded-xl border border-border-default shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
          <Search className="w-5 h-5 text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(-1)
            }}
            placeholder="Search ideas, features, blueprints, work orders..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary outline-none text-sm"
          />
          {isLoading && <Spinner className="w-4 h-4" />}
          {query && !isLoading && (
            <button
              onClick={() => { setQuery(''); setGroups([]); inputRef.current?.focus() }}
              className="p-1 hover:bg-bg-tertiary rounded transition-colors text-text-tertiary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto">
          {!query.trim() && (
            <div className="p-8 text-center text-text-tertiary text-sm">
              Start typing to search across all modules
            </div>
          )}

          {query.trim() && !isLoading && groups.length === 0 && (
            <div className="p-8 text-center text-text-tertiary text-sm">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {groups.map((group) => (
            <div key={group.type}>
              <div className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm px-4 py-2 flex items-center gap-2 text-xs font-medium text-text-secondary border-b border-border-subtle">
                <EntityTypeIcon type={group.type} className="w-3.5 h-3.5" />
                <span>{group.label}</span>
                <span className="text-text-tertiary">({group.total})</span>
              </div>
              {group.results.map((result) => {
                const idx = flatIndex++
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    data-search-item
                    onClick={() => navigateTo(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors',
                      isSelected ? 'bg-accent-cyan/10' : 'hover:bg-bg-tertiary/50'
                    )}
                  >
                    <EntityTypeIcon type={result.type} className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary truncate font-medium">
                          {highlightMatch(result.name, query)}
                        </span>
                        {result.status && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary flex-shrink-0">
                            {result.status.replace(/_/g, ' ')}
                          </span>
                        )}
                        {result.secondary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple flex-shrink-0">
                            {result.secondary.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      {result.excerpt && (
                        <p className="text-xs text-text-tertiary truncate mt-0.5">
                          {highlightMatch(result.excerpt, query)}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border-default text-[11px] text-text-tertiary">
          <span className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            <ArrowDown className="w-3 h-3" />
            navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" />
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-bg-tertiary text-[10px] font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  )
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return text
  return (
    <>
      {text.substring(0, idx)}
      <mark className="bg-accent-cyan/20 text-accent-cyan rounded-sm px-0.5">
        {text.substring(idx, idx + query.length)}
      </mark>
      {text.substring(idx + query.length)}
    </>
  )
}
