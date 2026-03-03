/**
 * Documentation inventory category configuration for Step 2.1.
 * Defines the 10 standard categories for documentation audit.
 */

import type { LucideIcon } from 'lucide-react'
import {
  FileText,
  Palette,
  MessageSquare,
  Code2,
  FlaskConical,
  Users,
  Globe,
  Figma,
  Briefcase,
  FolderOpen,
} from 'lucide-react'

export interface DocumentationCategory {
  category_id: string
  category_name: string
  description: string
  icon: LucideIcon
  exists: boolean
  location_notes: string
  file_count_estimate: number
  is_custom: boolean
}

export interface InventoryEvidence {
  inventory_type: 'documentation_inventory'
  created_at: string
  updated_at: string
  categories: DocumentationCategory[]
  total_categories_checked: number
  custom_categories_count: number
  completion_percentage: number
}

export interface StandardCategoryConfig {
  category_id: string
  category_name: string
  description: string
  icon: LucideIcon
}

export const STANDARD_CATEGORIES: StandardCategoryConfig[] = [
  {
    category_id: 'specifications',
    category_name: 'Specifications',
    description: 'Technical specs, feature specs, API contracts',
    icon: FileText,
  },
  {
    category_id: 'mockups_wireframes',
    category_name: 'Mockups/Wireframes',
    description: 'UI/UX mockups, wireframes, design explorations',
    icon: Palette,
  },
  {
    category_id: 'meeting_notes',
    category_name: 'Meeting Notes',
    description: 'Meeting transcripts, decision logs, sprint reviews',
    icon: MessageSquare,
  },
  {
    category_id: 'existing_code',
    category_name: 'Existing Code',
    description: 'Current codebase, reference implementations',
    icon: Code2,
  },
  {
    category_id: 'prior_prototypes',
    category_name: 'Prior Prototypes',
    description: 'Proof-of-concept code, prior attempts, experiments',
    icon: FlaskConical,
  },
  {
    category_id: 'user_research',
    category_name: 'User Research',
    description: 'User interviews, feedback, personas, testing results',
    icon: Users,
  },
  {
    category_id: 'api_documentation',
    category_name: 'API Documentation',
    description: 'API specs, endpoints, integration guides',
    icon: Globe,
  },
  {
    category_id: 'design_files',
    category_name: 'Design Files',
    description: 'Figma, Adobe XD, design system files',
    icon: Figma,
  },
  {
    category_id: 'business_requirements',
    category_name: 'Business Requirements',
    description: 'Product requirements docs, business logic, success metrics',
    icon: Briefcase,
  },
  {
    category_id: 'other',
    category_name: 'Other',
    description: 'Custom or miscellaneous documentation',
    icon: FolderOpen,
  },
]

export const MAX_CUSTOM_CATEGORIES = 5
export const MAX_LOCATION_NOTES_LENGTH = 200
export const MAX_CUSTOM_CATEGORY_NAME_LENGTH = 50

/**
 * Create initial category state from standard categories config.
 */
export function createInitialCategories(): DocumentationCategory[] {
  return STANDARD_CATEGORIES.map((config) => ({
    category_id: config.category_id,
    category_name: config.category_name,
    description: config.description,
    icon: config.icon,
    exists: false,
    location_notes: '',
    file_count_estimate: 0,
    is_custom: false,
  }))
}

/**
 * Create a new custom category with a unique ID.
 */
export function createCustomCategory(name: string): DocumentationCategory {
  const id = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`
  return {
    category_id: id,
    category_name: name,
    description: 'Custom documentation category',
    icon: FolderOpen,
    exists: false,
    location_notes: '',
    file_count_estimate: 0,
    is_custom: true,
  }
}

/**
 * Calculate inventory summary statistics.
 */
export function calculateInventoryStats(categories: DocumentationCategory[]) {
  const totalChecked = categories.filter((c) => c.exists).length
  const customCount = categories.filter((c) => c.is_custom).length
  const total = categories.length
  const percentage = total > 0 ? Math.round((totalChecked / total) * 100) : 0

  return {
    total_categories_checked: totalChecked,
    custom_categories_count: customCount,
    completion_percentage: percentage,
  }
}

/**
 * Build the evidence object for auto-save and completion.
 * Strips the `icon` field (non-serializable) from categories.
 */
export function buildInventoryEvidence(
  categories: DocumentationCategory[]
): InventoryEvidence {
  const stats = calculateInventoryStats(categories)
  const now = new Date().toISOString()

  return {
    inventory_type: 'documentation_inventory',
    created_at: now,
    updated_at: now,
    categories: categories.map(({ icon: _icon, ...rest }) => rest) as DocumentationCategory[],
    ...stats,
  }
}

/**
 * Validate that the inventory meets the minimum gate requirement.
 * At least 1 category must be marked as "exists".
 */
export function validateInventoryGate(categories: DocumentationCategory[]): {
  valid: boolean
  error: string | null
} {
  const hasChecked = categories.some((c) => c.exists)
  if (!hasChecked) {
    return {
      valid: false,
      error: 'Please identify at least one existing documentation category before advancing',
    }
  }
  return { valid: true, error: null }
}
