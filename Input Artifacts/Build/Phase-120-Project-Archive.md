# Phase 120 - Project Archive & Cleanup

## Objective
Implement project archival (soft delete) functionality allowing organizations to hide completed projects while preserving data, with restoration capability and read-only access to archived projects.

## Prerequisites
- Phase 005 (Organizations & Project Membership) completed
- Phase 002 (Project Schema & Core Tables) completed
- Phase 113 (Organization Console) completed

## Context
Projects completed and no longer active should be archived to reduce clutter while maintaining historical data access. Archive provides organizational clarity without data loss.

## Detailed Requirements

### Database Schema Changes

#### Update projects table
```sql
ALTER TABLE projects
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_archived ON projects(organization_id, is_archived);
CREATE INDEX idx_projects_archived_at ON projects(archived_at DESC);
```

### Archive Operations

#### Archive Project
```typescript
async function archiveProject(
  projectId: string,
  userId: string
): Promise<Project> {
  const result = await db.update('projects', {
    is_archived: true,
    archived_at: new Date(),
    archived_by: userId,
  }).where({ id: projectId });

  // Log activity
  await logActivity({
    project_id: projectId,
    user_id: userId,
    entity_type: 'project',
    entity_id: projectId,
    action: 'project_archived',
    details: { message: 'Project archived' },
  });

  return result;
}
```

#### Restore Project
```typescript
async function restoreProject(
  projectId: string,
  userId: string
): Promise<Project> {
  const result = await db.update('projects', {
    is_archived: false,
    archived_at: null,
    archived_by: null,
  }).where({ id: projectId });

  // Log activity
  await logActivity({
    project_id: projectId,
    user_id: userId,
    entity_type: 'project',
    entity_id: projectId,
    action: 'project_restored',
    details: { message: 'Project restored' },
  });

  return result;
}
```

### Project List Filtering

#### Active vs Archived Tabs
- Organization Console > Projects tab
- Two sub-tabs: "Active" and "Archived"
- Active tab: only is_archived = false
- Archived tab: only is_archived = true
- Counts shown on tabs

#### Default View
- Default view shows active projects
- Archived tab shows archived projects
- Toggle between tabs

### Read-Only Access to Archived Projects

#### Access Control
- Archived projects still accessible
- All operations read-only
- Cannot edit entities
- Cannot add members
- Cannot upload artifacts
- Can view all content
- Can comment (optional: allow or disable comments)

#### UI Indication
- "Archived" badge in header
- Gray-out styling indicating read-only
- Warning banner: "This project is archived and read-only"
- Disable all edit buttons/forms

### Archive UI Components

