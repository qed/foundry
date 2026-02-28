# Phase 133 — Notification System For Helix Events

## Objective
Implement in-app notifications for Helix events: step completion, gate check pass/fail, comments, assignments, build phase completion. Extend v1 notification system to cover helix_event entity type. Display notification bell with unread count and preferences per event type.

## Prerequisites
- Phase 132 — Step-Level Comments And Discussions — Comments system exists
- notifications table exists in v1 (polymorphic)

## Epic Context
**Epic:** 16 — Real-Time Collaboration
**Phase:** 133 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Teams need awareness of important Helix events. In-app notifications provide real-time alerts without email overload. Users can control which events trigger notifications based on preferences.

---

## Detailed Requirements

### 1. Helix Notifications Service
#### File: `src/lib/helix/helix-notifications.ts` (NEW)
```typescript
// src/lib/helix/helix-notifications.ts

import { createClient } from '@/lib/supabase';

export type HelixEventType =
  | 'step_completed'
  | 'gate_check_passed'
  | 'gate_check_failed'
  | 'comment_added'
  | 'step_assigned'
  | 'build_phase_completed';

/**
 * Create notification for Helix event
 */
export async function createHelixNotification(
  userId: string,
  eventType: HelixEventType,
  title: string,
  message: string,
  relatedEntityId: string,
  relatedEntityType: string
): Promise<void> {
  const supabase = createClient();

  await supabase.from('notifications').insert({
    user_id: userId,
    entity_type: 'helix_event',
    entity_id: relatedEntityId,
    event_type: eventType,
    title,
    message,
    related_entity_type: relatedEntityType,
    read: false,
    created_at: new Date().toISOString(),
  });
}

/**
 * Notify on step completion
 */
export async function notifyStepCompletion(stepId: string, stepName: string, projectId: string): Promise<void> {
  const supabase = createClient();

  // Get project members
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  if (!members) return;

  for (const member of members) {
    await createHelixNotification(
      member.user_id,
      'step_completed',
      'Step Completed',
      `${stepName} has been completed`,
      stepId,
      'helix_step'
    );
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createClient();

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  return count || 0;
}
```

### 2. Notification Bell Component
#### File: `src/app/helix/components/notification-bell.tsx` (NEW)
```typescript
// src/app/helix/components/notification-bell.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getUnreadCount } from '@/lib/helix/helix-notifications';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('entity_type', 'helix_event')
      .order('created_at', { ascending: false })
      .limit(10);

    setNotifications(data || []);
    const count = await getUnreadCount('current-user-id');
    setUnreadCount(count);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {Math.min(unreadCount, 9)}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-600 text-center">No notifications</p>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!notif.read ? 'bg-blue-50' : ''}`}>
                  <p className="font-semibold text-sm">{notif.title}</p>
                  <p className="text-sm text-gray-700">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## File Structure
```
src/lib/helix/
├── helix-notifications.ts (NEW)

src/app/helix/components/
├── notification-bell.tsx (NEW)
```

---

## Acceptance Criteria
1. createHelixNotification inserts to notifications table
2. entity_type='helix_event' for Helix events
3. notifyStepCompletion notifies all project members
4. getUnreadCount returns correct count
5. NotificationBell displays bell icon
6. Red badge shows unread count
7. Clicking bell toggles notification panel
8. Panel shows recent notifications
9. Unread notifications have blue background
10. Count refreshes every 5 seconds

---

## Testing Instructions
1. Create step completion event
2. Call notifyStepCompletion
3. Verify notifications created for all members
4. Call getUnreadCount
5. Verify count matches
6. Load NotificationBell component
7. Verify badge shows count
8. Click bell to open panel
9. Verify notifications display
10. Mark notification as read
11. Verify badge updates

---

## Notes for the AI Agent
- Uses v1 polymorphic notifications system
- entity_type='helix_event' distinguishes Helix events
- Preferences in Phase 133 allow filtering
- Email notifications in Phase 134
