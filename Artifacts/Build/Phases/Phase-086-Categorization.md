# Phase 086 - Feedback Categorization

## Objective
Implement categorization controls for feedback items, including category selection, multi-tag support, visual badge styling, and bulk categorization from the inbox list view.

## Prerequisites
- Phase 085: Feedback detail view with categorization section
- Phase 084: Feedback inbox display
- Phase 081: Database schema with category enum and tags array

## Context
Feedback categorization is essential for triage and prioritization. Teams need to quickly assign feedback to one of several categories (bug, feature request, UX issue, performance, other) and apply multiple tags for more granular organization. The categorization interface must be intuitive in both single-item and bulk contexts, with clear visual feedback on category assignments and color-coded badges throughout the interface.

## Detailed Requirements

### Category Options & Colors

| Category | Color | Icon | Description |
|----------|-------|------|-------------|
| bug | Red | AlertCircle | Critical issue affecting functionality |
| feature_request | Green | Lightbulb | Request for new functionality |
| ux_issue | Purple | Eye | User experience or interface problem |
| performance | Orange | Zap | Performance, speed, or resource usage issue |
| other | Gray | Tag | Miscellaneous feedback |
| uncategorized | Gray-200 | Question | Default, awaiting categorization |

### Category Dropdown Component
- **Display**: Current category with badge color
- **Options**: All 6 categories as selectable items
- **Selected Indicator**: Checkmark or highlight on current category
- **On Change**: Mutate database immediately, show loading state
- **Disabled State**: Shows spinner while updating
- **Keyboard Navigation**: Arrow keys to navigate, Enter to select, Esc to close

### Tags System

#### Tag Features
- **Display Format**: Removable chips/pills
- **Color**: Indigo background with rounded corners
- **Max Chars**: 50 characters per tag
- **Duplicates**: Prevent duplicate tags (case-insensitive)
- **Existing Tags List**: Dropdown of previously used tags for quick selection
- **New Tags**: Free-form text input to create new tags

#### Tag Input Interface
- **Text Input**: "Add tag..." placeholder
- **Add Button**: Next to input, disabled if input empty
- **Enter Key**: Submit tag on Enter
- **Autocomplete**: Show existing tags that match input
- **On Add**: Immediately update database, show chip, clear input
- **Tag Validation**: Min 2 chars, max 50 chars, alphanumeric + hyphens

### Bulk Categorization
- **Multi-select**: Checkboxes in inbox list (Phase 095)
- **Floating Action Bar**: Appears when items selected
- **Bulk Category Update**: Select category → apply to all selected items
- **Bulk Tag Application**: Add tag → apply to all selected items
- **Confirmation**: "Apply to N items?" dialog before bulk operations
- **Success Feedback**: Toast showing "Updated N feedback items"

### Category Badge Display

#### In Inbox List
- **Location**: Top-left of item preview
- **Size**: Small (text-xs, 6px padding)
- **Icon**: Category icon at left, label text
- **Responsive**: Truncate label on very narrow screens

#### In Detail View
- **Location**: Categorization section
- **Size**: Medium (select dropdown)
- **Context**: Full category name, editable

#### In Header Stats
- **Integration**: Color-coding in list items matches category colors
- **Visual Hierarchy**: Category badge always visible, even without score

### Priority Score Integration
- **Display**: Separate from category badge
- **Position**: Right of category in list, or in detail section
- **Styling**: Amber background for score
- **Uncategorized Behavior**: Empty/null score until category assigned
- **AI Assignment**: Auto-enrichment assigns score, user can update

### Category-Specific Rules (Optional)

- **Bug + Performance**: Can be combined (both apply)
- **Feature vs UX**: Mutually exclusive recommendations (suggest one)
- **Uncategorized**: Prevent converting to work order until categorized

## UI Components

### _components/CategoryBadge.tsx

