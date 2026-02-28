# Phase 113 - Organization Console

## Objective
Implement organization-level administrative console providing settings, member management, project administration, and usage visibility for organization owners and admins.

## Prerequisites
- Phase 005 (Organizations & Project Membership) completed
- Phase 009 (Roles & Permissions) completed
- Authentication and authorization system functional

## Context
Organization admins need centralized control over organization settings, member access, project administration, and usage tracking. The console provides dashboard and configuration interfaces restricted to admin-level users.

## Detailed Requirements

### Console Route & Access Control
- Route: `/org/[orgSlug]/settings`
- Accessible only to users with admin role in organization
- Redirect to projects if insufficient permissions
- Breadcrumb: Org Name > Settings

### Tabs/Sections

#### 1. General Settings Tab
- Organization name (editable)
- Organization slug (read-only after creation)
- Description/About (editable, markdown support)
- Organization avatar/logo (upload)
- Created date (read-only)
- Owner info (read-only)

#### 2. Members Tab
- List of all organization members
- Columns: Name, Email, Role, Status, Joined Date, Actions
- Sortable by: Name, Role, Joined Date
- Search by name/email
- Filtering: By role
- Actions per member:
  - Change role: dropdown (Admin, Editor, Viewer)
  - Remove from org: confirmation dialog
- Bulk actions: Change role, Remove multiple
- Member count badge

#### 3. Projects Tab
- List of all projects in organization
- Columns: Project Name, Status (active/archived), Members, Created, Actions
- Sortable and filterable
- Actions per project:
  - View project
  - Transfer to different org (if multiple)
  - Archive project (soft delete)
  - Restore archived project
- Active/Archived tabs or filter toggle
- Create project button

#### 4. Templates Tab (Future)
- Organization-wide templates
- Placeholder for future enhancement
- Link to manage templates

#### 5. Usage & Billing Tab
- Seat usage: "3 / 10 seats used"
- Storage usage: "45 GB / 500 GB"
- Project count
- Billing status
- Subscription plan (if applicable, Phase 115)
- Link to full billing dashboard (future)

#### 6. Danger Zone Tab
- Delete organization (only owner)
- Confirmation required
- Warning: "This cannot be undone. All projects and data will be permanently deleted."

## Database Changes

Ensure Phase 005 organizations schema includes:
```sql
ALTER TABLE organizations
ADD COLUMN avatar_url VARCHAR(2048),
ADD COLUMN description TEXT,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

## UI Components

### OrganizationConsole Component
```typescript
interface OrganizationConsoleProps {
  orgSlug: string;
  currentUserId: string;
}

export function OrganizationConsole({
  orgSlug,
  currentUserId,
}: OrganizationConsoleProps) {
  // Tab navigation
  // Route to current tab
  // Load organization data
}
```

### GeneralSettingsTab Component
```typescript
interface GeneralSettingsTabProps {
  organization: Organization;
  onUpdate: (updates: Partial<Organization>) => void;
  isLoading?: boolean;
}

export function GeneralSettingsTab({
  organization,
  onUpdate,
  isLoading = false,
}: GeneralSettingsTabProps) {
  // Edit form for org settings
  // Avatar upload
  // Save button
}
```

### MembersTab Component
```typescript
interface MembersTabProps {
  orgSlug: string;
  members: Member[];
  currentUserId: string;
  onMemberRemoved: (memberId: string) => void;
  onRoleChanged: (memberId: string, newRole: string) => void;
}

export function MembersTab({
  orgSlug,
  members,
  currentUserId,
  onMemberRemoved,
  onRoleChanged,
}: MembersTabProps) {
  // Member list with actions
  // Search and filter
  // Role change dropdown
  // Remove confirmation
}
```

### ProjectsTab Component
```typescript
interface ProjectsTabProps {
  orgSlug: string;
  projects: Project[];
  onArchive: (projectId: string) => void;
  onRestore: (projectId: string) => void;
}

