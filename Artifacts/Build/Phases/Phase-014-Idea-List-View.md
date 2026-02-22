# Phase 014 - Hall Idea List View

## Objective
Implement grid and list view display modes for ideas with sorting and pagination/infinite scroll. Both views should show idea previews, tags, creator info, and timestamps with clear visual hierarchy.

## Prerequisites
- Phase 011: Hall Database Schema (ideas, idea_tags, tags tables)
- Phase 012: Hall Page Layout (component structure and containers)
- Phase 013: Create Idea (ideas exist in database)

## Context
Users need multiple ways to browse ideas: a visual grid for quick scanning and compact lists for dense information. Both views must be performant, responsive, and allow for sorting by relevance (newest, oldest, recently updated).

## Detailed Requirements

### View Modes

#### Grid View (Default)

**Grid Layout**
- Desktop (> 1024px): 3 columns
- Tablet (640px - 1024px): 2 columns
- Mobile (< 640px): 1 column
- Gap between cards: 16px (1rem)
- Card width: auto (flexible), Min width: 280px, Max width: 400px
- Card height: ~250px (flexible based on content)

**Card Design** (IdeaCard Component)

Each card displays:

1. **Header Section** (32px height)
   - Creator Avatar (24px circle) on left
   - Creator name as small text (11px, gray-600)
   - Relative timestamp on right (e.g., "2 hours ago", gray-500)
   - Separator: thin gray line below

2. **Title** (2 lines max)
   - Font: 16px, bold (font-semibold), dark gray
   - Line-height: 1.4
   - Truncate with ellipsis if > 2 lines
   - Click to open detail view

3. **Body Preview** (2 lines max)
   - Font: 14px, gray-600
   - Line-height: 1.5
   - Truncate with ellipsis if > 2 lines
   - Only show first 120 characters

4. **Tags Section** (bottom)
   - Colored badge pills (8px height, 6px horizontal padding)
   - Font: 11px
   - Show max 3 tags; if more, show "+2 more" chip
   - Click tag to filter by tag (Phase 015)

5. **Footer** (16px height)
   - Checkbox on left (visible on hover or when in selection mode) (Phase 019)
   - Status badge on right (small, e.g., "raw", "developing", "mature")
     - Raw: gray
     - Developing: blue
     - Mature: purple
     - Promoted: green
     - Archived: strikethrough text

6. **Visual States**
   - Default: white background, thin gray border, soft shadow
   - Hover: shadow increases, background lightens slightly (bg-gray-50)
   - Selected: blue border, light blue background
   - Loading/Skeleton: gray placeholder blocks

**Card Dimensions**
- Padding: 16px
- Border-radius: 8px
- Min-height: 240px

**Responsive Behavior on Card**
- On mobile: reduce padding to 12px, font sizes down by 1-2px
- On tablet: padding 14px
- Touch targets for interactive elements: min 44px

#### List View

**List Layout**
- Rows stacked vertically
- Row height: 60px (fixed)
- Border separator between rows
- Alternating light background (white and gray-50) for readability

**Row Design**

Each row displays:

1. **Checkbox** (Left, 32px wide)
   - Visible always (not hover-only like grid)
   - Allows bulk selection

2. **Title** (Flex-grow)
   - Font: 15px, semibold
   - Ellipsis if too long
   - Click to open detail view

3. **Tags** (Flex section, ~200px)
   - Show max 2 tags inline
   - If more, show "+N more"
   - Right-aligned within section

4. **Creator Avatar + Name** (~80px)
   - Avatar (24px circle) + First name or initials
   - Right-aligned

5. **Timestamp** (~100px)
   - Relative time (e.g., "2h ago")
   - Right-aligned

6. **Status Badge** (~80px)
   - Same as grid view
   - Colored, right-aligned

7. **Hover State**
   - Background darkens slightly (bg-gray-100)
   - Row becomes slightly elevated

**Row Responsive Behavior**
- Mobile (< 640px): Stack or hide some columns
  - Hide creator/timestamp, show compact version
  - Full-width single row
  - Consider converting to card view instead of list
