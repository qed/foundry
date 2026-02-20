# Phase 031 - Edit & Delete Tree Nodes

## Objective
Enable teams to modify existing feature nodes by editing titles, deleting nodes with proper confirmation and conflict resolution, and changing node levels (promoting/demoting in hierarchy).

## Prerequisites
- Add Nodes to Feature Tree (Phase 030)
- Feature Tree component (Phase 029)
- Pattern Shop database schema (Phase 026)

## Context
Beyond creating nodes, teams need to refine them. This phase adds edit and delete capabilities with UX safety measures. Deletion is soft (sets deleted_at timestamp, hides from view) to preserve history. Level changes allow re-categorization without deleting nodes.

## Detailed Requirements

### Edit Node Title

**Trigger:**
1. Double-click node title in tree
2. Right-click context menu → "Edit"
3. Selected node toolbar → "Edit" button (Phase 034+)

**Behavior:**
1. Node enters inline edit mode (same as Phase 030)
2. Current title appears in input field
3. Input autofocuses, text selected
4. On Enter: save new title, exit edit mode
5. On Escape: cancel edit, revert to original title
6. On blur: save new title automatically

**Validation:**
- Title must not be empty
- Title must not exceed 255 characters
- Title can contain any characters (no special validation)

**Optimistic Update:**
- Update UI immediately upon Enter/blur
- Send API request in background
- If API fails, revert UI change and show error toast

### Edit Node Description

(Optional enhancement for later)

The description field is stored in database but not editable in this phase. Defer to Phase 034+.

### Delete Node (Soft Delete)

**Trigger:**
1. Right-click context menu → "Delete"
2. Selected node toolbar → "Delete" button

**Confirmation Dialog:**
Shows when user initiates delete.

**Content:**
```
Confirm Deletion

Are you sure you want to delete "{node.title}"?

- [x] Delete this node only (children become orphaned)
- [ ] Delete entire subtree (node and all children)
- [ ] Reparent children to parent (move children up one level)

[Cancel] [Delete]
```

**Options Explanation:**
1. **Delete only:** Node deleted, children remain but lose parent (moved to root or shown as disconnected)
2. **Delete subtree:** Node and all descendants permanently marked deleted
3. **Reparent children:** Node deleted, but each child's parent_id changed to this node's parent_id (move children up)

**Default:** Option 1 selected (delete only)

**Behavior:**
1. User selects option
2. Clicks "Delete"
3. SET deleted_at = NOW() on feature_node
4. If reparent: UPDATE children SET parent_id = deleted_node.parent_id WHERE parent_id = deleted_node_id
5. Tree re-renders, deleted node disappears
6. Show toast: "Node deleted"
7. Undo option available for 10 seconds

### Undo Delete

For 10 seconds after deletion:
- Toast message shows: "Node deleted" with "Undo" button
- Clicking "Undo" calls DELETE endpoint to soft-undelete node (SET deleted_at = NULL)
- If 10 seconds pass without undo, toast disappears
- After undo expires, manual restoration requires database query

**Implementation:**
```typescript
const [lastDeletedNode, setLastDeletedNode] = useState<string | null>(null);

useEffect(() => {
  if (!lastDeletedNode) return;
  const timer = setTimeout(() => setLastDeletedNode(null), 10000);
  return () => clearTimeout(timer);
}, [lastDeletedNode]);

// In delete handler:
await deleteNode(nodeId, option);
setLastDeletedNode(nodeId);
showToast('Node deleted', {
  action: { label: 'Undo', onClick: () => undoDelete(nodeId) },
});
```

### Change Node Level (Promote/Demote)

**Trigger:**
1. Right-click context menu → "Change Level"
2. Selected node toolbar → "Change Level" dropdown

**Dialog/Dropdown:**
Shows available levels:
- Current level is highlighted/disabled
- Disabled options shown grayed out (invalid transitions)

**Valid Transitions:**
- Epic → Feature (move all children down one level automatically)
- Feature → Epic OR Sub-feature (with children level adjustment)
- Sub-feature → Feature OR Task
- Task → Sub-feature

**Rules:**
1. Cannot promote Task to Feature (level jump too large)
2. Cannot demote Epic to Sub-feature (level drop too large)
3. When changing level, all children's levels auto-adjust proportionally
4. Example: promote Feature to Epic → all its Features become Features, all Sub-features become Features

