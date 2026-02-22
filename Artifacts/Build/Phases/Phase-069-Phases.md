# Phase 069 - Work Order Phases

## Objective
Implement phase management (CRUD), work order phase assignment, phase-based filtering, and progress tracking per phase.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 062: Assembly Floor Page Layout
- Phase 069: Kanban Board View

## Context
Phases represent logical groupings of work (e.g., Design, Development, Testing) or sprints/milestones. They help teams organize work hierarchically and track progress by category. Phases are project-level, allowing teams to structure their workflow. The phase system must support dynamic creation, reorganization, and flexible work order assignment.

## Detailed Requirements

### Phase Management

#### Create Phase
- "Add Phase" button in PhaseNavigation tabs (Phase 062)
- Modal or inline form:
  - Name (required, 1-100 chars)
  - Description (optional, 255 chars max)
  - Position (calculated automatically, can reorder after)
- Submit: POST /api/projects/[projectId]/phases
- Response: Created phase with id
- Adds new tab to phase navigation

#### Rename Phase
- Click phase name in PhaseNavigation to edit (or right-click menu)
- Inline edit or modal
- Name validation: 1-100 chars
- PATCH /api/projects/[projectId]/phases/[phaseId]
- Request: { name: "New Name" }

#### Reorder Phases
- Drag phase tab to reorder (or use up/down buttons)
- Position field updates
- PATCH /api/projects/[projectId]/phases/[phaseId]
- Request: { position: 1 }
- Tabs update in new order

#### Delete Phase
- Option in context menu or settings
- Confirmation modal: "Delete phase? Work orders in this phase will become unphased."
- DELETE /api/projects/[projectId]/phases/[phaseId]
- Moves all work orders in phase to "Unphased" (phase_id = null)
- Removes phase tab

### Phase Navigation (Tabs)

#### Phase Tabs
- Horizontal scrollable tabs above main content
- Default tab: "All Phases" or first active phase
- Each phase shows:
  - Name (editable on click)
  - Progress: "X/Y complete" in small text
  - Status badge (optional): planned/active/completed
- "Add Phase" button (+ icon)
- Click phase tab to filter to that phase
- Selected tab underlined or highlighted

#### Work Order Filtering by Phase
- Select phase tab → kanban/table shows only that phase's work orders
- "All Phases" tab shows all work orders across all phases
- Filter persisted in URL: ?phase=[phaseId]

#### Progress Per Phase
- Count work orders in phase: X total
- Count completed (status = "done"): Y done
- Display: "Y/X complete" or "Y/X (Z%)"
- Progress bar visual (optional)
- Updates in real-time as work orders complete

### Phase Status (optional for MVP)
- planned: preparing/planning work
- active: currently in progress
- completed: finished
- Status label visible on tab
- Can update via phase settings

### Work Order Assignment to Phases
- Dropdown in work order creation form (Phase 063)
- Editable in work order detail (Phase 064)
- Drag-drop assignment (Phase 2, optional):
  - Drag card from Backlog column to phase group/section
  - Card moves to that phase
- Bulk assignment in table (Phase 077)

### Database Schema
Uses `phases` and `work_orders` tables from Phase 061:
- phases.id, project_id, name, position, status, created_at
- work_orders.phase_id (FK to phases, nullable)

## API Routes
```
POST /api/projects/[projectId]/phases
  - Create phase
  - Request: { name, description?, position? }
  - Response: { id, project_id, name, description, position, status, created_at }
  - Status: 201

GET /api/projects/[projectId]/phases
  - List all phases for project
  - Response: [ { id, name, description, position, status, work_order_count, completed_count } ]
  - Status: 200
  - Ordered by position

PATCH /api/projects/[projectId]/phases/[phaseId]
  - Update phase
  - Request: { name?, description?, position?, status? }
  - Response: Updated phase object
  - Status: 200

DELETE /api/projects/[projectId]/phases/[phaseId]
  - Delete phase
  - Moves all work orders to unphased (phase_id = null)
  - Response: { success: true }
  - Status: 200

PATCH /api/projects/[projectId]/work-orders/[workOrderId]
  - Update work order phase assignment
  - Request: { phase_id: "uuid|null" }
  - Response: Updated work order
  - Status: 200
```

## UI Components

### New/Modified Components
1. **PhaseNavigation** (modify Phase 062)
   - Horizontal scrollable tabs with phases
   - "All Phases" default tab
   - Each tab shows name, progress (X/Y complete)
   - Right-click or settings menu:
     - Rename, Delete, Edit Status
   - "Add Phase" button opens CreatePhaseModal
   - Selected phase persisted in state/URL

2. **CreatePhaseModal** (`app/components/Assembly/CreatePhaseModal.tsx`)
   - Modal for creating new phase
   - Fields: name (required), description (optional)
   - Submit creates phase and adds tab
   - Close button cancels

3. **PhaseSettings** (`app/components/Assembly/PhaseSettings.tsx`)
   - Modal/popover for phase options
   - Rename field (inline or modal)
   - Status dropdown (planned/active/completed)
   - Delete button with confirmation
   - Reorder UI (drag-drop or up/down arrows)

