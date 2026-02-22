# Phase 036 - Feature Tree Search & Filter

## Objective
Implement search and filtering capabilities for the feature tree, allowing teams to find nodes by title/description and filter by status or level, while preserving tree context (showing ancestors of matching nodes).

## Prerequisites
- Feature Tree component (Phase 029)
- Status Tracking (Phase 035)
- Pattern Shop layout (Phase 027)

## Context
As feature trees grow (100+ nodes), navigation becomes difficult. Search and filter capabilities help teams locate nodes quickly. The key design principle is maintaining tree context—when showing search results, ancestor nodes are displayed to preserve hierarchy understanding.

## Detailed Requirements

### Search Box

**Location:**
- Top of left panel (above Product Overview section)

**Features:**
1. Text input field (placeholder: "Search features...")
2. Real-time filtering (debounced 300ms)
3. Match highlighting in results
4. Clear button (X icon) to reset search
5. Result counter ("12 results")

**Styling:**
```css
.search-box {
  width: 100%;
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
}
.search-box:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.clear-button {
  position: absolute;
  right: 12px;
  cursor: pointer;
  color: #9ca3af;
}
.clear-button:hover {
  color: #374151;
}
```

### Filter Controls

**Location:**
- Below search box in left panel

**Filter Types:**

1. **By Status:**
   - Checkboxes for each status (not_started, in_progress, complete, blocked)
   - "Select All" / "Deselect All" buttons
   - Show count per status: "In Progress (3)"

2. **By Level:**
   - Checkboxes for each level (Epic, Feature, Sub-feature, Task)
   - Show count per level: "Epic (2)"

**Styling:**
```
┌─ Status ─────────────────────┐
│ [✓] Not Started (0)         │
│ [ ] In Progress (3)         │
│ [✓] Complete (5)            │
│ [ ] Blocked (1)             │
│ [Select All] [Deselect All] │
└─────────────────────────────┘
┌─ Level ──────────────────────┐
│ [✓] Epic (2)                │
│ [✓] Feature (5)             │
│ [ ] Sub-feature (0)         │
│ [✓] Task (1)                │
│ [Select All] [Deselect All] │
└─────────────────────────────┘
```

**Collapse/Expand:**
- Status and Level sections collapse by default to save space
- Click section header to toggle expand/collapse

### Search Logic

**Query:**
- Case-insensitive partial match on title and description
- Search string compared against node.title and node.description

**Implementation:**
```typescript
function searchNodes(nodes: TreeNode[], query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const matchingIds: string[] = [];

  function traverse(node: TreeNode) {
    const titleMatch = node.title.toLowerCase().includes(lowerQuery);
    const descMatch = node.description?.toLowerCase().includes(lowerQuery) || false;

    if (titleMatch || descMatch) {
      matchingIds.push(node.id);
    }

    node.children?.forEach(traverse);
  }

  nodes.forEach(traverse);
  return matchingIds;
}
```

### Filtering Logic

**Combined Filters:**
- Filters are AND'd together (if status filter is on, only show nodes with selected statuses)
- Search + filters are AND'd: search results filtered by selected status/level

**Implementation:**
```typescript
function filterNodes(
  matchingIds: string[],
  selectedStatuses: FeatureStatus[],
  selectedLevels: FeatureLevel[],
  nodeMap: Map<string, FeatureNode>
): string[] {
  return matchingIds.filter((id) => {
    const node = nodeMap.get(id);
    if (!node) return false;

    const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(node.status);
    const levelMatch = selectedLevels.length === 0 || selectedLevels.includes(node.level);

    return statusMatch && levelMatch;
  });
}
```

### Tree Context Preservation

**Key Feature:**
When search/filter results are shown, display matching nodes AND their ancestors (parents, grandparents, etc.) to maintain hierarchy.

**Example:**
```
Search: "email"
Matches: Email Sign-up (Feature), Email Verification (Task)

Display:
└─ User Authentication (Epic) [ancestor, not a match]
   ├─ Email Sign-up (Feature) [MATCH, highlighted]
   └─ Email Verification (Task) [MATCH, highlighted]
```

