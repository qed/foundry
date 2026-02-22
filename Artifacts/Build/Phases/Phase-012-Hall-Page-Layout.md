# Phase 012 - Hall Page Layout & UI

## Objective
Build the main Hall page layout with header, sidebar navigation, empty state, and grid/list view containers. Establish the foundational UI structure that houses idea cards, search, filters, and bulk actions.

## Prerequisites
- Phase 006: Sidebar Navigation & Project Context (sidebar integration needed)
- Phase 010: Main App Layout & Navigation (overall app layout exists)
- Phase 011: Hall Database Schema (schema ready for queries)

## Context
The Hall page is the central workspace for capturing and organizing raw product ideas. It needs a professional, spacious layout that encourages rapid idea capture while providing discoverability through search, filters, and tags. The layout must adapt between desktop and mobile while maintaining functionality.

## Detailed Requirements

### Route Structure
```
/org/[orgSlug]/project/[projectId]/hall
```

### Page Layout Components

#### Header Section
- **Title**: "The Hall" as an H1 with optional descriptive subtitle: "Where raw product ideas live"
- **New Idea Button**: Primary CTA button ("+ New Idea") positioned top-right
- **Search Bar**: Search input with magnifying glass icon, placeholder "Search ideas by title or description..."
- **View Toggle**: Toggle buttons for "Grid" and "List" view (grid is default)
- **Responsive**: On mobile (< 768px), stack search below header; move view toggle to below search

#### Main Content Area
- **Grid View (Default)**:
  - Cards displayed in responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile)
  - Each card: 300-350px wide, ~200px tall
  - Hover effect: slight shadow increase, opacity change
  - Click card to open detail view or slide-over

- **List View**:
  - Compact rows with: checkbox, title, tags, creator avatar, relative timestamp
  - Rows: 60px height, alternating light/dark background on hover
  - Click row to open detail view

#### Sidebar Integration
- Hall link in project sidebar shows as "Hall" with icon (e.g., lightbulb icon)
- Active state: highlight or underline the Hall nav item
- No change to existing sidebar structure; just ensure Hall is listed alongside other modules

#### Empty State
- **When no ideas exist**:
  - Large centered icon (e.g., empty lightbulb)
  - Headline: "The Hall is empty"
  - Subtext: "Start capturing ideas! Click 'New Idea' to add your first one."
  - "New Idea" CTA button centered below text
  - Suggested empty state illustration (can be simple SVG)

#### Filter & Sort Bar (Below Header)
- **Status Filter**: Dropdown showing "All Statuses", "Raw", "Developing", "Mature", "Promoted", "Archived"
- **Sort By**: Dropdown showing "Newest", "Oldest", "Recently Updated"
- **Active Filters Chip Display**: Show applied filters as dismissible chips (e.g., "Tag: Feature" with X button)
- **Clear All Filters**: Secondary button to reset all filters and search

### Responsive Behavior
- **Mobile (< 640px)**:
  - Single column layout
  - Search bar stacks vertically
  - New Idea button becomes floating action button (FAB) in bottom-right corner
  - View toggle removed (default to list view)

- **Tablet (640px - 1024px)**:
  - Grid: 2 columns
  - Sidebar collapses to icon-only mode if needed
  - Header remains full-width

- **Desktop (> 1024px)**:
  - Grid: 3 columns
  - Full sidebar visible
  - All controls visible in header

## File Structure
```
app/
├── org/
│   └── [orgSlug]/
│       └── project/
│           └── [projectId]/
│               └── hall/
│                   ├── page.tsx (main Hall page component)
│                   ├── layout.tsx (Hall section layout)
│                   ├── components/
│                   │   ├── HallHeader.tsx
│                   │   ├── HallEmptyState.tsx
│                   │   ├── IdeaGrid.tsx
│                   │   ├── IdeaList.tsx
│                   │   ├── FilterBar.tsx
│                   │   ├── ViewToggle.tsx
│                   │   └── IdeaCard.tsx
│                   └── [ideaId]/
│                       ├── page.tsx (detail view or redirect to slide-over)
│                       └── layout.tsx
└── components/
    └── hall/
        └── (reusable components referenced above)
```

## Detailed Component Specifications

### HallHeader.tsx
```typescript
interface HallHeaderProps {
  projectId: string;
  orgSlug: string;
  onNewIdeaClick: () => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

// Exports: <HallHeader />
// Renders: Title, Search input, New Idea button, View toggle
// Handles: Search input changes, view mode toggle, new idea modal trigger
```

### HallEmptyState.tsx
```typescript
interface HallEmptyStateProps {
  onNewIdeaClick: () => void;
}

// Exports: <HallEmptyState />
// Renders: Icon, headline, subtext, CTA button
// Styling: Center content, 300px max-width, use Tailwind
```

### IdeaGrid.tsx
```typescript
interface IdeaGridProps {
  ideas: Idea[];
  onCardClick: (ideaId: string) => void;
  onTagClick: (tagId: string) => void;
  isLoading: boolean;
}

// Exports: <IdeaGrid />
// Renders: Grid of IdeaCard components
// Styling: Tailwind grid with responsive columns (3/2/1)
```

