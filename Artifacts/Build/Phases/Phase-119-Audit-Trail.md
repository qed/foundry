# Phase 119 - Audit Trail & Activity Log

## Objective
Implement comprehensive audit trail tracking all user actions across the platform with detailed logging, filtering, and analysis capabilities for compliance and transparency.

## Prerequisites
- Phase 002 (Project Schema & Core Tables) completed
- All entity creation and modification phases completed
- User authentication system functional

## Context
Organizations need visibility into who did what and when for compliance, debugging, and understanding project evolution. The activity log captures create, update, delete, and status change actions across all entities.

## Detailed Requirements

### Database Schema

#### activity_log table
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_project (project_id),
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_entity (entity_type, entity_id),
  INDEX idx_activity_action (action),
  INDEX idx_activity_created_at (created_at DESC)
);
```

### Action Types

#### Create Actions
- `idea_created`
- `feature_created`
- `blueprint_created`
- `work_order_created`
- `feedback_created`
- `requirement_document_created`
- `artifact_uploaded`
- `comment_created`

#### Update Actions
- `idea_updated`
- `feature_updated`
- `blueprint_updated`
- `work_order_updated`
- `feedback_updated`
- `requirement_document_updated`
- `artifact_moved`
- `comment_edited`

#### Delete Actions
- `idea_deleted`
- `feature_deleted`
- `blueprint_deleted`
- `work_order_deleted`
- `feedback_deleted`
- `artifact_deleted`
- `comment_deleted`

#### Status Change Actions
- `feature_status_changed`
- `work_order_status_changed`
- `feedback_severity_changed`

#### Collaboration Actions
- `member_added`
- `member_removed`
- `member_role_changed`
- `project_archived`
- `project_restored`
- `connection_created`
- `connection_removed`
- `version_restored`

#### Other Actions
- `settings_updated`
- `invitation_sent`
- `invitation_accepted`

### Details Field Structure

#### Example: feature_updated
```typescript
{
  previous_values: {
    name: "Old Name",
    status: "draft",
    priority: "high"
  },
  new_values: {
    name: "New Name",
    status: "in_progress",
    priority: "medium"
  },
  changed_fields: ["name", "status", "priority"],
  change_summary: "Updated name, status, and priority"
}
```

#### Example: connection_created
```typescript
{
  source_type: "feature",
  source_id: "feature-123",
  source_name: "User Authentication",
  target_type: "blueprint",
  target_id: "blueprint-456",
  target_name: "Auth System Design",
  connection_type: "depends_on"
}
```

### Activity Log Capture

#### Middleware/Hook Pattern
```typescript
async function logActivity(
  projectId: string,
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  details?: any,
  request?: Request
) {
  const ip = request?.headers?.get('x-forwarded-for') || 'unknown';
  const userAgent = request?.headers?.get('user-agent') || 'unknown';

  await db.insert('activity_log', {
    project_id: projectId,
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    details: details || {},
    ip_address: ip,
    user_agent: userAgent,
    created_at: new Date(),
  });
}
```

#### API Route Wrapper
```typescript
async function withActivityLog<T>(
  fn: (req: Request) => Promise<T>,
  logConfig: ActivityLogConfig
): Promise<T> {
  const result = await fn(req);

  // Log after successful operation
  if (result.success) {
    await logActivity(
      logConfig.projectId,
      logConfig.userId,
      logConfig.entityType,
      logConfig.entityId,
      logConfig.action,
      logConfig.details,
      req
    );
  }

  return result;
}
```

### Activity Log Viewer

#### ActivityLogPage Component
```typescript
// Route: /project/[slug]/activity-log
interface ActivityLogPageProps {
  projectId: string;
}

export function ActivityLogPage({ projectId }: ActivityLogPageProps) {
  // Filterable activity log list
  // Show all activities for project
}
```

#### ActivityLogViewer Component
```typescript
interface ActivityLogViewerProps {
  projectId: string;
  filters?: ActivityLogFilters;
  onFiltersChange?: (filters: ActivityLogFilters) => void;
}

export function ActivityLogViewer({
  projectId,
  filters,
  onFiltersChange,
}: ActivityLogViewerProps) {
  // List with filtering and sorting
  // Real-time updates (if needed)
}
```

#### ActivityItem Component
```typescript
interface ActivityItemProps {
  activity: ActivityLog;
  onViewDetails?: () => void;
}

export function ActivityItem({
  activity,
  onViewDetails,
}: ActivityItemProps) {
  // Shows user, action, entity, timestamp
  // Click to view full details
}
```

### Filtering & Search

#### Filter Criteria
- User: Select specific user or all
- Action type: Select action or category
- Entity type: Select entity type or all
- Date range: From date, to date
- Search: Full-text search in entity names/details
- Status: All, created, updated, deleted, etc.

#### API Routes

##### GET /api/activity-log
List activity log:

```
Query params:
- project_id: string (required)
- user_id?: string
- action?: string
- entity_type?: string
- entity_id?: string
- from_date?: ISO timestamp
- to_date?: ISO timestamp
- search?: string
- limit: number (default 50, max 100)
- offset: number (default 0)