**Implementation:**
```typescript
function getAncestors(nodeId: string, parentMap: Map<string, string>): string[] {
  const ancestors: string[] = [];
  let currentId: string | undefined = nodeId;

  while (currentId && parentMap.has(currentId)) {
    const parentId = parentMap.get(currentId);
    if (parentId) {
      ancestors.push(parentId);
      currentId = parentId;
    } else {
      break;
    }
  }

  return ancestors;
}

function getDisplayNodes(matchingIds: string[], nodeMap: Map<string, FeatureNode>): string[] {
  const parentMap = new Map<string, string>();
  nodeMap.forEach((node) => {
    if (node.parent_id) {
      parentMap.set(node.id, node.parent_id);
    }
  });

  const nodesToDisplay = new Set<string>(matchingIds);

  matchingIds.forEach((id) => {
    const ancestors = getAncestors(id, parentMap);
    ancestors.forEach((ancestorId) => nodesToDisplay.add(ancestorId));
  });

  return Array.from(nodesToDisplay);
}
```

### Visual Feedback

**In Tree:**
- Matching nodes highlighted (yellow background or bold)
- Non-matching ancestors shown with reduced opacity (opacity: 0.6)
- Non-matching descendants hidden (collapsed)

**Search State:**
- Show result counter: "12 results found"
- If no results: "No matching nodes"
- If search is empty: show full tree

### Clear Filters

**Button:**
- "Clear All" button clears search + all selected filters
- Resets to default (all statuses and levels selected, search empty)
- Triggers full tree re-render

### Keyboard Navigation

**Shortcuts:**
- Cmd+F / Ctrl+F: Focus search box
- Escape: Clear search and close filters
- Arrow keys (if implemented): Navigate search results

## Database Schema
No new tables. Uses Phase 026 schema.

## API Routes

### GET /api/projects/[projectId]/feature-nodes/search
Search and filter feature nodes.

**Query Parameters:**
- `q` (string, optional): Search query
- `statuses` (array, optional): Filter by statuses (comma-separated: not_started,in_progress)
- `levels` (array, optional): Filter by levels (comma-separated: epic,feature)

**Response (200 OK):**
```json
{
  "matchingNodeIds": ["feature-1", "task-2"],
  "displayNodeIds": ["epic-1", "feature-1", "feature-2", "task-2"],
  "totalMatches": 2,
  "statusCounts": {
    "not_started": 0,
    "in_progress": 2,
    "complete": 0,
    "blocked": 0
  },
  "levelCounts": {
    "epic": 1,
    "feature": 2,
    "sub_feature": 0,
    "task": 1
  }
}
```

**Logic:**
1. Query all feature_nodes for project where deleted_at IS NULL
2. If q provided: search title and description
3. If statuses provided: filter by selected statuses
4. If levels provided: filter by selected levels
5. Get matching node IDs
6. For each matching ID, get all ancestors
7. Combine matching IDs + ancestor IDs for display
8. Count statuses and levels in full tree (for filter checkboxes)
9. Return results

**Note:** For large trees (1000+ nodes), implement server-side search and pagination. For now, assume client-side filtering is acceptable.

## UI Components

### TreeSearchBox Component
**Path:** `/components/PatternShop/TreeSearchBox.tsx`

Search input with clear button and result counter.

```typescript
interface TreeSearchBoxProps {
  projectId: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  resultCount: number;
}

export default function TreeSearchBox({
  projectId,
  onSearchChange,
  onClear,
  resultCount,
}: TreeSearchBoxProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const debounced = useMemo(
    () => debounce((q: string) => {
      setDebouncedQuery(q);
      onSearchChange(q);
    }, 300),
    [onSearchChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    debounced(e.target.value);
  };

  const handleClear = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    onClear();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('tree-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative px-3 py-2 border-b border-gray-200">
      <input
        id="tree-search-input"
        type="text"
        placeholder="Search features..."
        value={searchQuery}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
      />

      {searchQuery && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-2 text-gray-500 hover:text-gray-700"
          title="Clear search"
        >
          <X size={16} />
        </button>
      )}

      {debouncedQuery && resultCount > 0 && (
        <div className="text-xs text-gray-600 mt-1">{resultCount} result{resultCount !== 1 ? 's' : ''}</div>
      )}

      {debouncedQuery && resultCount === 0 && (
        <div className="text-xs text-gray-500 mt-1">No matching nodes</div>
      )}
    </div>
  );
}
```

