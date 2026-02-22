# Phase 064 - Work Order Detail View

## Objective
Create a comprehensive work order detail view that displays all information, supports inline editing, shows acceptance criteria, implementation plans, and integrates activity feeds and comments.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 062: Assembly Floor Page Layout
- Phase 063: Create Work Order (Manual)
- Phase 010: Supabase Auth Integration
- Next.js 14+ with App Router

## Context
The work order detail view is the single source of truth for a work order. It provides complete visibility into all aspects of the work, from requirements to progress to team communication. The view must support both quick glances and deep dives, with inline editing for fields that change frequently (status, assignee, priority).

## Detailed Requirements

### Page Route
- Route: `/org/[orgSlug]/project/[projectId]/floor/[workOrderId]`
- Can be opened as:
  - Full page view (if directly navigated)
  - Slide-over/modal in kanban/table view (if opened from card)
- Protected: requires project membership

### Layout
- Slide-over (500-600px) or full page (on mobile/narrow)
- Scrollable content area
- Close button (X) in top-right corner
- Save/Discard buttons if inline edits made

### Sections (in order)

#### 1. Header (sticky)
- Work order ID (small, muted): "WO-001"
- Title (h1, editable inline, click to edit)
- Status badge (editable dropdown): Backlog, Ready, In Progress, In Review, Done
  - Color-coded: gray, blue, yellow, orange, green
  - Updates status field and creates activity entry

#### 2. Metadata Row
- Priority badge (editable): Critical (red), High (orange), Medium (yellow), Low (gray)
- Assignee (editable, shows avatar + name or "Unassigned")
- Phase tag (editable, shows phase name or "Unphased")
- Feature/Epic tag (shows linked feature node or "No feature linked")
- Created by: "[User name] on [date]"

#### 3. Description Section
- Label: "Description"
- Content: rich text preview (or editable in expanded view)
- Edit button toggles edit mode
- Edit mode: rich text editor (same as create form)
- Display mode: rendered HTML/markdown

#### 4. Acceptance Criteria
- Label: "Acceptance Criteria"
- List of criteria (initially as text/bullets)
- Edit button toggles edit mode
- Optional: checkbox list (if criteria formatted as checklist)
- Progress: "X/Y criteria met" (if implemented with checkboxes)
- Empty state: "No acceptance criteria defined"

#### 5. Implementation Plan
- Label: "Implementation Plan"
- Content: rich text (structured steps, file guidance)
- Edit button toggles edit mode
- Empty state: "No implementation plan. Agent can generate one."
- "Generate Plan" button (calls agent)

#### 6. Activity Feed
- Label: "Activity & Comments"
- Reverse chronological list of:
  - Status changes: "[User] changed status from X to Y"
  - Assignments: "[User] assigned to [assignee]"
  - Priority changes: "[User] changed priority to X"
  - Comments: "[User] commented: [text]"
  - Created: "[User] created this work order"
- Each entry shows timestamp, user avatar, action
- Grouping by date (optional: Today, Yesterday, Last week)

#### 7. Comments Section
- New comment input: "Add a comment..."
- Comment thread (in Phase 078)
- @mentions support (in Phase 078)

### Inline Editing
- Click on editable fields to enter edit mode
- Show edit icon on hover for text fields
- Outside click or Escape to cancel
- Save button appears when value changes
- API call on save, optimistic update

### API Routes
```
GET /api/projects/[projectId]/work-orders/[workOrderId]
  - Fetch complete work order with related data
  - Response: { id, project_id, title, description, status, priority, assignee, phase, feature_node, blueprint, activity: [], comments: [] }
  - Status: 200 on success, 404 if not found

PATCH /api/projects/[projectId]/work-orders/[workOrderId]
  - Update work order fields
  - Request body: { title, description, status, priority, assignee_id, phase_id, ... any field }
  - Response: Updated work order object
  - Creates activity entry on changes
  - Status: 200 on success, 400 on validation, 404 if not found

GET /api/projects/[projectId]/work-orders/[workOrderId]/activity
  - Fetch activity feed
  - Response: [ { id, action, user, timestamp, details } ]
  - Status: 200

POST /api/projects/[projectId]/work-orders/[workOrderId]/activity
  - Create activity entry (internal use)
  - Status: 201
```

## Database Schema
Uses `work_orders`, `work_order_activity` tables from Phase 061.
- work_orders.id (primary key for route)
- work_orders.status, priority, assignee_id, phase_id (editable fields)
- work_order_activity for feed

## UI Components

### New Components
1. **WorkOrderDetailView** (`app/components/Assembly/WorkOrderDetailView.tsx`)
   - Main container, route/modal wrapper
   - Manages edit state globally
   - Handles PATCH requests on save

2. **WorkOrderHeader** (`app/components/Assembly/WorkOrderHeader.tsx`)
   - Title (editable), status badge (editable dropdown)
   - Close button

3. **WorkOrderMetadata** (`app/components/Assembly/WorkOrderMetadata.tsx`)
   - Priority, assignee, phase, feature, created by
   - Inline editable dropdowns/selects

4. **SectionEditor** (`app/components/Assembly/SectionEditor.tsx`)
   - Generic editable section wrapper
   - Toggles between view/edit mode
   - Save/discard buttons

