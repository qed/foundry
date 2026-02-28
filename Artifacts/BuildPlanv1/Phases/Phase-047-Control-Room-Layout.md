# Phase 047 - Control Room Page Layout

**Objective:** Design and implement the main Control Room page layout with three-panel interface for blueprint management and navigation.

**Prerequisites:**
- Phase 006 (App routing and layout)
- Phase 010 (Navigation and sidebar)
- Phase 046 (Database schema)
- Supabase authentication in place

**Context:**
The Control Room page is the hub for technical blueprint management. It displays blueprints organized by type and feature tree, allows filtering and search, and provides a side panel for the Control Room Agent to assist with blueprint creation and review. The layout uses a three-panel design: left panel for blueprint navigation, center panel for blueprint editor, and right panel for agent interaction.

**Detailed Requirements:**

1. **Route Structure**
   - Path: `/org/[orgSlug]/project/[projectId]/room`
   - Dynamic segments: orgSlug (organization slug), projectId (UUID)
   - Params validation: verify orgSlug matches org.slug, verify projectId belongs to org
   - Breadcrumb: Organization > Project > Control Room

2. **Left Panel: Blueprint Tree & List (35% width, collapsible)**
   - Header: "Blueprints" with icon (blueprint/schematic icon)
   - Type filter tabs (horizontal, below header):
     - All (shows all blueprints)
     - Foundations (foundation blueprints)
     - System Diagrams (system_diagram blueprints)
     - Features (feature blueprints organized by feature tree)
   - Content sections:
     - **Foundations Section** (always visible when "All" or "Foundations" selected):
       - Collapsible group header: "Foundations" with count badge
       - Default foundations list (if empty, show placeholder):
         - Backend Architecture
         - Frontend Architecture
         - Data Layer
         - Authentication & Security
         - Deployment & DevOps
       - Each item: icon + title + status badge (small) + hover: duplicate button
       - "New Foundation Blueprint" button (with plus icon)
     - **System Diagrams Section** (when "All" or "System Diagrams" selected):
       - Collapsible group header: "System Diagrams" with count badge
       - List of system diagram blueprints
       - Each item: diagram icon + title + status badge + hover: actions (edit, delete)
       - "New System Diagram" button
     - **Feature Blueprints Section** (when "All" or "Features" selected):
       - Collapsible group header: "Feature Blueprints" with count badge
       - Nested tree structure mirroring Pattern Shop feature tree
       - Each feature node displays:
         - Feature icon (colored by type)
         - Feature name
         - Blueprint status badge (shows draft/in_review/approved/implemented or "No Blueprint" placeholder)
         - Hover: "Create Blueprint" button if no blueprint exists
       - Click feature node → scroll center panel to that blueprint
   - Search bar (top of left panel):
     - Placeholder: "Search blueprints..."
     - Real-time filter: searches title and content across all visible blueprints
     - Clear button (X icon)
   - Footer: "New Blueprint" button (dropdown: Foundation, System Diagram, Feature Specific)

3. **Center Panel: Blueprint Editor (50% width, main content)**
   - Default state: empty state "Select a blueprint to begin" with illustration
   - When blueprint selected:
     - Header area:
       - Breadcrumb: Blueprint Type > Title
       - Title field (editable inline, auto-save)
       - Status dropdown (Draft → In Review → Approved → Implemented)
       - Action buttons: Save (hidden if no changes), Preview (for diagrams), More Options (ellipsis menu: duplicate, delete, view history)
     - Editor area:
       - Full blueprint rich text editor (TipTap-based, Phase 049)
       - Auto-save with debounce (500ms)
       - Document outline sidebar (collapsible right edge of editor)
   - Bottom area:
     - Created by: [user name] on [date]
     - Last updated: [date] by [user name]

4. **Right Panel: Agent Chat (15% width, collapsible)**
   - Header: "Control Room Agent" with icon
   - Chat history (scrollable):
     - Messages from agent and user
     - Markdown rendering with syntax highlighting
   - Input area (sticky bottom):
     - Text input with placeholder: "Ask the agent..."
     - Send button
   - Suggested commands (below input, horizontally scrollable chips):
     - "Generate blueprint"
     - "Review blueprint"
     - "Help with outline"
   - Collapse/expand button (X or angle brackets)

5. **Responsive Behavior**
   - Desktop (>1280px): three panels visible, proportions as above
   - Tablet (768px-1280px): left panel hidden by default (toggle button), center and right panels adjust
   - Mobile (<768px): full-width single-panel experience (select blueprint first, then view editor)

