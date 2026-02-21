'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          )}

          {item.href ? (
            <Link
              href={item.href}
              className={`text-sm whitespace-nowrap transition-colors ${
                index === items.length - 1
                  ? 'text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-sm text-text-primary font-medium whitespace-nowrap">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