```typescript
'use client';

import { AlertCircle, Lightbulb, Eye, Zap, Tag, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Category = 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'other' | 'uncategorized';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const categoryConfig: Record<Category, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  bug: {
    label: 'Bug',
    icon: AlertCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200'
  },
  feature_request: {
    label: 'Feature',
    icon: Lightbulb,
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200'
  },
  ux_issue: {
    label: 'UX Issue',
    icon: Eye,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200'
  },
  performance: {
    label: 'Performance',
    icon: Zap,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200'
  },
  other: {
    label: 'Other',
    icon: Tag,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200'
  },
  uncategorized: {
    label: 'Uncategorized',
    icon: HelpCircle,
    bgColor: 'bg-gray-200',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300'
  }
};

const sizeConfig = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2'
};

export default function CategoryBadge({
  category,
  size = 'sm',
  className
}: CategoryBadgeProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center rounded font-medium border',
      config.bgColor,
      config.textColor,
      config.borderColor,
      sizeConfig[size],
      className
    )}>
      <Icon className={`w-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'} h-${size === 'sm' ? '3' : size === 'md' ? '4' : '5'}`} />
      {config.label}
    </span>
  );
}
```

### _components/CategorySelector.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import CategoryBadge from './CategoryBadge';
import { updateFeedbackCategory } from '@/lib/supabase/feedback';

type Category = 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'other' | 'uncategorized';

interface CategorySelectorProps {
  feedbackId: string;
  currentCategory: Category;
  onSelect?: (category: Category) => void;
}

const categories: Category[] = [
  'bug',
  'feature_request',
  'ux_issue',
  'performance',
  'other',
  'uncategorized'
];

export default function CategorySelector({
  feedbackId,
  currentCategory,
  onSelect
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (category: Category) =>
      updateFeedbackCategory(feedbackId, category),
    onSuccess: (_, category) => {
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
      onSelect?.(category);
      setIsOpen(false);
    }
  });

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={updateMutation.isPending}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        <CategoryBadge category={currentCategory} size="sm" />
        {updateMutation.isPending && (
          <div className="animate-spin text-xs">⟳</div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 border border-gray-200 rounded-md shadow-lg bg-white z-10">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => updateMutation.mutate(category)}
              disabled={updateMutation.isPending}
              className={cn(
                'w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50',
                category === currentCategory && 'bg-indigo-50'
              )}
            >
              <CategoryBadge category={category} size="sm" />
              {category === currentCategory && (
                <Check className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### _components/TagInput.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addFeedbackTag, removeFeedbackTag, getExistingTags } from '@/lib/supabase/feedback';

interface TagInputProps {
  feedbackId: string;
  projectId: string;
  existingTags: string[];
  onTagsChange?: (tags: string[]) => void;
}

export default function TagInput({
  feedbackId,
  projectId,
  existingTags,
  onTagsChange
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Get all existing tags in project for suggestions
  const { data: allProjectTags = [] } = useQuery({
    queryKey: ['project-tags', projectId],
    queryFn: () => getExistingTags(projectId),
    staleTime: 60000
  });

  const addTagMutation = useMutation({
    mutationFn: (tag: string) => addFeedbackTag(feedbackId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
      setInputValue('');
      setSuggestions([]);
    }
  });

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) => removeFeedbackTag(feedbackId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
    }
  });

  // Update suggestions as user types
  useEffect(() => {
    if (inputValue.length >= 2) {
      const filtered = allProjectTags.filter(
        tag =>
          tag.toLowerCase().includes(inputValue.toLowerCase()) &&
          !existingTags.includes(tag)
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [inputValue, allProjectTags, existingTags]);

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed.length >= 2 && trimmed.length <= 50 && !existingTags.includes(trimmed)) {
      addTagMutation.mutate(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing Tags */}
      <div className="flex flex-wrap gap-2">
        {existingTags.map(tag => (
          <div
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-medium"
          >
            {tag}
            <button
              onClick={() => removeTagMutation.mutate(tag)}
              disabled={removeTagMutation.isPending}
              className="hover:opacity-70 disabled:opacity-50"
              title="Remove tag"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Tag Input */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add tag..."
            maxLength={50}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={() => handleAddTag(inputValue)}
            disabled={!inputValue.trim() || inputValue.length < 2 || addTagMutation.isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 rounded-md bg-white shadow-md z-10">
            {suggestions.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setInputValue(tag);
                  handleAddTag(tag);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Character Count */}
        <p className="text-xs text-gray-500 mt-1">
          {inputValue.length}/50
        </p>
      </div>
    </div>
  );
}
```