Response:
{
  activities: [
    {
      id: string,
      user: { id, name, avatar },
      action: string,
      entity_type: string,
      entity_id: string,
      entity_name: string,
      details: object,
      created_at: string
    }
  ],
  total_count: number
}
```

##### GET /api/activity-log/[id]
Get activity details:

```
Response:
{
  id: string,
  project_id: string,
  user: { id, name, email, avatar },
  action: string,
  entity_type: string,
  entity_id: string,
  entity_name: string,
  details: object,
  ip_address: string,
  user_agent: string,
  created_at: string
}
```

### Entity-Level Activity

#### Per-Entity Activity Tab
Show activity for specific entity:
- Located on entity detail views
- Shows only activities related to that entity
- Filtered by entity_type and entity_id
- Newest first

#### Example: Feature Detail > Activity Tab
- All actions on that feature
- Comments added to feature
- Connections created
- Status changes

## File Structure
```
src/
├── components/
│   ├── activity/
│   │   ├── ActivityLogViewer.tsx
│   │   ├── ActivityItem.tsx
│   │   ├── ActivityFilters.tsx
│   │   ├── ActivityDetails.tsx
│   │   └── ActivityTimeline.tsx
│   └── shared/
│       └── ActivityBadge.tsx     (show on entity headers)
├── lib/
│   ├── activity/
│   │   ├── logging.ts            (log activity function)
│   │   ├── queries.ts            (fetch activities)
│   │   └── utils.ts              (format activity messages)
│   └── types/
│       └── activity.ts           (TypeScript types)
├── hooks/
│   └── useActivityLog.ts         (activity log hook)
├── app/
│   └── project/
│       └── [slug]/
│           └── activity-log/
│               └── page.tsx      (activity log page)
└── app/api/
    └── activity-log/
        ├── route.ts              (GET list)
        └── [id]/
            └── route.ts          (GET details)
```

## Integration Points

### When Logging Activity
1. After successful database mutations
2. Include before/after values for updates
3. Include related entity details
4. Capture user IP and user agent
5. Handle batch operations (loop and log each)

### Activity Notification
- Recent activity visible on project dashboard
- Activity feed showing latest 10 activities
- Real-time updates if using Realtime

## Acceptance Criteria
- [ ] activity_log table created with proper indexes
- [ ] Activity logged on all create operations
- [ ] Activity logged on all update operations
- [ ] Activity logged on all delete operations
- [ ] Activity logged on status changes
- [ ] Activity logged on member additions/removals
- [ ] Details field captures before/after values
- [ ] IP address and user agent captured
- [ ] ActivityLogViewer component renders log
- [ ] Filtering by user working
- [ ] Filtering by action working
- [ ] Filtering by entity type working
- [ ] Filtering by date range working
- [ ] Search functionality working
- [ ] Per-entity activity tab functional
- [ ] Activity formatted as human-readable messages
- [ ] Timestamps formatted user-friendly
- [ ] User avatars and names display
- [ ] Performance: loading 100 activities < 500ms
- [ ] Pagination working
- [ ] Authorization checks (users see own org activities)

## Testing Instructions

### Database Tests
```sql
-- Create activity log entry
INSERT INTO activity_log
  (project_id, user_id, entity_type, entity_id, action, details)
VALUES
  ('{project-id}', '{user-id}', 'feature', '{feature-id}', 'feature_created',
   '{"name": "New Feature", "status": "draft"}');

-- Query activities by entity
SELECT * FROM activity_log
WHERE entity_type = 'feature' AND entity_id = '{feature-id}'
ORDER BY created_at DESC;

-- Count activities by action
SELECT action, COUNT(*) as count
FROM activity_log
WHERE project_id = '{project-id}'
GROUP BY action;
```

### API Tests
```bash
# Get activity log
curl "http://localhost:3000/api/activity-log?project_id={project-id}" \
  -H "Authorization: Bearer {token}"

# Filter by user
curl "http://localhost:3000/api/activity-log?project_id={project-id}&user_id={user-id}" \
  -H "Authorization: Bearer {token}"

# Filter by action
curl "http://localhost:3000/api/activity-log?project_id={project-id}&action=feature_created" \
  -H "Authorization: Bearer {token}"

# Filter by date range
curl "http://localhost:3000/api/activity-log?project_id={project-id}&from_date=2025-01-01&to_date=2025-01-31" \
  -H "Authorization: Bearer {token}"

# Get activity details
curl http://localhost:3000/api/activity-log/{activity-id} \
  -H "Authorization: Bearer {token}"
```

### Manual Testing
1. Navigate to project
2. Create new feature
3. Go to Activity Log
4. Verify feature_created activity appears
5. Edit feature (change name, status, priority)
6. Verify feature_updated activity with before/after values
7. Filter by user
8. Verify only activities from that user show
9. Filter by action: "feature_created"
10. Verify only creation activities show
11. Filter by date range
12. Verify only activities in range show
13. Navigate to feature detail page
14. Click "Activity" tab
15. Verify only activities for that feature show
16. Search for activity
17. Verify matching results
18. Add comment to feature
19. Verify comment_created activity logged
20. Delete feature
21. Verify feature_deleted activity logged
22. Add member to project
23. Verify member_added activity logged
24. Check activity shows member details
25. Verify timestamps accurate
26. Verify user names and avatars display
