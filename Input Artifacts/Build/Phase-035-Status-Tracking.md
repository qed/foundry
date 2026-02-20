# Phase 035 - Feature Tree Status Tracking

## Objective
Implement status tracking for feature nodes with automatic propagation of status from children to parents, visual progress indicators, and activity logging for status changes.

## Prerequisites
- Feature Tree component (Phase 029)
- Feature node CRUD operations (Phases 030-031)
- Pattern Shop database schema (Phase 026)

## Context
Status tracking provides visibility into feature decomposition progress. Each node has a status (not_started, in_progress, complete, blocked). Parent nodes automatically calculate their status based on their children's statuses, enabling high-level progress tracking without manual updates. Status changes are logged for audit trails.

## Detailed Requirements

### Status Values

Each feature node has a `status` field (ENUM):
- `not_started`: Work has not begun
- `in_progress`: Work is actively happening
- `complete`: Work is finished
- `blocked`: Work is halted due to dependency or issue

### Manual Status Changes

**Trigger:**
- Click status dropdown on node (in tree or in toolbar)
- Select new status from list

**UI:**
- Dropdown appears inline in tree node or in center panel toolbar
- Current status is highlighted/selected
- Clicking option updates immediately (optimistic update)

**Styling:**
```
Status Dropdown:
┌─────────────────────┐
│ ○ Not Started       │ (gray)
│ ◉ In Progress       │ (blue, currently selected)
│ ○ Complete          │ (green)
│ ○ Blocked           │ (red)
└─────────────────────┘
```

### Automatic Status Propagation

**Rule:**
Parent node's status is auto-calculated from children's statuses:

1. **If all children are `complete`:** parent → `complete`
2. **Else if any child is `blocked`:** parent → `blocked`
3. **Else if any child is `in_progress`:** parent → `in_progress`
4. **Else:** parent → `not_started`

**Implementation:**
```typescript
function calculateParentStatus(childStatuses: FeatureStatus[]): FeatureStatus {
  if (childStatuses.length === 0) return 'not_started';

  const allComplete = childStatuses.every((s) => s === 'complete');
  if (allComplete) return 'complete';

  const anyBlocked = childStatuses.some((s) => s === 'blocked');
  if (anyBlocked) return 'blocked';

  const anyInProgress = childStatuses.some((s) => s === 'in_progress');
  if (anyInProgress) return 'in_progress';

  return 'not_started';
}
```

**Trigger for Recalculation:**
- When child node's status changes
- After bulk operations (drag-drop, delete)
- Recalculate entire ancestor chain (child updates parent, parent updates grandparent, etc.)

**Cascade Update:**
```typescript
async function updateNodeStatus(nodeId: string, newStatus: FeatureStatus, projectId: string) {
  // Update the node
  await updateNode(projectId, nodeId, { status: newStatus });

  // Cascade: recalculate ancestor statuses
  let currentNode = await getNode(projectId, nodeId);
  while (currentNode.parent_id) {
    const parent = await getNode(projectId, currentNode.parent_id);
    const siblings = await getChildren(projectId, parent.id);
    const newParentStatus = calculateParentStatus(siblings.map((s) => s.status));

    if (parent.status !== newParentStatus) {
      await updateNode(projectId, parent.id, { status: newParentStatus });
      currentNode = parent;
    } else {
      break; // No further changes needed up the chain
    }
  }
}
```

### Progress Visualization

**On Parent Nodes:**
- Show progress bar displaying % of children that are complete
- Progress value: `(complete_count / total_children_count) * 100`
- Hover to see breakdown: "3 of 5 complete (60%)"

**Progress Bar Styling:**
```css
.progress-bar {
  height: 4px;
  background: #e5e7eb (gray-200);
  border-radius: 2px;
  overflow: hidden;
}
.progress-bar-fill {
  background: linear-gradient(to right, #10b981 (green), #3b82f6 (blue));
  height: 100%;
  transition: width 0.3s ease;
}
```

**Display Location:**
- Below node title in tree (when node has children)
- Show only if node is expanded

**Example:**
```
▼ User Authentication (Epic)
  ████░░░░░░ 40% (4 of 10 complete)
  ├─ Email Sign-up (Feature)
  ├─ Password Reset (Feature)
  └─ ...
```

### Status Color Coding