#### ArchiveProjectDialog Component
```typescript
interface ArchiveProjectDialogProps {
  project: Project;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArchiveProjectDialog({
  project,
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: ArchiveProjectDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onCancel}>
      <DialogTitle>Archive Project?</DialogTitle>
      <DialogContent>
        <p>
          You are about to archive "{project.name}". This project will be moved to
          the Archived tab and become read-only.
        </p>
        <p>
          <strong>You can restore this project later.</strong>
        </p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onConfirm}
          isLoading={isLoading}
          variant="danger"
        >
          Archive Project
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

#### RestoreProjectDialog Component
```typescript
interface RestoreProjectDialogProps {
  project: Project;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestoreProjectDialog({
  project,
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: RestoreProjectDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onCancel}>
      <DialogTitle>Restore Project?</DialogTitle>
      <DialogContent>
        <p>
          You are about to restore "{project.name}". This project will be moved
          to the Active tab and become editable again.
        </p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onConfirm}
          isLoading={isLoading}
          variant="primary"
        >
          Restore Project
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

#### ProjectList Component with Tabs
```typescript
interface ProjectsTabProps {
  orgSlug: string;
  projects: Project[];
  archivedProjects: Project[];
  onArchive: (projectId: string) => void;
  onRestore: (projectId: string) => void;
}

export function ProjectsTab({
  orgSlug,
  projects,
  archivedProjects,
  onArchive,
  onRestore,
}: ProjectsTabProps) {
  const [activeTab, setActiveTab] = useState('active');

  const projectsToShow = activeTab === 'active' ? projects : archivedProjects;

  return (
    <div>
      <div className="flex gap-4 mb-4 border-b">
        <button
          onClick={() => setActiveTab('active')}
          className={activeTab === 'active' ? 'border-b-2 border-blue-500' : ''}
        >
          Active ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={activeTab === 'archived' ? 'border-b-2 border-blue-500' : ''}
        >
          Archived ({archivedProjects.length})
        </button>
      </div>

      <ProjectListItems
        projects={projectsToShow}
        onArchive={onArchive}
        onRestore={activeTab === 'archived' ? onRestore : undefined}
      />
    </div>
  );
}
```

### Project Header Indication

#### ArchivedBadge Component
```typescript
interface ArchivedBadgeProps {
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: User;
}

export function ArchivedBadge({
  isArchived,
  archivedAt,
  archivedBy,
}: ArchivedBadgeProps) {
  if (!isArchived) return null;

  return (
    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded">
      <span className="text-xs font-semibold text-gray-600">ARCHIVED</span>
      {archivedAt && (
        <span className="text-xs text-gray-500">
          on {formatDate(new Date(archivedAt))}
        </span>
      )}
    </div>
  );
}
```

### API Routes

#### GET /api/projects
List projects (already supports filtering):

```
Query params:
- organization_id: string
- is_archived?: boolean (optional, filter by archive status)

Response:
{
  projects: [
    {
      id: string,
      name: string,
      is_archived: boolean,
      archived_at?: string,
      archived_by?: { id, name },
      ...
    }
  ],
  active_count: number,
  archived_count: number
}
```

#### POST /api/projects/[id]/archive
Archive project:

```
Headers: Authorization: Bearer token

Response:
{
  success: true,
  project: Project
}

Errors:
- 403: Not organization admin
- 404: Project not found
```

#### POST /api/projects/[id]/restore
Restore archived project:

```
Headers: Authorization: Bearer token

Response:
{
  success: true,
  project: Project
}

Errors:
- 403: Not organization admin
- 404: Project not found
- 400: Project is not archived
```

### Edit Protection for Archived Projects

#### Middleware Check
```typescript
export function requireProjectNotArchived(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    const projectId = extractProjectId(req);
    const project = await getProject(projectId);

    if (project.is_archived) {
      return new Response(
        JSON.stringify({ error: 'Project is archived and read-only' }),
        { status: 403 }
      );
    }

    return handler(req);
  };
}
```

Apply to all edit endpoints:
- Create entities (ideas, features, etc.)
- Update entities
- Delete entities
- Add members
- Upload artifacts
- Update project settings

## File Structure
```
src/
├── components/
│   ├── projects/
│   │   ├── ProjectsTab.tsx       (in org console)
│   │   ├── ProjectListItems.tsx
│   │   ├── ArchivedBadge.tsx
│   │   ├── ArchiveProjectDialog.tsx
│   │   └── RestoreProjectDialog.tsx
│   └── shared/
│       └── ReadOnlyBanner.tsx
├── lib/
│   ├── projects/
│   │   ├── archive.ts           (archive/restore logic)
│   │   └── permissions.ts       (archived project access)
│   └── types/
│       └── projects.ts
└── app/api/
    └── projects/
        └── [id]/
            ├── archive/
            │   └── route.ts
            └── restore/
                └── route.ts
```

## Acceptance Criteria
- [ ] is_archived and related columns added to projects table
- [ ] Archive project function working with validation
- [ ] Restore project function working
- [ ] ProjectsTab shows Active and Archived tabs
- [ ] Active tab shows only is_archived = false
- [ ] Archived tab shows only is_archived = true
- [ ] Counts accurate on tabs
- [ ] Archive dialog confirmation required
- [ ] Restore dialog confirmation required
- [ ] ArchivedBadge shows in project header
- [ ] Read-only banner displays in archived projects
- [ ] All edit operations disabled for archived projects
- [ ] API returns 403 for edit attempts on archived projects
- [ ] Comments allowed on archived projects (if specified)
- [ ] Activity log shows archive/restore actions
- [ ] Can still view all content in archived projects
- [ ] Can download artifacts from archived projects
- [ ] Cannot add members to archived projects
- [ ] Cannot create new entities in archived projects
- [ ] Authorization checks prevent non-admins from archiving
- [ ] Archived projects not counted in active project quota

## Testing Instructions

### API Tests
```bash
# Archive project
curl -X POST http://localhost:3000/api/projects/{project-id}/archive \
  -H "Authorization: Bearer {token}"

# Try to edit archived project (should fail)
curl -X POST http://localhost:3000/api/ideas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "project_id": "{archived-project-id}",
    "title": "New Idea"
  }'
# Expected: 403 error "Project is archived and read-only"

# Restore project
curl -X POST http://localhost:3000/api/projects/{project-id}/restore \
  -H "Authorization: Bearer {token}"
```

### Manual Testing
1. Login as organization admin
2. Navigate to /org/[slug]/settings#projects
3. Find an active project
4. Click archive button
5. Verify confirmation dialog appears
6. Click "Archive Project"
7. Verify project disappears from Active tab
8. Click "Archived" tab
9. Verify project appears in Archived tab
10. Verify archived date and admin name shown
11. Click project name to open it
12. Verify "ARCHIVED" badge in header
13. Verify "This project is read-only" banner
14. Try to create new feature → error
15. Try to edit existing feature → disabled buttons
16. Verify can still view all content
17. Click "Restore Project"
18. Verify confirmation dialog
19. Confirm restore
20. Verify project moves to Active tab
21. Verify banner removed
22. Verify can edit again
23. Test with multiple archived projects
24. Test as non-admin (cannot archive)
25. Verify activity log shows archive/restore
