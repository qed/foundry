# Phase 051 - Feature Blueprints

**Objective:** Implement feature blueprint creation and editing, with 1:1 linking to Pattern Shop feature nodes.

**Prerequisites:**
- Phase 026 (Pattern Shop feature tree)
- Phase 046 (Database schema)
- Phase 047 (Control Room layout)
- Phase 049 (Blueprint editor)

**Context:**
Feature blueprints are technical specifications for individual features. Each feature in the Pattern Shop has exactly one corresponding blueprint in the Control Room. Feature blueprints bridge requirements (Pattern Shop) and implementation details (Control Room), detailing APIs, UI components, data models, business logic, and testing requirements. They follow a standardized template with sections that engineers fill in during planning phase.

**Detailed Requirements:**

1. **Feature Blueprint Structure**
   - Field: `blueprint_type` = 'feature'
   - Field: `feature_node_id` = UUID (references feature_nodes.id)
   - Field: `title` = Feature name (auto-populated from feature_node.name)
   - Content sections (from template):
     - **Solution Overview**: 2-3 paragraphs describing what this feature does and why
     - **API Endpoints**: list of endpoints needed (method, path, request/response)
     - **UI Components & Behavior**: list of UI components, their state, and interactions
     - **Data Model Changes**: database schema changes, new tables/columns/constraints
     - **Business Logic**: core business logic, calculations, workflows
     - **Testing Requirements**: unit tests, integration tests, edge cases to cover
     - **Dependencies**: internal (other features, systems) and external (APIs, libraries)
   - Metadata:
     - created_by, created_at, updated_at
     - status: draft → in_review → approved → implemented
     - linked feature_node_id (immutable after creation)

2. **Auto-Create on Feature View**
   - When user navigates to feature detail view in Pattern Shop and blueprint doesn't exist:
     - Show banner: "No blueprint exists for this feature" with "Create Blueprint" button
     - Click button → create feature blueprint and navigate to Control Room
   - Or: user creates blueprint from Control Room left panel (Feature section)

3. **Create Feature Blueprint**
   - Trigger A: From Pattern Shop feature detail view
     - Click "Create Blueprint" button in banner
     - System auto-creates blueprint with:
       - Title: feature.name
       - feature_node_id: feature.id
       - Status: draft
       - Content: template sections (placeholder text)
       - created_by: current user
     - Redirect to Control Room with blueprint open

   - Trigger B: From Control Room (on feature node without blueprint)
     - Right-click feature node in Feature Blueprints tree → "Create Blueprint"
     - Or: feature node shows "No Blueprint" placeholder → click "Create" button
     - Same creation as Trigger A, but stay in Control Room

   - Trigger C: From modal (if preferred UX)
     - Modal: "Create Blueprint for [Feature Name]"
     - Allow selecting template override
     - "Create" saves and opens

4. **Feature Blueprint Template**
   - System template: "Feature Blueprint" template
   - Outline sections (JSONB):
     ```json
     {
       "sections": [
         {
           "title": "Solution Overview",
           "placeholder": "Describe what this feature does, why it's needed, and key benefits..."
         },
         {
           "title": "API Endpoints",
           "placeholder": "List all API endpoints:\n\nGET /api/...\nRequest:\n  ...\nResponse:\n  ..."
         },
         {
           "title": "UI Components & Behavior",
           "placeholder": "List components, their state, user interactions, and behavior rules..."
         },
         {
           "title": "Data Model Changes",
           "placeholder": "Describe database changes:\n- New tables:\n- New columns:\n- Constraints:"
         },
         {
           "title": "Business Logic",
           "placeholder": "Describe business logic, calculations, workflows, algorithms..."
         },
         {
           "title": "Testing Requirements",
           "placeholder": "List test cases, edge cases, unit tests, integration tests..."
         },
         {
           "title": "Dependencies",
           "placeholder": "List internal (features, systems) and external (APIs, libraries) dependencies..."
         }
       ]
     }
     ```

5. **Feature-Blueprint 1:1 Relationship**
   - Database constraint: unique(project_id, feature_node_id) where feature_node_id IS NOT NULL
   - Prevent duplicate blueprints for same feature
   - On feature deletion: cascade delete blueprint (or soft-delete)
   - Immutable link: feature_node_id cannot be changed after creation

6. **Feature Blueprint in Control Room**
   - Left panel Feature Blueprints section:
     - Tree mirroring feature tree structure (from Pattern Shop)
     - Each feature node displays:
       - Feature icon (colored by type)
       - Feature name
       - Blueprint status badge:
         - If blueprint exists: color badge (draft=gray, in_review=yellow, approved=green, implemented=blue)
         - If no blueprint: gray "No Blueprint" placeholder + "Create" button
       - Hover: "View" button (if blueprint exists), "Create" button (if no blueprint)
   - Click feature node:
     - If blueprint exists: load blueprint in center panel
     - If no blueprint: show "No Blueprint" state in center panel with "Create Blueprint" button
   - Can create multiple feature nodes under same parent without conflict (each has own blueprint)

7. **Feature Blueprint Header**
   - Title: displays feature name (not editable, auto-synced from feature_node)
   - Breadcrumb: Feature Category > Subcategory > Feature Name
   - Link to feature in Pattern Shop (external link icon)
   - Status dropdown
   - Actions menu: create from template, duplicate (unusual but possible), delete

8. **Editing Feature Blueprint**
   - Open in TipTap editor (Phase 049)
   - All template sections available
   - Auto-save with debounce
   - Validation: minimum 10 characters per section or allow empty sections?