Reuse colors from Phase 029:
- `not_started`: gray-400 (#9ca3af)
- `in_progress`: blue-400 (#60a5fa)
- `complete`: green-400 (#4ade80)
- `blocked`: red-400 (#f87171)

Status badge appears as small colored dot next to node title.

### Activity Logging

When a node's status changes, create an activity entry (optional, Phase 043+ for full implementation):

**Activity Entry Fields:**
- `activity_id` (UUID)
- `project_id` (FK)
- `node_id` (FK to feature_nodes)
- `user_id` (FK to auth.users)
- `action` (enum: 'status_change', 'created', 'deleted', etc.)
- `old_value` (previous status)
- `new_value` (new status)
- `timestamp` (TIMESTAMP WITH TIME ZONE)

**For Phase 035:**
- Log to console or optional activity table
- Defer persistent logging to Phase 043

## Database Schema

Uses Phase 026 schema. Column exists:
- `feature_nodes.status` (ENUM: not_started, in_progress, complete, blocked)

**Optional Activity Table (Phase 043+):**
```sql
CREATE TABLE IF NOT EXISTS node_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES feature_nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_node_activities_node_id ON node_activities(node_id);
CREATE INDEX idx_node_activities_project_id ON node_activities(project_id);
```

## API Routes

### PUT /api/projects/[projectId]/feature-nodes/[nodeId]/status
Update a node's status.

**Body:**
```json
{
  "status": "in_progress"
}
```

**Response (200 OK):**
```json
{
  "id": "feature-1",
  "status": "in_progress",
  "updated_at": "2025-02-20T12:00:00Z",
  "parentStatusUpdated": true,
  "parentNewStatus": "in_progress"
}
```

**Logic:**
1. Validate new status is valid enum value
2. UPDATE feature_nodes SET status = ?, updated_at = NOW() WHERE id = ? AND project_id = ?
3. If successful, check if node has parent
4. If parent exists, recalculate parent status
5. Cascade up the tree if parent status changed
6. Log activity entry
7. Return updated node and cascade info

**Error Responses:**
- 400 Bad Request: Invalid status value
- 404 Not Found: Node not found
- 403 Forbidden: User lacks edit permission

### GET /api/projects/[projectId]/feature-nodes/[nodeId]/progress
Get progress metrics for a node.

**Response (200 OK):**
```json
{
  "nodeId": "epic-1",
  "totalChildren": 5,
  "completeChildren": 2,
  "inProgressChildren": 2,
  "blockedChildren": 0,
  "notStartedChildren": 1,
  "completionPercent": 40,
  "statusBreakdown": {
    "not_started": 1,
    "in_progress": 2,
    "complete": 2,
    "blocked": 0
  }
}
```

## UI Components

### StatusDropdown Component
**Path:** `/components/PatternShop/StatusDropdown.tsx`

Inline status selector.

```typescript
interface StatusDropdownProps {
  status: FeatureStatus;
  nodeId: string;
  projectId: string;
  onStatusChange: (status: FeatureStatus) => void;
  readOnly?: boolean;
}

export default function StatusDropdown({
  status,
  nodeId,
  projectId,
  onStatusChange,
  readOnly = false,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: FeatureStatus) => {
    if (readOnly || newStatus === status) return;

    setLoading(true);
    try {
      await updateNodeStatus(projectId, nodeId, newStatus);
      onStatusChange(newStatus);
      setOpen(false);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions: { value: FeatureStatus; label: string; color: string }[] = [
    { value: 'not_started', label: 'Not Started', color: 'bg-gray-400' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-400' },
    { value: 'complete', label: 'Complete', color: 'bg-green-400' },
    { value: 'blocked', label: 'Blocked', color: 'bg-red-400' },
  ];

  const currentOption = statusOptions.find((opt) => opt.value === status);

  return (
    <div className="relative">
      <button
        onClick={() => !readOnly && setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1 rounded border ${
          readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100'
        }`}
        disabled={readOnly || loading}
      >
        <span className={`w-3 h-3 rounded-full ${currentOption?.color}`} />
        <span className="text-sm">{currentOption?.label}</span>
      </button>

      {open && !readOnly && (
        <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 w-40">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <input
                type="radio"
                checked={status === option.value}
                readOnly
              />
              <span className={`w-3 h-3 rounded-full ${option.color}`} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### ProgressBar Component
**Path:** `/components/PatternShop/ProgressBar.tsx`

Visual progress indicator for parent nodes.

```typescript
interface ProgressBarProps {
  totalChildren: number;
  completeChildren: number;
}

export default function ProgressBar({
  totalChildren,
  completeChildren,
}: ProgressBarProps) {
  const percent = totalChildren > 0 ? (completeChildren / totalChildren) * 100 : 0;

  return (
    <div className="group relative">
      <div className="h-1 bg-gray-200 rounded overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
        {completeChildren} of {totalChildren} complete ({Math.round(percent)}%)
      </div>
    </div>
  );
}
```

### Updated TreeNodeComponent
**Path:** `/components/PatternShop/TreeNodeComponent.tsx` (updated)

Integrate status dropdown and progress bar.

```typescript
export default function TreeNodeComponent({
  node,
  level,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelectNode,
}) {
  const [childrenStats, setChildrenStats] = useState<ProgressStats | null>(null);

  useEffect(() => {
    if (isExpanded && node.children.length > 0) {
      fetchProgress(projectId, node.id).then(setChildrenStats);
    }
  }, [isExpanded, node.id]);

  return (
    <>
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
          isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
        }`}
      >
        {/* Expand/Collapse Chevron */}
        {node.children.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}

        {/* Level Icon */}
        <div className={getStatusColor(node.status) + ' p-1 rounded'}>
          {getLevelIcon(node.level)}
        </div>

        {/* Title */}
        <span className="flex-1 text-sm">{node.title}</span>

        {/* Status Dropdown */}
        <StatusDropdown
          status={node.status}
          nodeId={node.id}
          projectId={projectId}
          onStatusChange={(newStatus) => {
            node.status = newStatus;
            // Trigger tree re-render
          }}
        />
      </div>

      {/* Progress Bar (if expanded and has children) */}
      {isExpanded && childrenStats && (
        <div className="px-8 py-1">
          <ProgressBar
            totalChildren={childrenStats.totalChildren}
            completeChildren={childrenStats.completeChildren}
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && node.children.map((child) => (
        <TreeNodeComponent key={child.id} node={child} level={level + 1} {...otherProps} />
      ))}
    </>
  );
}
```

## File Structure
```
components/PatternShop/
  StatusDropdown.tsx          (status selector)
  ProgressBar.tsx             (progress visualization)
  TreeNodeComponent.tsx       (updated)

lib/
  api/
    featureNodes.ts           (status endpoint)
  statusCalculation.ts        (calculateParentStatus, etc.)

app/api/projects/[projectId]/
  feature-nodes/[nodeId]/
    status/
      route.ts                (PUT endpoint)
    progress/
      route.ts                (GET endpoint)
```

## Acceptance Criteria
- [ ] Status dropdown appears on each node
- [ ] Clicking dropdown shows 4 options (not started, in progress, complete, blocked)
- [ ] Selecting new status updates database
- [ ] Parent status auto-calculates from children
- [ ] All children complete → parent complete
- [ ] Any child blocked → parent blocked
- [ ] Any child in progress → parent in progress
- [ ] Progress bar appears on expanded parent nodes
- [ ] Progress bar % correct (complete_count / total)
- [ ] Hovering progress bar shows tooltip
- [ ] Status color badge displays correctly
- [ ] Status changes cascade up tree (grandparent recalculated)
- [ ] PUT /api/projects/[projectId]/feature-nodes/[nodeId]/status works (200)
- [ ] GET /api/projects/[projectId]/feature-nodes/[nodeId]/progress returns metrics

## Testing Instructions

1. **Test status dropdown:**
   - Click node status dropdown
   - Verify 4 options appear
   - Select "In Progress"
   - Verify node status updates and DB is updated

2. **Test parent propagation:**
   - Create Epic with 2 Features
   - Set both Features to "complete"
   - Verify Epic automatically becomes "complete"

3. **Test blocked priority:**
   - Create Epic with 3 Features: 2 complete, 1 blocked
   - Verify Epic status is "blocked"

4. **Test progress bar:**
   - Create Epic with 5 Features, 2 complete
   - Expand Epic
   - Verify progress bar shows 40% and tooltip "2 of 5 complete"

5. **Test cascade:**
   - Create Grandparent (Epic) with Parent (Feature) with Child (Sub-feature)
   - Set Child to "complete"
   - Verify Child, Parent, and Grandparent all update to "complete"

6. **Test API:**
   ```bash
   curl -X PUT -H "Content-Type: application/json" \
     -d '{"status": "in_progress"}' \
     "http://localhost:3000/api/projects/xyz/feature-nodes/node-id/status"
   ```

## Dependencies
- Phase 026: Database schema
- Phase 029: Feature tree component
- Phase 030-031: Node CRUD operations
