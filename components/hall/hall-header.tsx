'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Search, X, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ViewToggle } from './view-toggle'

interface HallHeaderProps {
  searchValue: string
  onSearchChange: (value: string) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  onNewIdeaClick: () => void
  tagsHref: string
}

export function HallHeader({
  searchValue,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onNewIdeaClick,
  tagsHref,
}: HallHeaderProps) {
  return (
    <div className="mb-6">
      {/* Top row: title + actions */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Image src="/icon-hall.png" alt="The Hall" width={40} height={40} />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary">
              The Hall
            </h1>
            <p className="text-xs text-text-tertiary hidden sm:block">
              Where raw product ideas live
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Manage Tags link — hidden on mobile */}
          <Link
            href={tagsHref}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <Tags className="w-4 h-4" />
            Manage Tags
          </Link>

          {/* View toggle — hidden on mobile */}
          <div className="hidden md:block">
            <ViewToggle activeView={viewMode} onChange={onViewModeChange} />
          </div>

          {/* New Idea button — hidden on mobile (FAB replaces it) */}
          <Button onClick={onNewIdeaClick} className="hidden md:flex">
            + New Idea
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search ideas by title or description..."
          className="w-full pl-10 pr-9 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
