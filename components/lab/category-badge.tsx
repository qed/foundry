'use client'

import {
  AlertCircle,
  Lightbulb,
  Eye,
  Zap,
  Tag,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeedbackCategory } from '@/types/database'

interface CategoryConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  colors: string // bg + text combined
}

const CATEGORY_CONFIG: Record<FeedbackCategory, CategoryConfig> = {
  bug: {
    label: 'Bug',
    icon: AlertCircle,
    colors: 'bg-accent-error/15 text-accent-error',
  },
  feature_request: {
    label: 'Feature',
    icon: Lightbulb,
    colors: 'bg-accent-success/15 text-accent-success',
  },
  ux_issue: {
    label: 'UX Issue',
    icon: Eye,
    colors: 'bg-accent-purple/15 text-accent-purple',
  },
  performance: {
    label: 'Performance',
    icon: Zap,
    colors: 'bg-accent-warning/15 text-accent-warning',
  },
  other: {
    label: 'Other',
    icon: Tag,
    colors: 'bg-text-tertiary/15 text-text-tertiary',
  },
  uncategorized: {
    label: 'Uncategorized',
    icon: HelpCircle,
    colors: 'bg-text-tertiary/10 text-text-tertiary',
  },
}

const SIZE_STYLES = {
  sm: 'px-1.5 py-0.5 text-[9px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
}

const ICON_SIZE = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
}

interface CategoryBadgeProps {
  category: FeedbackCategory
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function CategoryBadge({
  category,
  size = 'sm',
  showIcon = true,
  className,
}: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.colors,
        SIZE_STYLES[size],
        className
      )}
    >
      {showIcon && <Icon className={ICON_SIZE[size]} />}
      {config.label}
    </span>
  )
}

// Export config for reuse in selectors
export { CATEGORY_CONFIG }
export type { CategoryConfig }
