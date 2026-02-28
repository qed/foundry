# Phase 084 - Feedback Inbox Display

## Objective
Implement the feedback inbox list view with item previews, categorization badges, priority scoring, status indicators, sorting/pagination controls, and selection highlighting for the left panel of The Insights Lab.

## Prerequisites
- Phase 083: Insights Lab layout and header established
- Phase 081: Database schema with feedback_submissions complete
- TypeScript and Tailwind CSS configured
- Lucide icons library available

## Context
The feedback inbox is the primary interface for browsing submitted feedback. Each item displays a preview of the content, visual indicators for category and status, and priority scoring to help teams focus on high-impact issues. Users can sort by recency or priority, navigate through paginated results, and select items to view full details. The interface should be scannable and support quick triage decisions.

## Detailed Requirements

### Feedback Item Display
Each feedback item shows:
- **Content Preview**: First 2 lines of feedback text (truncated at ~150 chars)
- **Category Badge**: Colored badge indicating bug/feature/UX/performance/other/uncategorized
- **Status Dot**: Colored circle indicating new/triaged/converted/archived
- **Priority Score**: Numeric score (0-100) if available, empty state if uncategorized
- **Timestamp**: Relative time (e.g., "2 hours ago") with full date on hover
- **Submitter Info**: Email or name (optional), italicized and small
- **Unread Indicator**: Subtle highlight or badge for new items

### Category Badge Styles
- **Bug**: Red (bg-red-100, text-red-800, icon: AlertCircle)
- **Feature Request**: Green (bg-green-100, text-green-800, icon: Lightbulb)
- **UX Issue**: Purple (bg-purple-100, text-purple-800, icon: Eye)
- **Performance**: Orange (bg-orange-100, text-orange-800, icon: Zap)
- **Other**: Gray (bg-gray-100, text-gray-800, icon: Tag)
- **Uncategorized**: Gray-200 (bg-gray-200, text-gray-700, icon: Question)

### Status Indicator Styles
- **New**: Blue dot with optional pulse animation
- **Triaged**: Amber/yellow dot
- **Converted**: Green dot with checkmark
- **Archived**: Gray dot with archive icon

### Sorting Controls
- **Sort Options**:
  - Newest first (default, by created_at DESC)
  - Highest score (by score DESC NULLS LAST, uncategorized last)
  - Oldest first (by created_at ASC)
- **Sort Selector**: Dropdown button in filter bar (Phase 087)

### Pagination
- **Page Size**: 20 items per page (configurable)
- **Controls**: Previous/Next buttons, page indicator (e.g., "Page 1 of 5")
- **At Bottom**: Pagination controls appear below list
- **Infinite Scroll Option**: Load more button instead of traditional pagination

### Visual States
- **Default**: White background, subtle border
- **Hover**: Slight background highlight (gray-50), cursor pointer
- **Selected**: Blue border or blue background highlight, indicates current selection
- **Loading**: Skeleton loaders matching item height
- **Empty**: "No feedback found" message with clear filters link

### List Container
- **Max Height**: Full viewport minus header and padding
- **Scroll Behavior**: Vertical scroll with smooth scrolling
- **Empty Space**: 16px padding on all sides
- **Item Spacing**: 8px gap between items

## UI Components

### _components/FeedbackInbox.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import FeedbackInboxItem from './FeedbackInboxItem';
import FeedbackInboxHeader from './FeedbackInboxHeader';
import InboxPagination from './InboxPagination';
import { getFeedbackList } from '@/lib/supabase/feedback';

interface FeedbackInboxProps {
  projectId: string;
  selectedId: string | null;
  onSelectFeedback: (id: string) => void;
  isLoading: boolean;
}

type SortBy = 'newest' | 'highest-score' | 'oldest';

