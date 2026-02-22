# Phase 032 - Feature Tree Drag-and-Drop

## Objective
Implement drag-and-drop support for feature tree nodes, allowing teams to reorder siblings and reparent nodes within valid hierarchy constraints, with visual feedback and optimistic updates.

## Prerequisites
- Feature Tree component (Phase 029)
- Add/Edit/Delete nodes (Phases 030-031)
- Pattern Shop database schema (Phase 026)
- React DnD or similar library (react-beautiful-dnd, dnd-kit, or custom implementation)

## Context
Drag-and-drop is a powerful UX pattern for reorganizing hierarchical data. Teams can quickly rearrange features within an epic or move features between epics without creating/deleting. The implementation must validate level constraints (task cannot be parent, epic cannot be child of task) and provide clear visual feedback.

## Detailed Requirements

### Drag Sources and Drop Targets

**What Can Be Dragged:**
- Any feature node (Epic, Feature, Sub-feature, Task)

**Valid Drop Targets:**
1. **Reorder within siblings:** Drop on sibling node → reorder
2. **Reparent to valid parent:** Drop on potential parent node → change parent_id
3. **Drop into empty space:** Drop in tree gap → reparent to common ancestor or root

**Invalid Drops (Validation):**
- Task cannot have children → cannot drop Feature under Task
- Epic cannot have Epic parent → cannot drop Epic under Feature
- Cannot drop node on itself or its descendants (prevent circular references)

### Visual Feedback During Drag

**Dragging State:**
1. Dragged node becomes semi-transparent (opacity 0.5)
2. Ghost image follows cursor showing dragged item

