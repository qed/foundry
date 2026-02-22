'use client'

import { ChevronRight, FolderOpen } from 'lucide-react'

export interface BreadcrumbItem {
  id: string | null
  name: string
}

interface BreadcrumbNavProps {
  path: BreadcrumbItem[]
  onNavigate: (folderId: string | null) => void
}

export function BreadcrumbNav({ path, onNavigate }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto" aria-label="Artifact navigation">
      {path.map((item, i) => {
        const isLast = i === path.length - 1

        return (
          <div key={item.id ?? 'root'} className="flex items-center gap-1 shrink-0">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />}
            {isLast ? (
              <span className="flex items-center gap-1.5 text-text-primary font-medium">
                {i === 0 && <FolderOpen className="w-4 h-4 text-accent-cyan" />}
                {item.name}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className="flex items-center gap-1.5 text-text-secondary hover:text-accent-cyan transition-colors"
              >
                {i === 0 && <FolderOpen className="w-4 h-4" />}
                {item.name}
              </button>
            )}
          </div>
        )
      })}
    </nav>
  )
}