export default function FeedbackInbox({
  projectId,
  selectedId,
  onSelectFeedback,
  isLoading: parentLoading
}: FeedbackInboxProps) {
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Query feedback with sort and pagination
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['feedback', projectId, sortBy, currentPage],
    queryFn: () =>
      getFeedbackList(projectId, {
        sortBy,
        page: currentPage,
        pageSize
      }),
    staleTime: 30000,
    retry: 3
  });

  const feedback = data?.items || [];
  const totalPages = data?.totalPages || 0;
  const totalCount = data?.totalCount || 0;

  // Reset to page 1 when sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy]);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200">
      {/* Inbox Header with Sort */}
      <FeedbackInboxHeader
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalCount={totalCount}
      />

      {/* Feedback List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading || parentLoading ? (
          // Skeleton loaders
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="flex items-center justify-center h-full text-red-600">
            <div className="text-center">
              <p className="font-medium">Error loading feedback</p>
              <p className="text-sm text-red-500 mt-2">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        ) : feedback.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No feedback found</p>
              <p className="text-sm mt-2">
                Feedback will appear here once users submit it
              </p>
              <button
                onClick={() => {
                  setSortBy('newest');
                  setCurrentPage(1);
                }}
                className="mt-4 text-indigo-600 hover:underline text-sm"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          // Feedback items
          <div className="divide-y divide-gray-100">
            {feedback.map((item) => (
              <FeedbackInboxItem
                key={item.id}
                feedback={item}
                isSelected={selectedId === item.id}
                onSelect={() => onSelectFeedback(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && !isLoading && feedback.length > 0 && (
        <InboxPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
```

### _components/FeedbackInboxItem.tsx

```typescript
'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Lightbulb,
  Eye,
  Zap,
  Tag,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Feedback {
  id: string;
  content: string;
  category: 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'other' | 'uncategorized';
  status: 'new' | 'triaged' | 'converted' | 'archived';
  score: number | null;
  submitter_email: string | null;
  submitter_name: string | null;
  created_at: string;
}

interface FeedbackInboxItemProps {
  feedback: Feedback;
  isSelected: boolean;
  onSelect: () => void;
}

const categoryConfig = {
  bug: {
    label: 'Bug',
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    badgeColor: 'bg-red-100 text-red-800',
    borderColor: 'border-red-200'
  },
  feature_request: {
    label: 'Feature',
    icon: Lightbulb,
    bgColor: 'bg-green-50',
    badgeColor: 'bg-green-100 text-green-800',
    borderColor: 'border-green-200'
  },
  ux_issue: {
    label: 'UX Issue',
    icon: Eye,
    bgColor: 'bg-purple-50',
    badgeColor: 'bg-purple-100 text-purple-800',
    borderColor: 'border-purple-200'
  },
  performance: {
    label: 'Performance',
    icon: Zap,
    bgColor: 'bg-orange-50',
    badgeColor: 'bg-orange-100 text-orange-800',
    borderColor: 'border-orange-200'
  },
  other: {
    label: 'Other',
    icon: Tag,
    bgColor: 'bg-gray-50',
    badgeColor: 'bg-gray-100 text-gray-800',
    borderColor: 'border-gray-200'
  },
  uncategorized: {
    label: 'Uncategorized',
    icon: HelpCircle,
    bgColor: 'bg-gray-50',
    badgeColor: 'bg-gray-200 text-gray-700',
    borderColor: 'border-gray-300'
  }
};

const statusConfig = {
  new: { color: 'bg-blue-500', label: 'New', animate: true },
  triaged: { color: 'bg-amber-500', label: 'Triaged', animate: false },
  converted: { color: 'bg-green-500', label: 'Converted', animate: false },
  archived: { color: 'bg-gray-500', label: 'Archived', animate: false }
};

export default function FeedbackInboxItem({
  feedback,
  isSelected,
  onSelect
}: FeedbackInboxItemProps) {
  const category = categoryConfig[feedback.category];
  const status = statusConfig[feedback.status];
  const CategoryIcon = category.icon;
  const submitterDisplay = feedback.submitter_name || feedback.submitter_email || 'Anonymous';
  const timeAgo = formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true });

  // Truncate content to 2 lines (~150 chars)
  const lines = feedback.content.split('\n');
  const preview = (lines[0] + ' ' + (lines[1] || ''))
    .trim()
    .slice(0, 150)
    .replace(/\s+/g, ' ');

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full px-4 py-3 text-left transition-colors border-l-4 hover:bg-gray-50',
        isSelected
          ? `${category.bgColor} border-l-indigo-600 bg-indigo-50`
          : `border-l-transparent hover:bg-gray-50`
      )}
      title={feedback.content}
    >
      <div className="flex items-start gap-3">
        {/* Status Dot */}
        <div className={cn(
          'w-3 h-3 rounded-full flex-shrink-0 mt-1.5',
          status.color,
          status.animate && 'animate-pulse'
        )} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Category Badge + Score */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
              category.badgeColor
            )}>
              <CategoryIcon className="w-3 h-3" />
              {category.label}
            </span>

            {feedback.score !== null && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                {feedback.score}
              </span>
            )}
          </div>

          {/* Content Preview */}
          <p className="text-sm text-gray-900 line-clamp-2 mb-2">
            {preview}
          </p>

          {/* Footer: Submitter + Timestamp */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="italic truncate">
              {submitterDisplay}
            </span>
            <span className="flex-shrink-0 ml-2" title={new Date(feedback.created_at).toLocaleString()}>
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Right Indicator */}
        {feedback.status === 'converted' && (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        )}
      </div>
    </button>
  );
}
```

### _components/FeedbackInboxHeader.tsx

```typescript
'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortBy = 'newest' | 'highest-score' | 'oldest';

