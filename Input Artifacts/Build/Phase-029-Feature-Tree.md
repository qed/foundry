# Phase 029 - Feature Tree Component

## Objective
Build an interactive, hierarchical tree component that renders the feature nodes, with expand/collapse, visual level indicators, status color coding, and node selection to populate the requirements editor in the center panel.

## Prerequisites
- Pattern Shop database schema (Phase 026)
- Pattern Shop layout (Phase 027)
- TypeScript, React, Tailwind CSS
- Lucide icons for UI (expand, collapse, folder, puzzle, layers, check-circle icons)

## Context
The Feature Tree is the core navigation element of the Pattern Shop. It displays the decomposed feature hierarchy (Epic → Feature → Sub-feature → Task) with interactive expand/collapse controls. Each node displays its level via an icon, its status via color coding, and is clickable to load its associated requirements document. The tree must efficiently render potentially thousands of nodes while supporting filtering and search (Phase 036).

## Detailed Requirements

### Tree Data Structure

The tree is built from `feature_nodes` table rows and rendered hierarchically:

```typescript
interface FeatureNode {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description?: string;
  level: 'epic' | 'feature' | 'sub_feature' | 'task';
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  position: number;
  created_at: string;
  updated_at: string;
}

interface TreeNode extends FeatureNode {
  children: TreeNode[];
}
```

### API Route to Fetch Tree

**Route:** `GET /api/projects/[projectId]/feature-tree`

**Response:**
```json
{
  "nodes": [
    {
      "id": "epic-1",
      "title": "User Authentication",
      "level": "epic",
      "status": "in_progress",
      "position": 0,
      "children": [
        {
          "id": "feature-1",
          "title": "Email Sign-up",
          "level": "feature",
          "status": "complete",
          "position": 0,
          "children": [
            {
              "id": "task-1",
              "title": "Implement email validation",
              "level": "task",
              "status": "complete",
              "position": 0,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

### Visual Indicators

**Level Icons (Lucide):**
- Epic: `FolderOpen` (or custom folder icon)
- Feature: `Puzzle` (puzzle piece icon)
- Sub-feature: `Layers` (stacked layers icon)
- Task: `CheckCircle2` (check icon)

**Status Colors (Tailwind):**
- `not_started`: gray-400 (#9ca3af) background, gray-600 text
- `in_progress`: blue-400 (#60a5fa) background, blue-600 text
- `complete`: green-400 (#4ade80) background, green-600 text
- `blocked`: red-400 (#f87171) background, red-600 text

**Status Indicator:** Small badge (12-16px) next to icon showing colored circle

### Node Rendering

Each tree node displays:
```
┌─ ▶ [Icon] Title
│     Status Badge
└─ Description (optional, truncated)
```

**Expand/Collapse Behavior:**
- Show chevron-down/chevron-right icon to left of level icon
- Only show chevron if node has children
- Click chevron to toggle expand/collapse
- Expanded state tracked in component state (React useState or context)
- No persistence of expand state across sessions (initially all collapsed)

**Indentation:**
- Each level indents 16px from parent
- Epic: 0px margin-left
- Feature: 16px margin-left
- Sub-feature: 32px margin-left
- Task: 48px margin-left

### Node Selection and Highlighting

- Click node to select it
- Selected node highlighted: background-color: #dbeafe (blue-100) + bold text
- When selected, emit callback to load its FRD in center panel
- Visual feedback on hover: background-color: #f3f4f6 (gray-100)

### Empty State

If no feature nodes exist in project:
- Show empty state message:
  ```
  No feature nodes yet. Create your first Epic!
  ```
- Link to "Phase 030: Add Nodes to Feature Tree"

### Virtualization Consideration

For projects with 1000+ nodes, implement virtual scrolling to optimize performance:
- Use react-window or react-virtual library
- Only render visible nodes (typically 20-50 at a time)
- Placeholder height: 40px per node
- Scrolling must feel smooth

### Recursive Rendering

Primary approach uses recursive component structure:

```typescript
interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
}
```

## Database Schema
Uses Phase 026 `feature_nodes` table. No new tables required.

## API Routes

### GET /api/projects/[projectId]/feature-tree
Fetch complete feature tree for a project.

**Query Parameters:**
- `projectId` (string, required): Project UUID

**Response (200 OK):**
```json
{
  "nodes": [ /* TreeNode[] as shown above */ ],
  "count": 42
}
```

**Logic:**
1. Query all `feature_nodes` where project_id = projectId and deleted_at IS NULL, ordered by level then position
2. Build tree structure in application code (group by parent_id)
3. Return nested structure

**Performance Note:** For large trees (1000+ nodes), consider caching via Redis or returning a flat list and moving tree-building to client.

**Error Responses:**
- 404 Not Found: Project not found
- 403 Forbidden: User not a member of project

## UI Components

### FeatureTree Component
**Path:** `/components/PatternShop/FeatureTree.tsx`

Main tree container managing expand state and node selection.

```typescript
interface FeatureTreeProps {
  projectId: string;
  selectedNodeId?: string;
  onSelectNode: (nodeId: string) => void;
  expandedNodeIds?: Set<string>;
  onToggleExpand?: (nodeId: string) => void;
}

