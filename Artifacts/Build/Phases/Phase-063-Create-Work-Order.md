# Phase 063 - Create Work Order (Manual)

## Objective
Implement a modal/slide-over form for manually creating work orders with all required fields, validation, submission, and optimistic UI updates.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 062: Assembly Floor Page Layout
- Phase 010: Supabase Auth Integration
- Next.js 14+ with App Router
- TypeScript

## Context
While the Assembly Floor Agent can extract work orders from blueprints, teams need the ability to manually create work orders for ad-hoc tasks, follow-ups, and items not captured in planning. The create form is the primary entry point and must be intuitive, support rich text descriptions, and provide immediate feedback via optimistic updates.

## Detailed Requirements

### Form Fields
1. **Title** (required, 3-255 chars)
   - Text input, placeholder: "Work order title"
   - Real-time character count
   - Validation: min 3 chars

2. **Description** (optional)
   - Rich text editor (supports markdown, bold, italic, lists, code blocks)
   - Placeholder: "Detailed description of work to be done"
   - Max 5000 chars
   - Preview toggle

3. **Acceptance Criteria** (optional)
   - Textarea or checklist builder
   - Multiple criteria as bullet points
   - Placeholder: "Enter criteria, one per line or use checklist"
   - Stored as plain text initially (checkbox support added in Phase 078)

4. **Priority** (required, default: Medium)
   - Dropdown: Critical (red), High (orange), Medium (yellow), Low (gray)
   - Visual color indicators in dropdown
   - Default: Medium

5. **Assignee** (optional, initially can be none)
   - Dropdown of project members
   - Search/filter by name or email
   - Shows avatar next to name
   - Unassigned option (default)

6. **Phase** (optional)
   - Dropdown of phases in project
   - "Unphased" option (default)
   - Only shows phases from current project

7. **Linked Feature Node** (optional)
   - Dropdown/search of features and epics in project
   - Hierarchical display (epic > feature)
   - Filters by project
   - None selected by default

8. **Linked Blueprint** (optional)
   - Dropdown/search of blueprints in project
   - Shows blueprint title
   - Used to track work order origins
   - None by default

### Form Behavior
- Modal slide-over on right side (350-500px width)
- Click outside to cancel (with confirmation if form modified)
- Submit button: "Create Work Order" (disabled until title filled)
- Cancel button: "Cancel"
- Loading state: button shows spinner, form fields disabled during submission
- Success: toast notification, form closes, new work order appears in kanban/table

### Optimistic UI
- Immediately add work order to kanban board with loading state
- If submission fails, show error toast and remove from board
- Use local state and React Query mutation for sync
- Revalidate query on success

### API Route
- `POST /api/projects/[projectId]/work-orders`
- Request body:
  ```json
  {
    "title": "string",
    "description": "string (optional)",
    "acceptance_criteria": "string (optional)",
    "priority": "critical|high|medium|low",
    "assignee_id": "uuid (optional)",
    "phase_id": "uuid (optional)",
    "feature_node_id": "uuid (optional)",
    "blueprint_id": "uuid (optional)"
  }
  ```
- Response: Created work order object with all fields
- Validation:
  - Title required, 3-255 chars
  - Priority must be valid enum
  - All foreign keys must exist and belong to project
  - User must be project member

### Activity Tracking
- Create activity entry on successful work order creation
- Action: "created"
- Details: {} (empty or initial state)
- user_id: current user
- work_order_id: newly created ID

## Database Schema
Uses `work_orders` and `work_order_activity` tables from Phase 061.

## API Routes
```
POST /api/projects/[projectId]/work-orders
  - Create work order
  - Request body: { title, description, acceptance_criteria, priority, assignee_id, phase_id, feature_node_id, blueprint_id }
  - Response: { id, project_id, title, ... all fields }
  - Status: 201 on success, 400 on validation error, 401 on auth error

GET /api/projects/[projectId]/phases
  - List all phases for project (used in dropdown)
  - Response: [ { id, name, position, status } ]

GET /api/projects/[projectId]/feature-nodes
  - List all feature nodes (features and epics) (used in dropdown)
  - Response: [ { id, name, type, parent_id } ]

GET /api/projects/[projectId]/blueprints
  - List all blueprints for project (used in dropdown)
  - Response: [ { id, title, status } ]

GET /api/projects/[projectId]/members
  - List project members (used in assignee dropdown)
  - Response: [ { user_id, email, name, avatar_url } ]
```

## UI Components

