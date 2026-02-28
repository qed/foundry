# Phase 130 — Multi-User Helix Process

## Objective
Enable multiple team members to work on different Helix steps simultaneously. Implement step-level locking so when one user starts a step, others see "in progress by [name]". Support concurrent work on different steps within same stage. Prevent conflicts for same-step concurrent edits.

## Prerequisites
- Phase 009 — Step Detail View Component — Step detail view UI established
- Phase 121 — Bi-Directional Sync: Open Mode Changes — Realtime sync patterns

## Epic Context
**Epic:** 16 — Real-Time Collaboration
**Phase:** 130 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Helix projects should be team endeavors. Multiple team members should be able to work on different steps in parallel. When one person is actively working on a step, others should see that they're editing it, preventing accidental overwrites. This phase implements step-level locking and concurrent editing patterns.

---

## Detailed Requirements

### 1. Step Lock Service
#### File: `src/lib/helix/step-locking.ts` (NEW)
Manage step locks for concurrent editing prevention.

```typescript
// src/lib/helix/step-locking.ts

import { createClient } from '@/lib/supabase';

export interface StepLock {
  id: string;
  step_id: string;
  user_id: string;
  locked_at: string;
  expires_at: string;
}

/**
 * Acquire lock on a step (30-minute default)
 */
export async function acquireStepLock(stepId: string, userId: string): Promise<StepLock> {
  const supabase = createClient();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60000); // 30 minutes

  const { data, error } = await supabase
    .from('step_locks')
    .insert({
      step_id: stepId,
      user_id: userId,
      locked_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Release lock
 */
export async function releaseStepLock(stepId: string, userId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('step_locks')
    .delete()
    .eq('step_id', stepId)
    .eq('user_id', userId);
}

/**
 * Check if step is locked and by whom
 */
export async function getStepLock(stepId: string): Promise<StepLock | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('step_locks')
    .select('*')
    .eq('step_id', stepId)
    .gt('expires_at', new Date().toISOString())
    .single();

  return error ? null : data;
}

/**
 * Refresh lock (extend expiration)
 */
export async function refreshStepLock(stepId: string, userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();

  const supabase = createClient();
  await supabase
    .from('step_locks')
    .update({ expires_at: expiresAt })
    .eq('step_id', stepId)
    .eq('user_id', userId);
}
```

### 2. Locking UI Component
#### File: `src/app/helix/projects/[projectId]/steps/[stepId]/step-lock-indicator.tsx` (NEW)
Display lock status and lock holder.

```typescript
// src/app/helix/projects/[projectId]/steps/[stepId]/step-lock-indicator.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { StepLock } from '@/lib/helix/step-locking';

interface StepLockIndicatorProps {
  stepId: string;
  currentUserId: string;
}

export function StepLockIndicator({ stepId, currentUserId }: StepLockIndicatorProps) {
  const [lock, setLock] = useState<StepLock | null>(null);
  const [lockHolder, setLockHolder] = useState<any>(null);

  useEffect(() => {
    async function checkLock() {
      const supabase = createClient();
      const { data } = await supabase
        .from('step_locks')
        .select('*, profiles:user_id(name, avatar_url)')
        .eq('step_id', stepId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (data) {
        setLock(data);
        setLockHolder(data.profiles);
      } else {
        setLock(null);
        setLockHolder(null);
      }
    }

    checkLock();
    const interval = setInterval(checkLock, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, [stepId]);

  if (!lock) return null;

  const isOwnLock = lock.user_id === currentUserId;

  return (
    <div className={`p-3 rounded border flex items-center gap-2 ${
      isOwnLock
        ? 'bg-blue-50 border-blue-200'
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className={`w-3 h-3 rounded-full ${isOwnLock ? 'bg-blue-500' : 'bg-yellow-500'} animate-pulse`} />
      <span className="text-sm">
        {isOwnLock ? (
          <span className="text-blue-900">You are editing this step</span>
        ) : (
          <span className="text-yellow-900">
            <strong>{lockHolder?.name || 'Someone'}</strong> is editing this step
          </span>
        )}
      </span>
    </div>
  );
}
```

### 3. Database Schema
#### File: `supabase/migrations/step_locks.sql` (NEW)
```sql
CREATE TABLE IF NOT EXISTS step_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES helix_steps(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_step_locks_step_id ON step_locks(step_id);
CREATE INDEX idx_step_locks_user_id ON step_locks(user_id);
CREATE INDEX idx_step_locks_expires_at ON step_locks(expires_at);

-- Cleanup old locks
CREATE OR REPLACE FUNCTION cleanup_expired_step_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM step_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## File Structure
```
src/lib/helix/
├── step-locking.ts (NEW)

src/app/helix/projects/[projectId]/steps/[stepId]/
├── step-lock-indicator.tsx (NEW)

supabase/migrations/
└── step_locks.sql (NEW)
```

---

## Dependencies
- helix_steps table
- profiles table (user info)
- Supabase Realtime for lock updates

---

## Tech Stack
- TypeScript for locking logic
- React for UI indicators
- PostgreSQL for lock storage

---

## Acceptance Criteria
1. acquireStepLock creates lock with 30-minute expiration
2. getStepLock returns active lock or null
3. releaseStepLock removes lock
4. refreshStepLock extends expiration
5. StepLockIndicator shows lock status
6. Blue indicator for own lock
7. Yellow indicator for others' locks
8. Lock holder name displays
9. Lock checks refresh every 5 seconds
10. Expired locks are cleaned up

---

## Testing Instructions
1. User A acquires step lock
2. User B calls getStepLock and sees User A
3. User A refreshes lock
4. Verify expiration extends
5. User A releases lock
6. User B calls getStepLock and gets null
7. Load StepLockIndicator as User B while A has lock
8. Verify "User A is editing" message
9. Load StepLockIndicator as User A
10. Verify "You are editing" message

---

## Notes for the AI Agent
- 30-minute lock is reasonable default; can be configurable
- Expired locks are cleaned automatically
- Lock indicator is read-only; locking is automatic
- Consider adding "Take over" button for admin users
