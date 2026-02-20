# Phase 048 - Foundation Blueprints

**Objective:** Implement the creation and editing of foundation blueprints that capture project-wide technical decisions and architectural principles.

**Prerequisites:**
- Phase 046 (Database schema)
- Phase 047 (Control Room layout)
- Phase 049 (Blueprint rich text editor)

**Context:**
Foundation blueprints are project-wide technical decisions that establish the architectural foundation for all features. Every project should have five default foundations: Backend Architecture, Frontend Architecture, Data Layer, Authentication & Security, and Deployment & DevOps. These blueprints define conventions, technology choices, and constraints that all features must follow. They serve as reference documents for engineers building features and the Control Room Agent uses them for consistency checking.

**Detailed Requirements:**

1. **Default Foundations**
   - Every new project automatically creates five foundation blueprints in draft status:
     1. **Backend Architecture**
        - Covers: framework (Next.js API routes), runtime (Node.js), API design (REST/GraphQL), error handling, logging, monitoring
     2. **Frontend Architecture**
        - Covers: component architecture (React/Next.js patterns), state management approach, styling system, build optimization, performance targets
     3. **Data Layer**
        - Covers: primary database (PostgreSQL), query patterns (Supabase), caching strategy, data validation, schema conventions
     4. **Authentication & Security**
        - Covers: auth method (Supabase Auth), session management, RBAC/ABAC approach, secrets management, encryption practices
     5. **Deployment & DevOps**
        - Covers: hosting platform (Vercel), CI/CD pipeline, environments (dev/staging/prod), monitoring and alerting, backup strategy

2. **Foundation Blueprint Structure**
   - Field: `blueprint_type` = 'foundation'
   - Field: `feature_node_id` = NULL
   - Content sections (rich text editor):
     - **Overview**: 1-2 paragraph executive summary of this foundation's role
     - **Technology Choices**: list of key technologies, versions, rationale
     - **Architectural Principles**: list of guiding principles (e.g., "DRY", "separation of concerns")
     - **Conventions**: code style, naming conventions, directory structure conventions
     - **Constraints & Limitations**: known constraints, trade-offs, future considerations
   - Metadata:
     - created_by (UUID)
     - created_at (TIMESTAMP)
     - updated_at (TIMESTAMP)
     - status (enum: draft, in_review, approved, implemented)

3. **Create Foundation Blueprint**
   - Trigger: User clicks "New Foundation Blueprint" button in left panel
   - Modal/form:
     - Title input (required, max 255 chars)
     - Template picker (optional, defaults to "Foundation" template):
       - System templates (Backend Architecture, Frontend Architecture, etc.)
       - Custom org templates
     - "Create" button saves and opens in editor
   - On creation:
     - Save to `blueprints` table with status='draft'
     - Auto-insert into `blueprint_versions` table (version 1)
     - Redirect to blueprint in editor, or update center panel
     - Show success toast

4. **Edit Foundation Blueprint**
   - Open in rich text editor (Phase 049)
   - Title editable inline in header
   - Content editable in TipTap editor
   - Auto-save with debounce
   - Visual indicator: "Editing" state with unsaved changes dot

5. **Duplicate Foundation Blueprint**
   - Hover over foundation item in left panel → "Duplicate" button
   - Creates new blueprint with:
     - Title: "[Original Title] (Copy)"
     - Content: exact copy of original
     - Status: draft
     - created_by: current user
   - Show success toast with "View" link

6. **View Foundation Metadata**
   - Header area shows:
     - Title
     - Status badge (color-coded)
     - Created by: [user name] on [date]
     - Last updated: [date] by [user name]
   - Click status badge → dropdown to change status

7. **Foundation Template**
   - System template: "Foundation" template defines default outline sections
   - Outline (JSONB):
     ```json
     {
       "sections": [
         { "title": "Overview", "placeholder": "Provide a brief overview of this foundation area..." },
         { "title": "Technology Choices", "placeholder": "List key technologies, versions, and rationale..." },
         { "title": "Architectural Principles", "placeholder": "List guiding principles and patterns..." },
         { "title": "Conventions", "placeholder": "Code style, naming, directory structure conventions..." },
         { "title": "Constraints & Limitations", "placeholder": "Known constraints and trade-offs..." }
       ]
     }
     ```
   - Template sections pre-populate in editor with placeholder text

