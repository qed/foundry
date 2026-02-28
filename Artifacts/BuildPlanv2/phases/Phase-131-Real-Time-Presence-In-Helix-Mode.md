# Phase 131 — Real-Time Presence In Helix Mode

## Objective
Show who is viewing/working on which step with real-time presence indicators. Display user avatars and names on sidebar steps and dashboard. Implement "viewing"/"editing" status labels using Supabase Realtime presence.

## Prerequisites
- Phase 121 — Bi-Directional Sync: Open Mode Changes — Realtime patterns established
- Phase 130 — Multi-User Helix Process — Step locking in place

## Epic Context
**Epic:** 16 — Real-Time Collaboration
**Phase:** 131 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Real-time presence shows team members who's currently working where. This builds awareness and prevents duplicate work. Avatar and name badges next to step names provide instant context.

---

## Detailed Requirements

### 1. Presence Service
#### File: `src/lib/helix/presence-service.ts` (NEW)
Manage user presence on steps.

```typescript
// src/lib/helix/presence-service.ts

import { createClient } from '@/lib/supabase';

export interface UserPresence {
  user_id: string;
  step_id: string;
  status: 'viewing' | 'editing';
  last_active: string;
}

/**
 * Subscribe to presence for a project
 */
export function subscribeToProjectPresence(
  projectId: string,
  onPresenceChange: (presence: UserPresence[]) => void
) {
  const supabase = createClient();

  // Subscribe to step_presence table
  const subscription = supabase
    .from(`step_presence:project_id=eq.${projectId}`)
    .on('*', payload => {
      // Fetch current presence state
      getProjectPresence(projectId).then(onPresenceChange);
    })
    .subscribe();

  return subscription;
}

/**
 * Get current presence for project
 */
export async function getProjectPresence(projectId: string): Promise<UserPresence[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('step_presence')
    .select('*')
    .eq('project_id', projectId)
    .gt('last_active', new Date(Date.now() - 5 * 60000).toISOString()); // Last 5 minutes

  return data || [];
}

/**
 * Set presence for current user on step
 */
export async function setPresence(
  stepId: string,
  userId: string,
  projectId: string,
  status: 'viewing' | 'editing'
): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('step_presence')
    .upsert({
      step_id: stepId,
      user_id: userId,
      project_id: projectId,
      status,
      last_active: new Date().toISOString(),
    });
}

/**
 * Clear presence
 */
export async function clearPresence(stepId: string, userId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('step_presence')
    .delete()
    .eq('step_id', stepId)
    .eq('user_id', userId);
}
```

### 2. Presence Hook
#### File: `src/hooks/useStepPresence.ts` (NEW)
React hook for managing presence.

```typescript
// src/hooks/useStepPresence.ts

import { useEffect, useState } from 'react';
import { setPresence, clearPresence, subscribeToProjectPresence } from '@/lib/helix/presence-service';
import type { UserPresence } from '@/lib/helix/presence-service';

export function useStepPresence(stepId: string, projectId: string, userId: string, isEditing: boolean) {
  const [otherPresence, setOtherPresence] = useState<UserPresence[]>([]);

  useEffect(() => {
    // Set presence
    setPresence(stepId, userId, projectId, isEditing ? 'editing' : 'viewing');

    // Subscribe to changes
    const subscription = subscribeToProjectPresence(projectId, (presence) => {
      const filtered = presence.filter(p => p.user_id !== userId);
      setOtherPresence(filtered);
    });

    // Refresh presence every minute
    const interval = setInterval(() => {
      setPresence(stepId, userId, projectId, isEditing ? 'editing' : 'viewing');
    }, 60000);

    return () => {
      clearPresence(stepId, userId);
      subscription?.unsubscribe();
      clearInterval(interval);
    };
  }, [stepId, userId, projectId, isEditing]);

  return otherPresence;
}
```

### 3. Presence Indicator Component
#### File: `src/app/helix/components/presence-avatars.tsx` (NEW)
Display avatars of users viewing/editing step.

```typescript
// src/app/helix/components/presence-avatars.tsx

'use client';

import Image from 'next/image';
import type { UserPresence } from '@/lib/helix/presence-service';

interface PresenceAvatarsProps {
  presence: (UserPresence & { profile?: any })[];
}

export function PresenceAvatars({ presence }: PresenceAvatarsProps) {
  if (presence.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {presence.slice(0, 3).map(p => (
          <div key={p.user_id} className="relative group">
            <Image
              src={p.profile?.avatar_url || `/api/avatar/${p.user_id}`}
              alt={p.profile?.name || 'User'}
              width={28}
              height={28}
              className="rounded-full border-2 border-white"
            />
            <div className="absolute -bottom-8 left-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
              {p.profile?.name} ({p.status})
            </div>
          </div>
        ))}
      </div>
      {presence.length > 3 && (
        <span className="text-xs text-gray-600">+{presence.length - 3} more</span>
      )}
    </div>
  );
}
```

### 4. Database Migration
#### File: `supabase/migrations/step_presence.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS step_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES helix_steps(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  project_id UUID NOT NULL,
  status TEXT DEFAULT 'viewing',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(step_id, user_id)
);

CREATE INDEX idx_step_presence_project ON step_presence(project_id);
CREATE INDEX idx_step_presence_step ON step_presence(step_id);
```

---

## File Structure
```
src/lib/helix/
├── presence-service.ts (NEW)

src/hooks/
├── useStepPresence.ts (NEW)

src/app/helix/components/
├── presence-avatars.tsx (NEW)

supabase/migrations/
└── step_presence.sql (NEW)
```

---

## Dependencies
- Phase 130 step locking
- step_presence table
- Supabase Realtime

---

## Tech Stack
- Supabase Realtime for presence updates
- React hooks for lifecycle management
- Next.js Image for avatar display

---

## Acceptance Criteria
1. setPresence creates/updates presence entry
2. clearPresence removes presence on unmount
3. subscribeToProjectPresence returns updated presence list
4. useStepPresence sets presence on mount
5. useStepPresence refreshes every minute
6. useStepPresence clears on unmount
7. PresenceAvatars displays up to 3 avatars
8. PresenceAvatars shows "+N more" for overflow
9. Tooltip shows name and status on hover
10. Status toggles between 'viewing' and 'editing'

---

## Testing Instructions
1. User A navigates to step, presence is set
2. User B subscribes to presence and sees User A
3. User A leaves, presence is cleared
4. User B no longer sees User A
5. User A starts editing, status='editing'
6. User B sees status change
7. Load PresenceAvatars with 5 users
8. Verify 3 shown + "+2 more"
9. Test hover tooltip
10. Test subscription cleanup on unmount

---

## Notes for the AI Agent
- Presence auto-refreshes every minute to stay accurate
- Stale presence (>5 min) is filtered out
- Status reflects lock state (editing vs viewing)
- Avatars use Next.js Image optimization
- Consider adding keyboard shortcut to toggle status
