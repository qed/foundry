# Phase 072 - Work Order Search & Filter

## Objective
Implement comprehensive search by title/description and multi-faceted filtering with combined filters, persistent state via URL params, and clear filter controls.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 062: Assembly Floor Page Layout
- Phase 067: Table View (filter UI)
- Phase 069: Phases

## Context
As projects grow, finding specific work orders becomes essential. Search enables quick discovery by keywords, while filtering lets users view subsets based on workflow criteria (status, priority, assignee, phase, feature). Combining filters creates powerful views: "My High Priority Work Orders in Development Phase", etc.

## Detailed Requirements

### Search

#### Text Search
- Input field: "Search work orders..."
- Searches: title, description, acceptance criteria
- Case-insensitive, partial match
- Real-time results (debounced, 300ms)
- Clears on blur or X button

#### Search Behavior
- Typing updates results immediately
- Clear button (X icon) empties search
- Search applied with other filters (AND logic)
- Example: search "login" + filter Status="In Progress" = all in-progress work orders mentioning "login"

#### Search Performance
- Debounce input (300ms) to reduce API calls
- Database ILIKE query for SQL search
- Use full-text search (FTS) for better performance if 1000+ work orders
- Client-side caching of recent searches (localStorage)

### Filters

#### Available Filters
1. **Status** (multi-select)
   - Options: Backlog, Ready, In Progress, In Review, Done
   - Select one or more
   - "Clear status filter" button

2. **Priority** (multi-select)
   - Options: Critical, High, Medium, Low
   - Select one or more
   - Color-coded options

3. **Assignee** (multi-select)
   - List of project members
   - "Unassigned" option
   - Search by name/email if 20+ members
   - Select one or more

4. **Phase** (multi-select)
   - List of project phases
   - "Unphased" option
   - Select one or more
   - Note: Different from Phase Navigation tabs (which are single-select)

5. **Linked Feature/Epic** (multi-select)
   - List of features and epics
   - Hierarchical (epic > feature)
   - Select one or more
   - "No feature linked" option

#### Filter Combinations
- Multiple filters combined with AND logic
- Example: Status IN (In Progress, In Review) AND Priority IN (Critical, High) AND Assignee = [User]
- Result: All critical/high-priority work orders assigned to user that are in progress or review

### Filter UI

#### Filter Panel/Popover
- Accessible from header filter button
- Toggles open/closed
- Can be sidebar or popover

#### Filter Display
- Each filter section (Status, Priority, etc.)
- Checkboxes or toggle buttons for each option
- Section title, expandable/collapsible
- Count per option: "(5)" next to "In Progress"
- Applied filters highlighted

#### Clear Filters
- "Clear all filters" button at bottom of panel
- Resets all filter selections to defaults
- Confirms action (optional)

#### Active Filter Badge
- Badge or chip display showing applied filters
- Example: "Status: In Progress | Priority: High" × (remove each)
- Located above search bar or near filter button
- Click × to remove individual filter

### Search & Filter State Management

#### URL Query Parameters
- Search: `?search=login`
- Status: `?status=in_progress,in_review` (comma-separated)
- Priority: `?priority=critical,high`
- Assignee: `?assignee=[userId1],[userId2]`
- Phase: `?phase=[phaseId1],[phaseId2]`
- Feature: `?feature=[featureId1],[featureId2]`
- Example: `/floor?search=auth&status=in_progress,in_review&priority=critical&assignee=[userId]`

#### Shareable Filter States
- Copy URL to share filtered view with teammate
- Other user opens URL, sees same filtered view
- Bookmark filtered views for quick access

#### State Persistence
- Filters persisted in URL (not localStorage, for shareability)
- Page refresh maintains filters
- Navigation away and back restores filters (via URL)

### Database Queries

#### Search Query (ILIKE)
```sql
SELECT * FROM work_orders
WHERE project_id = $1
  AND (title ILIKE $2 OR description ILIKE $2 OR acceptance_criteria ILIKE $2)
ORDER BY updated_at DESC
```

#### Filter Query (with multiple conditions)
```sql
SELECT * FROM work_orders
WHERE project_id = $1
  AND (status = ANY($2::varchar[]) OR $2 IS NULL)
  AND (priority = ANY($3::varchar[]) OR $3 IS NULL)
  AND (assignee_id = ANY($4::uuid[]) OR $4 IS NULL)
  AND (phase_id = ANY($5::uuid[]) OR $5 IS NULL)
  AND (feature_node_id = ANY($6::uuid[]) OR $6 IS NULL)
  AND (title ILIKE $7 OR description ILIKE $7 OR $7 IS NULL)
ORDER BY phase_id, position
```