export default function FeatureTree({
  projectId,
  selectedNodeId,
  onSelectNode,
  expandedNodeIds: initialExpandedNodeIds = new Set(),
  onToggleExpand,
}: FeatureTreeProps) {
  const [expandedNodeIds, setExpandedNodeIds] = useState(initialExpandedNodeIds);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatureTree(projectId)
      .then(({ nodes }) => {
        setTree(nodes);
        setLoading(false);
      })
      .catch(console.error);
  }, [projectId]);

  const handleToggleExpand = (nodeId: string) => {
    const newExpandedNodeIds = new Set(expandedNodeIds);
    if (newExpandedNodeIds.has(nodeId)) {
      newExpandedNodeIds.delete(nodeId);
    } else {
      newExpandedNodeIds.add(nodeId);
    }
    setExpandedNodeIds(newExpandedNodeIds);
    onToggleExpand?.(nodeId);
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (tree.length === 0) return <EmptyTreeState projectId={projectId} />;

  return (
    <div className="overflow-y-auto flex-1">
      {tree.map((node) => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          level={0}
          isExpanded={expandedNodeIds.has(node.id)}
          isSelected={selectedNodeId === node.id}
          onToggleExpand={handleToggleExpand}
          onSelectNode={onSelectNode}
        />
      ))}
    </div>
  );
}
```

### TreeNodeComponent
**Path:** `/components/PatternShop/TreeNodeComponent.tsx`

Recursive component rendering individual tree nodes.

```typescript
interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

export default function TreeNodeComponent({
  node,
  level,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelectNode,
}: TreeNodeComponentProps) {
  const levelIcon = getLevelIcon(node.level);
  const statusColor = getStatusColor(node.status);
  const paddingLeft = level * 16;

  return (
    <>
      <div
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer
          ${isSelected ? 'bg-blue-100 font-semibold' : 'hover:bg-gray-100'}
          border-l-4 ${isSelected ? 'border-blue-500' : 'border-transparent'}
        `}
        style={{ paddingLeft }}
        onClick={() => onSelectNode(node.id)}
      >
        {node.children.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}

        <div className={`${statusColor} p-1 rounded`}>
          {levelIcon}
        </div>

        <span className="text-sm text-gray-900 flex-1 truncate">{node.title}</span>
      </div>

      {isExpanded && node.children.map((child) => (
        <TreeNodeComponent
          key={child.id}
          node={child}
          level={level + 1}
          isExpanded={expandedNodeIds.has(child.id)}
          isSelected={selectedNodeId === child.id}
          onToggleExpand={onToggleExpand}
          onSelectNode={onSelectNode}
        />
      ))}
    </>
  );
}
```

### Helper Functions
**Path:** `/lib/treeHelpers.ts`

```typescript
function getLevelIcon(level: 'epic' | 'feature' | 'sub_feature' | 'task') {
  const iconProps = { size: 16, className: 'text-white' };
  switch (level) {
    case 'epic':
      return <FolderOpen {...iconProps} />;
    case 'feature':
      return <Puzzle {...iconProps} />;
    case 'sub_feature':
      return <Layers {...iconProps} />;
    case 'task':
      return <CheckCircle2 {...iconProps} />;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'not_started':
      return 'bg-gray-400';
    case 'in_progress':
      return 'bg-blue-400';
    case 'complete':
      return 'bg-green-400';
    case 'blocked':
      return 'bg-red-400';
    default:
      return 'bg-gray-300';
  }
}

function buildTreeFromFlat(nodes: FeatureNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  nodes.forEach((node) => {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parent_id) {
      const parent = nodeMap.get(node.parent_id);
      if (parent) {
        parent.children.push(treeNode);
      }
    } else {
      roots.push(treeNode);
    }
  });

  roots.forEach((root) => {
    root.children.sort((a, b) => a.position - b.position);
  });

  return roots;
}
```

## File Structure
```
components/PatternShop/
  FeatureTree.tsx          (main container)
  TreeNodeComponent.tsx    (recursive node renderer)
  EmptyTreeState.tsx       (empty state display)

lib/
  treeHelpers.ts           (utilities: buildTree, getIcon, getColor)
  api/
    featureTree.ts         (API client functions)

app/api/projects/[projectId]/
  feature-tree/
    route.ts               (GET endpoint)
```

## Acceptance Criteria
- [ ] Feature tree fetches and renders correctly for project
- [ ] Expand/collapse functionality works for all nodes with children
- [ ] Nodes indent correctly by level (0/16/32/48px)
- [ ] Level icons display correctly (folder for epic, puzzle for feature, etc.)
- [ ] Status colors display correctly (gray/blue/green/red)
- [ ] Clicking node selects it (highlighted in blue-100, bold text)
- [ ] Selected node triggers callback to load FRD in center panel
- [ ] Empty state displays when no nodes exist
- [ ] Tree scrolls independently of other panels
- [ ] Performance acceptable for 1000+ nodes (virtualization if needed)
- [ ] RLS prevents viewing nodes from projects user is not member of

## Testing Instructions

1. **Test tree fetch:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/projects/xyz/feature-tree"
   ```
   Verify response is correctly nested tree structure.

2. **Test rendering:**
   - Create test project with mix of Epics, Features, Sub-features, Tasks
   - Open Pattern Shop
   - Verify tree renders with correct hierarchical structure

3. **Test expand/collapse:**
   - Click chevron next to Epic
   - Verify children (Features) appear/disappear
   - Verify chevron icon changes (down ↔ right)

4. **Test selection:**
   - Click feature node
   - Verify node highlights in blue-100
   - Verify center panel loads that node's FRD

5. **Test icons and colors:**
   - Verify Epic shows folder icon
   - Verify Feature shows puzzle icon
   - Verify Task shows check icon
   - Verify 'complete' node is green, 'in_progress' is blue, etc.

6. **Test empty state:**
   - Create new project
   - Open Pattern Shop
   - Verify "No feature nodes yet" message appears

7. **Test performance:**
   - In database, manually insert 2000 test nodes
   - Load Pattern Shop
   - Verify tree renders without lag
   - Verify scrolling is smooth

## Dependencies
- Phase 026: Database schema
- Phase 027: Pattern Shop layout
- Phase 034: Rich text editor (for FRD display when node is selected)
