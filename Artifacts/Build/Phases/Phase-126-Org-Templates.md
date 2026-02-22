# Phase 126: Control Room - Org-Level Blueprint Templates

## Objective
Enable organization administrators to create and manage reusable blueprint templates that are available to all projects within the organization.

## Prerequisites
- Phase 053: Control Room - Blueprint Templates (project-level templates)
- Phase 113: Organization Console (org admin features)
- Template picker and creation UI from Phase 053

## Context
Organizations often have standard blueprint patterns used across multiple projects. Rather than creating templates for each project, org-level templates allow admins to define templates once and make them available to all projects, ensuring consistency across the organization.

## Detailed Requirements

### Database Schema
```sql
CREATE TABLE org_blueprint_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  content JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  is_archived BOOLEAN DEFAULT false
);

CREATE TABLE org_template_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES org_blueprint_templates(id) ON DELETE CASCADE,
  default_sections TEXT[],
  recommended_artifacts TEXT[],
  suggested_stakeholders TEXT[],
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_org_templates_org ON org_blueprint_templates(org_id);
CREATE INDEX idx_org_templates_archived ON org_blueprint_templates(is_archived);
```

### Organization Console UI
- New section: "Organization Settings > Blueprint Templates"
- Templates list showing:
  - Template name
  - Category
  - Description
  - Created by (user name)
  - Created date
  - Last updated
  - "Active" or "Archived" status
  - Actions: Edit, Duplicate, Archive, Delete

- **Create/Edit Template Modal:**
  - Template name (required)
  - Description (optional)
  - Category dropdown (e.g., "Architecture", "Feature Development", "API", "Database")
  - Template content editor (rich text or markdown)
  - Default sections checklist (predefined options)
  - Recommended artifacts (tags)
  - Suggested stakeholders (role-based)
  - Save as Draft or Publish

- **Archive vs Delete:**
  - Archive: template hidden from new projects, existing blueprints using it still work
  - Delete: only allowed if no blueprints in any project currently use the template

### Template Availability
- When creating blueprint in any project:
  - Template picker shows: org templates + project templates
  - Org templates grouped under "Organization Templates"
  - Visual distinction (e.g., org badge) to indicate org-level
  - Read-only indicator (org templates can't be modified at project level, only used as-is)

- When using org template:
  - Blueprint created with template content
  - Blueprint can be edited freely after creation
  - Link back to template visible (with version info)
  - If template is updated, blueprint shows "New template version available"

### API Endpoints
- `GET /api/organizations/:orgId/templates` - List all templates
- `POST /api/organizations/:orgId/templates` - Create new template
- `PATCH /api/organizations/:orgId/templates/:templateId` - Update template
- `DELETE /api/organizations/:orgId/templates/:templateId` - Delete template
- `PATCH /api/organizations/:orgId/templates/:templateId/archive` - Archive template
- `GET /api/organizations/:orgId/templates/:templateId/usage` - See which projects/blueprints use template

### Permissions
- Only org admin can create/edit/delete org templates
- All org members can view and use org templates
- Project members can still create project-specific templates
- Org templates take precedence in UI (listed first in template picker)

### Migration from Project Templates
- Provide UI to promote a project template to org level:
  - In project template list: "Promote to Organization"
  - Move template to org level
  - Make available to all projects
  - Original project template can be deleted or archived

## File Structure
```
/app/api/organizations/[orgId]/templates/route.ts
/app/api/organizations/[orgId]/templates/[templateId]/route.ts
/app/api/organizations/[orgId]/templates/[templateId]/archive/route.ts
/app/api/organizations/[orgId]/templates/[templateId]/usage/route.ts
/app/components/OrganizationConsole/Templates/TemplatesList.tsx
/app/components/OrganizationConsole/Templates/CreateEditTemplateModal.tsx
/app/components/OrganizationConsole/Templates/TemplateUsagePanel.tsx
/app/components/ControlRoom/TemplatePickerIntegration.tsx (updated)
/app/lib/supabase/migrations/create-org-templates.sql
/app/hooks/useOrgTemplates.ts
```

## Acceptance Criteria
- [ ] org_blueprint_templates table created with correct schema
- [ ] Org admin can access "Templates" section in Organization Console
- [ ] Create template modal displays with all required fields
- [ ] Templates can be created and saved successfully
- [ ] Templates can be edited (name, description, content, category)
- [ ] Templates can be archived (hidden but preserve usage history)
- [ ] Templates can be deleted (only if no blueprints use them)
- [ ] Archive/delete actions show confirmation dialog
- [ ] Attempting to delete in-use template shows "In use by X blueprints" message
- [ ] Template list shows all org templates with correct metadata
- [ ] When creating blueprint, org templates appear in template picker
- [ ] Org templates are grouped separately from project templates
- [ ] Using org template creates blueprint with correct content
- [ ] Blueprints created from org templates can be freely edited
- [ ] Template usage page shows all projects/blueprints using a template
- [ ] Only org admins can manage org templates
- [ ] Promoted project templates become org templates
- [ ] Multiple projects can use the same org template
- [ ] Template versioning works (shows when updates available)

## Testing Instructions
1. Log in as organization admin
2. Navigate to Organization Console > Settings > Blueprint Templates
3. Click "Create Template"
4. Fill in:
   - Name: "Standard API Endpoint"
   - Description: "Template for REST API endpoint blueprints"
   - Category: "API"
   - Content: "## Endpoint Overview\n## Request/Response Schema\n## Error Handling\n## Security Considerations"
5. Click Save
6. Verify template appears in list
7. Create another template for database design
8. Go to a project and create a new blueprint
9. In template picker, verify "Organization Templates" section shows both templates
10. Select "Standard API Endpoint" template
11. Verify blueprint is created with that content
12. Edit blueprint and modify content
13. Go back to Organization Console and open template usage page for "Standard API Endpoint"
14. Verify it shows blueprints in multiple projects using it
15. Test archive: archive "Standard API Endpoint" template
16. Create a new blueprint and verify archived template doesn't appear in picker
17. Verify existing blueprints using archived template still display correctly
18. Try to delete a template that's in use - verify error appears
19. Archive the template first, then verify delete is allowed
20. Test promoting project template: in project templates, select one and promote to org level
21. Verify it now appears in org templates list
