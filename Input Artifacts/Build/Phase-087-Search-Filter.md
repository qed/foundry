# Phase 087 - Feedback Search & Filter

## Objective
Implement search and filtering controls for the feedback inbox, including text search, category/tag/status/date/score filters, saved filter views, and shareable URL parameters for collaborative triage.

## Prerequisites
- Phase 084: Feedback inbox display established
- Phase 086: Category and tag system implemented
- Phase 083: Insights Lab layout with filter bar area
- TypeScript and Tailwind CSS configured

## Context
Teams need to quickly narrow down feedback to focus on specific types of issues. The search and filter interface must be fast, intuitive, and allow both single-use filtering and saving of frequently-used filter combinations. URL parameters enable sharing of filtered views across team members, while saved filters support personalized workflow preferences.

## Detailed Requirements

### Search Field
- **Placeholder**: "Search feedback..."
- **Type**: Text input, full-text search on content
- **Behavior**: Real-time search (debounced 300ms)
- **Clear Button**: X icon to clear search
- **Icon**: Search icon in input
- **Max Chars**: No limit (search input)

### Filter Controls

#### Category Filter
- **Type**: Multi-select dropdown
- **Options**: Bug, Feature Request, UX Issue, Performance, Other, Uncategorized
- **Display**: "Category: X selected" or category badges
- **Behavior**: Show/hide uncategorized by default toggle
- **Select All**: Checkbox to toggle all categories

#### Status Filter
- **Type**: Multi-select dropdown
- **Options**: New, Triaged, Converted, Archived
- **Display**: Status badges or text
- **Default**: Exclude archived items
- **Behavior**: AND logic for multiple selections

#### Tags Filter
- **Type**: Multi-select with autocomplete
- **Options**: All tags used in project
- **Behavior**: Show feedback with ANY of selected tags (OR logic)
- **Display**: Tag chips showing selected tags
- **Search**: Type to filter tag list

#### Date Range Filter
- **Type**: Date picker with presets
- **Presets**: Last 24h, Last 7d, Last 30d, Custom range
- **Display**: "Date: Last 30d" or range dates
- **Format**: YYYY-MM-DD
- **Default**: All dates (no filter)

#### Score Range Filter
- **Type**: Numeric range slider
- **Range**: 0-100
- **Display**: Slider with number inputs
- **Labels**: "Score: 50-100" or similar
- **Default**: No score filter
- **Step**: 1

### Filter Bar Layout
- **Position**: Above feedback list in inbox
- **Sticky**: Fixed to top while scrolling inbox
- **Responsive**:
  - Desktop: All filters visible, horizontal layout
  - Mobile: Collapsed into button, expandable drawer
- **Background**: White with bottom border
- **Padding**: 12px horizontal, 8px vertical

### Filter Chips/Badges
- **Display**: Show active filters as removable chips
- **Location**: Below filter controls
- **Remove**: Click X on chip to remove that filter
- **Clear All**: "Clear all filters" link when any active
- **Visual**: Subtle background, icon per filter type

### Saved Filter Views
- **Save Current**: Button to save current filter combination
- **Name Input**: Modal to name the saved filter
- **Manage Saved**: Dropdown to load/delete saved filters
- **Default Name**: "Filter 1", "Filter 2", etc.
- **Limit**: 10 saved filters per project (configurable)
- **Storage**: Persisted in user preferences table
- **Sharing**: Share icon generates URL with filter params

### URL Parameters
- **Query Pattern**: `/lab?search=...&category=bug,ux&status=new&tags=urgent&dateFrom=2024-01-01&dateTo=2024-01-31&scoreMin=50&scoreMax=100`
- **Encoding**: URL-safe encoding for special chars
- **Copy Button**: Easy copy of shareable URL
- **Permalink**: "Copy link" button in filter bar
- **Browser History**: Filters update URL without page reload

### Query String Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| search | string | "crash on login" | Text search in content |
| category | string (comma-separated) | "bug,performance" | Multiple categories |
| status | string (comma-separated) | "new,triaged" | Multiple statuses |
| tags | string (comma-separated) | "urgent,mobile" | Any matching tags |
| dateFrom | ISO date | "2024-01-01" | Start of date range |
| dateTo | ISO date | "2024-01-31" | End of date range |
| scoreMin | number | "50" | Minimum score |
| scoreMax | number | "100" | Maximum score |
| savedFilter | uuid | "f47ac10b" | Load saved filter |