6. **Color & Visual Design**
   - Left panel: light background (gray-50 in Tailwind)
   - Center panel: white background
   - Right panel: light blue/gray background (to distinguish agent panel)
   - Status badges: color-coded (draft=gray, in_review=yellow, approved=green, implemented=blue)
   - Blueprint type icons: consistent throughout
   - Focus states and hover effects for all interactive elements

7. **Data Loading & States**
   - Loading state: skeleton placeholders in left panel while blueprints load
   - Error state: error banner with retry button if blueprint load fails
   - Empty state: illustrated message if no blueprints exist (offer "Create First Blueprint" CTA)
   - Unsaved changes: visual indicator (dot on title, confirmation on navigation)

**API Routes** (to be consumed by this page)
- `GET /api/projects/[projectId]/blueprints` — fetch all blueprints for project (query params: type, status, search)
- `GET /api/projects/[projectId]/blueprints/[blueprintId]` — fetch single blueprint
- `POST /api/projects/[projectId]/blueprints` — create new blueprint
- `PATCH /api/projects/[projectId]/blueprints/[blueprintId]` — update blueprint
- `DELETE /api/projects/[projectId]/blueprints/[blueprintId]` — delete blueprint

**UI Components**
- `ControlRoomLayout` (main page wrapper)
- `BlueprintSidebar` (left panel)
- `BlueprintSection` (collapsible section in sidebar)
- `BlueprintItem` (list item in sidebar)
- `BlueprintEditor` (center panel, reuses TipTap editor from Phase 049)
- `BlueprintHeader` (metadata and status)
- `ControlRoomAgent` (right panel, container for agent chat)
- `StatusBadge` (small badge component, reusable)
- `BlueprintTypeIcon` (icon component, type-aware)
- `FeatureTreeBlueprintView` (nested tree in sidebar)
- `EmptyState` (placeholder when no blueprint selected)

**File Structure**
```
app/
  org/
    [orgSlug]/
      project/
        [projectId]/
          room/
            page.tsx (main page component)
            layout.tsx (room layout wrapper)
  components/
    room/
      ControlRoomLayout.tsx
      BlueprintSidebar.tsx
      BlueprintSection.tsx
      BlueprintItem.tsx
      BlueprintEditor.tsx
      BlueprintHeader.tsx
      ControlRoomAgent.tsx (container)
      StatusBadge.tsx
      BlueprintTypeIcon.tsx
      FeatureTreeBlueprintView.tsx
      EmptyState.tsx
  lib/
    hooks/
      useControlRoom.ts (manages blueprint state, selection, filtering)
      useBlueprintList.ts (fetches and manages blueprint list)
```

**Acceptance Criteria**
- [ ] `/org/[orgSlug]/project/[projectId]/room` route renders without errors
- [ ] Left panel displays Foundations, System Diagrams, and Feature Blueprints sections
- [ ] Type filter tabs work: All, Foundations, System Diagrams, Features
- [ ] Search bar filters blueprints by title in real-time
- [ ] Center panel shows selected blueprint with title, status, and editor
- [ ] Status dropdown allows transitioning blueprint status
- [ ] Right panel displays agent chat interface
- [ ] Three-panel layout proportions correct on desktop (35/50/15)
- [ ] Responsive layout works on tablet and mobile
- [ ] Unsaved changes indicator visible when blueprint edited
- [ ] Empty state displays when no blueprint selected
- [ ] Loading states show skeleton placeholders
- [ ] Error boundary catches failed blueprint loads
- [ ] All icons and badges render correctly
- [ ] Navigation breadcrumbs display and work

**Testing Instructions**
1. Navigate to `/org/[orgSlug]/project/[projectId]/room` in a test project
2. Verify left panel loads with empty Foundations section and CTA to create first blueprint
3. Create a test foundation blueprint and verify it appears in left panel
4. Click foundation blueprint and verify it loads in center panel
5. Test type filter tabs: click "Foundations" tab and verify only foundations show
6. Test search: type partial title in search bar and verify filtering works
7. Edit blueprint title inline and verify it saves automatically
8. Change blueprint status via dropdown and verify status badge updates
9. Verify responsive layout on tablet and mobile widths
10. Test agent panel: click input and verify send button is enabled
11. Verify scroll to blueprint when clicking feature node in tree
12. Test collapse/expand of blueprint sections in left panel
13. Verify breadcrumb navigation links work
14. Test "New Blueprint" button dropdown offers correct blueprint type options
