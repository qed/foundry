# Phase 055 - Blueprint Search & Filter

**Objective:** Implement comprehensive search and filtering for blueprints by title, content, type, status, and linked feature.

**Prerequisites:**
- Phase 046 (Database schema)
- Phase 047 (Control Room layout)
- Phase 054 (Blueprint status)

**Context:**
As the number of blueprints grows, searching and filtering becomes essential for finding relevant blueprints quickly. The Control Room search bar supports full-text search across blueprint titles and content, with filters for type, status, and linked feature. Results display with clear visual hierarchy and type indicators.

**Detailed Requirements:**

1. **Search Bar (Top of Left Panel)**
   - Placeholder text: "Search blueprints..."
   - Single text input field
   - Clear button (X icon) appears when input has text
   - Real-time search: filters results as user types (300ms debounce)
   - Focus: Ctrl+/ or Cmd+/ keyboard shortcut to focus search
   - Supports:
     - Title search: searches blueprint titles
     - Content search: full-text search in blueprint content
     - Feature search: search by feature node name (for feature blueprints)
   - Search scope: only visible blueprints (respects type filter tabs)
   - Case-insensitive

2. **Search Algorithm**
   - Client-side filtering (for responsiveness) if blueprints already loaded
   - Server-side full-text search for larger result sets:
     - PostgreSQL full-text search on title + content
     - Use tsvector and tsquery for efficient searching
   - Hybrid approach:
     - Quick filter on loaded blueprints first
     - If no results, fetch from server with query parameter
   - Search quality: partial word matching (e.g., "auth" matches "authentication")

3. **Type Filter Tabs** (already in Phase 047, reinforced here)
   - Tabs below search bar:
     - "All" (default)
     - "Foundations"
     - "System Diagrams"
     - "Features"
   - Clicking tab filters visible blueprints by type
   - Search respects current filter tab
   - Badge on tabs: count of blueprints of that type

4. **Advanced Filters** (optional collapsible panel)
   - Button: "More Filters" or filter icon (funnel)
   - Filters:
     - **Status**: checkboxes for Draft, In Review, Approved, Implemented
       - Default: all selected
       - Click to toggle status visibility
     - **Linked Feature**: dropdown to filter by feature (feature blueprints only)
       - Shows feature tree hierarchy
       - Searchable in dropdown
     - **Created By**: dropdown to filter by author
       - Shows list of team members
       - Multi-select (Ctrl+click)
     - **Date Range**: created after/before dates
       - Calendar picker or date input
   - Apply/Reset buttons (or auto-apply on change)
   - Filter summary: badge showing number of active filters

5. **Search Results Display**
   - Results shown in left panel where blueprints list normally appears
   - Results organized by relevance (highest match first)
   - Each result shows:
     - Blueprint type icon (foundation, diagram, feature icon)
     - Blueprint title (highlight matching search term in bold)
     - Status badge (small, right side)
     - Feature name (if feature blueprint): "in [Feature Name]"
     - Created by: "(by [User Name])"
     - Snippet: 1-2 lines of matching content (ellipsis if truncated), with search term highlighted
   - Number of results shown: "23 blueprints found"
   - Empty state: "No blueprints match your search" with suggestion to clear filters

6. **Search Result Interaction**
   - Click result: load blueprint in center panel
   - Hover: show actions menu (view, edit, delete)
   - Keyboard navigation:
     - Arrow keys to navigate results
     - Enter to select highlighted result
     - Escape to clear search and return to full list

7. **Full-Text Search Implementation (Server)**
   - PostgreSQL full-text search columns:
     - `title` (A weight, highest priority)
     - `content` (B weight)
     - Feature node name (for feature blueprints, B weight)
   - Trigger: compute tsvector on INSERT/UPDATE
   - Query: use tsquery with OR operator for multi-word searches
   - Performance: GIN index on tsvector column

8. **Filter Combination Logic**
   - All filters AND together:
     - (type = X OR type = Y) AND (status = A OR status = B) AND (created_by = Z) AND (date_range)
   - Search text AND with filters:
     - (search_text matches) AND (filters)
   - Example: search "auth" with filter Status=Approved, Feature=User Management
     - Returns approved blueprints matching "auth" linked to "User Management" feature

9. **Filter Persistence** (optional)
   - Save filter state in URL query params:
     - ?search=auth&type=foundation&status=approved
   - Allow sharing filtered view via URL
   - Restore filters from URL on page load

10. **Search Performance**
    - Debounce search input: 300ms
    - Limit initial results: first 50 results displayed, "Load more" button if more exist
    - Pagination: show next 50 on "Load more"
    - Search history: optional, remember last 5 searches (in localStorage)
    - Caching: cache search results for 5 minutes

11. **Search Analytics** (future)
    - Track popular search terms
    - Track search with no results (for gap analysis)
    - Use for improving content/organization

12. **Accessibility**
    - Search input has aria-label
    - Results list has aria-live="polite" (announce result count)
    - Filter panel has aria-expanded for toggle state
    - Keyboard accessible: Tab through filters, Space to toggle checkboxes
    - High contrast for highlighted search terms

**Database Schema**

```sql
-- Add full-text search columns
ALTER TABLE blueprints ADD COLUMN search_tsvector tsvector;

-- Create GIN index for full-text search
CREATE INDEX idx_blueprints_search_tsvector
ON blueprints USING GIN(search_tsvector);

-- Function to update search_tsvector
CREATE OR REPLACE FUNCTION update_blueprints_search_tsvector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_tsvector := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content::text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector
CREATE TRIGGER blueprints_search_tsvector_trigger
BEFORE INSERT OR UPDATE ON blueprints
FOR EACH ROW
EXECUTE FUNCTION update_blueprints_search_tsvector();
```

