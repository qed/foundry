# Phase 067 - Work Order List/Table View

## Objective
Implement a sortable, filterable table view of work orders with column resizing, row selection, and collapsible grouping by phase, status, assignee, or priority.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 062: Assembly Floor Page Layout
- Phase 064: Work Order Detail View
- Next.js 14+ with App Router
- TypeScript
- TanStack Table (React Table) library

## Context
While the kanban board excels at visualizing workflow, some teams prefer the density and filtering capabilities of a table view. The table provides an alternative perspective on work orders, enabling power users to sort, group, and filter efficiently. Row selection enables bulk operations in Phase 077.

## Detailed Requirements

### Table Library
- **TanStack Table (React Table)** - headless table library
  ```bash
  npm install @tanstack/react-table
  ```

### Column Structure (sortable, resizable)
1. **Selection** (checkbox, pinned left)
   - Select individual rows
   - Header checkbox: select/deselect all in current view
   - Used for bulk operations (Phase 077)

2. **Title** (sortable, resizable, 250px default)
   - Link-style display
   - Click to open detail view
   - Truncate long titles

3. **Status** (sortable, resizable, 120px)
   - Colored badge: Backlog, Ready, In Progress, In Review, Done
   - Matches kanban column colors

4. **Priority** (sortable, resizable, 100px)
   - Colored dot/badge: Critical, High, Medium, Low
   - Matches kanban card display

5. **Assignee** (sortable, resizable, 150px)
   - Avatar + name
   - "Unassigned" if no assignee
   - Filter by assignee (Phase 072)

6. **Phase** (sortable, resizable, 120px)
   - Phase name
   - "Unphased" if no phase
   - Filter by phase

7. **Feature** (sortable, resizable, 150px)
   - Linked feature node name
   - Shows epic parent if applicable
   - "No feature" if not linked

8. **Updated** (sortable, resizable, 130px)
   - Last update timestamp
   - Relative format: "2 days ago"
   - Tooltip on hover: full timestamp

### Sorting
- Click column header to sort
- First click: ascending (A→Z)
- Second click: descending (Z→A)
- Third click: remove sort
- Visual indicator: arrow icon in header (↑, ↓, or none)
- Multi-column sort: hold Ctrl/Cmd + click (optional, Phase 2)

### Column Resizing
- Drag column border to resize
- Minimum width enforced (50px)
- Maximum width (600px)
- Resize persisted to localStorage per project

### Grouping (via toggled buttons or dropdown)
- **No Grouping** (default)
- **Group by Phase**
  - Collapsible rows for each phase
  - Phase header shows count: "Design (5)"
  - Click to collapse/expand
  - Arrow indicator (▼/▶)
- **Group by Status**
  - Collapsible by status: Backlog, Ready, In Progress, In Review, Done
  - Status header with count
- **Group by Assignee**
  - Collapsible by assignee
  - Shows "Unassigned (3)" group
- **Group by Priority**
  - Collapsible by priority: Critical, High, Medium, Low, Unset

### Row Display
- **Normal Row**:
  - Displays all columns
  - Hover: subtle background highlight
  - Click: opens work order detail view
  - Checkbox: row selection

- **Grouped Header Row** (collapsible):
  - Background color: light gray
  - Shows grouping value (phase name, status, etc.)
  - Shows count
  - Arrow icon (▼/▶)
  - Click arrow or row to toggle
  - Bold font (600 weight)

### Pagination (optional for MVP)
- Show 25/50/100 rows per page
- Previous/Next buttons
- Page indicator: "1-25 of 150"
- URL query param: ?page=1

### Responsive Behavior
- Desktop (1200px+): All columns visible, horizontal scroll if needed
- Tablet: Hide "Feature" and "Phase" columns, show "Updated"
- Mobile: Stack table or show simplified list view

## Database Schema
Uses `work_orders` table from Phase 061.

## API Routes
Uses GET work-orders endpoint from Phase 065, with query params for sorting/filtering.

## UI Components

### New Components
1. **WorkOrderTable** (`app/components/Assembly/WorkOrderTable.tsx`)
   - Main table component
   - TanStack Table setup
   - Sorting, grouping, column management
   - Props: work orders data, onRowClick handler

2. **TableHeader** (`app/components/Assembly/TableHeader.tsx`)
   - Column headers with sort indicators
   - Grouping toggle buttons
   - Column visibility toggle (in Phase 2)

3. **TableRow** (`app/components/Assembly/TableRow.tsx`)
   - Individual table row
   - All columns rendered
   - Click handler for detail view

4. **GroupHeaderRow** (`app/components/Assembly/GroupHeaderRow.tsx`)
   - Collapsible group header
   - Shows grouping value and count
   - Toggle expand/collapse

5. **TablePagination** (`app/components/Assembly/TablePagination.tsx`)
   - Bottom pagination controls
   - Rows per page selector
   - Previous/Next buttons

### Reused Components
- PriorityBadge (from Phase 066)
- UserAvatar (from Phase 066)
- StatusBadge (from Phase 065)

