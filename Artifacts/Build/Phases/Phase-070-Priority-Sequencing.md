# Phase 070 - Work Order Priority & Sequencing

## Objective
Implement priority levels with visual indicators, within-phase sequencing (ordering) via drag-drop, and priority-based sorting.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 065: Kanban Board View
- Phase 067: Table View
- Phase 069: Phases

## Context
Priority and sequencing enable teams to manage workflow discipline. Priority levels (Critical → Low) indicate urgency and importance, while sequencing within a phase determines execution order. The combination supports capacity planning, risk management (critical items first), and dependencies (higher priority blocks lower priority in same phase).

## Detailed Requirements

### Priority Levels

#### Four Levels
1. **Critical** (red: #EF4444)
   - Highest urgency
   - Blocking issues, production problems
   - Badge: solid red circle or "Critical" label

2. **High** (orange: #F97316)
   - Important, should complete soon
   - Roadmap items, major features

3. **Medium** (yellow/amber: #EAB308)
   - Normal priority
   - Default for new work orders
   - Regular feature work

4. **Low** (gray: #9CA3AF)
   - Nice to have, deferred
   - Technical debt, polish
   - Lower urgency improvements

#### Visual Indicators
- Kanban card: colored dot (8px) top-right (Phase 066)
- Table row: colored badge or dot with label
- Detail view: colored badge
- Status: "Critical", "High", "Medium", "Low"
- Tooltip on hover shows full text

### Priority Assignment
- Dropdown in work order creation (Phase 063)
- Editable in work order detail (Phase 064)
- Default: "Medium"
- Can change via detail view or inline edit in table/kanban

### Sequencing (Ordering) Within Phase

#### Drag-to-Reorder
- Kanban columns: reorder cards vertically
- Table view: drag-to-reorder rows (if rows are draggable)
- Saves position field in work_orders table
- Drag from any part of card/row (not checkbox)

#### Position Field
- work_orders.position (integer)
- Sequential within phase + status (optional: by status too)
- On create: position = max(position) + 1
- On move: recalculate all positions in target phase/column
- Immutable primary key: (project_id, phase_id, position)

#### Visual Feedback
- Drag-over highlight: subtle blue background
- Drag icon: optional, on hover or always visible
- Drop feedback: line or gap showing insertion point

### Sorting

#### Default Sort
- By position (within phase)
- Position asc → displays cards top-to-bottom in execution order

#### Sort by Priority
- Table view: click "Priority" column header
- Sorts by priority: Critical → High → Medium → Low
- Secondary sort: by position within priority level
- Works within phase filter (only sorts phase's work orders)

#### Sort by Status
- Table view: click "Status" column header
- Sorts by: Backlog, Ready, In Progress, In Review, Done
- Secondary sort: by position within status

### Database Schema
Uses `work_orders` table from Phase 061:
- work_orders.position (integer, not null, default 0)
- work_orders.priority (varchar, enum: critical/high/medium/low)
- Index on (project_id, phase_id, position) for efficient ordering

### Constraints
- Each work order has unique (project_id, phase_id, position)
- Use database trigger or API logic to enforce sequential positions
- Positions do not need to be 0, 1, 2, 3... can be 100, 200, 300... (for insertion flexibility)

## API Routes
```
PATCH /api/projects/[projectId]/work-orders/[workOrderId]
  - Update priority field
  - Request: { priority: "critical|high|medium|low" }
  - Response: Updated work order
  - Status: 200

PATCH /api/projects/[projectId]/work-orders/[workOrderId]/reorder
  - Update position within phase
  - Request: { position: 150 } or { move_after_id: "uuid" }
  - Recalculates positions if needed
  - Response: Updated work order
  - Status: 200

GET /api/projects/[projectId]/work-orders
  - Support ?sort=priority|position query param
  - Default: sort by position (within phase)
  - If sort=priority: sort by priority (critical first)
  - Response: Sorted array of work orders
  - Status: 200

PATCH /api/projects/[projectId]/work-orders/reorder-batch
  - Reorder multiple work orders at once
  - Request: [ { id, position } ]
  - Updates all in transaction
  - Response: Updated work orders
  - Status: 200
```

## UI Components

### New/Modified Components
1. **PriorityBadge** (modify/reuse from Phase 066)
   - Colored dot or pill showing priority
   - Click to open priority dropdown
   - Tooltip on hover
   - Used in cards, table, detail view

2. **PrioritySelect** (modify from Phase 063)
   - Dropdown for changing priority
   - Shows 4 options with colors
   - Click to select
   - Applied to work order

3. **ReorderHandle** (`app/components/Assembly/ReorderHandle.tsx`)
   - Drag handle icon (⋮⋮)
   - Shows on hover or always visible (configurable)
   - Visible on cards and table rows
   - Indicates draggable region

4. **KanbanColumn** (modify Phase 065)
   - Support vertical reordering of cards
   - Drag-drop library handles positioning
   - Recalculate positions on drop
   - Visual drop indicator (line/gap)

5. **WorkOrderTable** (modify Phase 067)
   - Support row drag-to-reorder (if dnd-kit supports)
   - Or use table row DnD plugin
   - Position updates on drop

### Reused Components
- PriorityBadge (from Phase 066)
- PrioritySelect (from Phase 063)

## File Structure
```
app/
  components/
    Assembly/
      PriorityBadge.tsx                   # Modify: add click to edit
      PrioritySelect.tsx                  # Modify: ensure reusable
      ReorderHandle.tsx                   # Drag handle icon
  api/
    projects/
      [projectId]/
        work-orders/
          route.ts                        # Modify: support sort param
          [workOrderId]/
            route.ts                      # Modify: handle priority update
            reorder/
              route.ts                    # PATCH reorder endpoint
          reorder-batch/
            route.ts                      # PATCH batch reorder
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useUpdatePriority.ts            # Mutation for priority change
          useReorderWorkOrder.ts          # Mutation for position change
```

## Acceptance Criteria
- Priority dropdown shows 4 options with correct colors
- Default priority for new work order is "Medium"
- Click priority badge in detail/table/kanban to change
- Priority updates save via API and persist
- Priority badges display correctly in all views
- Drag card vertically in kanban column to reorder
- Position updates in database on drop
- Drag row in table to reorder (if implemented)
- Sort by priority in table (click header): Critical → High → Medium → Low
- Sort persists while in phase filter
- Within-phase reordering works (position changes only affect same phase)
- Reorder handle visible on hover (⋮⋮)
- Drop feedback shows insertion point (visual indicator)
- Batch reorder works for multiple cards

## Testing Instructions

1. **Priority Assignment**
   - Create work order, verify default priority "Medium"
   - Click priority badge
   - Verify dropdown shows 4 options with colors
   - Select "Critical"
   - Verify badge updates to red
   - Select "Low"
   - Verify badge updates to gray

2. **Priority Persistence**
   - Assign priority "High" to work order
   - Refresh page
   - Navigate back to work order
   - Verify priority still "High"

3. **Visual Indicators**
   - Create work orders with each priority
   - Kanban: verify each has correct colored dot top-right
   - Table: verify priority column shows colors
   - Detail: verify priority badge shown

4. **Drag to Reorder in Kanban**
   - Create 3 work orders in Ready column
   - Position order: A, B, C
   - Drag C above A
   - Verify visual reordering (insertion point shows)
   - Release mouse
   - Verify C is now first, then A, then B
   - Verify API called to update positions

5. **Reorder Handle Icon**
   - Hover over card in kanban
   - Verify reorder handle (⋮⋮) visible or present
   - Icon positioned for easy access

6. **Sort by Priority in Table**
   - Create work orders: Low, High, Medium, Critical (in that creation order)
   - View table, default sort by position (creation order)
   - Click "Priority" column header
   - Verify sorted: Critical (red), High (orange), Medium (yellow), Low (gray)
   - Click again
   - Verify reverse sort: Low, Medium, High, Critical
   - Within same priority, secondary sort by position

7. **Sort by Priority with Phase Filter**
   - Create 2 phases: "Design" and "Dev"
   - Phase Design: 3 work orders with mixed priorities
   - Phase Dev: 3 work orders with mixed priorities
   - Select Design phase
   - Sort by priority
   - Verify only Design work orders shown, sorted by priority
   - Select Dev phase
   - Verify only Dev work orders shown, sorted by priority

8. **Reorder Within Phase Only**
   - Create 2 phases
   - Phase 1: A (priority High), B (priority Low)
   - Phase 2: C (priority Medium)
   - Drag A below B within Phase 1
   - Verify A now after B
   - Verify C still in Phase 2 (unchanged)

9. **Position Persistence**
   - Reorder 5 cards in column
   - Refresh page
   - Verify cards still in reordered sequence
   - Position field in DB correctly updated

10. **Drop Feedback Visual**
    - Drag card in kanban
    - Hover over column
    - Verify visual feedback (line/gap showing where card will drop)
    - Move up/down column
    - Verify insertion point follows

11. **Table Row Reorder** (if implemented)
    - Drag table row to new position
    - Verify row moves
    - Verify position updated

12. **Batch Reorder**
    - Select multiple work orders in table
    - Bulk action: reorder
    - Verify all positions updated

13. **Priority + Assignee Interaction**
    - Assign work order to member
    - Change priority
    - Verify both changes persisted
    - Verify in activity feed both changes tracked

14. **Edge Cases**
    - Reorder single card (should not change)
    - Reorder empty column (should not error)
    - Drag card out and back to same position (should not error)

15. **Concurrent Reorders**
    - Open board in two tabs
    - Tab 1: reorder card
    - Tab 2: reorder different card
    - Verify both changes apply (no conflicts)