5. **DescriptionSection** (`app/components/Assembly/DescriptionSection.tsx`)
   - Renders description with edit toggle
   - Uses RichTextEditor in edit mode

6. **AcceptanceCriteriaSection** (`app/components/Assembly/AcceptanceCriteriaSection.tsx`)
   - Displays criteria as bullet list
   - Edit mode: textarea with one criterion per line
   - Shows count

7. **ImplementationPlanSection** (`app/components/Assembly/ImplementationPlanSection.tsx`)
   - Displays plan with edit toggle
   - "Generate Plan" button (calls agent in Phase 076)
   - Uses RichTextEditor

8. **ActivityFeed** (`app/components/Assembly/ActivityFeed.tsx`)
   - Renders activity entries
   - Formats action text based on action type
   - Shows user avatar, timestamp, details

9. **CommentsSection** (`app/components/Assembly/CommentsSection.tsx`)
   - Placeholder for Phase 078
   - Comment input field
   - List of comments

### Reused Components
- RichTextEditor (from Phase 063)
- PrioritySelect, MemberSelect (from Phase 063)

## File Structure
```
app/
  components/
    Assembly/
      WorkOrderDetailView.tsx             # Main detail view
      WorkOrderHeader.tsx                 # Title and status
      WorkOrderMetadata.tsx               # Priority, assignee, phase
      SectionEditor.tsx                   # Generic edit toggle wrapper
      DescriptionSection.tsx              # Description editor
      AcceptanceCriteriaSection.tsx      # Acceptance criteria
      ImplementationPlanSection.tsx       # Implementation plan
      ActivityFeed.tsx                    # Activity entries
      CommentsSection.tsx                 # Comments (placeholder for 078)
  api/
    projects/
      [projectId]/
        work-orders/
          [workOrderId]/
            route.ts                      # GET and PATCH handlers
            activity/
              route.ts                    # GET activity feed
  org/[orgSlug]/
    project/[projectId]/
      floor/
        [workOrderId]/
          page.tsx                        # Full page view (optional)
        hooks/
          useWorkOrderDetail.ts           # React Query hook for fetch
          useUpdateWorkOrder.ts           # React Query mutation for PATCH
```

## Acceptance Criteria
- Page loads at `/org/[orgSlug]/project/[projectId]/floor/[workOrderId]`
- All 7 sections display correctly
- Title is editable inline, changes saved via API
- Status dropdown shows all 5 options, selection updates
- Priority dropdown editable with colors
- Assignee editable with member search
- Phase editable with phase selection
- Description displays with rich text formatting
- Acceptance criteria displays as bullet list
- Implementation plan displays with edit option
- Activity feed shows all historical changes
- Create date and creator visible
- Comments section present (placeholder)
- Close button works and closes detail view
- Optimistic updates for inline edits
- Activity entries created for each change
- Edit indicator visible on hover (pencil icon)

## Testing Instructions

1. **Page Loading**
   - Navigate to `/org/[slug]/project/[id]/floor/[woId]` for existing work order
   - Verify all sections render
   - Verify loading state while fetching
   - Verify error state for invalid ID

2. **Title Editing**
   - Hover over title, verify edit icon appears
   - Click title to enter edit mode
   - Verify input field appears
   - Change text and click save
   - Verify API PATCH called with new title
   - Verify optimistic update shows new title immediately
   - Verify activity entry created for title change

3. **Status Change**
   - Click status badge
   - Verify dropdown opens with 5 options
   - Select different status
   - Verify badge updates immediately
   - Verify API PATCH called
   - Verify activity entry shows status change

4. **Priority Editing**
   - Click priority badge
   - Verify color-coded dropdown
   - Select new priority
   - Verify change reflected immediately

5. **Assignee Editing**
   - Click assignee (or "Unassigned")
   - Verify member dropdown opens
   - Select different member
   - Verify avatar and name update
   - Verify activity entry shows assignment change
   - Unassign and verify "Unassigned" shows

6. **Phase Editing**
   - Click phase tag
   - Verify phase dropdown
   - Select new phase
   - Verify tag updates

7. **Description Editing**
   - Click description or edit button
   - Verify rich text editor opens
   - Type text with markdown
   - Click save
   - Verify formatted display
   - Verify activity entry created

8. **Acceptance Criteria**
   - Verify criteria displays as list
   - Click edit button
   - Verify edit textarea opens
   - Modify criteria
   - Click save
   - Verify list updates

9. **Implementation Plan**
   - Click edit button
   - Verify rich text editor opens
   - Type plan
   - Click save
   - Verify displays as formatted text

10. **Activity Feed**
    - Verify all historical changes listed
    - Verify timestamp and user visible
    - Verify action text descriptive
    - Verify ordering (newest first)

11. **Close & Navigation**
    - Click close button (X)
    - Verify detail view closes
    - If opened from kanban, verify returns to board

12. **Permissions**
    - Access as project member (should work)
    - Access as non-member (should deny)
    - Verify edit buttons only for members (enforce on API)

13. **Concurrent Edits**
    - Open same work order in two tabs
    - Edit in tab 1, save
    - Refresh tab 2, verify changes from tab 1 visible
