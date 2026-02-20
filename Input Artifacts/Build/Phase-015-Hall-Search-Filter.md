# Phase 015 - Hall Search & Filter

## Objective
Implement search, tag filtering, and status filtering with URL-based state management. Enable users to narrow ideas by keywords, tags, and lifecycle status with shareable filter states.

## Prerequisites
- Phase 011: Hall Database Schema (ideas, tags, idea_tags tables)
- Phase 012: Hall Page Layout (FilterBar component structure)
- Phase 014: Idea List View (idea cards/rows exist)

## Context
As The Hall grows, users need efficient ways to find ideas among many. Search allows keyword matching in titles and descriptions. Tag filtering enables quick browsing of idea categories. Status filtering helps users focus on ideas at specific stages (raw vs. mature vs. promoted). All filters should be composable and shareable via URL.

## Detailed Requirements

### Search Input

**UI Component**
- Positioned in HallHeader (Phase 012)
- Single text input with magnifying glass icon
- Placeholder: "Search ideas by title or description..."
- Width: Full width on mobile, ~300px on desktop
- Trigger: Search automatically on input change (with debounce)
- Clear icon (X) appears when text entered; click to clear search

**Search Behavior**
- Debounce input change: wait 300ms after user stops typing before querying
- Search queries ideas by:
  - Title (case-insensitive, substring match)
  - Body/description (case-insensitive, substring match)
- Empty search: no filtering applied
- Search works in combination with tag and status filters (AND logic)
- Search is case-insensitive

**Search Results**
- Results update immediately as user types (after debounce)
- Result count displayed: "45 ideas match 'feature'"
- Empty results state: "No ideas match your search"

**URL State**
- Search stored in URL params: `?search=feature`
- URL is shareable: send link to teammate with filters applied

### Tag Filtering

**UI Component** (in FilterBar)
- **Tag Filter Display**:
  - "Tags" label/button
  - Opens dropdown with all project tags
  - Show tag name + color indicator
  - Each tag is clickable checkbox
  - Multi-select: can select multiple tags

- **Tag Dropdown Behavior**:
  - Shows all project tags with colored badges
  - Checkmark indicator next to selected tags
  - Search within dropdown to filter tags (optional)
  - "Select all" and "Deselect all" options (optional)
  - Close dropdown on outside click or Escape

- **Selected Tags Display** (chip bar above ideas):
  - Show applied tag filters as removable colored pills
  - Each pill has tag name and colored background
  - X button on each pill to remove that filter
  - "Clear all" button if any filters applied

**Filter Logic**
- Multi-tag AND logic: ideas must have ALL selected tags
  - Example: Select "Feature" AND "Backend" → only ideas with both tags
- Combined with search and status filters
- Filter updates results in real-time

**URL State**
- Tag IDs stored in URL: `?tags=uuid1,uuid2,uuid3`
- Multiple tags separated by comma
- Shareable via URL

### Status Filtering

**UI Component** (in FilterBar)
- Dropdown labeled "Status"
- Show options:
  - All Statuses (default, no filter)
  - Raw
  - Developing
  - Mature
  - Promoted
  - Archived
- Selected status shows in dropdown button
- Current selection shown with checkmark

**Filter Logic**
- Single-select: only one status can be active
- "All Statuses" means no filter applied
- Filters in combination with search and tags

**URL State**
- Status stored in URL: `?status=developing`
- "All Statuses" = no status param in URL

### Combined Filtering

**Filter Composition**
- Search AND Tag Filter AND Status Filter
- All filters applied simultaneously
- Filters are independent: changing one doesn't clear others

**Example Scenarios**
1. Search "mobile" + Tag "Frontend" → ideas with "mobile" in title/body AND tagged "Frontend"
2. Search "API" + Status "Mature" → mature ideas with "API" in content
3. Tags "Feature" + "Security" + Status "Developing" → ideas with both tags in developing status
4. No filters → all ideas (unless search is empty and tags/status are all)

### Filter Bar UI

**Layout** (Below HallHeader)
- Flex row with controls
- On mobile: wrap to 2-3 lines if needed
- Sticky positioning: remains visible when scrolling