### New Components
1. **CreateWorkOrderModal** (`app/components/Assembly/CreateWorkOrderModal.tsx`)
   - Modal/slide-over container
   - Form state management with React Hook Form
   - Validation schema with Zod
   - Submission handler with React Query

2. **WorkOrderForm** (`app/components/Assembly/WorkOrderForm.tsx`)
   - Form fields (title, description, criteria, priority, etc.)
   - Rich text editor for description
   - Dropdowns with data loading
   - Character counts and validation messages

3. **RichTextEditor** (`app/components/common/RichTextEditor.tsx`)
   - Simple markdown editor for descriptions
   - Toolbar: bold, italic, list, code, link
   - Preview mode toggle
   - Reusable across app

4. **PrioritySelect** (`app/components/Assembly/PrioritySelect.tsx`)
   - Dropdown with color-coded options
   - Shows colored dot/badge
   - Reusable in multiple views

5. **MemberSelect** (`app/components/Assembly/MemberSelect.tsx`)
   - Searchable dropdown of project members
   - Shows avatar and name
   - Reusable for assignee fields

## File Structure
```
app/
  components/
    Assembly/
      CreateWorkOrderModal.tsx            # Modal wrapper
      WorkOrderForm.tsx                   # Form fields and layout
      PrioritySelect.tsx                  # Priority dropdown
      MemberSelect.tsx                    # Member select dropdown
    common/
      RichTextEditor.tsx                  # Reusable rich text editor
  api/
    projects/
      [projectId]/
        work-orders/
          route.ts                        # POST handler
        phases/
          route.ts                        # GET list (create earlier if missing)
        feature-nodes/
          route.ts                        # GET list
        blueprints/
          route.ts                        # GET list
        members/
          route.ts                        # GET list
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useCreateWorkOrder.ts           # React Query mutation hook
```

## Acceptance Criteria
- Modal/slide-over appears when "New Work Order" button clicked
- All 8 form fields present and functional
- Title validation works (min 3 chars, shows error if invalid)
- Priority dropdown shows all 4 options with colors
- Assignee dropdown loads and filters project members
- Phase dropdown shows all project phases
- Feature node dropdown shows features and epics
- Blueprint dropdown shows blueprints
- Form submission creates work order via API
- Optimistic UI: new work order appears immediately in kanban
- On error, work order removed and toast shown
- Success: form closes and toast shown
- Activity entry created for new work order
- Character counts accurate for title and description
- Rich text editor renders in description field

## Testing Instructions

1. **Modal Opening**
   - Click "New Work Order" button
   - Verify modal appears with correct title
   - Verify all form fields visible

2. **Title Field**
   - Type 1 char, verify "min 3 characters" error
   - Type 3+ chars, verify error clears
   - Type 300 chars, verify character count shows warning
   - Verify character count updates in real-time

3. **Priority Dropdown**
   - Open priority dropdown
   - Verify 4 options visible with correct colors
   - Select each priority and verify selection updates
   - Default value is Medium

4. **Assignee Dropdown**
   - Open assignee dropdown
   - Verify all project members listed
   - Search by name/email (if implemented)
   - Select member and verify avatar shows
   - Verify unassigned (none) option available

5. **Phase Dropdown**
   - Open phase dropdown
   - Verify all project phases listed
   - Select phase and verify selection updates
   - Verify "Unphased" option available (default)

6. **Feature & Blueprint Dropdowns**
   - Open feature node dropdown
   - Verify features and epics listed
   - Open blueprint dropdown
   - Verify blueprints listed

7. **Rich Text Editor**
   - Click description field
   - Verify toolbar visible (if applicable)
   - Test markdown: **bold**, *italic*, lists
   - Verify preview mode works (if implemented)

8. **Form Submission**
   - Fill only title field
   - Click "Create Work Order"
   - Verify API called with correct data
   - Verify new work order appears in kanban (optimistic)
   - Verify success toast shown
   - Verify form closes

9. **Validation & Error Handling**
   - Try submit with empty title (should show error, disable button)
   - Try submit with invalid assignee (should fail with API error)
   - Verify form stays open on error
   - Verify error toast shown

10. **Cancel Behavior**
    - Fill form with data
    - Click cancel
    - Verify confirmation dialog (if form modified)
    - Verify modal closes and data lost

11. **Activity Tracking**
    - Create work order
    - Navigate to work order detail view
    - Verify activity feed shows "created by [user]"

12. **Optimistic UI Failure**
    - Mock API failure
    - Create work order
    - Verify work order appears then disappears on error
    - Verify error message shown