## File Structure
```
app/
  components/
    Assembly/
      WorkOrderTable.tsx                  # Main table component
      TableHeader.tsx                     # Column headers
      TableRow.tsx                        # Single row
      GroupHeaderRow.tsx                  # Groupable group header
      TablePagination.tsx                 # Pagination
      WorkOrderTable.module.css           # Table styling
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useWorkOrderTable.ts            # React Query hook with sort/group state
```

## Styling

### CSS Classes (Tailwind)
```css
/* Table container */
.work-order-table {
  @apply w-full border-collapse;
}

/* Table header row */
.table-header-row {
  @apply bg-gray-50 border-b border-gray-200;
}

/* Header cell */
.table-header-cell {
  @apply px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer select-none;
}

.table-header-cell:hover {
  @apply bg-gray-100;
}

/* Sort indicator */
.sort-indicator {
  @apply ml-1 inline-block text-gray-400;
}

/* Table body row */
.table-body-row {
  @apply border-b border-gray-200 hover:bg-gray-50 transition-colors;
}

.table-body-row.selected {
  @apply bg-blue-50;
}

/* Body cell */
.table-body-cell {
  @apply px-4 py-3 text-sm text-gray-900;
}

/* Group header row */
.group-header-row {
  @apply bg-gray-100 font-semibold text-gray-900 hover:bg-gray-200;
}

/* Checkbox */
.table-checkbox {
  @apply cursor-pointer;
}
```

## Acceptance Criteria
- Table view displays at `/org/[slug]/project/[id]/floor?view=table`
- All 8 columns visible and render correctly
- Column headers sortable (click to sort)
- Sort indicators show direction (↑, ↓)
- Column resizable by dragging border
- Resize persisted to localStorage
- Grouping toggle buttons appear
- Group by Phase: collapsible rows with phase count
- Group by Status: collapsible rows with status
- Group by Assignee: collapsible rows with assignee
- Group by Priority: collapsible rows with priority
- Expand/collapse works with arrow click
- Row click opens work order detail view
- Row selection checkboxes work
- Header checkbox selects all rows in current view
- Pagination controls appear (if 25+ rows)
- Rows per page selector works
- Responsive layout adapts to screen size
- Text truncation prevents overflow

## Testing Instructions

1. **Table Display**
   - Toggle to table view
   - Verify table displays with 8 columns
   - Verify column headers correct: Title, Status, Priority, Assignee, Phase, Feature, Updated

2. **Sorting**
   - Click "Title" header
   - Verify rows sort A→Z with ↑ indicator
   - Click again, verify Z→A with ↓ indicator
   - Click again, verify sort removed and no indicator
   - Test sorting on other columns: Status, Priority, Updated
   - Verify sort persisted on page reload (if implemented)

3. **Column Resizing**
   - Position mouse on border between columns
   - Drag to widen/narrow column
   - Verify column width updates
   - Verify minimum width enforced (50px)
   - Verify resizing persisted on reload

4. **Grouping by Phase**
   - Click "Group by Phase" button
   - Verify table reorganized with phase headers
   - Verify each phase header shows: "Design (5)" format
   - Verify rows indented under phase headers
   - Click phase header arrow, verify rows collapse
   - Click again, verify rows expand

5. **Grouping by Status**
   - Click "Group by Status" button
   - Verify table shows status headers: Backlog, Ready, In Progress, In Review, Done
   - Each header shows count
   - Verify collapsible/expandable
   - Switch to Group by Phase, verify grouping changes

6. **Grouping by Assignee**
   - Click "Group by Assignee" button
   - Verify headers for each assignee plus "Unassigned"
   - Verify count per assignee

7. **Grouping by Priority**
   - Click "Group by Priority" button
   - Verify headers: Critical, High, Medium, Low
   - Verify collapsible groups

8. **Row Selection**
   - Check checkbox on single row
   - Verify row highlights with blue background
   - Click another row checkbox
   - Verify multiple rows selected
   - Click header checkbox
   - Verify all rows on current page selected
   - Click header checkbox again
   - Verify all rows deselected

9. **Row Click to Detail**
   - Click row (outside checkbox)
   - Verify detail view opens
   - Close detail view
   - Verify returns to table

10. **Column Content**
    - Verify title displays (click links to detail)
    - Verify status badges with correct colors
    - Verify priority badges with colors
    - Verify assignee shows avatar + name
    - Verify "Unassigned" for no assignee
    - Verify phase shows phase name
    - Verify "Unphased" for no phase
    - Verify feature shows feature name
    - Verify "No feature" for unlinked
    - Verify updated shows relative time ("2 days ago")

11. **Pagination** (if 25+ rows)
    - Verify "Showing X-Y of Z" displays
    - Click next page
    - Verify rows update
    - Click previous page
    - Verify rows update
    - Change rows per page to 50
    - Verify table updates

12. **Responsive Behavior**
    - Test at 1920px: all columns visible
    - Test at 1024px: hidden Feature column
    - Test at 768px: simplified layout

13. **Text Truncation**
    - Create work order with very long title
    - Verify title truncated in table
    - Hover or click to see full title in detail view

14. **Empty State**
    - Filter to phase with no work orders
    - Verify table shows "No work orders" or similar message
    - Verify no errors
