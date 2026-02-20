# Phase 077 - Work Order Bulk Operations

## Objective
Enable multi-row selection and batch operations on work orders (status, assignment, phase, priority changes), with floating action bar and confirmation for destructive actions.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 067: Table View
- Phase 065: Kanban Board (optional)

## Context
For large projects with hundreds of work orders, bulk operations enable efficient workflow updates. Instead of editing each work order individually, users can select multiple and apply changes together (e.g., "Mark all critical items in Backlog as Ready", "Assign Design phase work orders to Designer A").

## Detailed Requirements

### Row Selection

#### Checkboxes
- Checkbox column on left (pinned) in table view
- Checkbox on each row
- Header checkbox selects/deselects all rows in current view
- Individual row checkbox toggles row
- Visual feedback: selected rows highlighted (blue background)

#### Selection Modes
- Single click checkbox to toggle
- Shift+click to select range
- Ctrl/Cmd+click to toggle multiple
- "Select all in current view" checkbox
- "Select all matching filter/search" option

#### Selection Count
- Badge showing "3 rows selected"
- Located in header or action bar
- Updates as selection changes

### Floating Action Bar

#### Display
- Appears when rows selected
- Floats above/below table
- Contains: action buttons, selection info, cancel button
- Format: "3 selected | [Action Buttons] [Clear selection]"

#### Action Buttons
1. **Change Status**
   - Dropdown: select new status (Backlog, Ready, In Progress, In Review, Done)
   - Apply to all selected
   - Creates activity entry per work order

2. **Assign to**
   - Dropdown: select member or "Unassign"
   - Assigns selected work orders to member
   - Creates activity entries

3. **Move to Phase**
   - Dropdown: select phase or "Unphased"
   - Moves all selected to that phase
   - Creates activity entries

4. **Set Priority**
   - Dropdown: select priority (Critical, High, Medium, Low)
   - Sets all selected to that priority
   - Creates activity entries

5. **Delete** (destructive)
   - Button marked as destructive (red)
   - Confirmation modal required
   - "Are you sure? This will delete X work orders."
   - Permanent deletion

#### Button States
- Disabled when no rows selected
- Disabled (grayed out) when action not applicable
- Loading state during operation
- Success toast after completion

### Bulk Operation Execution

#### Process
1. User selects rows
2. Clicks action button
3. Selects value (status, assignee, etc.)
4. Confirmation for destructive actions (delete)
5. Batch API call to update all at once
6. Optimistic UI: rows update immediately
7. Activity entries created (batch or per-row)
8. Success notification with count

#### API Calls
- Single PATCH request with array of work order IDs and new value
- Or multiple PATCH requests in parallel
- Transactional (all succeed or all fail)
- Returns updated work orders

### Undo/Revert (optional for MVP)
- Toast notification with "Undo" button after operation
- Reverts changes if clicked within 5 seconds
- After timeout, changes permanent

## Database Schema
Uses `work_orders` and `work_order_activity` tables from Phase 061.

## API Routes
```
PATCH /api/projects/[projectId]/work-orders/bulk-update
  - Update multiple work orders
  - Request: {
      work_order_ids: ["uuid", "uuid"],
      updates: {
        status?: "status",
        priority?: "priority",
        assignee_id?: "uuid|null",
        phase_id?: "uuid|null"
      }
    }
  - Response: {
      updated_count: 3,
      updated_work_orders: [{ id, title, status, ... }],
      failed: []
    }
  - Status: 200

DELETE /api/projects/[projectId]/work-orders/bulk-delete
  - Delete multiple work orders
  - Request: { work_order_ids: ["uuid", "uuid"] }
  - Response: { deleted_count: X, deleted_ids: [] }
  - Status: 200
  - Requires confirmation (handled on client)
```

## UI Components

### New/Modified Components
1. **WorkOrderTable** (modify Phase 067)
   - Add checkbox column
   - Track selected row IDs
   - Show selection count badge
   - Show FloatingActionBar when selected

2. **CheckboxColumn** (`app/components/Assembly/CheckboxColumn.tsx`)
   - Checkbox for row selection
   - Header checkbox for select all
   - Handles shift+click for range select

3. **FloatingActionBar** (`app/components/Assembly/FloatingActionBar.tsx`)
   - Displays when rows selected
   - Shows selection info: "3 selected"
   - Contains action buttons
   - Cancel/clear button
   - Sticky positioning (floats when scrolling)

4. **BulkActionButton** (`app/components/Assembly/BulkActionButton.tsx`)
   - Reusable button for bulk actions
   - Dropdown to select value (status, assignee, etc.)
   - Confirmation for destructive actions
   - Loading state

5. **BulkDeleteConfirmation** (`app/components/Assembly/BulkDeleteConfirmation.tsx`)
   - Modal to confirm deletion
   - Shows count: "Delete 3 work orders?"
   - Warning: "This action cannot be undone"
   - Cancel/Confirm buttons

### Reused Components
- Checkbox (from common)
- Dropdown (from common)
- Modal (from common)
- Button (from common)