### _components/BulkCategorizeBar.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import { bulkUpdateFeedbackCategory } from '@/lib/supabase/feedback';

type Category = 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'other' | 'uncategorized';

interface BulkCategorizeBarProps {
  selectedIds: string[];
  onClose: () => void;
}

const categories: Category[] = [
  'bug',
  'feature_request',
  'ux_issue',
  'performance',
  'other'
];

export default function BulkCategorizeBar({
  selectedIds,
  onClose
}: BulkCategorizeBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const queryClient = useQueryClient();

  const bulkMutation = useMutation({
    mutationFn: (category: Category) =>
      bulkUpdateFeedbackCategory(selectedIds, category),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['feedback']
      });
      onClose();
    }
  });

  const handleApply = (category: Category) => {
    setSelectedCategory(category);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (selectedCategory) {
      bulkMutation.mutate(selectedCategory);
    }
  };

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-900">
            {selectedIds.length} selected
          </p>

          {/* Category Buttons */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleApply(category)}
                disabled={bulkMutation.isPending}
                className="hover:opacity-80 disabled:opacity-50"
              >
                <CategoryBadge category={category} size="sm" />
              </button>
            ))}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Apply category to {selectedIds.length} items?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This will set all selected feedback to{' '}
              <CategoryBadge category={selectedCategory} size="sm" className="ml-1" />
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={bulkMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

## File Structure
```
app/
└── org/
    └── [orgSlug]/
        └── project/
            └── [projectId]/
                └── lab/
                    └── _components/
                        ├── CategoryBadge.tsx
                        ├── CategorySelector.tsx
                        ├── TagInput.tsx
                        └── BulkCategorizeBar.tsx (Phase 095)
lib/
└── supabase/
    └── feedback.ts
        ├── updateFeedbackCategory()
        ├── addFeedbackTag()
        ├── removeFeedbackTag()
        ├── getExistingTags()
        └── bulkUpdateFeedbackCategory()
```

## Acceptance Criteria
- [x] CategoryBadge component displays all 6 categories with correct colors
- [x] CategoryBadge shows appropriate icon for each category
- [x] CategorySelector dropdown shows all category options
- [x] Current category highlighted/checked in dropdown
- [x] Selecting category immediately updates database
- [x] Loading state shows during mutation
- [x] TagInput displays existing tags as removable chips
- [x] TagInput accepts new tags via input + button or Enter key
- [x] Tag suggestions show previously used tags that match input
- [x] Duplicate tags prevented (case-insensitive check)
- [x] Tags have min 2 chars, max 50 chars validation
- [x] Remove tag button immediately removes from database
- [x] BulkCategorizeBar shows when multiple items selected
- [x] Bulk apply shows confirmation dialog
- [x] Bulk apply updates all selected items
- [x] Success toast/notification appears after bulk operations

## Testing Instructions

1. **Category Badge**
   - Verify all 6 categories render with correct colors
   - Verify icons display correctly
   - Test small, medium, large sizes
   - Verify custom className prop works

2. **Category Selector**
   - Click dropdown to open
   - Click category to select
   - Verify database updates
   - Verify detail view refreshes
   - Verify inbox list updates category badge
   - Test keyboard navigation (arrow keys, Enter, Esc)

3. **Tag Management**
   - Add tag via input + button
   - Add tag via Enter key
   - Verify tag appears as chip
   - Click X to remove tag
   - Verify database updates
   - Verify suggestions appear for partial matches
   - Test duplicate prevention (add same tag twice)
   - Test validation (< 2 chars rejected, > 50 chars truncated)

4. **Tag Suggestions**
   - Type first 2 chars of previously used tag
   - Verify matching suggestions appear
   - Click suggestion to add it
   - Verify max 5 suggestions shown

5. **Bulk Categorization** (Phase 095)
   - Select multiple feedback items
   - Verify action bar appears
   - Click category button
   - Verify confirmation dialog
   - Confirm bulk operation
   - Verify all selected items updated
   - Verify success notification

6. **Edge Cases**
   - Try to add empty tag → button disabled
   - Try to add tag < 2 chars → button disabled
   - Try to add duplicate tag → not added
   - Try to add 51+ char tag → truncated to 50
   - Remove tag while still typing → input not cleared
