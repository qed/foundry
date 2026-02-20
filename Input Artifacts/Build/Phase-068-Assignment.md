# Phase 068 - Work Order Assignment

## Objective
Implement work order assignment and unassignment with activity tracking, filtering, and visual indicators across all views.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 064: Work Order Detail View
- Phase 065: Kanban Board View
- Phase 067: Table View
- Phase 010: Supabase Auth Integration

## Context
Assignment ties work orders to team members and enables tracking who owns each task. The assignment feature must be quick and accessible from multiple views (detail, kanban, table) and provide visibility into each member's workload. The "My Work Orders" filter lets developers focus on their tasks.

## Detailed Requirements

### Assignment UI

#### Detail View Assignment (Phase 064)
- **Assignee Section** in metadata row
- Display: Avatar + name or "Unassigned"
- Click to open assignee dropdown
- Dropdown shows:
  - All project members (name + email)
  - Search/filter by name or email (if 20+ members)
  - "Unassigned" option to remove assignment
  - Avatar next to each name
  - Currently assigned shown with checkmark

#### Quick Assignment (Kanban/Table Inline)
- Kanban card: assignee avatar (click to open dropdown)
- Table row: assignee cell (click to open dropdown)
- Same dropdown as detail view
- Closes after selection
- Optimistic UI: avatar/name updates immediately

### Assignment Constraints
- Only project members can be assigned
- One assignee per work order (or null)
- User can unassign work orders
- No restrictions on who can assign (project member)

### Filtering

#### "My Work Orders" Quick Filter
- Filter button or toggle in header
- Shows only work orders assigned to current user
- Accessible from kanban and table views
- Persisted to URL: `?filter=my-work-orders`
- Works with other filters (phases, status, priority)

#### Filter by Assignee (Phase 072)
- Dropdown to select assignee(s)
- Show only work orders assigned to selected members
- "Unassigned" option to show only unassigned WOs

### Activity Tracking
- Assignment creates activity entry:
  - Action: "assigned"
  - Details: { assignee_id, assignee_name, previous_assignee }
- Unassignment creates activity entry:
  - Action: "unassigned"
  - Details: { previous_assignee, previous_assignee_id }
- Activity feed shows: "[User] assigned to [Assignee]" or "[User] unassigned"
- Timestamp recorded

### Visual Indicators
- **Kanban cards**: assignee avatar bottom-left (Phase 066)
- **Table rows**: assignee column with avatar + name
- **Detail view**: assignee in metadata
- **Filter badge**: shows "My Work Orders" if active
- **Activity feed**: shows assignment changes

## Database Schema
Uses `work_orders` table from Phase 061:
- work_orders.assignee_id (UUID FK to auth.users)
- work_orders.updated_at (updates on assignment change)

## API Routes
```
PATCH /api/projects/[projectId]/work-orders/[workOrderId]
  - Update assignee_id field
  - Request: { assignee_id: "uuid|null" }
  - Creates activity entry
  - Response: Updated work order

GET /api/projects/[projectId]/work-orders
  - Support ?assigned_to=[userId] query param
  - Filters to work orders assigned to user
  - Used for "My Work Orders" filter
  - Response: filtered work orders

GET /api/projects/[projectId]/members
  - List project members (for dropdown)
  - Response: [ { user_id, email, name, avatar_url } ]
```

## UI Components

### New/Modified Components
1. **AssigneeSelector** (`app/components/Assembly/AssigneeSelector.tsx`)
   - Dropdown for selecting assignee
   - Shows all project members + unassigned option
   - Search/filter by name (if needed)
   - Checkmark for current assignment
   - Click selection to assign
   - Handles null assignment (unassign)

2. **AssigneeDisplay** (`app/components/Assembly/AssigneeDisplay.tsx`)
   - Shows assigned member with avatar + name
   - Click to open AssigneeSelector
   - Shows "Unassigned" if no assignee
   - Reusable across views

3. **MyWorkOrdersFilter** (`app/components/Assembly/MyWorkOrdersFilter.tsx`)
   - Toggle button "My Work Orders"
   - Styled as active/inactive state
   - Updates query param and filters work orders
   - Shows badge with count (optional)

4. **Filter Button** (modify from Phase 062)
   - Add "My Work Orders" as quick filter option
   - Or separate dedicated button