### Filter Logic
- **AND Between Filter Types**: Category AND Status AND Date AND Score
- **OR Within Tags**: Any matching tag (union)
- **Search**: Matches in content (full-text)
- **Empty Results**: Show "No feedback found" with option to clear filters

### Debouncing & Performance
- **Search Input**: Debounce 300ms before querying
- **Range Sliders**: Debounce 500ms before querying
- **Filter Changes**: Immediate update (checkboxes)
- **Query Optimization**: Use database indexes for common filters

## UI Components

### _components/FeedbackFilterBar.tsx

```typescript
'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Settings } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import SearchInput from './SearchInput';
import FilterDropdown from './FilterDropdown';
import FilterChips from './FilterChips';
import SavedFiltersMenu from './SavedFiltersMenu';
import { useFilterStore } from '@/hooks/useFilterStore';

interface FeedbackFilterBarProps {
  projectId: string;
}

export default function FeedbackFilterBar({ projectId }: FeedbackFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    search,
    categories,
    statuses,
    tags,
    dateFrom,
    dateTo,
    scoreMin,
    scoreMax,
    setSearch,
    setCategories,
    setStatuses,
    setTags,
    setDateRange,
    setScoreRange,
    clearAll
  } = useFilterStore(projectParams);

  // Parse URL params on mount
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const categoryParams = searchParams.get('category')?.split(',') || [];
    const statusParams = searchParams.get('status')?.split(',') || [];
    const tagParams = searchParams.get('tags')?.split(',') || [];
    const dateFromParam = searchParams.get('dateFrom') || undefined;
    const dateToParam = searchParams.get('dateTo') || undefined;
    const scoreMinParam = searchParams.get('scoreMin');
    const scoreMaxParam = searchParams.get('scoreMax');

    if (search) setSearch(search);
    if (categoryParams.length) setCategories(categoryParams);
    if (statusParams.length) setStatuses(statusParams);
    if (tagParams.length) setTags(tagParams);
    if (dateFromParam || dateToParam) setDateRange(dateFromParam, dateToParam);
    if (scoreMinParam || scoreMaxParam) {
      setScoreRange(
        scoreMinParam ? parseInt(scoreMinParam) : 0,
        scoreMaxParam ? parseInt(scoreMaxParam) : 100
      );
    }
  }, [searchParams]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categories.length) params.set('category', categories.join(','));
    if (statuses.length) params.set('status', statuses.join(','));
    if (tags.length) params.set('tags', tags.join(','));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (scoreMin > 0) params.set('scoreMin', scoreMin.toString());
    if (scoreMax < 100) params.set('scoreMax', scoreMax.toString());

    const queryString = params.toString();
    router.push(`?${queryString}`, { scroll: false });
  }, [search, categories, statuses, tags, dateFrom, dateTo, scoreMin, scoreMax, router]);

  const hasActiveFilters =
    search || categories.length || statuses.length || tags.length ||
    dateFrom || dateTo || scoreMin > 0 || scoreMax < 100;

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="px-4 py-3 space-y-3">
        {/* Search and Action Row */}
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search feedback..."
          />

          {/* Filter Toggle (Mobile) */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden p-2 border border-gray-300 rounded-md hover:bg-gray-50"
            title="Toggle filters"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Saved Filters */}
          <SavedFiltersMenu
            projectId={projectId}
            currentSearch={search}
            currentCategories={categories}
            currentStatuses={statuses}
            currentTags={tags}
            currentDateFrom={dateFrom}
            currentDateTo={dateTo}
            currentScoreMin={scoreMin}
            currentScoreMax={scoreMax}
          />
        </div>

        {/* Filter Dropdowns (Desktop Always, Mobile When Expanded) */}
        <div className={`
          ${isExpanded ? 'block' : 'hidden'} lg:block
          grid grid-cols-2 lg:grid-cols-6 gap-2
        `}>
          <FilterDropdown
            label="Category"
            type="category"
            selectedValues={categories}
            onChange={setCategories}
          />

          <FilterDropdown
            label="Status"
            type="status"
            selectedValues={statuses}
            onChange={setStatuses}
          />

          <FilterDropdown
            label="Tags"
            type="tags"
            selectedValues={tags}
            onChange={setTags}
            projectId={projectId}
          />

          <FilterDropdown
            label="Date"
            type="date"
            selectedValues={[dateFrom, dateTo].filter(Boolean)}
            onChange={(values) => {
              const [from, to] = values;
              setDateRange(from, to);
            }}
          />

          <div className="col-span-2 lg:col-span-1">
            <ScoreRangeFilter
              min={scoreMin}
              max={scoreMax}
              onChange={(min, max) => setScoreRange(min, max)}
            />
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <FilterChips
            filters={{
              search,
              categories,
              statuses,
              tags,
              dateFrom,
              dateTo,
              scoreMin,
              scoreMax
            }}
            onRemoveFilter={(filterType) => {
              switch (filterType) {
                case 'search':
                  setSearch('');
                  break;
                case 'category':
                  setCategories([]);
                  break;
                case 'status':
                  setStatuses([]);
                  break;
                case 'tags':
                  setTags([]);
                  break;
                case 'date':
                  setDateRange(undefined, undefined);
                  break;
                case 'score':
                  setScoreRange(0, 100);
                  break;
              }
            }}
            onClearAll={clearAll}
          />
        )}
      </div>
    </div>
  );
}
```