**Components**
1. **Search Input** (See HallHeader)
2. **Status Dropdown**: "Status: All" → shows selected status
3. **Tag Filter Button**: "Tags (2)" → shows count of selected tags
4. **Applied Filters Chip Bar**: Display applied filters as removable pills
5. **Clear All Filters Button**: Reset all filters to default (secondary button)

**Responsive Behavior**
- Desktop: All controls in single row
- Tablet: Wrap if needed, maintain usability
- Mobile: Stack vertically or use dropdowns to save space

### Active Filters Display

**Chip Bar** (Below FilterBar)
- Shows each applied filter as a removable pill
- Format: "[Tag Color Dot] Tag Name" or "Status: Developing"
- Each pill has X button to remove that filter
- Clicking X removes filter and updates results immediately
- If no filters applied: chip bar is hidden
- "Clear all" button next to chips for quick reset

### Clear All Filters

**Behavior**
- Button labeled "Clear all" or "Reset filters"
- Visible only when any filter applied
- On click:
  - Clear search input
  - Clear tag selections
  - Reset status to "All Statuses"
  - Update results to show all ideas
  - Remove all params from URL
- Confirmation: not needed (low-friction, can undo by typing again)

### URL Query Parameters

**Parameter Structure**
```
/org/[slug]/project/[id]/hall
  ?search=keyword
  &tags=uuid1,uuid2
  &status=developing
  &sort=newest
  &view=grid
```

**Behavior**
- Parameters are optional; any can be omitted
- URL reflects current filter state
- Shared URL loads with same filters applied
- Bookmark or share to maintain filter state
- Browser back button restores previous state
- Page refresh maintains filters

**Query Parameter Details**

| Parameter | Type | Example | Default | Notes |
|-----------|------|---------|---------|-------|
| search | string | `search=mobile%20app` | (empty) | URL-encoded, case-insensitive |
| tags | string | `tags=uuid1,uuid2` | (empty) | Comma-separated tag UUIDs, AND logic |
| status | string | `status=developing` | (empty/all) | Single value: raw, developing, mature, promoted, archived |
| sort | string | `sort=newest` | newest | Values: newest, oldest, updated |
| view | string | `view=list` | grid | Values: grid, list |

## File Structure

```
app/
├── org/
│   └── [orgSlug]/
│       └── project/
│           └── [projectId]/
│               └── hall/
│                   ├── page.tsx (main page)
│                   └── components/
│                       ├── SearchInput.tsx
│                       ├── StatusFilter.tsx
│                       ├── TagFilter.tsx
│                       ├── FilterChipBar.tsx
│                       ├── FilterBar.tsx
│                       └── ClearAllButton.tsx
└── api/
    └── hall/
        └── ideas/
            └── route.ts (updated to support filters)
```

## Component Specifications

### SearchInput.tsx

```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search ideas by title or description...",
}: SearchInputProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);

    // Debounce the actual search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  const handleClear = () => {
    setDisplayValue("");
    onChange("");
  };

  return (
    <div className="relative flex-1 md:flex-none md:w-80">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {displayValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
```

### StatusFilter.tsx

```typescript
interface StatusFilterProps {
  value: string | null;
  onChange: (status: string | null) => void;
}

const STATUS_OPTIONS = [
  { label: "All Statuses", value: null },
  { label: "Raw", value: "raw" },
  { label: "Developing", value: "developing" },
  { label: "Mature", value: "mature" },
  { label: "Promoted", value: "promoted" },
  { label: "Archived", value: "archived" },
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLabel = STATUS_OPTIONS.find(opt => opt.value === value)?.label || "All Statuses";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (newValue: string | null) => {
    onChange(newValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
      >
        Status: {currentLabel}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {STATUS_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              onKeyDown={handleKeyDown}
              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                value === option.value
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {value === option.value && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### TagFilter.tsx

```typescript
interface TagFilterProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  projectTags: Tag[];
}