interface FeedbackInboxHeaderProps {
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  totalCount: number;
}

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'highest-score', label: 'Highest Score' },
  { value: 'oldest', label: 'Oldest' }
];

export default function FeedbackInboxHeader({
  sortBy,
  onSortChange,
  totalCount
}: FeedbackInboxHeaderProps) {
  const currentSort = sortOptions.find(opt => opt.value === sortBy);

  return (
    <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Feedback Inbox</h2>
        <p className="text-xs text-gray-600 mt-1">{totalCount} total</p>
      </div>

      {/* Sort Dropdown */}
      <div className="relative group">
        <button className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
          {currentSort?.label}
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Dropdown Menu */}
        <div className="absolute right-0 mt-0 w-40 bg-white border border-gray-200 rounded-md shadow-lg hidden group-hover:block z-10">
          {sortOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={cn(
                'block w-full text-left px-4 py-2 text-sm hover:bg-gray-50',
                sortBy === option.value && 'bg-indigo-50 text-indigo-700 font-medium'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### _components/InboxPagination.tsx

```typescript
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InboxPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function InboxPagination({
  currentPage,
  totalPages,
  onPageChange
}: InboxPaginationProps) {
  return (
    <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between text-sm">
      <div className="text-gray-600">
        Page <span className="font-medium">{currentPage}</span> of{' '}
        <span className="font-medium">{totalPages}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
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
                        ├── FeedbackInbox.tsx
                        ├── FeedbackInboxItem.tsx
                        ├── FeedbackInboxHeader.tsx
                        └── InboxPagination.tsx
lib/
└── supabase/
    └── feedback.ts (contains getFeedbackList)
```

## Acceptance Criteria
- [x] Feedback list displays items with category badge, status dot, content preview
- [x] Category badges show correct color and icon for each type
- [x] Status indicator dots appear with correct colors
- [x] Priority score displayed for categorized items
- [x] Unscored items (uncategorized) show empty score area
- [x] Submitter info (name or email) displayed, or "Anonymous"
- [x] Timestamp shown in relative format with full date on hover
- [x] Content preview shows first 2 lines, truncated at ~150 characters
- [x] Selected item highlighted with blue border and background
- [x] Clicking item calls onSelect callback
- [x] Sort dropdown allows sorting by newest, highest score, oldest
- [x] Sorting by highest score places uncategorized items last
- [x] Pagination controls appear at bottom when applicable
- [x] Previous/Next buttons disabled at boundaries
- [x] Page indicator shows current page and total pages
- [x] Loading state shows skeleton loaders
- [x] Error state shows message with retry button
- [x] Empty state shows "No feedback found" message
- [x] List scrolls vertically within container
- [x] Hover state shows subtle background highlight

## Testing Instructions

1. **Item Display**
   - Create feedback with various categories
   - Verify each category shows correct badge color and icon
   - Verify content preview truncates at ~150 chars
   - Verify submitter info displays or shows "Anonymous"
   - Verify timestamp shows relative time (e.g., "2 hours ago")

2. **Sorting**
   - Open sort dropdown
   - Select "Highest Score" → items with score > 0 appear first
   - Uncategorized items should appear last
   - Select "Oldest" → oldest items appear first
   - Select "Newest" → newest items appear first (default)

3. **Pagination**
   - Create > 20 feedback items
   - Verify pagination controls appear at bottom
   - Click Next → page 2 items load
   - Click Previous → page 1 items load
   - Verify "Page 1 of X" indicator updates
   - Disabled state on boundary pages

4. **Selection**
   - Click feedback item
   - Verify item shows blue highlight and border
   - Verify onSelect callback fires
   - Click another item → new item highlighted, old not
   - Click same item again → remains selected

5. **Status Indicators**
   - Verify 'new' status shows blue dot with pulse animation
   - Verify 'triaged' status shows amber dot
   - Verify 'converted' status shows green checkmark icon
   - Verify 'archived' status shows gray dot

6. **Empty & Error States**
   - Project with no feedback shows empty state
   - Simulate API error → shows error message with retry
   - Clear filters → refreshes and loads data

7. **Responsiveness**
   - On mobile, verify item is still clickable
   - Verify truncation works on narrow screens
   - Verify pagination controls stack properly