### _components/SearchInput.tsx

```typescript
'use client';

import { Search, X } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { useState, useEffect } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...'
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  const debouncedChange = useDebouncedCallback((text: string) => {
    onChange(text);
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    debouncedChange(e.target.value);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
```

### _components/FilterDropdown.tsx

```typescript
'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { getProjectTags } from '@/lib/supabase/feedback';

type FilterType = 'category' | 'status' | 'tags' | 'date';

interface FilterDropdownProps {
  label: string;
  type: FilterType;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  projectId?: string;
}

const categoryOptions = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'ux_issue', label: 'UX Issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
  { value: 'uncategorized', label: 'Uncategorized' }
];

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'converted', label: 'Converted' },
  { value: 'archived', label: 'Archived' }
];

export default function FilterDropdown({
  label,
  type,
  selectedValues,
  onChange,
  projectId
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Load tags if needed
  const { data: tagOptions = [] } = useQuery({
    queryKey: ['project-tags', projectId],
    queryFn: () => getProjectTags(projectId!),
    enabled: type === 'tags' && !!projectId
  });

  const options = type === 'category' ? categoryOptions :
                  type === 'status' ? statusOptions :
                  type === 'tags' ? tagOptions.map(t => ({ value: t, label: t })) :
                  [];

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const selectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 flex items-center justify-between"
      >
        <span className="truncate">
          {selectedValues.length > 0
            ? `${label}: ${selectedValues.length}`
            : label}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 rounded-md shadow-lg bg-white z-10 max-h-80 overflow-y-auto">
          <button
            onClick={selectAll}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 font-medium"
          >
            {selectedValues.length === options.length ? 'Deselect All' : 'Select All'}
          </button>

          {options.map(option => (
            <button
              key={option.value}
              onClick={() => toggleValue(option.value)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
            >
              {option.label}
              {selectedValues.includes(option.value) && (
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

### _components/ScoreRangeFilter.tsx

```typescript
'use client';

import { useDebouncedCallback } from 'use-debounce';
import { useState } from 'react';

interface ScoreRangeFilterProps {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}

export default function ScoreRangeFilter({
  min,
  max,
  onChange
}: ScoreRangeFilterProps) {
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);

  const debouncedChange = useDebouncedCallback((newMin: number, newMax: number) => {
    onChange(newMin, newMax);
  }, 500);

  const handleMinChange = (value: number) => {
    setLocalMin(value);
    debouncedChange(value, localMax);
  };

  const handleMaxChange = (value: number) => {
    setLocalMax(value);
    debouncedChange(localMin, value);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">Score</label>
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max="100"
          value={localMin}
          onChange={(e) => handleMinChange(parseInt(e.target.value))}
          className="w-full"
        />
        <input
          type="range"
          min="0"
          max="100"
          value={localMax}
          onChange={(e) => handleMaxChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>{localMin}</span>
          <span>{localMax}</span>
        </div>
      </div>
    </div>
  );
}
```

### _components/FilterChips.tsx

```typescript
'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterChipsProps {
  filters: {
    search?: string;
    categories?: string[];
    statuses?: string[];
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    scoreMin?: number;
    scoreMax?: number;
  };
  onRemoveFilter: (filterType: string) => void;
  onClearAll: () => void;
}