export function TagFilter({
  selectedTagIds,
  onChange,
  projectTags,
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleTag = (tagId: string) => {
    const newIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    onChange(newIds);
  };

  const filteredTags = projectTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
      >
        Tags
        {selectedTagIds.length > 0 && (
          <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {selectedTagIds.length}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Search within tags */}
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border-b border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Tag list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredTags.length > 0 ? (
              filteredTags.map(tag => (
                <label
                  key={tag.id}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => handleToggleTag(tag.id)}
                    className="w-4 h-4 rounded"
                  />
                  <span
                    className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-gray-700">{tag.name}</span>
                </label>
              ))
            ) : (
              <p className="px-4 py-2 text-gray-500 text-sm">No tags found</p>
            )}
          </div>

          {/* Select/Deselect all */}
          {projectTags.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-2 flex gap-2 text-sm">
              <button
                onClick={() => onChange(projectTags.map(t => t.id))}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Select all
              </button>
              <button
                onClick={() => onChange([])}
                className="text-gray-600 hover:text-gray-700 font-medium"
              >
                Deselect all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### FilterChipBar.tsx

```typescript
interface FilterChipBarProps {
  search: string;
  selectedTagIds: string[];
  selectedStatus: string | null;
  projectTags: Tag[];
  onRemoveTag: (tagId: string) => void;
  onRemoveStatus: () => void;
  onClearAll: () => void;
}

export function FilterChipBar({
  search,
  selectedTagIds,
  selectedStatus,
  projectTags,
  onRemoveTag,
  onRemoveStatus,
  onClearAll,
}: FilterChipBarProps) {
  const hasFilters = search || selectedTagIds.length > 0 || selectedStatus;

  if (!hasFilters) {
    return null;
  }

  const selectedTags = projectTags.filter(t => selectedTagIds.includes(t.id));

  return (
    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2 flex-wrap">
      {search && (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-blue-200 rounded-full text-sm">
          <span>Search: "{search}"</span>
          <button
            onClick={() => {}} // Clear search via parent
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}

      {selectedTags.map(tag => (
        <div
          key={tag.id}
          className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-blue-200 rounded-full text-sm"
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          <span>{tag.name}</span>
          <button
            onClick={() => onRemoveTag(tag.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      ))}

      {selectedStatus && (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-blue-200 rounded-full text-sm">
          <span>Status: {selectedStatus}</span>
          <button
            onClick={onRemoveStatus}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}

      <button
        onClick={onClearAll}
        className="ml-auto px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Clear all
      </button>
    </div>
  );
}
```

### FilterBar.tsx

```typescript
interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  projectTags: Tag[];
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: 'newest' | 'oldest' | 'updated';
  onSortChange: (sort: 'newest' | 'oldest' | 'updated') => void;
}

export function FilterBar({
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedTagIds,
  onTagsChange,
  projectTags,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-white flex flex-col md:flex-row gap-3 md:gap-4 md:items-center">
      <SearchInput value={search} onChange={onSearchChange} />

      <div className="flex gap-2 items-center">
        <StatusFilter value={selectedStatus} onChange={onStatusChange} />
        <TagFilter
          selectedTagIds={selectedTagIds}
          onChange={onTagsChange}
          projectTags={projectTags}
        />
      </div>

      <div className="flex gap-2 items-center ml-auto">
        <SortDropdown value={sortBy} onChange={onSortChange} />
        <ViewToggle activeView={viewMode} onChange={onViewModeChange} />
      </div>
    </div>
  );
}
```

## Page Integration

Update Hall page to manage filters and URL state:

```typescript
'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function HallPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current filter values from URL
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || null;
  const tagsParam = searchParams.get('tags') || '';
  const selectedTagIds = tagsParam ? tagsParam.split(',') : [];

  // Update URL when filters change
  const updateFilters = (newFilters: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    updateFilters({ search: value });
  };

  const handleTagsChange = (tagIds: string[]) => {
    updateFilters({ tags: tagIds.join(',') || null });
  };

  const handleStatusChange = (value: string | null) => {
    updateFilters({ status: value });
  };

  const handleClearAll = () => {
    router.push('/org/[slug]/project/[id]/hall');
  };

  return (
    <>
      <HallHeader />
      <FilterBar
        search={search}
        onSearchChange={handleSearchChange}
        selectedStatus={status}
        onStatusChange={handleStatusChange}
        selectedTagIds={selectedTagIds}
        onTagsChange={handleTagsChange}
        // ...
      />
      <FilterChipBar
        search={search}
        selectedTagIds={selectedTagIds}
        selectedStatus={status}
        projectTags={projectTags}
        onRemoveTag={(tagId) => {
          const newIds = selectedTagIds.filter(id => id !== tagId);
          handleTagsChange(newIds);
        }}
        onRemoveStatus={() => handleStatusChange(null)}
        onClearAll={handleClearAll}
      />
      <IdeaGrid /* or IdeaList */ ideas={filteredIdeas} />
    </>
  );
}
```

## Acceptance Criteria
1. Search input debounces and filters ideas by title + body
2. Search results update in real-time after 300ms delay
3. Search input has clear (X) button to reset
4. Status dropdown shows all 6 options (All + 5 statuses)
5. Status filter is single-select
6. Tag filter shows checkboxes for each project tag
7. Tag filter allows multi-select (AND logic)
8. Tag search input filters tags within dropdown
9. Selected tags show chip with X to remove
10. Applied filters display as chip bar below FilterBar
11. Each chip has X button to remove individual filter
12. "Clear all" button removes all filters at once
13. URL params reflect current filter state: ?search=xxx&tags=id1,id2&status=xxx
14. URL is shareable: someone can paste link and see same filters
15. Browser back button restores previous filter state
16. Page refresh maintains filters from URL
17. All filters work in combination (AND logic across all types)
18. Responsive: filters wrap on smaller screens
19. Keyboard navigation works (arrow keys, Escape to close dropdowns)
20. Clear all only shows when filters applied

## Testing Instructions

### Search Testing
1. Type "mobile" in search input
2. Verify ideas with "mobile" in title or body appear
3. Wait 300ms; verify search triggers (not on every keystroke)
4. Clear search with X button
5. Verify all ideas reappear
6. Verify search in URL: `?search=mobile`
7. Paste URL in new tab; verify search applied

### Status Filter Testing
1. Click Status dropdown
2. Select "Developing"
3. Verify only developing ideas appear
4. Select "All Statuses"; verify all ideas appear
5. Verify status in URL: `?status=developing`
6. Confirm single-select: cannot select two statuses simultaneously

### Tag Filter Testing
1. Click Tags dropdown
2. Select "Feature" and "Backend" checkboxes
3. Verify ideas with BOTH tags appear (AND logic)
4. Search within tags dropdown: type "front"
5. Verify only "Frontend" tag shows
6. Select another tag; verify "Select all" and "Deselect all" buttons work
7. Verify tags in URL: `?tags=uuid1,uuid2`

### Combined Filter Testing
1. Search "API" + Status "Mature" + Tags "Backend" + "Security"
2. Verify ideas match all criteria
3. Verify all params in URL: `?search=API&status=mature&tags=id1,id2`
4. Remove one filter (e.g., status); verify others remain
5. Clear all; verify URL is clean and all ideas show

### Filter Chip Bar Testing
1. Apply multiple filters
2. Verify chip bar displays all applied filters
3. Click X on individual chip; verify that filter removed
4. Verify others remain
5. Click "Clear all"; verify all chips disappear
6. Verify no filters applied

### URL Sharing Testing
1. Apply: Search "feature" + Tag "UI" + Status "Raw"
2. Copy URL from address bar
3. Open in new browser tab
4. Verify same filters applied automatically
5. Verify results are identical

### Responsive Testing
- **Desktop**: All filters in single row
- **Tablet (768px)**: Filters wrap to 2 lines if needed
- **Mobile (375px)**: Filters stack vertically; dropdown buttons remain accessible

### Keyboard Accessibility
1. Tab through controls: search input → status dropdown → tags dropdown
2. In dropdown, use arrow keys to navigate options
3. Press Enter to select
4. Press Escape to close dropdown
5. Verify Tab moves to next button (not trapped in dropdown)

### Empty Results
1. Search "zzzzzzzzzz" (nonsense text)
2. Verify "No ideas match your search" state displays
3. Verify "Clear filters" button works
4. Click it; verify all ideas return