- Tablet (640px - 1024px): Show all columns, adjust spacing
- Desktop: Full layout as described

### Sorting

**Sort Options** (dropdown in FilterBar)

1. **Newest** (Default)
   - Sort by `created_at DESC`
   - "Ideas created most recently appear first"

2. **Oldest**
   - Sort by `created_at ASC`
   - "Ideas created earliest appear first"

3. **Recently Updated**
   - Sort by `updated_at DESC`
   - "Ideas edited most recently appear first"

**Sort Persistence**
- Selected sort persists in URL params: `?sort=newest`
- Default to "Newest" if not specified
- Dropdown shows current selection with checkmark

### Pagination / Infinite Scroll

**Implementation Strategy**

Choose one (or implement both with toggle):

**Option A: Pagination**
- Show page numbers at bottom
- 12 ideas per page
- Buttons: "Previous", "Next" (disabled on edges)
- Current page indicator: "Page 2 of 5"
- Click page number to jump to page

**Option B: Infinite Scroll**
- Load initial 12 ideas
- When user scrolls to bottom (200px threshold), auto-load next 12
- Show loading indicator (spinner) before new items appear
- No "Load More" button needed
- Current approach: Infinite scroll for better UX

**Recommended: Infinite Scroll with Intersection Observer**

```typescript
// Pseudo-code
const observerTarget = useRef(null);

useEffect(() => {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
      loadMore();
    }
  });

  if (observerTarget.current) {
    observer.observe(observerTarget.current);
  }

  return () => observer.disconnect();
}, [hasMore, isLoading]);
```

**Loading More State**
- Show spinner at bottom while fetching
- Append new ideas to list
- If no more ideas, show "No more ideas" text
- If error, show "Failed to load more" with retry button

### Empty States

**No Ideas at All**
- Delegated to HallEmptyState component (Phase 012)
- Show centered icon, headline, CTA

**After Filters Applied, No Results**
- Headline: "No ideas match your filters"
- Subtext: "Try adjusting your search or filters"
- "Clear filters" button
- Icon: magnifying glass with question mark

**Loading State**
- Show 3-4 skeleton card placeholders (in grid view)
- Or 3-4 skeleton rows (in list view)
- Skeleton: gray placeholder blocks, slightly animated

### Data Fetching

**API Endpoint**: GET /api/hall/ideas

```typescript
// Query params
GET /api/hall/ideas?projectId=xxx&limit=12&offset=0&sort=newest&search=xxx&status=xxx&tags=xxx,yyy
```

**Response Structure**
```json
{
  "ideas": [
    {
      "id": "uuid",
      "title": "string",
      "body": "string",
      "status": "raw | developing | mature | promoted | archived",
      "created_at": "ISO datetime",
      "updated_at": "ISO datetime",
      "created_by": {
        "id": "uuid",
        "email": "string",
        "user_metadata": { "full_name": "string", "avatar_url": "string" }
      },
      "idea_tags": [
        { "tag_id": "uuid", "tags": { "id": "uuid", "name": "string", "color": "hex" } }
      ]
    }
  ],
  "total": 42,
  "hasMore": true
}
```

**Fetching Strategy**
- Server component: Initial load of first 12 ideas
- Client component: Infinite scroll load-more logic
- Cache bust on sort/filter changes
- SWR or React Query for client-side data fetching (optional)

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
│                       ├── IdeaGrid.tsx
│                       ├── IdeaList.tsx
│                       ├── IdeaCard.tsx
│                       ├── IdeaListRow.tsx
│                       ├── IdeaSkeletons.tsx
│                       ├── LoadMoreTrigger.tsx
│                       └── NoResultsState.tsx
└── api/
    └── hall/
        └── ideas/
            └── route.ts (GET endpoint)
