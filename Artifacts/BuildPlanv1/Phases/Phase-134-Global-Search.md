# Phase 134: Cross-Module - Global Search

## Objective
Implement Cmd+K (Ctrl+K) global search overlay enabling rapid navigation across all Helix Foundry entities: ideas, features, blueprints, work orders, feedback, and artifacts.

## Prerequisites
- All prior module phases (001-133) - schema for all entities
- PostgreSQL full-text search capability
- Keyboard shortcut handling
- UI modal/overlay components

## Context
Users need fast navigation across scattered entities. Global search enables productivity by providing a single entry point to find anything in the system without clicking through multiple pages.

## Detailed Requirements

### Search Scope
- Search across all project entities:
  - **Hall:** Ideas (title, description, tags)
  - **Pattern Shop:** Features (name, description), Requirements (description, acceptance criteria)
  - **Control Room:** Blueprints (name, content)
  - **Assembly Floor:** Work Orders (title, description, implementation plan)
  - **Insights Lab:** Feedback (title, text, category)
  - **Artifacts:** All artifact types (name, content)

### Search UI
- **Trigger:**
  - Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  - Or: click search icon in header
  - Keyboard shortcut accessible from any page

- **Search Overlay:**
  - Modal dialog spanning 90% width, centered on screen
  - Search input field (focused on open) with icon and placeholder: "Search ideas, features, blueprints..."
  - Results section below input (max height 400px, scrollable)
  - Results grouped by entity type with collapsible sections
  - "No results" message if nothing found

### Search Results Display
```
Search input: "authentication"

Results:

📋 Ideas (3)
  • User Authentication Enhancement
  • Two-Factor Authentication
  • OAuth Integration Research

🎯 Features (2)
  • Multi-factor Authentication
  • Single Sign-On

📄 Blueprints (1)
  • Auth Service Architecture

⚙️ Work Orders (2)
  • Implement JWT token rotation
  • Add password reset flow

💬 Feedback (5)
  • Users want biometric login
  • ...3 more

🎨 Artifacts (1)
  • Auth flows diagram
```

- Each result shows:
  - Entity type icon and name
  - Highlight of matching text (excerpt showing context)
  - Secondary info (status, assigned to, date, etc.)
  - Count of results in category

### Search Functionality
- **Query Processing:**
  - Minimum 1 character to start search (instant results)
  - Query breaks into tokens (e.g., "auth flow" → ["auth", "flow"])
  - Both AND and OR matching:
    - AND: all tokens must match (higher relevance)
    - OR: any token matches (broader results)
  - Fuzzy matching for typos (e.g., "autentication" matches "authentication")
  - Weighted search: title matches weighted higher than description

- **Performance:**
  - Debounce search input (100ms)
  - Max 100 results total (limited per entity type)
  - Full-text search indexes on searchable columns
  - Results cached for 5 minutes per query

### Keyboard Navigation
- Arrow Up/Down: navigate results
- Enter: open selected result
- Escape: close overlay
- Tab: cycle through result groups
- Type to filter: clears selection, refocuses search

### Entity Type Icons
- 📋 Ideas
- 🎯 Features
- 📄 Blueprints
- ⚙️ Work Orders
- 💬 Feedback
- 🎨 Artifacts

### Database Full-Text Search Setup
```sql
-- Create GIN indexes for each searchable entity
CREATE INDEX idx_ideas_fulltext ON ideas
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX idx_features_fulltext ON features
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX idx_blueprints_fulltext ON blueprints
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(content, '')));

CREATE INDEX idx_work_orders_fulltext ON work_orders
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX idx_feedback_fulltext ON feedback
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(text, '')));

-- Create search function
CREATE OR REPLACE FUNCTION search_all_entities(
  p_project_id UUID,
  p_query TEXT
) RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  entity_excerpt TEXT,
  entity_status TEXT,
  match_score FLOAT
) AS $$
-- Combine results from all entity tables with UNION ALL
-- Order by match score (relevance) and timestamp
$$ LANGUAGE SQL;
```

### Search Query Example
```sql
SELECT 'idea' as entity_type, id, title, description as excerpt, status, ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '')), to_tsquery('english', query)) as score
FROM ideas
WHERE project_id = $1 AND to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ to_tsquery('english', $2)
UNION ALL
SELECT 'feature', id, name, description, status, ts_rank(...)
FROM features
WHERE project_id = $1 AND ...
-- ... union all other entities
ORDER BY score DESC, created_at DESC
LIMIT 100;
```

