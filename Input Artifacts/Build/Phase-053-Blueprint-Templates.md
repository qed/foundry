# Phase 053 - Blueprint Templates

**Objective:** Implement system and organization-level blueprint templates to standardize blueprint structure and guide engineers.

**Prerequisites:**
- Phase 046 (Database schema with blueprint_templates table)
- Phase 048 (Foundation blueprints)
- Phase 050 (System diagrams)
- Phase 051 (Feature blueprints)

**Context:**
Blueprint templates define the structure and placeholder text for blueprints. System templates are provided by Helix Foundry and cover the default blueprint types. Organization templates allow teams to customize structure for their specific needs. Templates improve consistency, reduce onboarding time, and guide engineers on what information is required.

**Detailed Requirements:**

1. **System Templates (Default)**
   - Pre-seeded in database, available to all organizations
   - Four system templates:
     1. **Foundation Blueprint Template**
        - Type: foundation
        - Sections:
          - Overview
          - Technology Choices
          - Architectural Principles
          - Conventions
          - Constraints & Limitations
     2. **System Diagram Blueprint Template**
        - Type: system_diagram
        - Sections:
          - Diagram Code (Mermaid syntax)
          - Legend/Key (if needed)
     3. **Feature Blueprint Template**
        - Type: feature
        - Sections:
          - Solution Overview
          - API Endpoints
          - UI Components & Behavior
          - Data Model Changes
          - Business Logic
          - Testing Requirements
          - Dependencies
     4. **Flowchart Diagram Template** (optional, specific to system_diagram)
        - Pre-configured with sample flowchart code

   - System templates stored with `org_id = NULL` and `is_default = true`

2. **Organization Templates**
   - Custom templates created by org admins
   - Inherits or overrides system templates
   - Stored with `org_id = [organization_id]` and `is_default = false`
   - Example: custom foundation template with org-specific sections
   - Can be marked as organization default

3. **Template Structure (outline_content JSONB)**
   ```json
   {
     "description": "Short description of template purpose",
     "sections": [
       {
         "id": "overview",
         "title": "Overview",
         "placeholder": "Provide a brief overview...",
         "required": true,
         "help_text": "Optional guidance text"
       },
       {
         "id": "technology",
         "title": "Technology Choices",
         "placeholder": "List key technologies...",
         "required": true,
         "help_text": "Include versions and rationale"
       }
     ]
   }
   ```

4. **Template Picker UI**
   - When creating new blueprint:
     - Modal/form includes "Template" dropdown (optional)
     - Dropdown shows:
       - System templates (section header "System Templates")
       - Organization templates (section header "Organization Templates")
       - Preview of template on hover (tooltip or side panel)
     - Default: auto-selects appropriate system template based on blueprint type
     - Clicking template shows:
       - Template name
       - Description
       - Preview of sections
   - Selecting template pre-populates blueprint content with placeholder text

5. **Template Preview**
   - Clicking template shows modal:
     - Template name and description
     - List of sections with placeholder text
     - "Use This Template" button
     - "Cancel" button
   - Or: side-by-side view (template list left, preview right)

6. **Template Management (Admin)**
   - Page: `/org/[orgSlug]/settings/templates` or `/org/[orgSlug]/admin/templates`
   - List existing templates:
     - Name, type, created by, creation date
     - System templates: read-only (lock icon)
     - Organization templates: editable, deletable
   - Create new template:
     - Modal/form:
       - Name (required, unique per org)
       - Blueprint type (required): Foundation, System Diagram, Feature
       - Description (optional)
       - Sections (dynamic list):
         - Add/delete section buttons
         - For each section:
           - Section title
           - Placeholder text
           - Required checkbox
           - Help text
       - Mark as organization default (checkbox)
       - "Create" button
   - Edit template:
     - Same form as create, with Update button
     - Cannot edit system templates
   - Delete template:
     - Confirmation dialog: "Are you sure? Existing blueprints using this template won't be affected."
     - "Delete" button
   - Set as default:
     - Radio button to mark template as default for its blueprint type
     - Only one default per blueprint type per org

7. **Template Usage**
   - When creating blueprint with template:
     - Content pre-populated with section structure
     - Each section has placeholder text from template
     - Sections are not locked (user can modify structure)
   - Template ID stored in blueprint metadata (for reference, not constraint)
   - Updating template doesn't affect existing blueprints (one-time use)

8. **API Routes**
   ```
   GET /api/orgs/[orgId]/blueprint-templates
     Query: { type?: 'foundation' | 'system_diagram' | 'feature' }
     Returns: { system_templates: [...], org_templates: [...] }

   POST /api/orgs/[orgId]/blueprint-templates
     Body: {
       name,
       blueprint_type,
       outline_content,
       description?,
       is_default?
     }
     Returns: { id, created_at, ... }

   PATCH /api/orgs/[orgId]/blueprint-templates/[templateId]
     Body: { name?, outline_content?, description?, is_default? }
     Returns: updated template

   DELETE /api/orgs/[orgId]/blueprint-templates/[templateId]
     Returns: { deleted: true }

   GET /api/projects/[projectId]/blueprint-templates
     Query: { type?: string }
     Returns: { system_templates, org_templates }
   ```