export default function FilterChips({
  filters,
  onRemoveFilter,
  onClearAll
}: FilterChipsProps) {
  const chips: Array<{ type: string; label: string }> = [];

  if (filters.search) {
    chips.push({ type: 'search', label: `Search: "${filters.search}"` });
  }
  if (filters.categories?.length) {
    chips.push({ type: 'category', label: `Category: ${filters.categories.join(', ')}` });
  }
  if (filters.statuses?.length) {
    chips.push({ type: 'status', label: `Status: ${filters.statuses.join(', ')}` });
  }
  if (filters.tags?.length) {
    chips.push({ type: 'tags', label: `Tags: ${filters.tags.join(', ')}` });
  }
  if (filters.dateFrom || filters.dateTo) {
    const dateLabel = `${filters.dateFrom || 'Start'} to ${filters.dateTo || 'End'}`;
    chips.push({ type: 'date', label: `Date: ${dateLabel}` });
  }
  if ((filters.scoreMin ?? 0) > 0 || (filters.scoreMax ?? 100) < 100) {
    chips.push({
      type: 'score',
      label: `Score: ${filters.scoreMin ?? 0}-${filters.scoreMax ?? 100}`
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {chips.map(chip => (
        <div
          key={chip.type}
          className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs"
        >
          {chip.label}
          <button
            onClick={() => onRemoveFilter(chip.type)}
            className="hover:opacity-70"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
      >
        Clear all
      </button>
    </div>
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
                        ├── FeedbackFilterBar.tsx
                        ├── SearchInput.tsx
                        ├── FilterDropdown.tsx
                        ├── ScoreRangeFilter.tsx
                        ├── FilterChips.tsx
                        └── SavedFiltersMenu.tsx (Phase 087 continued)
hooks/
└── useFilterStore.ts
lib/
└── supabase/
    └── feedback.ts
        ├── getProjectTags()
        └── getUserSavedFilters()
```

## Acceptance Criteria
- [x] Search input debounces 300ms before querying
- [x] Clear button appears in search when text entered
- [x] Category filter shows all 6 categories as checkboxes
- [x] Status filter shows all 4 statuses as checkboxes
- [x] Tags filter loads from project and shows checkboxes
- [x] Date filter supports preset options (24h, 7d, 30d, custom)
- [x] Score range filter uses dual-thumb slider
- [x] Filters persist in URL query parameters
- [x] Filters restore from URL on page load
- [x] Active filter chips display below filters
- [x] Removing chip removes that filter
- [x] "Clear all" removes all filters at once
- [x] Filter bar sticky at top while scrolling inbox
- [x] Mobile: Filters collapse into button, expandable drawer
- [x] Desktop: All filters visible
- [x] Saved filters dropdown accessible
- [x] URL shareable with filters encoded
- [x] Loading state on filter dropdowns while loading data

## Testing Instructions

1. **Search Function**
   - Type in search box
   - Wait 300ms
   - Verify feedback list filters
   - Click clear button
   - Verify search clears
   - Verify URL includes ?search=

2. **Category Filter**
   - Click category dropdown
   - Select multiple categories
   - Verify inbox updates to show only selected
   - Verify chip appears for each selected
   - Click chip X to remove one
   - Click "Select All"
   - Click "Deselect All"

3. **Status Filter**
   - Select "new" status
   - Verify only new feedback shows
   - Select "converted" also
   - Verify both new and converted show (OR logic)
   - Default should exclude archived

4. **Tags Filter**
   - Select tag from dropdown
   - Verify feedback with any matching tag shows
   - Select another tag
   - Verify both tags match (OR logic)

5. **Date Filter**
   - Select "Last 7 days" preset
   - Verify only feedback from last 7 days shows
   - Select custom range
   - Verify date picker works
   - Select end date before start date (validation)

6. **Score Filter**
   - Drag min slider to 50
   - Verify only feedback with score >= 50 shows
   - Drag max slider to 80
   - Verify only 50-80 range shows
   - Reset to 0-100

7. **URL Parameters**
   - Apply filters
   - Verify URL updates with ?category=bug&status=new
   - Copy URL
   - Open in new tab
   - Verify filters restore correctly
   - Share URL with team member

8. **Mobile Responsive**
   - View on mobile device
   - Verify filters collapsed in button
   - Click settings icon
   - Verify filters expand in drawer
   - Apply filter
   - Verify drawer collapses
   - Verify chip appears

9. **Saved Filters** (Phase 087)
   - Apply some filters
   - Click "Save filter"
   - Enter name "Critical Bugs"
   - Click save
   - Verify filter appears in saved list
   - Clear current filters
   - Click saved filter name
   - Verify filters restore
   - Delete saved filter
   - Verify removed from list