export function ProjectsTab({
  orgSlug,
  projects,
  onArchive,
  onRestore,
}: ProjectsTabProps) {
  // Project list
  // Archive/Restore actions
  // Active/Archived filtering
  // Create project button
}
```

## File Structure
```
src/
├── app/org/
│   ├── [slug]/
│   │   ├── settings/
│   │   │   └── page.tsx         (main console page)
│   │   └── layout.tsx           (org layout)
│   └── layout.tsx               (org section layout)
├── components/
│   ├── org-console/
│   │   ├── OrganizationConsole.tsx
│   │   ├── GeneralSettingsTab.tsx
│   │   ├── MembersTab.tsx
│   │   ├── ProjectsTab.tsx
│   │   ├── UsageTab.tsx
│   │   ├── DangerZoneTab.tsx
│   │   ├── MemberRow.tsx
│   │   ├── ProjectRow.tsx
│   │   └── TabNavigation.tsx
│   └── dialogs/
│       ├── RemoveMemberDialog.tsx
│       ├── ArchiveProjectDialog.tsx
│       ├── DeleteOrgDialog.tsx
│       └── ChangeMemberRoleDialog.tsx
├── lib/
│   ├── org/
│   │   ├── queries.ts           (org queries)
│   │   ├── mutations.ts         (org mutations)
│   │   └── validation.ts        (validation)
│   └── types/
│       └── org.ts               (TypeScript types)
└── app/api/
    └── organizations/
        ├── [slug]/
        │   ├── route.ts         (GET/PATCH org)
        │   ├── members/
        │   │   ├── route.ts     (GET/POST members)
        │   │   └── [id]/
        │   │       └── route.ts (PATCH/DELETE member)
        │   └── projects/
        │       └── route.ts     (GET projects)
        └── usage/
            └── route.ts         (GET usage stats)
```

## API Routes

### GET /api/organizations/[slug]
Get organization details:

```
Headers: Authorization: Bearer token

Response:
{
  id: string,
  slug: string,
  name: string,
  description: string,
  avatar_url: string,
  owner_id: string,
  created_at: string,
  updated_at: string,
  member_count: number,
  project_count: number
}

Errors:
- 401: Unauthorized
- 403: Not organization member
- 404: Organization not found
```

### PATCH /api/organizations/[slug]
Update organization:

```
Headers: Authorization: Bearer token

Body:
{
  name?: string,
  description?: string,
  avatar_url?: string
}

Response: { success: true, organization: Organization }

Errors:
- 400: Invalid data
- 403: Not organization admin
- 409: Slug already taken
```

### GET /api/organizations/[slug]/members
List organization members:

```
Headers: Authorization: Bearer token

Query params:
- role?: string
- status?: 'active' | 'invited'
- limit: number (default 20)
- offset: number (default 0)

Response:
{
  members: [
    {
      id: string,
      user_id: string,
      name: string,
      email: string,
      role: string,
      joined_at: string,
      status: string
    }
  ],
  total_count: number
}
```

### PATCH /api/organizations/[slug]/members/[id]
Change member role:

```
Headers: Authorization: Bearer token

Body:
{
  role: 'admin' | 'editor' | 'viewer'
}

Response: { success: true, member: Member }

Errors:
- 400: Invalid role
- 403: Not organization admin
- 404: Member not found
```

### DELETE /api/organizations/[slug]/members/[id]
Remove member from organization:

```
Headers: Authorization: Bearer token

Response: { success: true }

Errors:
- 403: Cannot remove organization owner
- 404: Member not found
```

### GET /api/organizations/[slug]/usage
Get organization usage statistics:

```
Headers: Authorization: Bearer token