9. **Linking Back to Pattern Shop**
   - Feature blueprint header has "View Feature" link
   - Clicking navigates to Pattern Shop feature detail view
   - Pattern Shop feature detail shows "View Blueprint" link in banner
   - Breadcrumb shows link path

10. **Feature Blueprint Metadata**
    - Shows feature name (synced from feature_node.name)
    - Shows project name
    - Created by and updated by with timestamps
    - Blueprint version count (total versions)

11. **Search & Filter**
    - Search finds feature blueprints by feature name or blueprint content
    - Filter by feature category (if needed)
    - Filter by blueprint status
    - Search results show feature path (Category > Subcategory > Feature Name)

12. **Validation**
    - Title: auto-filled from feature, not editable
    - Content: optional (can be empty, but minimum 1 character to avoid blank sections)
    - feature_node_id: required, must be valid and exist

**API Routes**
```
POST /api/projects/[projectId]/blueprints
  Body: {
    blueprint_type: 'feature',
    feature_node_id: uuid,
    title?: string (optional, defaults to feature.name)
  }
  Returns: { id, title, feature_node_id, created_at, ... }

GET /api/projects/[projectId]/blueprints?type=feature
  Returns: { blueprints: [...] }

GET /api/projects/[projectId]/blueprints/for-feature/[featureNodeId]
  Returns: { blueprint } or 404 if not exists

PATCH /api/projects/[projectId]/blueprints/[blueprintId]
  Body: { content?, status? }
  Returns: updated blueprint

GET /api/features/[featureNodeId]
  Returns: { feature_node, blueprint: {...} } (include blueprint if exists)

GET /api/projects/[projectId]/blueprints/missing
  Returns: { feature_nodes_without_blueprints: [...] }
```

**UI Components**
- `FeatureBlueprintTree` (nested tree in left panel)
- `FeatureNodeBlueprintItem` (feature node with status badge or "No Blueprint" state)
- `FeatureBlueprintEditor` (center panel, uses TipTap)
- `FeatureBlueprintHeader` (title, link to feature, status)
- `NoBlueprintState` (placeholder when no blueprint exists)
- `FeatureBlueprintLinkBanner` (in Pattern Shop feature detail, "Create Blueprint" or "View Blueprint")

**File Structure**
```
app/
  api/
    projects/
      [projectId]/
        blueprints/
          route.ts
          for-feature/
            [featureNodeId]/
              route.ts (GET blueprint for feature)
          missing/
            route.ts (GET features without blueprints)
          [blueprintId]/
            route.ts
  components/
    room/
      features/
        FeatureBlueprintTree.tsx
        FeatureNodeBlueprintItem.tsx
        NoBlueprintState.tsx
  components/
    pattern-shop/
      FeatureBlueprintLinkBanner.tsx
  lib/
    hooks/
      useFeatureBlueprint.ts (fetch blueprint for feature)
      useFeatureBlueprintTree.ts (manage tree state)
```

**Acceptance Criteria**
- [ ] Feature Blueprint table has unique constraint on (project_id, feature_node_id)
- [ ] Creating feature blueprint auto-populates title from feature.name
- [ ] "Create Blueprint" button in Pattern Shop feature detail works
- [ ] Feature blueprint created and opens in Control Room
- [ ] Feature Blueprint tree displays in left panel mirroring feature tree
- [ ] Feature nodes without blueprints show "No Blueprint" badge and "Create" button
- [ ] Feature nodes with blueprints show status badge (draft/in_review/approved/implemented)
- [ ] Clicking feature node loads blueprint in center panel
- [ ] Clicking "View Feature" link navigates to Pattern Shop feature detail
- [ ] Pattern Shop feature detail shows "View Blueprint" link if blueprint exists
- [ ] Feature blueprint title synced from feature name
- [ ] Feature blueprint can be edited in TipTap editor
- [ ] All template sections display in editor
- [ ] Auto-save works for feature blueprints
- [ ] Status dropdown allows status transitions
- [ ] Search finds feature blueprints by feature name or content
- [ ] Filter by status works
- [ ] Metadata shows created by, updated by, timestamps
- [ ] RLS enforces project member access
- [ ] Breadcrumb shows feature path in Control Room
- [ ] Prevent creation of duplicate blueprints for same feature (unique constraint)

**Testing Instructions**
1. Navigate to Pattern Shop and view a feature detail
2. Verify "No Blueprint" banner appears with "Create Blueprint" button
3. Click "Create Blueprint" and verify:
   - Blueprint created in database
   - Control Room opens with feature blueprint selected
   - Title matches feature name
   - Template sections appear in editor
4. In Control Room, view Feature Blueprints section in left panel
5. Verify feature tree structure matches Pattern Shop
6. Verify feature node shows blueprint status badge
7. Click feature node and verify blueprint loads in center panel
8. Edit feature blueprint content and verify auto-save
9. Change status via dropdown
10. Click "View Feature" link and verify navigates to Pattern Shop feature detail
11. In Pattern Shop, verify "View Blueprint" link appears in banner
12. Click "View Blueprint" and verify Control Room opens with blueprint selected
13. Create feature blueprint from Control Room:
    - Right-click feature node without blueprint
    - Select "Create Blueprint" from context menu
14. Verify feature blueprint created and opens in editor
15. Navigate to feature tree and verify "No Blueprint" state changes to status badge
16. Search for feature blueprint by feature name
17. Filter by status and verify only matching blueprints show
18. Try to create second blueprint for same feature (should fail with unique constraint error)
19. Verify feature nodes without blueprints show "Create" button
20. Test creating blueprints for features at different tree levels (top-level, nested)
21. Delete feature blueprint and verify "No Blueprint" state returns to feature node
22. Verify RLS: project member can view/edit, non-member cannot access