**API Routes**
```
GET /api/projects/[projectId]/blueprints/search
  Query:
    - q: search string (required)
    - type?: 'foundation' | 'system_diagram' | 'feature' (optional, can be comma-separated)
    - status?: 'draft,in_review,approved' (optional, comma-separated)
    - feature_node_id?: uuid (optional, for feature blueprints)
    - created_by?: uuid (optional)
    - date_from?: ISO date string
    - date_to?: ISO date string
    - limit?: number (default 50)
    - offset?: number (default 0)
  Returns: {
    total: number,
    results: [
      {
        id,
        title,
        type,
        status,
        feature_node_id?,
        created_by,
        snippet,
        highlight_positions: [...]
      }
    ]
  }

GET /api/projects/[projectId]/blueprints/filters
  Returns: {
    statuses: ['draft', 'in_review', 'approved', 'implemented'],
    authors: [{ id, name, avatar_url }],
    features: [{ id, name, path }]
  }
```

**UI Components**
- `BlueprintSearchBar` (search input with clear button)
- `BlueprintTypeFilterTabs` (tab buttons)
- `BlueprintAdvancedFilters` (collapsible filter panel)
- `FilterCheckbox` (reusable checkbox for filters)
- `FilterDropdown` (reusable dropdown for filters)
- `BlueprintSearchResults` (results list view)
- `BlueprintSearchResultItem` (single result item)
- `BlueprintSearchEmptyState` (empty results state)

**File Structure**
```
app/
  api/
    projects/
      [projectId]/
        blueprints/
          search/
            route.ts (GET search with filtering)
          filters/
            route.ts (GET available filter options)
  components/
    room/
      BlueprintSearchBar.tsx
      BlueprintTypeFilterTabs.tsx
      BlueprintAdvancedFilters.tsx
      BlueprintSearchResults.tsx
      BlueprintSearchResultItem.tsx
  lib/
    hooks/
      useBlueprintSearch.ts (manage search state and API calls)
      useBlueprintFilters.ts (manage filter state)
    supabase/
      migrations/
        20260220_add_blueprint_search.sql
```

**Acceptance Criteria**
- [ ] Search bar appears at top of left panel with placeholder text
- [ ] Search input real-time filters blueprints (300ms debounce)
- [ ] Clear button (X) appears when search has text
- [ ] Type filter tabs display with blueprint counts
- [ ] Clicking tab filters results by type
- [ ] Search results show blueprint type icon, title, status badge, feature name
- [ ] Matching search term highlighted in bold in results
- [ ] Results show snippet of matching content
- [ ] Advanced filters panel toggles on/off
- [ ] Status checkboxes filter by multiple statuses (OR logic)
- [ ] Feature dropdown filters by linked feature
- [ ] Created By dropdown filters by author
- [ ] Date range picker filters by creation date
- [ ] All filters combine with AND logic
- [ ] Result count displayed ("23 blueprints found")
- [ ] Empty state shows when no results
- [ ] Keyboard shortcut Ctrl+/ focuses search bar
- [ ] Arrow keys navigate results
- [ ] Enter key selects highlighted result
- [ ] Escape key clears search
- [ ] Full-text search works for multi-word queries
- [ ] Search is case-insensitive
- [ ] Pagination with "Load more" button works
- [ ] Filter state persists in URL query params
- [ ] Search results load from server (not just client-side)
- [ ] GIN index created for performance
- [ ] Result relevance ordering works (exact matches first)

**Testing Instructions**
1. Navigate to Control Room with multiple blueprints
2. Click search bar and verify placeholder text
3. Type "auth" and verify blueprints filtered in real-time
4. Verify matching results show "auth" highlighted in title
5. Verify "Clear" (X) button appears and clears search
6. Test keyboard shortcut: press Ctrl+/ and verify search bar focused
7. Type "backend" and verify results show content snippet with "backend" highlighted
8. Click result and verify blueprint loads in center panel
9. Click "Foundation" tab and verify only foundation blueprints display
10. Click "System Diagrams" tab and verify only diagrams display
11. Click "All" tab and verify all blueprints return
12. Verify tab badges show correct counts
13. Click "More Filters" and verify filter panel opens
14. Select "Draft" status checkbox and verify only drafts display
15. Select multiple statuses (Draft, In Review) and verify OR logic (shows both)
16. Click feature dropdown and select specific feature
17. Verify only blueprints for that feature display
18. Click "Created By" dropdown and select team member
19. Verify only blueprints created by that member display
20. Set date range filters and verify blueprints within range display
21. Search "test" while filters active, verify search AND filter logic
22. Clear all filters with "Reset Filters" button
23. Verify all blueprints return
24. Search with 2+ word query (e.g., "feature blueprint") and verify matches
25. Verify full-text search finds content, not just titles
26. Scroll through large result set and verify "Load more" button
27. Copy filtered URL and share with colleague
28. Verify colleague loads URL and sees same filtered results
29. Test keyboard navigation: arrow keys move through results
30. Test keyboard selection: press Enter to open highlighted result
31. Test Escape key to close search
32. Verify result relevance: exact title matches appear first
33. Test search with special characters
34. Test search performance: search with 500+ blueprints
