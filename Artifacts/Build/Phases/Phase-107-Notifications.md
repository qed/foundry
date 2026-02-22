# Phase 107 - Notification System

## Objective
Implement in-app notification system with bell icon, dropdown list, read status tracking, and notification types for mentions, comments, assignments, and status changes.

## Prerequisites
- Phase 105 (Comments System Foundation) completed
- Phase 106 (@Mentions System) completed
- User authentication system functional

## Context
Users need real-time awareness of activity relevant to them: when they're mentioned, assigned tasks, or comments are made on their content. The notification system consolidates these events in one accessible location.

## Detailed Requirements

### Database Schema

#### notifications table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link_url VARCHAR(2048),
  source_entity_type VARCHAR(50),
  source_entity_id UUID,
  triggered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  CHECK (type IN ('mention', 'comment', 'assignment', 'status_change', 'feedback'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_project ON notifications(project_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);
```

### Notification Types

#### Mention Notification
- Triggered when user mentioned in comment or document
- Title: "You were mentioned"
- Body: Preview of comment or sentence with mention
- Link: URL to entity with mention
- TriggerredByUser: User who mentioned

#### Comment Notification
- Triggered when comment added to entity user owns/follows
- Title: "New comment on [Entity Name]"
- Body: Comment preview (first 100 chars)
- Link: URL to entity
- TriggeredByUser: Comment author

#### Assignment Notification
- Triggered when user assigned to work order (future phase)
- Title: "You were assigned to [Work Order]"
- Body: Work order title and priority
- Link: URL to work order
- TriggeredByUser: User who assigned

#### Status Change Notification
- Triggered when entity status changes (future phase)
- Title: "[Entity Name] status changed to [Status]"
- Body: Previous status → new status
- Link: URL to entity
- TriggeredByUser: User who changed status

#### Feedback Notification
- Triggered when feedback submitted on entity (future phases)
- Title: "New feedback on [Entity]"
- Body: Feedback preview
- Link: URL to feedback
- TriggeredByUser: Feedback author

### Header Notification Bell

#### Bell Icon Component
```typescript
interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBell({
  unreadCount,
  onClick,
}: NotificationBellProps) {
  return (
    <button onClick={onClick} className="relative">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
```

#### Notification Dropdown
- Positioned below bell icon
- Shows recent notifications (newest first)
- Click notification to navigate to link_url
- "Mark as read" button on each
- "Mark all as read" button at bottom
- Scrollable list for 50+ notifications
- Link to "View all notifications" page

### Notification Dropdown Component

#### NotificationDropdown
```typescript
interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (url: string) => void;
}

export function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}: NotificationDropdownProps) {
  // Dropdown menu with notification list
  // Mark as read buttons
  // Link to full page
}
```

#### NotificationItem Component
```typescript
interface NotificationItemProps {
  notification: Notification;
  isRead: boolean;
  onMarkAsRead: (id: string) => void;
  onNavigate: (url: string) => void;
}

export function NotificationItem({
  notification,
  isRead,
  onMarkAsRead,
  onNavigate,
}: NotificationItemProps) {
  // Shows notification with type icon
  // Title and body preview
  // Time ago
  // Read indicator (dot)
}
```

### Notification List Page

#### Full Notifications Page
- Route: `/notifications`
- Show all notifications paginated
- Filter by read/unread
- Filter by type
- Sort by: newest first, oldest first
- Mark as read/unread toggle
- Bulk actions: Mark all as read, Delete

## File Structure
```
src/
├── components/
│   ├── notifications/
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationDropdown.tsx
│   │   ├── NotificationItem.tsx
│   │   ├── NotificationTypeIcon.tsx
│   │   └── NotificationPreview.tsx
│   └── shared/
│       └── UnreadBadge.tsx
├── lib/
│   ├── notifications/
│   │   ├── queries.ts           (fetch notifications)
│   │   ├── mutations.ts         (mark read, delete)
│   │   └── triggers.ts          (create notifications)
│   └── types/
│       └── notifications.ts     (TypeScript types)
├── hooks/
│   ├── useNotifications.ts      (fetch & state)
│   └── useNotificationBell.ts   (bell state)
├── app/
│   └── notifications/
│       └── page.tsx             (full notifications page)
└── app/api/
    └── notifications/
        ├── route.ts             (GET list, PATCH mark read)
        ├── [id]/
        │   ├── route.ts         (PATCH, DELETE)
        │   └── read/
        │       └── route.ts     (PATCH mark as read)
        └── mark-all-read/
            └── route.ts         (PATCH mark all as read)
```

## API Routes

### GET /api/notifications
List notifications for current user:

```
Query params:
- limit: number (default 20)
- offset: number (default 0)
- is_read: boolean (optional, filter)
- type: string (optional, filter by notification type)
- project_id: string (optional)

Response:
{
  notifications: [
    {
      id: string,
      type: string,
      title: string,
      body: string,
      link_url: string,
      source_entity_type: string,
      source_entity_id: string,
      triggered_by_user: { id, name, avatar },
      is_read: boolean,
      created_at: string
    }
  ],
  total_count: number,
  unread_count: number
}
```

### PATCH /api/notifications/[id]
Mark notification as read:

```
Headers: Authorization: Bearer token

Body:
{
  is_read: boolean
}

Response:
{
  id: string,
  is_read: boolean,
  read_at: string | null
}

Errors:
- 403: Not notification owner
- 404: Notification not found
```

### PATCH /api/notifications/mark-all-read
Mark all notifications as read:

```
Headers: Authorization: Bearer token

Query params:
- project_id: string (optional, mark all in project)

Response:
{
  marked_count: number
}
```

### DELETE /api/notifications/[id]
Delete notification:

```
Response: { success: true }
```

## Creating Notifications

### From Comments (Phase 105)
```typescript
async function notifyOnMention(comment: Comment) {
  const mentions = extractMentions(comment.content);

  for (const mentionedUserId of mentions.userIds) {
    await createNotification({
      user_id: mentionedUserId,
      project_id: comment.project_id,
      type: 'mention',
      title: 'You were mentioned',
      body: `${comment.author.name} mentioned you in a comment`,
      link_url: `/project/${comment.project_id}/entity/${comment.entity_type}/${comment.entity_id}`,
      source_entity_type: 'comment',
      source_entity_id: comment.id,
      triggered_by_user_id: comment.author_id,
    });
  }
}

async function notifyOnComment(comment: Comment, entityOwnerId: string) {
  // Skip if commenter is also owner
  if (comment.author_id === entityOwnerId) return;

  await createNotification({
    user_id: entityOwnerId,
    project_id: comment.project_id,
    type: 'comment',
    title: `New comment on ${comment.entity_type}`,
    body: comment.content.substring(0, 100),
    link_url: `/project/${comment.project_id}/entity/${comment.entity_type}/${comment.entity_id}`,
    source_entity_type: comment.entity_type,
    source_entity_id: comment.entity_id,
    triggered_by_user_id: comment.author_id,
  });
}
```

### From Assignments (Future)
```typescript
async function notifyOnAssignment(workOrder: WorkOrder, assignedUserId: string) {
  await createNotification({
    user_id: assignedUserId,
    project_id: workOrder.project_id,
    type: 'assignment',
    title: 'You were assigned to a work order',
    body: `${workOrder.title} - ${workOrder.priority}`,
    link_url: `/project/${workOrder.project_id}/assembly-floor/work-orders/${workOrder.id}`,
    source_entity_type: 'work_order',
    source_entity_id: workOrder.id,
    triggered_by_user_id: getCurrentUserId(),
  });
}
```

### Notification Expiration
- Notifications expire after 30 days
- Archive old notifications (don't delete)
- Background job to clean up expired notifications

## Acceptance Criteria
- [ ] notifications table created with proper constraints
- [ ] NotificationBell component renders in header
- [ ] Unread count badge displays on bell
- [ ] Bell click opens dropdown
- [ ] NotificationDropdown shows recent notifications
- [ ] Notifications sorted newest first
- [ ] Click notification navigates to link_url
- [ ] Mark as read button works
- [ ] Mark all as read button works
- [ ] is_read status persists in database
- [ ] read_at timestamp set when marked read
- [ ] Mention notifications created when user mentioned
- [ ] Comment notifications created on new comments
- [ ] Notification type icon displays correctly
- [ ] Unread badge shows correct count
- [ ] Full notifications page shows all notifications
- [ ] Notifications filterable by read/unread
- [ ] Notifications filterable by type
- [ ] Notifications expire after 30 days
- [ ] Performance: loading notification list < 200ms
- [ ] Works for all entity types

## Testing Instructions

### Database Tests
```sql
-- Create notification
INSERT INTO notifications
  (user_id, project_id, type, title, body, link_url, triggered_by_user_id)
VALUES
  ('{user-id}', '{project-id}', 'mention', 'You were mentioned',
   'In a comment about features', '/project/{id}/feature/{fid}', '{other-user-id}');

-- Count unread
SELECT COUNT(*) as unread_count
FROM notifications
WHERE user_id = '{user-id}' AND is_read = FALSE;

-- Mark as read
UPDATE notifications
SET is_read = TRUE, read_at = NOW()
WHERE id = '{notification-id}';
```

### Component Tests
```typescript
// NotificationBell.test.tsx
describe('NotificationBell', () => {
  it('displays unread count', () => {
    // Verify badge shows count
  });

  it('opens dropdown on click', async () => {
    // Click bell, verify dropdown opens
  });

  it('hides badge when count is 0', () => {
    // Verify badge not shown when no unread
  });
});

// NotificationDropdown.test.tsx
describe('NotificationDropdown', () => {
  it('shows recent notifications', () => {
    // Verify notifications listed
  });

  it('marks notification as read', async () => {
    // Click read button, verify onMarkAsRead called
  });

  it('navigates on notification click', async () => {
    // Click notification, verify navigation
  });

  it('marks all as read', async () => {
    // Click "mark all", verify all marked
  });
});
```

### Integration Tests
```bash
# Get notifications
curl "http://localhost:3000/api/notifications" \
  -H "Authorization: Bearer {token}"

# Mark as read
curl -X PATCH http://localhost:3000/api/notifications/{notification-id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"is_read": true}'

# Mark all as read
curl -X PATCH http://localhost:3000/api/notifications/mark-all-read \
  -H "Authorization: Bearer {token}"
```

### Manual Testing
1. Have user A mention user B in a comment
2. Login as user B
3. Verify notification appears on bell
4. Verify unread count increments
5. Click bell to open dropdown
6. Verify notification shows in list
7. Click notification and verify navigation to entity
8. Check that notification marked as read
9. Verify unread count decrements
10. Open full notifications page
11. Filter by unread notifications
12. Filter by notification type
13. Mark all as read
14. Verify all marked and counts updated
15. Delete notification
16. Verify removed from list
17. Test with different entity types (comment on feature, blueprint, work order, etc.)
18. Test notification expiration after 30 days