```

## Component Specifications

### IdeaGrid.tsx

```typescript
interface IdeaGridProps {
  ideas: Idea[];
  isLoading?: boolean;
  onCardClick: (ideaId: string) => void;
  onTagClick?: (tagId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function IdeaGrid({
  ideas,
  isLoading,
  onCardClick,
  onTagClick,
  onLoadMore,
  hasMore,
  isLoadingMore,
  selectedIds = new Set(),
  onSelectionChange,
}: IdeaGridProps) {
  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
        {ideas.map(idea => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            onClick={() => onCardClick(idea.id)}
            onTagClick={onTagClick}
            isSelected={selectedIds.has(idea.id)}
            onSelectionChange={(selected) => {
              const newIds = new Set(selectedIds);
              if (selected) {
                newIds.add(idea.id);
              } else {
                newIds.delete(idea.id);
              }
              onSelectionChange?.(newIds);
            }}
          />
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasMore && !isLoading && (
        <LoadMoreTrigger
          onLoad={onLoadMore}
          isLoading={isLoadingMore}
        />
      )}

      {/* Loading More State */}
      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* No More Ideas */}
      {!hasMore && ideas.length > 0 && (
        <p className="text-center text-gray-500 py-8">No more ideas</p>
      )}
    </div>
  );
}
```

### IdeaCard.tsx

```typescript
interface IdeaCardProps {
  idea: Idea;
  onClick: () => void;
  onTagClick?: (tagId: string) => void;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

export function IdeaCard({
  idea,
  onClick,
  onTagClick,
  isSelected,
  onSelectionChange,
}: IdeaCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const tags = idea.idea_tags?.map(it => it.tags) || [];
  const visibleTags = tags.slice(0, 3);
  const moreTagsCount = Math.max(0, tags.length - 3);

  const displayCreatorName = idea.created_by?.user_metadata?.full_name
    || idea.created_by?.email?.split('@')[0]
    || 'Unknown';

  const relativeTime = getRelativeTime(idea.created_at);

  const statusColors = {
    raw: 'bg-gray-100 text-gray-800',
    developing: 'bg-blue-100 text-blue-800',
    mature: 'bg-purple-100 text-purple-800',
    promoted: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-500 line-through',
  };

  return (
    <div
      className={`
        p-4 border rounded-lg transition-all cursor-pointer relative
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white shadow-sm hover:shadow-md hover:bg-gray-50'
        }
        ${isHovered ? 'shadow-md' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Checkbox */}
      <div
        className={`absolute top-3 right-3 transition-opacity ${
          isHovered || isSelected ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectionChange?.(!isSelected);
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="w-5 h-5 rounded cursor-pointer"
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
        <img
          src={idea.created_by?.user_metadata?.avatar_url || '/avatar-placeholder.svg'}
          alt={displayCreatorName}
          className="w-6 h-6 rounded-full bg-gray-300"
        />
        <span className="text-xs text-gray-600 flex-1">{displayCreatorName}</span>
        <span className="text-xs text-gray-500">{relativeTime}</span>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
        {idea.title}
      </h3>

      {/* Body Preview */}
      {idea.body && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {idea.body}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {visibleTags.map(tag => (
          <button
            key={tag.id}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick?.(tag.id);
            }}
            className="px-2 py-1 rounded-full text-xs text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </button>
        ))}
        {moreTagsCount > 0 && (
          <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700">
            +{moreTagsCount}
          </span>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex justify-end">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[idea.status]}`}>
          {idea.status.charAt(0).toUpperCase() + idea.status.slice(1)}
        </span>
      </div>
    </div>
  );
}
```

### IdeaList.tsx

```typescript
interface IdeaListProps {
  ideas: Idea[];
  isLoading?: boolean;
  onRowClick: (ideaId: string) => void;
  onTagClick?: (tagId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function IdeaList({
  ideas,
  isLoading,
  onRowClick,
  onTagClick,
  onLoadMore,
  hasMore,
  isLoadingMore,
  selectedIds = new Set(),
  onSelectionChange,
}: IdeaListProps) {
  return (
    <div className="space-y-0">
      {ideas.map((idea, idx) => (
        <IdeaListRow
          key={idea.id}
          idea={idea}
          onRowClick={() => onRowClick(idea.id)}
          onTagClick={onTagClick}
          isSelected={selectedIds.has(idea.id)}
          onSelectionChange={(selected) => {
            const newIds = new Set(selectedIds);
            if (selected) {
              newIds.add(idea.id);
            } else {
              newIds.delete(idea.id);
            }
            onSelectionChange?.(newIds);
          }}
          alternatingBg={idx % 2 === 0 ? 'white' : 'gray-50'}
        />
      ))}

      {hasMore && !isLoading && (
        <LoadMoreTrigger onLoad={onLoadMore} isLoading={isLoadingMore} />
      )}

      {isLoadingMore && (
        <div className="flex justify-center py-6 bg-gray-50">
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {!hasMore && ideas.length > 0 && (
        <p className="text-center text-gray-500 py-4 bg-gray-50">No more ideas</p>
      )}
    </div>
  );
}
```

### IdeaListRow.tsx

```typescript
interface IdeaListRowProps {
  idea: Idea;
  onRowClick: () => void;
  onTagClick?: (tagId: string) => void;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  alternatingBg?: 'white' | 'gray-50';
}

export function IdeaListRow({
  idea,
  onRowClick,
  onTagClick,
  isSelected,
  onSelectionChange,
  alternatingBg = 'white',
}: IdeaListRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const tags = idea.idea_tags?.map(it => it.tags) || [];
  const displayCreatorName = idea.created_by?.user_metadata?.full_name
    || idea.created_by?.email?.split('@')[0]
    || 'Unknown';

  const relativeTime = getRelativeTime(idea.created_at);

  const statusColors = {
    raw: 'text-gray-600',
    developing: 'text-blue-600',
    mature: 'text-purple-600',
    promoted: 'text-green-600',
    archived: 'text-gray-400 line-through',
  };

  return (
    <div
      className={`
        h-16 flex items-center gap-4 px-4 border-b border-gray-200 transition-colors cursor-pointer
        ${isSelected ? 'bg-blue-50' : `bg-${alternatingBg}`}
        ${isHovered ? 'bg-gray-100' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onRowClick}
    >
      {/* Checkbox */}
      <div
        className="flex-shrink-0 w-6"
        onClick={(e) => {
          e.stopPropagation();
          onSelectionChange?.(!isSelected);
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="w-5 h-5 rounded cursor-pointer"
        />
      </div>

      {/* Title */}
      <h3 className="flex-1 text-sm font-semibold text-gray-900 truncate">
        {idea.title}
      </h3>

      {/* Tags */}
      <div className="flex gap-2 flex-shrink-0 w-48">
        {tags.slice(0, 2).map(tag => (
          <button
            key={tag.id}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick?.(tag.id);
            }}
            className="px-2 py-0.5 rounded text-xs text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </button>
        ))}
        {tags.length > 2 && (
          <span className="text-xs text-gray-500">+{tags.length - 2}</span>
        )}
      </div>

      {/* Creator */}
      <div className="flex items-center gap-2 flex-shrink-0 w-24">
        <img
          src={idea.created_by?.user_metadata?.avatar_url || '/avatar-placeholder.svg'}
          alt={displayCreatorName}
          className="w-5 h-5 rounded-full bg-gray-300"
        />
        <span className="text-xs text-gray-600 truncate">{displayCreatorName}</span>
      </div>

      {/* Timestamp */}
      <span className="text-xs text-gray-500 flex-shrink-0 w-20 text-right">
        {relativeTime}
      </span>

      {/* Status */}
      <span className={`text-xs font-medium flex-shrink-0 w-20 text-right ${statusColors[idea.status]}`}>
        {idea.status}
      </span>
    </div>
  );
}
```

### LoadMoreTrigger.tsx

```typescript
interface LoadMoreTriggerProps {
  onLoad: () => void;
  isLoading?: boolean;
}

export function LoadMoreTrigger({ onLoad, isLoading }: LoadMoreTriggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoad();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [onLoad, isLoading]);

  return <div ref={ref} className="h-4" aria-hidden="true" />;
}
```

### API Route: GET /api/hall/ideas

```typescript
// File: app/api/hall/ideas/route.ts

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'newest';
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const tagsParam = searchParams.get('tags');

    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user belongs to project
    const memberCheck = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (!memberCheck.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('ideas')
      .select(`
        id, title, body, status, created_at, updated_at,
        created_by(id, email, user_metadata),
        idea_tags(tag_id, tags(id, name, color))
      `)
      .eq('project_id', projectId);

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by search
    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
    }

    // Filter by tags
    if (tagsParam) {
      const tagIds = tagsParam.split(',');
      // This is simplified; ideally use a proper junction table query
      query = query.in('id', (subquery) => {
        subquery
          .from('idea_tags')
          .select('idea_id')
          .in('tag_id', tagIds);
      });
    }

    // Sort
    const orderByMap = {
      newest: { column: 'created_at', ascending: false },
      oldest: { column: 'created_at', ascending: true },
      updated: { column: 'updated_at', ascending: false },
    };
    const orderBy = orderByMap[sort] || orderByMap.newest;
    query = query.order(orderBy.column, { ascending: orderBy.ascending });

    // Get total count (before pagination)
    const countResponse = await supabase
      .from('ideas')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId);

    const total = countResponse.count || 0;

    // Paginate
    query = query.range(offset, offset + limit - 1);

    const response = await query;

    if (response.error) {
      throw response.error;
    }

    return NextResponse.json({
      ideas: response.data,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('GET /api/hall/ideas error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Acceptance Criteria
1. Grid view displays ideas in responsive columns (3/2/1)
2. List view displays ideas in compact rows with all information visible
3. View toggle switches between grid and list
4. Sort dropdown shows "Newest", "Oldest", "Recently Updated" options
5. Selecting a sort option re-orders the ideas
6. Cards/rows display: title, body preview, tags, creator, timestamp, status
7. Infinite scroll loads next batch when scrolling near bottom
8. Loading spinner shows while fetching more
9. "No more ideas" message shows when all loaded
10. Checkbox appears on hover (grid) or always (list) for selection
11. Selected items highlight with blue border/background
12. Tag click triggers filter (Phase 015)
13. Click card/row opens detail view or modal
14. Responsive on mobile: single column, adjusted layout
15. Empty result state shows when no ideas match filters
16. Skeleton loaders show during initial load
17. Status badges color-coded and visible on all views

## Testing Instructions

### View Switching
1. Open Hall page with ideas present
2. Default view is grid; verify 3 columns on desktop
3. Click list toggle; verify ideas display in rows
4. Click grid toggle; verify cards return

### Grid View Display
1. Verify cards are in 3-column grid (desktop)
2. Check card contains: title, body preview (2 lines max), tags, creator avatar/name, timestamp, status
3. Hover card; verify shadow increases and checkbox appears
4. Verify ellipsis on titles/bodies > 2 lines

### List View Display
1. Verify rows are full-width with 60px height
2. Check row contains: checkbox, title, tags (2 max), creator, timestamp, status
3. Hover row; verify background darkens
4. Click row; verify opens detail view

### Sorting
1. Default sort is "Newest"
2. Click sort dropdown
3. Select "Oldest"; verify ideas reorder with oldest first
4. Select "Recently Updated"; verify order changes
5. Verify sort persists in URL: `?sort=recently-updated`

### Infinite Scroll
1. Scroll to bottom of idea list
2. Verify loading spinner appears
3. Wait for next batch to load
4. Verify new ideas append to list
5. Repeat until "No more ideas" message
6. Verify no duplicate ideas between batches

### Empty Results
1. Apply filter that returns no ideas
2. Verify "No ideas match your filters" message
3. Verify "Clear filters" button works
4. Verify not showing skeleton loaders

### Responsive Behavior
- **Desktop (1280px)**: 3 columns grid, full list layout
- **Tablet (768px)**: 2 columns grid, list layout with some columns hidden
- **Mobile (375px)**: 1 column grid, converted to single-column card list

### Accessibility
1. Tab through cards/rows; verify keyboard navigation works
2. Press Enter on focused card; verify opens detail view
3. Verify checkboxes are keyboard accessible
4. Verify color not only indicator (status badges have text)

### Performance
1. Load Hall page with 100+ ideas
2. Scroll through list; verify smooth scrolling (60fps)
3. Verify browser DevTools shows Network tab with paginated requests
4. Verify no jumpy layout shifts as images load