### TreeFilterPanel Component
**Path:** `/components/PatternShop/TreeFilterPanel.tsx`

Status and level filter checkboxes.

```typescript
interface TreeFilterPanelProps {
  statusCounts: Record<FeatureStatus, number>;
  levelCounts: Record<FeatureLevel, number>;
  selectedStatuses: FeatureStatus[];
  selectedLevels: FeatureLevel[];
  onStatusChange: (statuses: FeatureStatus[]) => void;
  onLevelChange: (levels: FeatureLevel[]) => void;
  onClearAll: () => void;
}

export default function TreeFilterPanel({
  statusCounts,
  levelCounts,
  selectedStatuses,
  selectedLevels,
  onStatusChange,
  onLevelChange,
  onClearAll,
}: TreeFilterPanelProps) {
  const [expandedSection, setExpandedSection] = useState<'status' | 'level' | null>(null);

  const statuses: FeatureStatus[] = ['not_started', 'in_progress', 'complete', 'blocked'];
  const levels: FeatureLevel[] = ['epic', 'feature', 'sub_feature', 'task'];

  const handleStatusToggle = (status: FeatureStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    onStatusChange(newStatuses);
  };

  const handleLevelToggle = (level: FeatureLevel) => {
    const newLevels = selectedLevels.includes(level)
      ? selectedLevels.filter((l) => l !== level)
      : [...selectedLevels, level];
    onLevelChange(newLevels);
  };

  return (
    <div className="px-3 py-2 border-b border-gray-200 space-y-2">
      {/* Status Filter */}
      <div>
        <button
          onClick={() => setExpandedSection(expandedSection === 'status' ? null : 'status')}
          className="w-full text-left text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1"
        >
          {expandedSection === 'status' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Status
        </button>

        {expandedSection === 'status' && (
          <div className="ml-4 space-y-1 mt-2">
            {statuses.map((status) => (
              <label key={status} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => handleStatusToggle(status)}
                />
                <span>{status.replace(/_/g, ' ')} ({statusCounts[status]})</span>
              </label>
            ))}
            <div className="mt-2 flex gap-1 text-xs">
              <button onClick={() => onStatusChange(statuses)} className="text-blue-600 hover:underline">
                All
              </button>
              <button onClick={() => onStatusChange([])} className="text-blue-600 hover:underline">
                None
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Level Filter */}
      <div>
        <button
          onClick={() => setExpandedSection(expandedSection === 'level' ? null : 'level')}
          className="w-full text-left text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1"
        >
          {expandedSection === 'level' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Level
        </button>

        {expandedSection === 'level' && (
          <div className="ml-4 space-y-1 mt-2">
            {levels.map((level) => (
              <label key={level} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level)}
                  onChange={() => handleLevelToggle(level)}
                />
                <span>{level.replace(/_/g, ' ')} ({levelCounts[level]})</span>
              </label>
            ))}
            <div className="mt-2 flex gap-1 text-xs">
              <button onClick={() => onLevelChange(levels)} className="text-blue-600 hover:underline">
                All
              </button>
              <button onClick={() => onLevelChange([])} className="text-blue-600 hover:underline">
                None
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear All */}
      <button
        onClick={onClearAll}
        className="w-full text-sm text-blue-600 hover:text-blue-800 font-semibold py-2"
      >
        Clear All Filters
      </button>
    </div>
  );
}
```

### Updated FeatureTree Component
**Path:** `/components/PatternShop/FeatureTree.tsx` (updated)

Integrate search and filter state.

