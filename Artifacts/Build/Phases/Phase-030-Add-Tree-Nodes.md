# Phase 030 - Add Nodes to Feature Tree

## Objective
Enable teams to create new feature nodes (Epic, Feature, Sub-feature, Task) via UI affordances including "+" buttons, right-click context menus, and inline title editing for new nodes.

## Prerequisites
- Feature Tree component (Phase 029)
- Pattern Shop database schema (Phase 026)
- Lucide icons for UI

## Context
Creating nodes is the primary action teams take in The Pattern Shop. The UX must be fast and intuitive, supporting two workflows:
1. **Quick creation:** Click "+" button next to a node to add a child
2. **Contextual creation:** Right-click node for context menu with "Add Child", "Add Sibling" options

New nodes start with an editable title field (inline edit mode) to streamline creation. The level is auto-determined by parent (epic children are features, feature children are sub-features, etc.).

## Detailed Requirements

### Add Child via "+" Button

**Trigger:**
- Small "+" button appears on hover next to each node in tree (or in toolbar for selected node)
- Position: right of node title, before status badge

**Behavior:**
1. Click "+" button
2. New node is inserted as last child of clicked node
3. New node's level is auto-calculated (parent is epic → new node is feature, etc.)
4. New node enters edit mode (see "Inline Title Editing" below)
5. Node persists to database immediately (with empty title initially)
6. Tree re-renders with new node
7. Focus moves to title input field

**Styling:**
- Button: transparent background, hover:bg-gray-200, p-1, rounded
- Icon: Plus icon (16px) from Lucide, text-gray-500 hover:text-gray-700

### Add Sibling via Context Menu

**Trigger:**
- Right-click (or long-press on mobile) any node to open context menu

**Menu Items:**
1. **Add Child** - creates child node
2. **Add Sibling** - creates sibling node at same level
3. **Edit** - enters edit mode (see Phase 031)
4. **Delete** - soft-deletes node (see Phase 031)
5. **Change Level** - promotes/demotes node (see Phase 031)

**Context Menu Styling (Radix UI or Headless UI):**
- Background: white, border: 1px solid gray-200, shadow: md, border-radius: 6px
- Padding: 4px 0
- Menu items: 8px padding, hover:bg-gray-100, text-sm text-gray-900
- Keyboard navigation (arrow keys, enter to select)
- Dismiss on click outside or Escape key

### Auto-Calculate Level

When adding a node, determine its level based on parent:
```typescript
function getChildLevel(parentLevel: FeatureLevel): FeatureLevel {
  switch (parentLevel) {
    case 'epic':
      return 'feature';
    case 'feature':
      return 'sub_feature';
    case 'sub_feature':
      return 'task';
    case 'task':
      // Task cannot have children
      return null;
  }
}
```

**Rule:** Task-level nodes cannot have children. If user attempts to add child to Task, show error toast: "Tasks cannot have child nodes."

### Inline Title Editing

When new node is created or during edit mode:
1. Node title field becomes active text input
2. Input autofocuses
3. Placeholder text: "(Untitled Node)" or similar
4. On Enter key: save title, exit edit mode, refresh tree
5. On Escape key: cancel edit, if node has no title, delete node
6. On blur (click outside): save title automatically

**Input Styling:**
```css
input {
  background: white;
  border: 2px solid #3b82f6 (blue-500);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  outline: none;
}
input:focus {
  border-color: #1e40af (blue-700);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### Position Auto-Calculation

New node's `position` field is auto-calculated:
1. Query max position of current siblings: `MAX(position) WHERE parent_id = X`
2. New node position = max + 1 (or 0 if no siblings)
3. This preserves insertion order without manual renumbering

### Top-Level Node Creation

When adding Epic (no parent):
- Show "Add Epic" button or menu item at top of tree
- parent_id = NULL
- position = MAX(position where parent_id IS NULL) + 1

### Data Validation

Before creating node:
- Title must not be empty (user must enter at least 1 character)
- Level must match parent's child level
- Parent node must exist
- Project must exist and user must have edit permission

**Error Messages (Toast notifications):**
- "Title is required"
- "Invalid node level for parent"
- "Task nodes cannot have children"
- "You don't have permission to create nodes in this project"

## Database Schema
Uses Phase 026 `feature_nodes` table. No new tables.

## API Routes

### POST /api/projects/[projectId]/feature-nodes
Create a new feature node.

**Body:**
```json
{
  "title": "User Authentication",
  "description": "Optional description",
  "level": "epic",
  "parentId": null,
  "position": 0
}
```

**Alternative (auto-calculate level):**
```json
{
  "title": "Email Sign-up",
  "parentId": "epic-1",
  "position": null
}
```

**Response (201 Created):**
```json
{
  "id": "feature-1",
  "project_id": "xyz",
  "parent_id": "epic-1",
  "title": "Email Sign-up",
  "level": "feature",
  "status": "not_started",
  "position": 2,
  "created_by": "user-uuid",
  "created_at": "2025-02-20T12:00:00Z",
  "updated_at": "2025-02-20T12:00:00Z"
}
```

**Error Responses:**
- 400 Bad Request: Title required, invalid level, etc.
- 403 Forbidden: User lacks edit permission
- 404 Not Found: Parent node or project not found

**Logic:**
1. Validate title is not empty
2. If parentId provided, fetch parent and verify level progression
3. Auto-calculate level if not provided
4. Calculate position as MAX(siblings.position) + 1
5. Insert into feature_nodes
6. Return created node
7. Trigger cache invalidation for GET feature-tree

### GET /api/projects/[projectId]/feature-nodes?parentId=[parentId]
Fetch child nodes of a specific parent (optional, for incremental loading).

**Response:**
```json
{
  "nodes": [
    {
      "id": "feature-1",
      "title": "Email Sign-up",
      "level": "feature",
      "status": "in_progress",
      "position": 0,
      "children": []
    }
  ]
}
```

## UI Components

### AddNodeButton Component
**Path:** `/components/PatternShop/AddNodeButton.tsx`

Renders the "+" button that appears on node hover.

```typescript
interface AddNodeButtonProps {
  nodeId: string;
  parentLevel: FeatureLevel;
  onAddChild: (parentId: string) => void;
}