8. **Data Validation**
   - Title: required, 1-255 characters, trim whitespace
   - Content: required, minimum 10 characters (to ensure meaningful content)
   - Status: must be valid enum value
   - On validation error: show inline error messages, prevent save

9. **Related Features**
   - Foundations linked from feature blueprints via content references (text mentions)
   - Agent can reference foundations in blueprint generation (Phase 057)
   - Foundations appear in blueprint search results

10. **Access Control**
    - Project members: can view and edit (via RLS)
    - Project admin: can delete
    - Non-members: no access

**API Routes**
```
POST /api/projects/[projectId]/blueprints
  Body: { blueprint_type: 'foundation', title, content, template_id? }
  Returns: { id, created_at, ... }

GET /api/projects/[projectId]/blueprints?type=foundation
  Returns: { blueprints: [...] }

PATCH /api/projects/[projectId]/blueprints/[blueprintId]
  Body: { title?, content?, status? }
  Returns: updated blueprint

POST /api/projects/[projectId]/blueprints/[blueprintId]/duplicate
  Returns: { id, title, ... } (new blueprint)

GET /api/projects/[projectId]/blueprint-templates?type=foundation
  Returns: list of foundation templates for org and system
```

**UI Components**
- `CreateFoundationBlueprintModal` (modal/form for creation)
- `FoundationBlueprintSection` (collapsible section in sidebar showing foundations)
- `FoundationBlueprintItem` (list item with duplicate button)
- `BlueprintHeader` (displays title, status, metadata)
- `BlueprintStatusDropdown` (status change)
- `TemplatePickerDropdown` (select template)

**File Structure**
```
app/
  api/
    projects/
      [projectId]/
        blueprints/
          route.ts (POST create, GET list with filters)
          [blueprintId]/
            route.ts (GET, PATCH update)
            duplicate/
              route.ts (POST duplicate)
  components/
    room/
      foundations/
        CreateFoundationBlueprintModal.tsx
        FoundationBlueprintSection.tsx
        FoundationBlueprintItem.tsx
  lib/
    hooks/
      useFoundationBlueprints.ts (manage foundation list state)
  lib/
    seeds/
      foundation-blueprints.ts (default foundation seeds)
```

**Acceptance Criteria**
- [ ] New project auto-creates 5 default foundation blueprints
- [ ] "New Foundation Blueprint" button opens modal with title and template picker
- [ ] Creating foundation blueprint saves to database and shows in sidebar
- [ ] Foundation blueprints display correct template sections in editor
- [ ] Title field editable inline with auto-save
- [ ] Status dropdown allows transitioning foundation status
- [ ] "Duplicate" button creates copy with "(Copy)" suffix
- [ ] Search finds foundation blueprints by title
- [ ] Foundations filter tab shows only foundation blueprints
- [ ] Metadata (created by, updated at) displays correctly
- [ ] Unsaved changes indicator visible when editing
- [ ] Content validation prevents empty saves
- [ ] Auto-save works with 500ms debounce
- [ ] RLS enforces project member access
- [ ] Project admin can delete foundations
- [ ] System template contains correct outline sections
- [ ] Org templates can be created and selected (Phase 053)

**Testing Instructions**
1. Create a new project and verify 5 default foundations auto-created in left panel
2. Click "Backend Architecture" foundation and verify it opens in editor with template sections
3. Click "New Foundation Blueprint" button and verify modal opens
4. Create custom foundation blueprint with title "Security Best Practices"
5. Verify new foundation appears in left panel under Foundations section
6. Edit foundation title inline and verify auto-save (check database)
7. Change status from Draft to In Review and verify status badge updates
8. Hover over foundation item and click "Duplicate" button
9. Verify copy created with "(Copy)" suffix and status=draft
10. Edit content in foundation blueprint and verify auto-save with debounce
11. Click Foundations filter tab and verify only foundations display
12. Search for "architecture" and verify both Backend and Frontend architectures appear
13. Switch to another foundation and verify unsaved changes warning if content modified
14. Verify project members can edit, admins can delete
15. Test validation: try to save foundation with empty content (should fail)
16. Navigate away from foundation blueprint and back, verify content persisted