```typescript
export default function FeatureTree({ projectId, ... }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<FeatureStatus[]>([
    'not_started', 'in_progress', 'complete', 'blocked'
  ]);
  const [selectedLevels, setSelectedLevels] = useState<FeatureLevel[]>([
    'epic', 'feature', 'sub_feature', 'task'
  ]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<FeatureStatus, number>>({
    not_started: 0, in_progress: 0, complete: 0, blocked: 0
  });
  const [levelCounts, setLevelCounts] = useState<Record<FeatureLevel, number>>({
    epic: 0, feature: 0, sub_feature: 0, task: 0
  });
  const [displayNodeIds, setDisplayNodeIds] = useState<Set<string>>(new Set());
  const [matchingNodeIds, setMatchingNodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Perform search and filter
    const matching = searchNodes(tree, searchQuery);
    const filtered = filterNodes(matching, selectedStatuses, selectedLevels, nodeMap);
    const toDisplay = getDisplayNodes(filtered, nodeMap);

    setMatchingNodeIds(new Set(matching));
    setDisplayNodeIds(new Set(toDisplay));
  }, [searchQuery, selectedStatuses, selectedLevels, tree]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TreeSearchBox
        projectId={projectId}
        onSearchChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
        resultCount={matchingNodeIds.size}
      />

      <TreeFilterPanel
        statusCounts={statusCounts}
        levelCounts={levelCounts}
        selectedStatuses={selectedStatuses}
        selectedLevels={selectedLevels}
        onStatusChange={setSelectedStatuses}
        onLevelChange={setSelectedLevels}
        onClearAll={() => {
          setSearchQuery('');
          setSelectedStatuses(['not_started', 'in_progress', 'complete', 'blocked']);
          setSelectedLevels(['epic', 'feature', 'sub_feature', 'task']);
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {displayNodeIds.size === 0 ? (
          <div className="p-4 text-gray-500 text-sm">No nodes match current filters</div>
        ) : (
          tree.map((node) => renderTreeNode(node, displayNodeIds, matchingNodeIds))
        )}
      </div>
    </div>
  );
}
```

## File Structure
```
components/PatternShop/
  TreeSearchBox.tsx           (search input)
  TreeFilterPanel.tsx         (status/level filters)
  FeatureTree.tsx             (updated with search/filter)

lib/
  search/
    searchNodes.ts            (search logic)
    filterNodes.ts            (filter logic)
    treeContext.ts            (ancestor retrieval)
```

## Acceptance Criteria
- [ ] Search box appears at top of left panel
- [ ] Typing in search updates results in real-time (debounced 300ms)
- [ ] Search matches on title and description (case-insensitive)
- [ ] Result counter shows correct count
- [ ] Matching nodes are highlighted
- [ ] Ancestor nodes shown (non-matching) with reduced opacity
- [ ] Status filter checkboxes appear (collapsed by default)
- [ ] Level filter checkboxes appear (collapsed by default)
- [ ] Filter counts show per status/level (e.g., "In Progress (3)")
- [ ] Selecting filters updates tree display
- [ ] Search + filters AND'd together
- [ ] "Clear All" button resets search and all filters
- [ ] Cmd+F / Ctrl+F focuses search box
- [ ] Escape closes search/filters
- [ ] No results message displays when appropriate
- [ ] GET /api/projects/[projectId]/feature-nodes/search works with all query params

## Testing Instructions

1. **Test search:**
   - Create features with titles "Email Sign-up", "Email Verification", "Password Reset"
   - Type "email" in search
   - Verify 2 results appear
   - Verify ancestors are shown

2. **Test filter by status:**
   - Create mix of nodes with different statuses
   - Uncheck "Complete"
   - Verify completed nodes disappear

3. **Test combined search + filter:**
   - Search "email"
   - Uncheck "Not Started"
   - Verify only in-progress/complete/blocked email nodes appear

4. **Test clear all:**
   - Apply search and filters
   - Click "Clear All"
   - Verify search box empty, all filters selected, full tree displays

5. **Test keyboard:**
   - Press Ctrl+F (Windows) or Cmd+F (Mac)
   - Verify search box focuses

6. **Test API:**
   ```bash
   curl "http://localhost:3000/api/projects/xyz/feature-nodes/search?q=email&statuses=in_progress,complete"
   ```

## Dependencies
- Phase 026: Database schema
- Phase 029: Feature tree component
- Phase 035: Status tracking (for filter counts)