### Permissions
- Search respects project-level permissions (RLS)
- Users only see results they have access to
- No cross-project search (searches within current project)

### Recent Searches (Optional)
- Store last 10 searches per user
- Display in search overlay when input empty
- "Recent searches" section above results
- Clear recent searches option

## File Structure
```
/app/components/GlobalSearch/SearchOverlay.tsx
/app/components/GlobalSearch/SearchResults.tsx
/app/components/GlobalSearch/SearchResultGroup.tsx
/app/components/GlobalSearch/SearchResultItem.tsx
/app/components/GlobalSearch/useGlobalSearch.ts
/app/api/projects/[projectId]/search/route.ts
/app/lib/supabase/migrations/create-fulltext-indexes.sql
/app/lib/search/searchService.ts
/app/hooks/useKeyboardShortcuts.ts
```

## Acceptance Criteria
- [ ] Cmd+K (Ctrl+K) opens search overlay from any page
- [ ] Search input focused when overlay opens
- [ ] Typing in search triggers results instantly
- [ ] Results grouped by entity type (ideas, features, etc.)
- [ ] Each group shows count of results
- [ ] Results within group sorted by relevance
- [ ] Matching text highlighted in results
- [ ] Result excerpt shows context
- [ ] Clicking result navigates to entity detail page
- [ ] Arrow Up/Down navigates results
- [ ] Enter key opens selected result
- [ ] Escape closes overlay
- [ ] Debounce prevents excessive queries
- [ ] Full-text search returns accurate matches
- [ ] Fuzzy matching handles typos
- [ ] Multiple query tokens work (AND/OR logic)
- [ ] No cross-project leakage of data
- [ ] RLS policies respected (users only see allowed entities)
- [ ] Max 100 results returned (prevents huge result sets)
- [ ] Performance: search completes in <500ms
- [ ] Recent searches displayed when input empty
- [ ] All entity types searchable

## Testing Instructions
1. From any page, press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
2. Verify search overlay appears centered on screen
3. Verify search input is focused (cursor visible)
4. Type "auth" - should show results instantly
5. Verify results grouped by type (Ideas, Features, Blueprints, Work Orders, Feedback)
6. Verify each group shows count (e.g., "Ideas (3)")
7. Verify result excerpt shows matching text with context
8. **Test Keyboard Navigation:**
   - Press arrow down to highlight next result
   - Press arrow up to go back
   - Press Enter to open highlighted result
   - Verify page navigates to that entity
9. **Test Search from Different Pages:**
   - Go to Hall and search "blueprint"
   - Go to Pattern Shop and search same
   - Go to Control Room and search
   - Verify search works from all pages
10. **Test Typo Handling:**
    - Search "autentication" (typo for authentication)
    - Verify results still show authentication-related items
11. **Test Multiple Tokens:**
    - Search "user auth"
    - Verify results contain both "user" and "auth"
    - Verify title/description matches weighted higher
12. **Test Entity Detail Navigation:**
    - Search "login"
    - Click on a Blueprint result
    - Verify page navigates to blueprint detail
    - Go back and search again
    - Click on Work Order result
    - Verify navigation works
13. **Test Empty Query:**
    - Open search overlay (press Cmd+K)
    - Don't type anything
    - Verify recent searches display
    - Verify "Recent searches" section shows last 10 queries
14. **Test Escape to Close:**
    - Open search overlay
    - Press Escape
    - Verify overlay closes
15. **Test Performance:**
    - Create project with 100+ entities
    - Open search overlay
    - Type query
    - Measure response time
    - Should be <500ms
16. **Test Permissions:**
    - As User A with access to Project 1 only
    - Search and verify only Project 1 results
    - Verify no Project 2 entities appear
17. **Test Result Count:**
    - Create project with 200+ entities all matching query
    - Search
    - Verify max 100 results returned
    - Verify UI doesn't break with many results

## Search UI Example
```
┌─────────────────────────────────────────┐
│  Search ideas, features, blueprints...  │ ← search input
├─────────────────────────────────────────┤
│                                         │
│ 📋 Ideas (3)                            │
│   • User Authentication Enhancement     │
│   • Two-Factor Authentication           │
│                                         │
│ 🎯 Features (2)                         │
│   • Multi-factor Authentication         │
│                                         │
│ ⚙️ Work Orders (2)                      │
│   • Implement JWT token rotation        │
│                                         │
└─────────────────────────────────────────┘
```