## File Structure
```
app/
  components/
    Assembly/
      CheckboxColumn.tsx                  # Row selection checkbox
      FloatingActionBar.tsx               # Action bar when selected
      BulkActionButton.tsx                # Bulk action dropdown/button
      BulkDeleteConfirmation.tsx          # Delete confirmation modal
  api/
    projects/
      [projectId]/
        work-orders/
          bulk-update/
            route.ts                      # PATCH bulk update
          bulk-delete/
            route.ts                      # DELETE bulk delete
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useBulkUpdateWorkOrders.ts      # Mutation for bulk update
          useBulkDeleteWorkOrders.ts      # Mutation for bulk delete
          useWorkOrderSelection.ts        # State for selected rows
```

## Acceptance Criteria
- Checkbox column visible in table view
- Click checkbox to select/deselect row
- Header checkbox selects all rows in current view
- Selected rows highlight with blue background
- Badge shows "X selected" count
- Floating action bar appears when rows selected
- Floating action bar has buttons: Status, Assign, Phase, Priority, Delete
- Click Status button → dropdown opens
- Select new status from dropdown
- All selected rows update to new status
- Activity entries created for each row
- Assign button lets user select team member
- Confirm/Cancel buttons prevent accidental updates
- Delete button shows destructive styling (red)
- Click delete → confirmation modal
- Modal shows count and warning
- Confirm deletes all selected
- Clear/cancel selection button works
- Operation completes with success toast showing count
- No row selected → floating action bar hidden

## Testing Instructions

1. **Checkbox Display**
   - View table
   - Verify checkbox column visible (leftmost)
   - Verify checkbox on each row
   - Verify header checkbox present

2. **Single Row Select**
   - Click row 1 checkbox
   - Verify row 1 highlights
   - Verify badge shows "1 selected"
   - Click row 1 checkbox again
   - Verify deselected, badge hides

3. **Multiple Row Select**
   - Click checkboxes for rows 1, 3, 5
   - Verify all 3 rows highlighted
   - Verify badge shows "3 selected"
   - Click row 3 checkbox
   - Verify badge shows "2 selected" (row 3 deselected)

4. **Select All (Header Checkbox)**
   - Click header checkbox
   - Verify all visible rows selected
   - Verify badge shows "10 selected" (if 10 visible)
   - Click header checkbox again
   - Verify all deselected

5. **Shift+Click Range Select**
   - Click row 1
   - Hold Shift, click row 5
   - Verify rows 1-5 selected (5 rows)
   - Verify badge shows "5 selected"

6. **Floating Action Bar Display**
   - Select 0 rows
   - Verify action bar hidden
   - Select 1 row
   - Verify action bar appears
   - Verify shows "1 selected | [Action buttons] [Clear]"

7. **Change Status Bulk**
   - Select 3 work orders
   - Click "Change Status" button
   - Dropdown opens showing: Backlog, Ready, In Progress, In Review, Done
   - Select "In Progress"
   - Verify loading state
   - Verify all 3 rows update to "In Progress" status
   - Verify success toast: "Updated 3 work orders"

8. **Assign Bulk**
   - Select 3 work orders
   - Click "Assign to" button
   - Dropdown opens with team members
   - Select "Alice"
   - Verify all 3 rows update assignee to Alice
   - Success toast shown

9. **Move to Phase Bulk**
   - Select 5 work orders in "Unphased"
   - Click "Move to Phase"
   - Dropdown opens with phases
   - Select "Development"
   - Verify all 5 rows move to Development phase
   - Success toast: "Moved 5 work orders to Development"

10. **Set Priority Bulk**
    - Select work orders with mixed priorities
    - Click "Set Priority"
    - Select "Critical"
    - Verify all selected show critical (red) priority
    - Success toast shown

11. **Delete Confirmation**
    - Select 3 work orders
    - Click "Delete" button (red/destructive styling)
    - Confirmation modal appears: "Delete 3 work orders?"
    - Warning text shown
    - Cancel button closes modal without deleting
    - Confirm button deletes

12. **Delete Execution**
    - Confirm deletion of 3 work orders
    - Verify rows removed from table
    - Verify success toast: "Deleted 3 work orders"
    - Verify database confirms deletion (reload page, not present)

13. **Clear Selection**
    - Select multiple rows
    - Click "Clear selection" button in action bar
    - Verify all deselected
    - Verify action bar disappears
    - Verify selection count resets

14. **Bulk Update with Filters Applied**
    - Apply filter: Status = "Backlog"
    - Select all in filtered view (10 work orders)
    - Change status to "Ready"
    - Verify only filtered work orders updated
    - Verify non-backlog work orders unchanged

15. **Activity Tracking**
    - Select 3 work orders
    - Change status via bulk action
    - Navigate to activity feed of one work order
    - Verify activity entry: "[You] changed status to In Progress" (bulk operation)

16. **Concurrent Selection**
    - Tab 1: select rows 1-3
    - Tab 2: select rows 5-7
    - Tab 1: perform bulk update
    - Tab 2: verify action bar still shows (doesn't auto-refresh)
    - Or auto-refresh if using Realtime

17. **Large Bulk Operation**
    - Select 100+ work orders (if table supports virtualization)
    - Bulk update
    - Verify API handles efficiently
    - Verify success notification

18. **Error Handling**
    - Mock API error during bulk update
    - Verify error message shown
    - Verify rows revert to original state
    - Option to retry

19. **Permissions**
    - Non-member tries to select rows (should not access)
    - Member performs bulk operation
    - Non-member attempts bulk delete (should fail with 403)

20. **Performance**
    - Table with 200 rows
    - Select 50 rows
    - Verify selection smooth, no lag
    - Bulk operation completes quickly