4. **PhaseProgressIndicator** (`app/components/Assembly/PhaseProgressIndicator.tsx`)
   - Shows progress per phase
   - Format: "Y/X complete" or progress bar
   - Positioned in phase tab or below tab
   - Updates reactively as work orders complete

### Reused Components
- Modal (from common)
- Dropdown (from common)

## File Structure
```
app/
  components/
    Assembly/
      PhaseNavigation.tsx                 # Modify: tabs with filtering
      CreatePhaseModal.tsx                # Modal to create phase
      PhaseSettings.tsx                   # Popover/modal for phase options
      PhaseProgressIndicator.tsx          # Progress display
  api/
    projects/
      [projectId]/
        phases/
          route.ts                        # POST, GET phases
          [phaseId]/
            route.ts                      # PATCH, DELETE phase
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          usePhases.ts                    # React Query hook for phases list
          useCreatePhase.ts               # Mutation for create
          useUpdatePhase.ts               # Mutation for update
          useDeletePhase.ts               # Mutation for delete
          usePhaseFilter.ts               # State management for selected phase
```

## Acceptance Criteria
- "Add Phase" button visible in PhaseNavigation
- Click button opens CreatePhaseModal
- Modal has name and description fields
- Submit creates phase and adds tab to navigation
- Phase tabs show name, position order correct
- Click phase tab filters kanban/table to that phase
- "All Phases" tab shows all work orders
- Progress shows "X/Y complete" per phase
- Rename phase: right-click or settings menu, inline edit, updates tab
- Delete phase: confirmation modal, moves work orders to unphased, removes tab
- Reorder phases: drag tabs or use up/down controls, position field updates
- Work orders assigned to phase via dropdown on detail view
- Work orders show in correct phase tab
- Phase filter persisted in URL (?phase=[id])
- Progress updates reactively when work order status changes
- All phases accessible in dropdown on work order creation (Phase 063)
- Phase cascade delete behavior verified (work orders unphased, not deleted)

## Testing Instructions

1. **Create Phase**
   - Click "Add Phase" button
   - Verify CreatePhaseModal opens
   - Enter phase name: "Design"
   - Leave description empty
   - Click create
   - Verify new "Design" tab appears in PhaseNavigation
   - Verify tab shows position

2. **List Phases**
   - Create 3 phases: "Design", "Dev", "Testing"
   - Verify all 3 tabs visible in correct order
   - Verify "All Phases" tab first/default

3. **Progress Display**
   - Create phase with 0 work orders
   - Verify shows "0/0 complete"
   - Create 5 work orders in phase
   - Verify shows "0/5 complete"
   - Mark 2 work orders as done
   - Verify shows "2/5 complete"

4. **Rename Phase**
   - Right-click phase tab
   - Click rename option
   - Verify inline edit or modal opens
   - Change name to "Design & UX"
   - Save
   - Verify tab updates with new name

5. **Reorder Phases**
   - Drag phase tab to new position
   - Verify order updates on board
   - Verify position field updated in DB

6. **Delete Phase**
   - Create phase with 3 work orders
   - Right-click phase tab
   - Click delete
   - Verify confirmation modal
   - Confirm delete
   - Verify tab removed
   - Verify work orders become "Unphased"
   - Navigate to detail view of moved work order
   - Verify phase_id is null

7. **Filter by Phase**
   - Create 2 phases: "Design" (2 WOs), "Dev" (4 WOs)
   - Click "All Phases" tab
   - Verify 6 work orders showing
   - Click "Design" tab
   - Verify only 2 work orders shown (from Design phase)
   - Click "Dev" tab
   - Verify only 4 work orders shown
   - Click "All Phases"
   - Verify all 6 shown again

8. **Phase Filter URL**
   - Select "Design" phase
   - Verify URL shows ?phase=[designPhaseId]
   - Copy URL and open in new tab
   - Verify same phase selected
   - Verify same work orders filtered

9. **Assign Work Order to Phase**
   - Create work order
   - In detail view, click phase dropdown
   - Verify all phases listed + "Unphased" option
   - Select "Dev" phase
   - Save
   - Return to board, click "Dev" tab
   - Verify work order appears in Dev phase

10. **Unphase Work Order**
    - Assigned work order to phase
    - In detail, click phase dropdown
    - Select "Unphased"
    - Save
    - Verify work order no longer in that phase
    - Verify only appears when "All Phases" selected

11. **Bulk Phase Assignment** (if implemented)
    - Select multiple work orders in table
    - Bulk action: "Move to Phase"
    - Select destination phase
    - Verify all selected work orders moved

12. **Phase Status** (if implemented)
    - In phase settings, change status to "active"
    - Verify tab shows "active" badge
    - Change to "completed"
    - Verify badge updates

13. **Empty Phase**
    - Create empty phase
    - Click to view
    - Verify "No work orders" message
    - Verify no errors

14. **Concurrent Phase Operations**
    - Open board in two tabs
    - Tab 1: create new phase
    - Tab 2: verify new phase appears (if auto-sync)
    - Or: refresh Tab 2, verify new phase visible

15. **Progress Rollup**
    - Create phase with 5 work orders
    - Mark 3 as "done"
    - Verify phase shows "3/5 complete"
    - Detail view shows work order progress
    - Change status from done back to in_progress
    - Verify phase progress updates to "2/5 complete"