#### Full-Text Search (optional, for scale)
```sql
CREATE INDEX idx_work_orders_search ON work_orders
USING GIN(
  to_tsvector('english', title) || to_tsvector('english', description)
);

SELECT * FROM work_orders
WHERE project_id = $1
  AND to_tsvector('english', title || ' ' || COALESCE(description, '')) @@
      plainto_tsquery('english', $2)
ORDER BY updated_at DESC
```

## API Routes
```
GET /api/projects/[projectId]/work-orders
  - Query params: ?search=string&status=csv&priority=csv&assignee=csv&phase=csv&feature=csv
  - Returns: filtered work orders
  - Status: 200

GET /api/projects/[projectId]/work-orders/search
  - Alternative search endpoint
  - Query: ?q=query_string
  - Returns: [ { id, title, description, ... } ]
  - Status: 200

GET /api/projects/[projectId]/search-suggestions
  - Auto-complete suggestions
  - Query: ?q=partial_string
  - Returns: [ "Work order title 1", "Work order title 2", ... ]
  - Status: 200
```

## UI Components

### New Components
1. **SearchBar** (`app/components/Assembly/SearchBar.tsx`)
   - Input field for search text
   - Placeholder: "Search by title, description, criteria..."
   - Clear button (X icon)
   - Debounced input
   - Props: onSearchChange, searchValue, onClear

2. **FilterPanel** (`app/components/Assembly/FilterPanel.tsx`)
   - Popover/sidebar for all filters
   - Toggle open/closed
   - Sections for each filter type
   - Clear all button
   - Submit/Apply button (or auto-apply)

3. **FilterSection** (`app/components/Assembly/FilterSection.tsx`)
   - Single filter type (Status, Priority, etc.)
   - Collapsible/expandable
   - Checkboxes for options
   - Count per option
   - Search within filter (if many options)

4. **FilterBadges** (`app/components/Assembly/FilterBadges.tsx`)
   - Display applied filters as removable chips
   - Each chip shows filter value
   - × button to remove individual filter
   - "Clear all" link

5. **FilterButton** (`app/components/Assembly/FilterButton.tsx`)
   - Button to open/close FilterPanel
   - Icon: funnel
   - Badge: show count of active filters

### Reused Components
- Checkbox (from common)
- Popover (from common)
- Badge (from common)

## File Structure
```
app/
  components/
    Assembly/
      SearchBar.tsx                       # Search input
      FilterPanel.tsx                     # Filter UI container
      FilterSection.tsx                   # Single filter section
      FilterBadges.tsx                    # Display active filters
      FilterButton.tsx                    # Filter toggle button
  api/
    projects/
      [projectId]/
        work-orders/
          route.ts                        # Modify: support filter query params
          search/
            route.ts                      # GET search endpoint
          search-suggestions/
            route.ts                      # GET auto-complete suggestions
  lib/
    search.ts                             # Search utilities
    filters.ts                            # Filter utilities
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useSearch.ts                    # Hook for search state
          useFilters.ts                   # Hook for filter state
          useSearchAndFilters.ts          # Combined hook
```

## URL Query Parameter Schema
```
/org/[slug]/project/[id]/floor
  ?search=query_text
  &status=backlog,ready,in_progress,in_review,done
  &priority=critical,high,medium,low
  &assignee=[userId1],[userId2]
  &phase=[phaseId1],[phaseId2]
  &feature=[featureId1],[featureId2]
  &view=kanban|table
  &sort=priority|status
```

Example: `/org/acme/project/123/floor?search=auth&status=in_progress,in_review&priority=critical&view=table`

## Acceptance Criteria
- Search input visible in header or filter area
- Type text, results filter in real-time (debounced)
- Search by title, description, and acceptance criteria
- Clear button (X) empties search
- Filter button opens FilterPanel
- FilterPanel shows 5 filter sections: Status, Priority, Assignee, Phase, Feature
- Each section has checkboxes for options
- Select multiple options within filter (OR logic)
- Multiple filters combined with AND logic
- "Clear all filters" button resets all selections
- Applied filters shown as removable badges/chips
- Each badge has × button to remove individually
- Filters persisted in URL query params
- URL change reflects filter state (and vice versa)
- Copy URL and share: other user sees same filtered view
- Reload page: filters persist
- Navigate away and back: filters persist (via URL)
- Work orders count updates based on filters
- Empty state shows if no results match filters