### IdeaList.tsx
```typescript
interface IdeaListProps {
  ideas: Idea[];
  onRowClick: (ideaId: string) => void;
  onTagClick: (tagId: string) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  isLoading: boolean;
}

// Exports: <IdeaList />
// Renders: List of rows, each with checkbox, title, tags, creator, timestamp
// Styling: Tailwind table-like structure using divs
```

### IdeaCard.tsx
```typescript
interface IdeaCardProps {
  idea: Idea;
  onClick: () => void;
  onTagClick: (tagId: string) => void;
  isSelected?: boolean;
}

// Exports: <IdeaCard />
// Renders:
//   - Title (bold, 2 lines max)
//   - Body preview (italic, 2 lines max, truncated)
//   - Tags as colored badges
//   - Creator avatar (small, 24px)
//   - Relative timestamp (e.g., "2 hours ago")
//   - Checkbox in corner (visible on hover or in selection mode)
// Styling: Tailwind card with border, shadow, rounded corners
```

### FilterBar.tsx
```typescript
interface FilterBarProps {
  statusFilter: string | null;
  onStatusChange: (status: string | null) => void;
  sortBy: 'newest' | 'oldest' | 'updated';
  onSortChange: (sort: 'newest' | 'oldest' | 'updated') => void;
  activeFilters: Filter[];
  onRemoveFilter: (filterId: string) => void;
  onClearAll: () => void;
}

// Exports: <FilterBar />
// Renders: Status dropdown, Sort dropdown, Active filter chips, Clear All button
// Styling: Tailwind flexbox, responsive layout
```

### ViewToggle.tsx
```typescript
interface ViewToggleProps {
  activeView: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
}

// Exports: <ViewToggle />
// Renders: Two toggle buttons (Grid icon, List icon)
// Styling: Tailwind button group, active state styling
```

### page.tsx (Hall Main Page)
```typescript
// File: app/org/[orgSlug]/project/[projectId]/hall/page.tsx
// Server Component with Client boundary at interactive sections

export default async function HallPage({
  params: { orgSlug, projectId },
  searchParams,
}: {
  params: { orgSlug: string; projectId: string };
  searchParams: Record<string, string | string[]>;
}) {
  // Fetch project data and ideas from Supabase
  // Pass to client component with initial data
  // Render: HallHeader, FilterBar, IdeaGrid/IdeaList, or HallEmptyState
}
```

## State Management
- **Client State** (useState):
  - `viewMode`: 'grid' | 'list'
  - `searchValue`: string
  - `statusFilter`: string | null
  - `sortBy`: 'newest' | 'oldest' | 'updated'
  - `selectedIds`: Set<string> (for bulk operations)
  - `showNewIdeaModal`: boolean

- **URL State** (searchParams):
  - `view`: grid or list
  - `search`: search query
  - `status`: status filter
  - `sort`: sort order
  - All shareable and bookmarkable

## Acceptance Criteria
1. Hall page loads and displays layout correctly
2. Header contains title "The Hall", search input, New Idea button, view toggle
3. Grid view displays ideas in 3-column responsive grid (or fewer on smaller screens)
4. List view displays ideas in compact row format with checkboxes
5. View toggle switches between grid and list
6. Empty state displays when no ideas exist with centered content and CTA
7. Sidebar shows Hall as active nav item
8. Filter bar displays status and sort dropdowns
9. Search bar placeholder is visible and functional
10. Layout is responsive: single column on mobile, adapts on tablet/desktop
11. All links use Next.js `<Link>` component for client-side navigation
12. Loading state shows skeleton or spinner while fetching ideas

## Testing Instructions

### Visual Testing
1. Open `/org/[slug]/project/[id]/hall` in browser
2. Verify "The Hall" title visible with description
3. Verify "New Idea" button in top-right
4. Verify search bar with correct placeholder text
5. Verify view toggle buttons (grid/list) visible

### Responsive Testing
- **Desktop (1280px)**: Verify 3-column grid, full sidebar, all controls visible
- **Tablet (768px)**: Verify 2-column grid, sidebar visible, controls stacked if needed
- **Mobile (375px)**: Verify single column, search stacked, FAB in corner

### Empty State Testing
1. In a project with no ideas, verify HallEmptyState displays
2. Verify centered icon, headline, subtext, and CTA button
3. Click CTA button; verify New Idea modal opens

### View Toggle Testing
1. With ideas present, verify grid view displays cards in grid format
2. Click list toggle; verify ideas display in row format
3. Click grid toggle; verify cards return to grid format

### Navigation Testing
1. Click on Hall in sidebar; verify page highlights Hall as active
2. Click on an idea card/row; verify navigation to detail view (or modal opens)
3. Use browser back button; verify return to Hall list

### URL State Testing
1. Apply search, filter, and sort
2. Copy URL from address bar
3. Open in new tab
4. Verify same filters/search/sort applied

### Mobile FAB Testing (Mobile View)
1. Resize to mobile width (375px)
2. Verify "New Idea" button becomes FAB in bottom-right
3. Click FAB; verify New Idea modal opens
4. Scroll idea list; verify FAB remains visible