**Behavior:**
1. User selects new level from dropdown
2. Confirm: "Changing {title} from Feature to Epic will change X children's levels. Continue?"
3. If confirmed:
   - UPDATE feature_node SET level = new_level WHERE id = node_id
   - For each child, recursively UPDATE level
4. Tree re-renders with new levels and icons
5. Show toast: "Node level changed"

**Error Handling:**
- If children cannot be re-leveled (e.g., task has grandchildren), show error: "Cannot change level: Task nodes must not have children. Delete child nodes first."

## Database Schema
Uses Phase 026 `feature_nodes` table. No new tables.

**Updated Constraint:**
- Soft delete by setting deleted_at timestamp
- Queries should filter: WHERE deleted_at IS NULL
- Index: idx_feature_nodes_deleted_at

## API Routes

### PUT /api/projects/[projectId]/feature-nodes/[nodeId]
Update a feature node.

**Body (title only):**
```json
{
  "title": "Updated Title"
}
```

**Body (level change):**
```json
{
  "level": "feature"
}
```

**Response (200 OK):**
```json
{
  "id": "feature-1",
  "title": "Updated Title",
  "level": "feature",
  "updated_at": "2025-02-20T12:05:00Z"
}
```

**Error Responses:**
- 400 Bad Request: Invalid level transition, title too long, etc.
- 403 Forbidden: User lacks edit permission
- 404 Not Found: Node not found

**Logic:**
1. Validate new values
2. If level change: calculate child level adjustments, validate no invalid states
3. UPDATE feature_nodes SET ... WHERE id = node_id
4. Return updated node

### DELETE /api/projects/[projectId]/feature-nodes/[nodeId]
Soft-delete a feature node.

**Query Parameters:**
- `deleteOption` (enum: 'delete_only', 'delete_subtree', 'reparent_children'): How to handle children

**Body:**
```json
{
  "deleteOption": "delete_only"
}
```

**Response (200 OK):**
```json
{
  "id": "feature-1",
  "deleted_at": "2025-02-20T12:05:00Z",
  "childrenDeleted": 0,
  "childrenReparented": 0
}
```

**Logic:**
1. Validate user has edit permission
2. If deleteOption = 'delete_only': SET deleted_at = NOW() on node only
3. If deleteOption = 'delete_subtree': SET deleted_at = NOW() on node and all descendants (recursive query)
4. If deleteOption = 'reparent_children': SET deleted_at = NOW() on node; UPDATE children SET parent_id = node.parent_id WHERE parent_id = node_id
5. Return confirmation with counts

### POST /api/projects/[projectId]/feature-nodes/[nodeId]/restore
Restore a soft-deleted node (undo delete).

**Response (200 OK):**
```json
{
  "id": "feature-1",
  "deleted_at": null,
  "restored_at": "2025-02-20T12:06:00Z"
}
```

**Logic:**
1. Validate node was deleted (deleted_at IS NOT NULL)
2. SET deleted_at = NULL WHERE id = node_id
3. Return restored node

## UI Components

### EditNodeDialog Component
**Path:** `/components/PatternShop/EditNodeDialog.tsx`

Modal dialog for editing node title.

```typescript
interface EditNodeDialogProps {
  nodeId: string;
  currentTitle: string;
  open: boolean;
  onClose: () => void;
  onSave: (nodeId: string, newTitle: string) => Promise<void>;
}

export default function EditNodeDialog({
  nodeId,
  currentTitle,
  open,
  onClose,
  onSave,
}: EditNodeDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setLoading(true);
    try {
      await onSave(nodeId, title.trim());
      onClose();
    } catch (error) {
      toast.error('Failed to save node');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Node Title</DialogTitle>
        </DialogHeader>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Node title"
          className="w-full px-3 py-2 border border-gray-300 rounded"
          autoFocus
        />
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### DeleteNodeDialog Component
**Path:** `/components/PatternShop/DeleteNodeDialog.tsx`

Modal with delete confirmation and option selection.

```typescript
interface DeleteNodeDialogProps {
  nodeId: string;
  nodeTitle: string;
  childCount: number;
  open: boolean;
  onClose: () => void;
  onConfirm: (nodeId: string, option: DeleteOption) => Promise<void>;
}

