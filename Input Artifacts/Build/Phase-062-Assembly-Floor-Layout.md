# Phase 062 - Assembly Floor Page Layout

## Objective
Design and implement the main Assembly Floor layout including header, view toggles, phase navigation, main content area (kanban/table), and collapsible agent chat panel.

## Prerequisites
- Phase 006: Project Navigation & Layout
- Phase 010: Supabase Auth Integration
- Phase 061: Assembly Floor Database Schema
- Next.js App Router setup
- Tailwind CSS configured

## Context
The Assembly Floor is the command center for work order management. The layout serves both individual contributors and team leads. It needs to scale from small features with few work orders to large projects with hundreds. The design balances information density with clarity, supporting multiple viewing modes and an integrated AI agent for planning.

## Detailed Requirements

### Page Route
- Route: `/org/[orgSlug]/project/[projectId]/floor`
- Parent layout: `/org/[orgSlug]/project/[projectId]` (reuse project context)
- Protected: requires project membership

### Header Section (100px height)
- Left side:
  - Title: "The Assembly Floor" (h1, 24px font weight-600)
  - Progress summary badge: "24/48 work orders complete (50%)" with icon
  - Styled: gray-700 text, optional background

- Center area:
  - View toggle buttons (button group):
    - "Kanban" (default) - icon: columns
    - "Table" - icon: list
    - State persisted to localStorage and URL query param `?view=kanban|table`

- Right side:
  - "New Work Order" button (primary, blue)
  - Settings/filter button (icon, secondary)
  - Collapsible agent panel button (icon: robot/chat, secondary)

### Phase Navigation (48px height)
- Horizontal scrollable tabs above main content
- Default tab: "All Phases" or "Active Phase"
- Each phase tab shows:
  - Phase name
  - Progress indicator: "X/Y complete" or progress bar (micro)
  - Status badge: planned/active/completed
- Add phase button (+ icon)
- Active phase highlighted with underline or background color

### Main Content Area (flex-grow)
- Kanban board view (default):
  - 5 columns: Backlog, Ready, In Progress, In Review, Done
  - Scrollable horizontally if needed
  - Scrollable vertically for overflow cards
  - Drag-drop enabled between columns
  - Each column shows count badge in header

- Table view:
  - Full-width table
  - Columns: Title, Status, Priority, Assignee, Phase, Feature, Updated
  - Sortable headers
  - Row selection checkboxes
  - Grouping toggles in header

### Right Sidebar (350px, collapsible)
- Agent chat panel
- Header: "Assembly Floor Agent" with close button
- Message thread area (scrollable)
- Input field: "Ask about work orders, phases, dependencies..."
- Example prompts: "Extract work orders from blueprint", "Suggest phase plan"
- Collapse toggle button in header

### Responsive Behavior
- Desktop (1200px+): Full layout with sidebars
- Tablet (768-1199px): Kanban may stack columns, sidebar collapses by default
- Mobile: Stack everything vertically, hide some information

## Database Schema
No new tables; uses `phases` and `work_orders` from Phase 061

## API Routes
- `GET /api/projects/[projectId]/work-orders` - List work orders for project
- `GET /api/projects/[projectId]/phases` - List phases for project
- `GET /api/projects/[projectId]/progress` - Progress summary
- Used by page to populate initial data

## UI Components

### New Components to Create
1. **AssemblyFloorLayout** (`app/components/Assembly/AssemblyFloorLayout.tsx`)
   - Wraps main content
   - Manages view state (kanban/table)
   - Manages agent panel open/closed
   - Handles responsive sidebar collapse

2. **FloorHeader** (`app/components/Assembly/FloorHeader.tsx`)
   - Title, progress badge
   - View toggle buttons
   - New Work Order button
   - Settings button

3. **PhaseNavigation** (`app/components/Assembly/PhaseNavigation.tsx`)
   - Horizontal scrollable phase tabs
   - Phase selection state
   - Add phase button
   - Shows progress per phase

4. **AssemblyFloorAgent** (`app/components/Assembly/AssemblyFloorAgent.tsx`)
   - Chat interface (reuse from Phase 002 if available)
   - Message thread
   - Input field
   - Streaming responses

5. **AssemblyFloorContent** (`app/components/Assembly/AssemblyFloorContent.tsx`)
   - Routes to KanbanBoard or TableView based on state

### Reused Components
- From project layout: navigation, project header
- From common: buttons, badges, loading states

## File Structure
```
app/
  org/[orgSlug]/
    project/[projectId]/
      floor/
        page.tsx                          # Main page component
        layout.tsx                        # Floor layout wrapper
      components/
        Assembly/
          AssemblyFloorLayout.tsx         # Main layout container
          FloorHeader.tsx                 # Header with title, progress, controls
          PhaseNavigation.tsx             # Phase tabs
          AssemblyFloorAgent.tsx          # Agent chat panel
          AssemblyFloorContent.tsx        # Kanban or table router
          AssemblyFloorLayout.module.css  # Layout styles (optional)
```

## Acceptance Criteria
- Page loads at `/org/[orgSlug]/project/[projectId]/floor`
- Requires authentication and project membership
- Header displays with correct spacing and styling
- Progress summary badge shows accurate count and percentage
- View toggle buttons work and persist selection
- Phase navigation displays all phases with progress
- Main content area changes between kanban and table views
- Agent panel toggles open/closed
- Responsive layout adapts to viewport size
- All data loads from API without blocking page render
- Kanban and table views are skeletons/placeholders for now (implemented in later phases)

## Testing Instructions

1. **Navigation & Access**
   - Navigate to `/org/test-org/project/[projectId]/floor` as project member (should load)
   - Navigate as non-member (should redirect or show error)
   - Navigate to invalid project ID (should 404)

2. **Header Verification**
   - Verify title "The Assembly Floor" displays
   - Verify progress badge shows correct count (e.g., "0/0 work orders complete" if empty)
   - Verify view toggle buttons are visible

3. **View Toggle**
   - Click "Kanban" button (should stay on kanban)
   - Click "Table" button (should switch to table view)
   - Verify state persists on page reload
   - Verify URL shows `?view=table` when in table mode

4. **Phase Navigation**
   - Create 3 test phases: "Design", "Development", "Testing"
   - Verify all phases display in tabs
   - Verify progress shows "0/0" for each phase
   - Click phase tab (should filter to that phase)
   - Verify "Add phase" button navigates to create phase modal

5. **Agent Panel**
   - Verify agent panel button visible in header
   - Click button (should expand panel on right)
   - Verify agent panel title and input field visible
   - Click close button (should collapse panel)
   - Verify state persists (or resets based on spec)

6. **Responsive Behavior**
   - Test at 1920px (desktop): full layout
   - Test at 1024px (tablet): sidebar collapsed by default
   - Test at 375px (mobile): stack vertically

7. **Performance**
   - Page load time < 2s
   - No layout shift after data loads
   - Smooth transitions between views

8. **Accessibility**
   - Tab navigation works through controls
   - Button labels clear and semantic
   - Color contrast meets WCAG AA
   - Aria labels on icons