9. **Database Seeding**
   - Migration includes seed data for system templates:
     ```sql
     INSERT INTO blueprint_templates (name, blueprint_type, outline_content, is_default, org_id)
     VALUES
       ('Foundation Blueprint', 'foundation', {...}, true, NULL),
       ('System Diagram', 'system_diagram', {...}, true, NULL),
       ('Feature Blueprint', 'feature', {...}, true, NULL);
     ```
   - Seeds run once on first migration

10. **RLS Policies**
    - System templates: visible to all authenticated users
    - Org templates: visible to org members only
    - Create org templates: org admin only
    - Update/delete org templates: org admin only

11. **Validation**
    - Template name: required, 1-255 chars, unique per org per type
    - Blueprint type: required enum value
    - Sections: at least 1 section required
    - Section title: required, 1-100 chars
    - Placeholder text: optional, max 2000 chars

12. **Search & Discovery**
    - Template picker searchable by name and description
    - Filter by blueprint type
    - Suggested templates (most-used templates highlighted)

**UI Components**
- `BlueprintTemplateSelector` (dropdown/modal in create blueprint form)
- `BlueprintTemplatePreview` (preview modal/panel)
- `BlueprintTemplateList` (admin page listing templates)
- `CreateBlueprintTemplateForm` (modal for creating/editing templates)
- `SectionEditor` (component for editing template sections)
- `TemplateTypeIcon` (icon for blueprint type)

**File Structure**
```
app/
  api/
    orgs/
      [orgId]/
        blueprint-templates/
          route.ts (GET list, POST create)
          [templateId]/
            route.ts (GET, PATCH update, DELETE)
    projects/
      [projectId]/
        blueprint-templates/
          route.ts (GET system + org templates)
  org/
    [orgSlug]/
      settings/
        templates/
          page.tsx (template management page)
          [templateId]/
            page.tsx (edit template)
  components/
    room/
      BlueprintTemplateSelector.tsx
      BlueprintTemplatePreview.tsx
    settings/
      BlueprintTemplateList.tsx
      CreateBlueprintTemplateForm.tsx
      SectionEditor.tsx
  lib/
    seeds/
      blueprint-templates.ts (system template definitions)
    hooks/
      useBlueprintTemplates.ts (fetch templates)
```

**Acceptance Criteria**
- [ ] System templates for all 4 types exist in database
- [ ] System templates visible to all users (org_id = NULL)
- [ ] Blueprint template picker shows system templates in create form
- [ ] Blueprint template picker shows organization templates
- [ ] Selecting template pre-populates blueprint with section placeholders
- [ ] Organization admins can create custom templates
- [ ] Template management page shows system templates as read-only
- [ ] Template management page shows org templates as editable
- [ ] Creating org template saves to database with org_id
- [ ] Editing org template updates database
- [ ] Deleting org template removes from database
- [ ] Can mark org template as default (only one default per type per org)
- [ ] Template sections can be added/removed when creating template
- [ ] Template preview shows all sections with placeholder text
- [ ] API returns both system and org templates in one call
- [ ] RLS enforces: org members see org templates, non-members don't
- [ ] Validation prevents empty template names or sections
- [ ] Validation prevents duplicate template names within org
- [ ] Existing blueprints unaffected when template deleted
- [ ] Template search works by name and description
- [ ] Icon shows for each blueprint type in picker

**Testing Instructions**
1. Navigate to Control Room and create new blueprint
2. Verify template dropdown includes Foundation, System Diagram, Feature templates
3. Select Feature Blueprint template from dropdown
4. Verify blueprint opens with all feature template sections pre-filled
5. Navigate to org settings → Templates page
6. Verify system templates listed as read-only (lock icon)
7. Verify org templates listed as editable
8. Click "Create Template" button
9. Create custom foundation template with custom sections:
    - Overview
    - Tech Stack (custom name)
    - Principles
    - Custom Guidelines (new section)
10. Verify template saved to database
11. Navigate to Control Room and create new blueprint
12. Verify custom template appears in template picker under "Organization Templates"
13. Select custom template and verify blueprint uses custom section names
14. Return to template management and edit custom template
15. Add new section, remove a section, change descriptions
16. Verify changes saved
17. Click template to view as default (should only allow one default per type)
18. Verify mark as default works
19. Delete custom template
20. Verify template removed from list and from template picker
21. Try to create template with duplicate name (should fail validation)
22. Try to create template with no sections (should fail validation)
23. Test template preview: hover over/click template to see preview modal
24. Test template search: search by template name in picker
25. Create two blueprints from same template, verify both created independently
26. Edit one blueprint's structure, verify other blueprint unaffected
27. Test RLS: login as non-org-member, verify cannot see org templates (system templates visible)
28. Test template with special characters and long placeholder text