### Reused Components
- UserAvatar (from Phase 066)
- MemberSelect (from Phase 063, enhanced)

## File Structure
```
app/
  components/
    Assembly/
      AssigneeSelector.tsx                # Dropdown for assignment
      AssigneeDisplay.tsx                 # Shows current assignee with click to edit
      MyWorkOrdersFilter.tsx              # "My Work Orders" quick filter toggle
  api/
    projects/
      [projectId]/
        work-orders/
          route.ts                        # Modify: support ?assigned_to filter
          [workOrderId]/
            route.ts                      # Modify: handle assignee_id update
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useAssignWorkOrder.ts           # React Query mutation for assignment
          useMyWorkOrders.ts              # Hook for "My Work Orders" filter state
```

## Acceptance Criteria
- Click assignee in detail view to open dropdown
- Dropdown shows all project members with avatars
- Current assignment marked with checkmark
- Select member to assign
- Work order updates immediately (optimistic)
- Activity entry created for assignment
- Unassign option works (sets assignee_id to null)
- Avatar updates in kanban cards after assignment
- Assignee column updates in table after assignment
- "My Work Orders" filter button visible in header
- Click button to filter to current user's assignments
- Filter persisted in URL query param
- Works with other filters (phase, status, priority)
- Filter badge shows when "My Work Orders" active
- Unassigned work orders show in table without avatar
- Assignment accessible from kanban (click avatar)
- Assignment accessible from table (click cell)
- Hover shows tooltip with assignee name (optional)

## Testing Instructions

1. **Assignment via Detail View**
   - Open work order detail
   - Verify assignee shows "Unassigned"
   - Click assignee section
   - Verify dropdown opens with project members
   - Select member from dropdown
   - Verify assignee updates immediately
   - Verify API PATCH called with assignee_id
   - Verify activity entry shows "assigned to [User]"

2. **Unassignment**
   - Open assigned work order
   - Click assignee
   - Click "Unassigned" option
   - Verify assignee clears
   - Verify activity shows "unassigned"

3. **Assignment via Kanban**
   - View kanban board
   - Click assignee avatar on card (if clickable)
   - Verify dropdown appears
   - Select member
   - Verify avatar updates on card

4. **Assignment via Table**
   - View table
   - Click assignee cell
   - Verify dropdown opens
   - Select member
   - Verify table updates

5. **Search in Assignee Dropdown** (if implemented)
   - Open dropdown with 20+ members
   - Type to search by name/email
   - Verify filtering works
   - Verify can still scroll full list

6. **My Work Orders Filter**
   - Verify "My Work Orders" button in header
   - Assign several work orders to current user
   - Click "My Work Orders" button
   - Verify only user's work orders shown
   - Verify button shows active state
   - Verify URL shows ?filter=my-work-orders
   - Click button again
   - Verify filter removed and all work orders show

7. **My Work Orders with Phase Filter**
   - Set "My Work Orders" filter
   - Also select specific phase
   - Verify both filters apply (AND logic)
   - Only user's work orders in that phase shown

8. **Filter Badge**
   - Apply "My Work Orders" filter
   - Verify badge or indicator shows filter active
   - Shows "(My Work Orders)" or similar label

9. **Avatar Display Updates**
   - Assign work order from detail view
   - Return to kanban
   - Verify avatar appears on card
   - Unassign from detail
   - Return to kanban
   - Verify avatar gone

10. **Activity Tracking**
    - Assign work order to user A
    - Navigate to activity feed
    - Verify entry shows "[You] assigned to [User A]"
    - Timestamp correct
    - Change assignment to user B
    - Verify new activity: "[You] assigned to [User B]"

11. **Multiple Users Assigning**
    - User A assigns work order to User B
    - Verify activity shows "User A assigned to User B"
    - (Not "User B assigned")

12. **Concurrent Assignment**
    - Open same work order in two tabs
    - Tab 1: assign to User A
    - Tab 2: refresh or auto-sync
    - Verify tab 2 shows User A assigned

13. **Empty State**
    - Filter "My Work Orders" as user with no assignments
    - Verify "No work orders" message shows
    - No errors

14. **Permission Check**
    - Non-member tries to assign
    - Should get 403 error (enforce on API)

15. **Unassigned Display**
    - Create work order without assignment
    - In table: verify "Unassigned" shows
    - In kanban: verify no avatar
    - In detail: verify "Unassigned" badge