## Testing Instructions

1. **Search Bar Display**
   - Verify search input visible in header/filter area
   - Verify placeholder text: "Search by title..."
   - Verify clear button (X) visible

2. **Basic Search**
   - Create work order titled "User Authentication"
   - Type "auth" in search
   - Verify work order appears in filtered results
   - Type "xyz" (no match)
   - Verify no results shown
   - Clear search, verify all work orders return

3. **Search Multiple Fields**
   - Create work order: title "Database setup", description "Configure PostgreSQL"
   - Search "postgres"
   - Verify work order appears (found in description)
   - Search "database"
   - Verify work order appears (found in title)

4. **Search Debouncing**
   - Type "a", "ab", "abc", "abcd" quickly
   - Verify API calls are debounced (not called 4 times)
   - Results update smoothly

5. **Filter by Status**
   - Create 5 work orders: 2 in-progress, 2 done, 1 backlog
   - Open filter panel
   - Check only "In Progress"
   - Verify 2 in-progress work orders shown
   - Check "Done" also
   - Verify 4 work orders shown (2 in-progress + 2 done)
   - Uncheck all, verify all 5 shown

6. **Filter by Priority**
   - Create work orders with mixed priorities
   - Filter by "Critical"
   - Verify only critical shown
   - Add "High" filter
   - Verify critical and high shown

7. **Filter by Assignee**
   - Create work orders assigned to different users
   - Filter by User A
   - Verify only User A's work orders shown
   - Add User B to filter
   - Verify both users' work orders shown

8. **Filter by Phase**
   - Create 2 phases with work orders
   - Filter by Phase A
   - Verify only Phase A work orders shown
   - Add Phase B to filter
   - Verify both phases shown

9. **Combined Filters**
   - Create diverse work orders
   - Status: "In Progress" + Priority: "High" + Assignee: User A
   - Verify results show only high-priority in-progress work orders assigned to User A
   - All other filters applied simultaneously

10. **Clear All Filters**
    - Apply multiple filters
    - Click "Clear all filters" button
    - Verify all filters reset
    - All work orders shown

11. **Filter Badges**
    - Apply filters: Status "In Progress", Priority "High"
    - Verify badges show: "Status: In Progress" and "Priority: High"
    - Click × on Status badge
    - Verify status filter removed, priority still active
    - Click × on Priority badge
    - Verify all filters cleared

12. **URL Query Parameters**
    - Apply filters and search
    - Verify URL shows: ?search=text&status=...&priority=...
    - Copy URL
    - Paste in new tab
    - Verify same filters applied
    - Filters match previous view

13. **Shareable URLs**
    - Create filtered view
    - Copy URL
    - Send to teammate
    - Teammate opens URL
    - Verify same filters applied
    - Same work orders shown

14. **Bookmark Filters**
    - Create useful filtered view
    - Bookmark URL in browser
    - Clear all filters (different view)
    - Click bookmark
    - Verify previous filtered view restored

15. **Filter Count Badge**
    - Apply 3 filters
    - Verify filter button shows badge with "3"
    - Clear filters
    - Verify badge disappears or shows "0"

16. **No Results State**
    - Search for non-existent text
    - Verify "No work orders found" message
    - Verify no errors

17. **Performance - Many Work Orders**
    - Project with 1000 work orders
    - Apply complex filter (multiple statuses, priorities, assignees)
    - Verify load time < 1s
    - Verify smooth interaction (no lag)

18. **Filter Persistence on Navigation**
    - Apply filters
    - Click work order to open detail view
    - Close detail view
    - Verify filters still applied
    - Board shows same filtered results

19. **Search + Filters Together**
    - Search for "bug"
    - Also filter by Status "In Progress" and Priority "Critical"
    - Verify results: only critical in-progress work orders mentioning "bug"

20. **Responsive Filter UI**
    - Desktop: FilterPanel sidebar or popover
    - Tablet/Mobile: FilterPanel responsive, good touch targets
    - Verify filters accessible and usable on all sizes
