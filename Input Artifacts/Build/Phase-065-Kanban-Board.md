# Phase 065 - Kanban Board View

## Objective
Implement a fully functional kanban board with 5 status columns, drag-and-drop card movement, column headers with counts, and scrollable overflow handling.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 062: Assembly Floor Page Layout
- Phase 063: Create Work Order (Manual)
- Phase 064: Work Order Detail View
- Next.js 14+ with App Router
- dnd-kit or @hello-pangea/dnd library

## Context
The kanban board is the default view for the Assembly Floor, providing a visual representation of work flow through the development pipeline. The 5-column layout (Backlog → Ready → In Progress → In Review → Done) aligns with typical software development workflows. Drag-and-drop interaction provides immediate visual feedback and reduces friction compared to dropdown status changes.

## Detailed Requirements

### Board Layout
- 5 columns (fixed order):
  1. Backlog (gray)
  2. Ready (blue)
  3. In Progress (yellow)
  4. In Review (orange)
  5. Done (green)

### Column Features
- **Column Header** (sticky at top):
  - Status name (h3, 14px font)
  - Count badge: "12" (number of cards in column)
  - Optional progress indicator (subtle)
  - Styled with status color

- **Scrollable Column Body**:
  - Vertical scroll for overflow cards
  - Scroll only within column, not page
  - Max height: viewport height - header - padding (~500px)
  - Smooth scrolling

- **Drop Zone**:
  - Visible when dragging (subtle background highlight)
  - Visual feedback for drop location

### Card Display
- Delegated to KanbanCard component (Phase 066)
- Shows title, priority badge, assignee avatar, AC count
- Click card opens detail view (slide-over)

### Drag & Drop
- **Library**: dnd-kit (recommended) or @hello-pangea/dnd (react-beautiful-dnd)
- **Draggable**: Individual cards
- **Droppable**: Each column
- **Behavior on Drop**:
  - Update work_order.status in database
  - Create activity entry: "[User] moved to [Status]"
  - Optimistic UI: immediate card movement
  - Revalidate board query on success
  - Handle error: revert card to original position

### Filtering
- Respects phase filter from Phase Navigation
- If phase selected: only show work orders in that phase
- "All Phases" shows all work orders

### Responsive Behavior
- Desktop (1200px+): All 5 columns visible, horizontal scroll if needed
- Tablet (768-1199px): 3-4 columns visible, horizontal scroll
- Mobile (<768px): Stack vertically or single column carousel

### Performance Optimization
- Virtualize long columns (100+ cards) using react-window or similar
- Memoize card components
- Debounce drag operations
- Batch API updates if multiple cards moved in quick succession

## Database Schema
Uses `work_orders` table from Phase 061.
- work_orders.status (updated on drop)
- work_orders.phase_id (filtered by)

## API Routes
```
PATCH /api/projects/[projectId]/work-orders/[workOrderId]
  - Update status field
  - Request: { status: "in_progress" }
  - Creates activity entry
  - Response: Updated work order

GET /api/projects/[projectId]/work-orders
  - List all work orders (or filtered by phase)
  - Query params: ?phase_id=[uuid]&status=[status]
  - Response: [ { id, title, status, priority, assignee, phase, feature_node } ]
  - Used to populate board on initial load
```

## UI Components

### New Components
1. **KanbanBoard** (`app/components/Assembly/KanbanBoard.tsx`)
   - Main board container
   - Sets up dnd context
   - Manages board state (drag in progress, etc.)
   - Handles phase filtering

2. **KanbanColumn** (`app/components/Assembly/KanbanColumn.tsx`)
   - Single status column
   - Droppable zone
   - Renders column header with count
   - Renders cards list (virtualized if needed)
   - Scrollable container

3. **KanbanCard** (`app/components/Assembly/KanbanCard.tsx`)
   - Single work order card
   - Draggable
   - Shows: title, priority badge, assignee, AC count, feature tag
   - Click opens detail view
   - Hover effects

4. **ColumnHeader** (`app/components/Assembly/ColumnHeader.tsx`)
   - Status name with color
   - Count badge
   - Optional progress bar (micro)

5. **DragOverlay** (optional, `app/components/Assembly/DragOverlay.tsx`)
   - Ghost/preview of card being dragged
   - Shows above other content while dragging
   - Uses dnd-kit overlay