**Drop Target Highlighting:**
- Valid drop target: green highlight border (2px solid #10b981)
- Invalid drop target: red highlight border (2px solid #ef4444) + crossed cursor
- Insertion line appears above/below nodes showing where drop will occur

**Cursor:**
- Over valid drop target: grabbing cursor
- Over invalid drop target: no-drop cursor

### Reordering Within Siblings

**Behavior:**
1. Drag node A to position of node B (sibling)
2. Drop on node B
3. Show insertion line above B (or below, depending on mouse position)
4. On drop:
   - If dropped above B: A.position = B.position - 0.5 (or reorder both)
   - If dropped below B: A.position = B.position + 0.5
   - Renumber all siblings' positions to 0, 1, 2, ... sequentially
5. Tree re-renders with new positions

**Alternative Approach (Cleaner):**
- On drop, collect all siblings in new order
- Assign positions 0, 1, 2, ... based on order
- Send batch update to API

### Reparenting (Moving Between Parents)

**Behavior:**
1. Drag node A (Feature) to drop on node B (different Epic)
2. Show insertion indicator that B is the new parent
3. On drop:
   - A.parent_id = B.id
   - A.position = 0 (first child of B)
   - Siblings of B increment their positions
4. Validate level transition (cannot drop Feature on Task)

**Level Validation:**
```typescript
function isValidParent(childLevel: FeatureLevel, potentialParentLevel: FeatureLevel): boolean {
  const validParents: Record<FeatureLevel, FeatureLevel[]> = {
    epic: [], // Epic has no parent
    feature: ['epic'],
    sub_feature: ['feature'],
    task: ['sub_feature'],
  };
  return validParents[childLevel]?.includes(potentialParentLevel) ?? false;
}
```

### Circular Reference Prevention

Check that drag source is not an ancestor of drop target:

```typescript
function isAncestor(nodeId: string, potentialAncestorId: string, nodeMap: Map<string, FeatureNode>): boolean {
  let current = nodeMap.get(potentialAncestorId);
  while (current?.parent_id) {
    if (current.parent_id === nodeId) return true;
    current = nodeMap.get(current.parent_id);
  }
  return false;
}
```

### Optimistic Updates

1. Update UI immediately upon drop (optimistic update)
2. Send API request in background
3. If API fails, revert to original state + error toast
4. Show loading indicator during API call (spinner on node)

### Undo/Redo (Optional Enhancement)

For now, simple undo via 5-second toast. Defer complex undo/redo to Phase 043+.

## Database Schema
Uses Phase 026 `feature_nodes` table. No new tables.

**Columns Updated:**
- `parent_id`: FK, nullable, can be updated
- `position`: INT, can be updated to reorder

## API Routes

### PUT /api/projects/[projectId]/feature-nodes/bulk-reorder
Batch reorder/reparent nodes (optimized for drag-drop).

**Body:**
```json
{
  "moves": [
    {
      "nodeId": "feature-1",
      "newParentId": "epic-2",
      "newPosition": 1
    },
    {
      "nodeId": "feature-2",
      "newParentId": "epic-2",
      "newPosition": 2
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "updated": 2,
  "moves": [
    {
      "nodeId": "feature-1",
      "newParentId": "epic-2",
      "newPosition": 1
    }
  ]
}
```

**Logic:**
1. Validate all moves for circular references and level constraints
2. Group moves by parent to reorder correctly
3. UPDATE each node's parent_id and position
4. Return success or error with failed moves

**Error Responses:**
- 400 Bad Request: Invalid moves (circular ref, level mismatch)
- 409 Conflict: Node was modified since drag started (optimistic lock)

### PUT /api/projects/[projectId]/feature-nodes/[nodeId]/move
Single node move (simpler alternative to bulk).

**Body:**
```json
{
  "parentId": "epic-2",
  "position": 1
}
```

**Response (200 OK):**
```json
{
  "id": "feature-1",
  "parentId": "epic-2",
  "position": 1
}
```

## UI Components

### DragDropContext
**Path:** `/components/PatternShop/DragDropContext.tsx`

Wraps tree in drag-drop provider (using react-beautiful-dnd or dnd-kit).

```typescript
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

export function DragDropProvider({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    // Handle drop logic
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
```

### DraggableTreeNode
**Path:** `/components/PatternShop/DraggableTreeNode.tsx`

Tree node wrapper with drag/drop handlers.

```typescript
import { useDraggable } from '@dnd-kit/core';

interface DraggableTreeNodeProps {
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

export function DraggableTreeNode({
  node,
  level,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelectNode,
}: DraggableTreeNodeProps) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: node.id,
    data: { node },
  });

  const style = transform ? {
    opacity: isDragging ? 0.5 : 1,
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : {};

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Tree node content */}
    </div>
  );
}
```

### DroppableNodeArea
**Path:** `/components/PatternShop/DroppableNodeArea.tsx`

Drop zone for parent nodes.

```typescript
import { useDroppable } from '@dnd-kit/core';

interface DroppableNodeAreaProps {
  node: TreeNode;
  children: ReactNode;
}

export function DroppableNodeArea({ node, children }: DroppableNodeAreaProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `drop-${node.id}`,
    data: { nodeId: node.id, type: 'parent' },
  });

  const canDrop = validateDrop(active?.data?.node, node); // Validate level constraints

  return (
    <div
      ref={setNodeRef}
      className={`
        relative transition-colors
        ${isOver && canDrop ? 'bg-green-50 border-2 border-green-500' : ''}
        ${isOver && !canDrop ? 'border-2 border-red-500' : ''}
      `}
    >
      {children}
    </div>
  );
}
```

### Updated FeatureTree Component
**Path:** `/components/PatternShop/FeatureTree.tsx` (updated)

Integrate drag-drop context and reorder/reparent logic.

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const draggedNode = tree.find((n) => n.id === active.id);
  const targetNode = tree.find((n) => n.id === over.id);

  if (!draggedNode || !targetNode) return;

  // Validate move
  if (!isValidParent(draggedNode.level, targetNode.level)) {
    toast.error('Invalid move: cannot drop here');
    return;
  }

  if (isAncestor(draggedNode.id, targetNode.id, nodeMap)) {
    toast.error('Cannot move node to its own descendant');
    return;
  }

  // Optimistic update
  const previousState = tree;
  try {
    setTree(applyMove(tree, draggedNode.id, targetNode.id));

    // API call
    await moveNode(projectId, draggedNode.id, {
      parentId: targetNode.id,
      position: 0,
    });

    showToast('Node moved', { action: { label: 'Undo', onClick: () => setTree(previousState) } });
  } catch (error) {
    setTree(previousState);
    toast.error('Failed to move node');
  }
};
```

## File Structure
```
components/PatternShop/
  FeatureTree.tsx              (updated with drag-drop)
  DragDropContext.tsx          (provider)
  DraggableTreeNode.tsx        (draggable node)
  DroppableNodeArea.tsx        (drop zone)
  DropIndicator.tsx            (visual feedback line)

lib/
  dragDrop/
    validation.ts              (isValidParent, isAncestor, etc.)
    reorder.ts                 (apply moves to tree state)
  api/
    featureNodes.ts            (bulk-reorder endpoint)
```

## Acceptance Criteria
- [ ] Nodes can be dragged (semi-transparent, ghost image follows cursor)
- [ ] Dragging over valid drop target shows green highlight
- [ ] Dragging over invalid target shows red highlight with no-drop cursor
- [ ] Dropping on sibling reorders them (positions 0, 1, 2...)
- [ ] Dropping on parent reparents node (changes parent_id)
- [ ] Cannot drop node on itself or descendants (circular ref prevented)
- [ ] Cannot drop Feature on Task (level validation)
- [ ] Cannot drop Epic on Feature (level validation)
- [ ] Optimistic update (tree re-renders immediately)
- [ ] API call in background
- [ ] On API failure, revert to original state
- [ ] Toast shows "Node moved" with undo button
- [ ] Undo works (reverts move for 5 seconds)

## Testing Instructions

1. **Test reorder siblings:**
   - Drag Feature A to position of Feature B (same Epic)
   - Drop
   - Verify order changes and positions are 0, 1, 2

2. **Test reparent:**
   - Create 2 Epics with Features
   - Drag Feature from Epic 1 to Epic 2
   - Verify Feature appears under Epic 2

3. **Test invalid moves:**
   - Try to drag Feature onto Task node
   - Verify red highlight and move fails

4. **Test circular reference prevention:**
   - Try to drag Epic onto its own Feature
   - Verify move is rejected

5. **Test optimistic update:**
   - Drag node (observe immediate UI update)
   - Wait for API call
   - Verify tree reflects API response

6. **Test undo:**
   - Move node
   - Click "Undo" in toast
   - Verify move is reverted

7. **Stress test:**
   - Drag 10 nodes rapidly
   - Verify no crashes, correct final state

## Dependencies
- Phase 026: Database schema
- Phase 029: Feature tree component
- Phase 030-031: Add/edit/delete nodes