export default function AddNodeButton({
  nodeId,
  parentLevel,
  onAddChild,
}: AddNodeButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Validate: Task cannot have children
    if (parentLevel === 'task') {
      toast.error('Tasks cannot have child nodes.');
      return;
    }

    onAddChild(nodeId);
  };

  return (
    <button
      onClick={handleClick}
      className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
      title="Add child node"
    >
      <Plus size={16} />
    </button>
  );
}
```

### ContextMenu Component
**Path:** `/components/PatternShop/NodeContextMenu.tsx`

Renders the right-click context menu for tree nodes. Use Radix UI Dropdown or Headless UI Menu.

```typescript
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface NodeContextMenuProps {
  nodeId: string;
  nodeLevel: FeatureLevel;
  onAddChild: (parentId: string) => void;
  onAddSibling: (nodeId: string) => void;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onChangeLevel: (nodeId: string) => void;
  children: ReactNode;
}

export default function NodeContextMenu({
  nodeId,
  nodeLevel,
  onAddChild,
  onAddSibling,
  onEdit,
  onDelete,
  onChangeLevel,
  children,
}: NodeContextMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {children}
      </DropdownMenu.Trigger>

      <DropdownMenu.Content className="w-48">
        <DropdownMenu.Item onClick={() => onAddChild(nodeId)}>
          Add Child
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onAddSibling(nodeId)}>
          Add Sibling
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onClick={() => onEdit(nodeId)}>
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => onChangeLevel(nodeId)}>
          Change Level
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onClick={() => onDelete(nodeId)} className="text-red-600">
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
```

### TreeNodeComponent Update
**Modify:** `/components/PatternShop/TreeNodeComponent.tsx`

Add hover state showing "+" button and wrapping node in context menu:

```typescript
const [isHovering, setIsHovering] = useState(false);

return (
  <NodeContextMenu nodeId={node.id} nodeLevel={node.level} {...handlers}>
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        // Context menu opens automatically via Radix
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100">
        {/* ... existing content ... */}
        {isHovering && <AddNodeButton nodeId={node.id} parentLevel={node.level} onAddChild={onAddChild} />}
      </div>
    </div>
  </NodeContextMenu>
);
```

## File Structure
```
components/PatternShop/
  AddNodeButton.tsx         (+ button)
  NodeContextMenu.tsx       (right-click menu)
  TreeNodeComponent.tsx     (updated to include above)
  InlineTitleEditor.tsx     (inline edit component)

lib/
  api/
    featureNodes.ts         (API client)

app/api/projects/[projectId]/
  feature-nodes/
    route.ts                (POST endpoint)
```

## Acceptance Criteria
- [ ] "+" button appears on node hover
- [ ] Clicking "+" button creates new child node with next sequential position
- [ ] Right-click context menu appears with Add Child, Add Sibling, Edit, Delete, Change Level
- [ ] New node enters inline edit mode with autofocus on title input
- [ ] Pressing Enter saves title and exits edit mode
- [ ] Pressing Escape cancels (and deletes if empty)
- [ ] Blur saves title automatically
- [ ] Level auto-calculated based on parent level
- [ ] Task nodes cannot have children (error toast shown)
- [ ] POST /api/projects/[projectId]/feature-nodes creates node and returns 201
- [ ] Position auto-calculated and sequential within siblings
- [ ] Tree re-renders and new node appears at correct position
- [ ] Error messages display for validation failures

## Testing Instructions

1. **Test "+" button:**
   - Hover over Epic node
   - Verify "+" button appears on right
   - Click "+"
   - Verify new Feature node is created and enters edit mode

2. **Test context menu:**
   - Right-click Feature node
   - Verify menu appears with 5 items
   - Click "Add Sibling"
   - Verify new node created at same level, different position

3. **Test level auto-calculation:**
   - Add child to Epic → should be Feature
   - Add child to Feature → should be Sub-feature
   - Add child to Sub-feature → should be Task
   - Attempt to add child to Task → should show error

4. **Test inline editing:**
   - Add new node (auto-enters edit mode)
   - Type "Email Verification"
   - Press Enter
   - Verify title is saved and node exits edit mode

5. **Test position:**
   - Add 3 Features to same Epic
   - Verify positions are 0, 1, 2
   - Verify they appear in order in tree

6. **Test API:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"title": "New Feature", "parentId": "epic-1"}' \
     "http://localhost:3000/api/projects/xyz/feature-nodes"
   ```
   Verify 201 response with created node.

7. **Test permissions:**
   - Sign in as viewer (read-only)
   - Try to add node
   - Verify 403 error

## Dependencies
- Phase 026: Database schema
- Phase 029: Feature tree component (to be updated)