### Reused Components
- From Phase 062: AssemblyFloorContent (routes to KanbanBoard)

## File Structure
```
app/
  components/
    Assembly/
      KanbanBoard.tsx                     # Main board, dnd context
      KanbanColumn.tsx                    # Single column
      KanbanCard.tsx                      # Single card
      ColumnHeader.tsx                    # Column header with count
      DragOverlay.tsx                     # Card preview while dragging (optional)
      KanbanBoard.module.css              # Styling
  api/
    projects/
      [projectId]/
        work-orders/
          route.ts                        # GET list, update board data
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useKanbanBoard.ts               # React Query hook for work orders
          useUpdateWorkOrderStatus.ts     # Mutation for status change
```

## Library Setup

### dnd-kit Setup (Recommended)
```bash
npm install @dnd-kit/core @dnd-kit/utilities @dnd-kit/sortable @dnd-kit/modifiers
```

### Alternative: @hello-pangea/dnd
```bash
npm install @hello-pangea/dnd
```

## Acceptance Criteria
- Kanban board displays with 5 columns in correct order
- Column headers show status name and work order count
- Work order cards display (details in Phase 066)
- Drag work order card from one column to another
- On drop, status updates in database
- Activity entry created for status change
- Optimistic UI: card moves immediately
- Column scrolls vertically when overflow
- Phase filter applied: selecting phase filters cards
- Error handling: card reverts on failed update
- Responsive layout adapts to screen size
- Performance: board renders 100+ cards smoothly
- Accessibility: keyboard support for drag-drop (if dnd-kit)

## Testing Instructions

1. **Board Display**
   - Navigate to Assembly Floor page
   - Verify kanban board displayed (default view)
   - Verify 5 columns present in correct order: Backlog, Ready, In Progress, In Review, Done
   - Verify column headers styled with status color

2. **Column Headers**
   - Verify each column header shows status name
   - Verify count badge shows accurate count
   - Create new work order in Backlog, verify count increments

3. **Cards Display**
   - Verify cards show in correct columns based on status
   - Verify card content displays (title, priority, assignee, AC count)
   - Create multiple work orders in same column
   - Verify all cards display

4. **Drag & Drop - Basic**
   - Click and hold card in Backlog column
   - Verify card becomes semi-transparent or highlighted
   - Drag to Ready column
   - Verify drop zone highlight appears
   - Release mouse
   - Verify card moves to Ready column

5. **Status Update on Drop**
   - Create work order in Backlog
   - Drag to In Progress column
   - Verify API PATCH called with new status
   - Verify card remains in new column
   - Verify activity entry created
   - Navigate to work order detail, verify status shows "in_progress"

6. **Multiple Drags**
   - Drag multiple cards between columns in sequence
   - Verify each move updates correctly
   - Verify no conflicts or overlaps

7. **Error Handling**
   - Mock API failure for status update
   - Drag card to new column
   - Verify card appears to move (optimistic)
   - Simulate API error
   - Verify card reverts to original column
   - Verify error toast shown

8. **Column Scrolling**
   - Create 20+ work orders in single column
   - Verify column scrolls vertically
   - Verify page doesn't scroll (only column)
   - Verify header stays sticky while scrolling

9. **Phase Filtering**
   - Create phase "Design" with 3 work orders
   - Create phase "Development" with 5 work orders
   - Click "All Phases" tab (default): verify all 8 cards visible
   - Click "Design" phase tab: verify only 3 cards visible
   - Click "Development" phase tab: verify only 5 cards visible

10. **Card Click to Detail**
    - Click card in board
    - Verify detail view opens (slide-over)
    - Close detail view
    - Verify returns to board

11. **Responsive Behavior**
    - Test at 1920px: all columns visible
    - Test at 1024px: 3-4 columns visible with horizontal scroll
    - Test at 768px: verify layout adapts
    - Test at 375px: verify stack or carousel layout

12. **Performance**
    - Create 500 work orders
    - Load board
    - Verify load time < 2s
    - Drag cards, verify smooth animation
    - No janky scrolling or lag

13. **Concurrent Updates**
    - Open board in two tabs/windows
    - Drag card in tab 1
    - Verify board in tab 2 updates (Supabase Realtime or polling)

14. **Keyboard Navigation** (if using dnd-kit)
    - Tab to card
    - Use keyboard shortcuts to move between columns
    - Verify drag-drop works via keyboard