type DeleteOption = 'delete_only' | 'delete_subtree' | 'reparent_children';

export default function DeleteNodeDialog({
  nodeId,
  nodeTitle,
  childCount,
  open,
  onClose,
  onConfirm,
}: DeleteNodeDialogProps) {
  const [selectedOption, setSelectedOption] = useState<DeleteOption>('delete_only');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(nodeId, selectedOption);
      onClose();
    } catch (error) {
      toast.error('Failed to delete node');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
        </DialogHeader>
        <p className="text-gray-700 mb-4">
          Are you sure you want to delete <strong>"{nodeTitle}"</strong>?
        </p>
        {childCount > 0 && (
          <>
            <p className="text-sm text-gray-600 mb-4">This node has {childCount} child node(s).</p>
            <fieldset className="space-y-3 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="delete_only"
                  checked={selectedOption === 'delete_only'}
                  onChange={(e) => setSelectedOption(e.target.value as DeleteOption)}
                />
                <span className="text-sm">Delete this node only (children become orphaned)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="delete_subtree"
                  checked={selectedOption === 'delete_subtree'}
                  onChange={(e) => setSelectedOption(e.target.value as DeleteOption)}
                />
                <span className="text-sm">Delete entire subtree (node and all {childCount} children)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="reparent_children"
                  checked={selectedOption === 'reparent_children'}
                  onChange={(e) => setSelectedOption(e.target.value as DeleteOption)}
                />
                <span className="text-sm">Reparent children (move {childCount} children up one level)</span>
              </label>
            </fieldset>
          </>
        )}
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### ChangeLevelDialog Component
**Path:** `/components/PatternShop/ChangeLevelDialog.tsx`

Modal for level changes with validation.

## File Structure
```
components/PatternShop/
  EditNodeDialog.tsx         (edit title modal)
  DeleteNodeDialog.tsx       (delete confirmation modal)
  ChangeLevelDialog.tsx      (level change modal)
  TreeNodeComponent.tsx      (updated with delete, edit triggers)

lib/
  api/
    featureNodes.ts          (PUT, DELETE, POST endpoints)

app/api/projects/[projectId]/
  feature-nodes/[nodeId]/
    route.ts                 (PUT, DELETE endpoints)
    restore/
      route.ts               (POST restore endpoint)
```

## Acceptance Criteria
- [ ] Double-click node title enters inline edit mode
- [ ] Pressing Enter saves title to database
- [ ] Pressing Escape cancels edit without saving
- [ ] Invalid titles (empty, too long) show validation error
- [ ] Right-click "Delete" opens confirmation dialog
- [ ] Delete dialog shows 3 options: delete only, delete subtree, reparent children
- [ ] Deleting with "delete only" soft-deletes node only
- [ ] Deleting with "delete subtree" soft-deletes node and descendants
- [ ] Deleting with "reparent children" soft-deletes node and moves children to parent
- [ ] Toast shows "Node deleted" with 10-second undo window
- [ ] Undo button restores node (sets deleted_at = NULL)
- [ ] Right-click "Change Level" opens level change dialog
- [ ] Level change validates transitions (no epic → task jump)
- [ ] Level change auto-adjusts children's levels
- [ ] Tree re-renders after all operations
- [ ] All operations return 200/201 from API

## Testing Instructions

1. **Test edit title:**
   - Double-click node title
   - Edit text and press Enter
   - Verify title updates in database

2. **Test delete with options:**
   - Create Epic with 2 Features, 1 Feature with 2 Sub-features
   - Right-click Feature, select Delete
   - Try each option (delete only, subtree, reparent)
   - Verify tree reflects chosen option

3. **Test undo:**
   - Delete a node
   - Click "Undo" in toast within 10 seconds
   - Verify node is restored

4. **Test level change:**
   - Create Feature with Sub-features
   - Right-click Feature, select "Change Level"
   - Promote to Epic
   - Verify Feature becomes Epic and Sub-features become Features

5. **Test API:**
   ```bash
   curl -X PUT -H "Content-Type: application/json" \
     -d '{"title": "New Title"}' \
     "http://localhost:3000/api/projects/xyz/feature-nodes/node-id"
   ```

## Dependencies
- Phase 026: Database schema
- Phase 029: Feature tree component
- Phase 030: Add nodes (context menu)
