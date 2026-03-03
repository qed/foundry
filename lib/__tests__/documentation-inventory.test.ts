import { describe, it, expect } from 'vitest'
import {
  createInitialCategories,
  createCustomCategory,
  calculateInventoryStats,
  buildInventoryEvidence,
  validateInventoryGate,
  STANDARD_CATEGORIES,
  MAX_CUSTOM_CATEGORIES,
} from '@/lib/helix/documentation-inventory'

describe('documentation-inventory', () => {
  describe('createInitialCategories', () => {
    it('creates 10 standard categories', () => {
      const categories = createInitialCategories()
      expect(categories).toHaveLength(10)
    })

    it('all categories start unchecked with empty fields', () => {
      const categories = createInitialCategories()
      for (const cat of categories) {
        expect(cat.exists).toBe(false)
        expect(cat.location_notes).toBe('')
        expect(cat.file_count_estimate).toBe(0)
        expect(cat.is_custom).toBe(false)
      }
    })

    it('maps standard category IDs correctly', () => {
      const categories = createInitialCategories()
      const ids = categories.map((c) => c.category_id)
      expect(ids).toContain('specifications')
      expect(ids).toContain('mockups_wireframes')
      expect(ids).toContain('meeting_notes')
      expect(ids).toContain('existing_code')
      expect(ids).toContain('prior_prototypes')
      expect(ids).toContain('user_research')
      expect(ids).toContain('api_documentation')
      expect(ids).toContain('design_files')
      expect(ids).toContain('business_requirements')
      expect(ids).toContain('other')
    })

    it('includes icon reference for each category', () => {
      const categories = createInitialCategories()
      for (const cat of categories) {
        expect(cat.icon).toBeDefined()
        expect(typeof cat.icon).toBe('object') // lucide-react ForwardRef
      }
    })
  })

  describe('createCustomCategory', () => {
    it('creates a custom category with sanitized ID', () => {
      const cat = createCustomCategory('Brand Guidelines')
      expect(cat.category_id).toBe('custom_brand_guidelines')
      expect(cat.category_name).toBe('Brand Guidelines')
      expect(cat.is_custom).toBe(true)
      expect(cat.exists).toBe(false)
    })

    it('handles special characters in name', () => {
      const cat = createCustomCategory('  API (v2)  ')
      expect(cat.category_id).toBe('custom_api_v2')
      expect(cat.category_name).toBe('  API (v2)  ')
    })
  })

  describe('calculateInventoryStats', () => {
    it('returns zero stats for unchecked categories', () => {
      const categories = createInitialCategories()
      const stats = calculateInventoryStats(categories)
      expect(stats.total_categories_checked).toBe(0)
      expect(stats.custom_categories_count).toBe(0)
      expect(stats.completion_percentage).toBe(0)
    })

    it('counts checked categories correctly', () => {
      const categories = createInitialCategories()
      categories[0].exists = true
      categories[2].exists = true
      categories[5].exists = true
      const stats = calculateInventoryStats(categories)
      expect(stats.total_categories_checked).toBe(3)
      expect(stats.completion_percentage).toBe(30)
    })

    it('counts custom categories', () => {
      const categories = [
        ...createInitialCategories(),
        createCustomCategory('Custom A'),
        createCustomCategory('Custom B'),
      ]
      const stats = calculateInventoryStats(categories)
      expect(stats.custom_categories_count).toBe(2)
    })

    it('handles empty array', () => {
      const stats = calculateInventoryStats([])
      expect(stats.total_categories_checked).toBe(0)
      expect(stats.completion_percentage).toBe(0)
    })
  })

  describe('buildInventoryEvidence', () => {
    it('builds valid evidence object', () => {
      const categories = createInitialCategories()
      categories[0].exists = true
      categories[0].location_notes = 'In Notion'
      categories[0].file_count_estimate = 5

      const evidence = buildInventoryEvidence(categories)
      expect(evidence.inventory_type).toBe('documentation_inventory')
      expect(evidence.created_at).toBeTruthy()
      expect(evidence.updated_at).toBeTruthy()
      expect(evidence.categories).toHaveLength(10)
      expect(evidence.total_categories_checked).toBe(1)
    })

    it('strips icon field from categories for serialization', () => {
      const categories = createInitialCategories()
      const evidence = buildInventoryEvidence(categories)
      for (const cat of evidence.categories) {
        // icon should not appear in serialized evidence
        expect('icon' in cat).toBe(false)
      }
    })
  })

  describe('validateInventoryGate', () => {
    it('fails when no categories are checked', () => {
      const categories = createInitialCategories()
      const result = validateInventoryGate(categories)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least one')
    })

    it('passes when at least one category is checked', () => {
      const categories = createInitialCategories()
      categories[3].exists = true
      const result = validateInventoryGate(categories)
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('passes with only custom categories checked', () => {
      const categories = [
        ...createInitialCategories(),
        { ...createCustomCategory('Custom'), exists: true },
      ]
      const result = validateInventoryGate(categories)
      expect(result.valid).toBe(true)
    })
  })

  describe('STANDARD_CATEGORIES', () => {
    it('has exactly 10 standard categories', () => {
      expect(STANDARD_CATEGORIES).toHaveLength(10)
    })

    it('each category has required fields', () => {
      for (const cat of STANDARD_CATEGORIES) {
        expect(cat.category_id).toBeTruthy()
        expect(cat.category_name).toBeTruthy()
        expect(cat.description).toBeTruthy()
        expect(cat.icon).toBeDefined()
      }
    })

    it('has unique category IDs', () => {
      const ids = STANDARD_CATEGORIES.map((c) => c.category_id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('MAX_CUSTOM_CATEGORIES', () => {
    it('is 5', () => {
      expect(MAX_CUSTOM_CATEGORIES).toBe(5)
    })
  })
})