Response:
{
  seats: {
    used: number,
    limit: number
  },
  storage: {
    used_bytes: number,
    limit_bytes: number
  },
  projects: {
    active: number,
    archived: number
  },
  created_at: string,
  last_updated: string
}
```

## Settings Updates

### Avatar Upload
- Click avatar to open file picker
- Accept: .png, .jpg, .jpeg (max 5MB)
- Upload to Supabase Storage: `/org-avatars/{org-id}/{filename}`
- Show preview after upload
- Compress to 400x400px

### Organization Name Update
- Inline edit or modal form
- Validation: 1-255 characters, non-empty
- Slug does not change on name update
- Update timestamp reflected

### Role Change
- Dropdown select in members list
- Confirmation if changing owner's role
- Error: Cannot remove last admin
- Toast notification on success

## Authorization Checks

```typescript
function canAccessOrgConsole(user: User, org: Organization, role: string): boolean {
  // User must be org member
  // User must have admin role
  return role === 'admin';
}

function canManageMembers(user: User, org: Organization, targetMemberId: string): boolean {
  // Cannot remove organization owner
  // Owner can remove/change anyone
  // Admin can change/remove non-admins
  if (user.id === targetMemberId) return false; // Cannot self-modify
  if (user.role === 'admin') return true;
  return false;
}

function canDeleteOrg(user: User, org: Organization): boolean {
  // Only owner can delete
  return user.id === org.owner_id;
}
```

## Acceptance Criteria
- [ ] Organization console accessible at /org/[slug]/settings
- [ ] Access restricted to organization admins
- [ ] General settings tab functional with edits
- [ ] Avatar upload working with validation
- [ ] Members tab shows all members with roles
- [ ] Member search and filter working
- [ ] Change member role functional
- [ ] Remove member with confirmation working
- [ ] Cannot remove organization owner
- [ ] Cannot remove last admin
- [ ] Projects tab shows all projects
- [ ] Archive/restore project working
- [ ] Usage tab shows accurate stats
- [ ] Danger zone only visible to owner
- [ ] Delete organization with confirmation working
- [ ] API routes return correct data
- [ ] Authorization checks preventing unauthorized access
- [ ] Breadcrumb navigation working
- [ ] All tabs accessible and functional
- [ ] Responsive on mobile
- [ ] Toast notifications show on success/error

## Testing Instructions

### Authorization Tests
```typescript
// org-console.test.ts
describe('Organization Console', () => {
  it('restricts access to non-admins', () => {
    // Viewer user cannot access console
    expect(canAccessOrgConsole(viewerUser, org, 'viewer')).toBe(false);
  });

  it('allows admin access', () => {
    expect(canAccessOrgConsole(adminUser, org, 'admin')).toBe(true);
  });

  it('prevents self-modification', () => {
    expect(canManageMembers(user, org, user.id)).toBe(false);
  });
});
```

### API Tests
```bash
# Get organization
curl http://localhost:3000/api/organizations/acme-corp \
  -H "Authorization: Bearer {token}"

# Update organization
curl -X PATCH http://localhost:3000/api/organizations/acme-corp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"name": "ACME Updated"}'

# Get members
curl http://localhost:3000/api/organizations/acme-corp/members \
  -H "Authorization: Bearer {token}"

# Change member role
curl -X PATCH http://localhost:3000/api/organizations/acme-corp/members/{member-id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"role": "admin"}'

# Remove member
curl -X DELETE http://localhost:3000/api/organizations/acme-corp/members/{member-id} \
  -H "Authorization: Bearer {token}"

# Get usage
curl http://localhost:3000/api/organizations/acme-corp/usage \
  -H "Authorization: Bearer {token}"
```

### Manual Testing
1. Login as organization owner
2. Navigate to /org/[org-slug]/settings
3. Verify all tabs present
4. Update organization name
5. Verify change persists
6. Upload new avatar
7. Verify avatar displays
8. Go to Members tab
9. Search for member by name
10. Change member role
11. Verify role change confirmed
12. Remove member with confirmation
13. Verify member removed from list
14. Go to Projects tab
15. Verify all projects listed
16. Archive a project
17. Verify appears in archived tab
18. Restore archived project
19. Go to Usage tab
20. Verify stats displayed correctly
21. Go to Danger Zone
22. Test delete organization confirmation
23. Test as non-admin user
24. Verify access denied (403)
