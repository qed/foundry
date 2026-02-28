# Phase 134 — Email Notifications For Helix Events

## Objective
Implement configurable email alerts for critical Helix events. Events: stage completion, gate check failure, critical bug found, deployment triggered. Use Resend email provider (existing in v1). Allow user preferences to control which events trigger emails.

## Prerequisites
- Phase 133 — Notification System For Helix Events — In-app notifications in place
- Resend integration exists in v1

## Epic Context
**Epic:** 16 — Real-Time Collaboration
**Phase:** 134 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Some events warrant email alerts, not just in-app notifications. Critical gates, deployments, and blockers should notify stakeholders even if they're not active in the app. Users control preferences to avoid notification fatigue.

---

## Detailed Requirements

### 1. Email Notification Service
#### File: `src/lib/helix/helix-email-notifications.ts` (NEW)
```typescript
// src/lib/helix/helix-email-notifications.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export type CriticalEventType = 'stage_completed' | 'gate_check_failed' | 'critical_bug_found' | 'deployment_triggered';

/**
 * Send email for critical Helix event
 */
export async function sendCriticalEventEmail(
  recipientEmail: string,
  eventType: CriticalEventType,
  title: string,
  content: string,
  actionUrl?: string
): Promise<void> {
  const subject = {
    stage_completed: '[Helix] Stage Completed',
    gate_check_failed: '[Helix] Gate Check Failed',
    critical_bug_found: '[Helix] Critical Bug Found',
    deployment_triggered: '[Helix] Deployment Triggered',
  }[eventType];

  const html = `
    <h2>${title}</h2>
    <p>${content}</p>
    ${actionUrl ? `<p><a href="${actionUrl}">View Details</a></p>` : ''}
  `;

  await resend.emails.send({
    from: 'helix@foundry.dev',
    to: recipientEmail,
    subject,
    html,
  });
}

/**
 * Notify on gate check failure
 */
export async function notifyGateCheckFailure(
  userId: string,
  userEmail: string,
  gateName: string,
  projectId: string,
  preferences: any
): Promise<void> {
  if (!preferences?.gate_check_failed) return;

  const content = `Gate check "${gateName}" failed. Please review and address blocking issues.`;
  const actionUrl = `/helix/projects/${projectId}`;

  await sendCriticalEventEmail(
    userEmail,
    'gate_check_failed',
    `Gate Check Failed: ${gateName}`,
    content,
    actionUrl
  );
}

/**
 * Notify on deployment
 */
export async function notifyDeploymentTriggered(
  userId: string,
  userEmail: string,
  deploymentName: string,
  projectId: string,
  preferences: any
): Promise<void> {
  if (!preferences?.deployment_triggered) return;

  const content = `Deployment "${deploymentName}" has been triggered and is now in progress.`;
  const actionUrl = `/helix/projects/${projectId}/deployments`;

  await sendCriticalEventEmail(
    userEmail,
    'deployment_triggered',
    `Deployment Triggered: ${deploymentName}`,
    content,
    actionUrl
  );
}
```

### 2. Notification Preferences UI
#### File: `src/app/settings/notification-preferences.tsx` (NEW)
```typescript
// src/app/settings/notification-preferences.tsx

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState({
    gate_check_failed: true,
    deployment_triggered: true,
    stage_completed: false,
    critical_bug_found: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    const supabase = createClient();
    const { data } = await supabase
      .from('user_notification_preferences')
      .select('preferences')
      .single();

    if (data?.preferences) {
      setPreferences(data.preferences);
    }
  }

  async function savePreferences() {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from('user_notification_preferences')
        .upsert({ preferences });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  }

  const events = [
    { key: 'gate_check_failed', label: 'Gate Check Failures', desc: 'Critical blockers that need addressing' },
    { key: 'deployment_triggered', label: 'Deployments', desc: 'When a deployment is triggered' },
    { key: 'stage_completed', label: 'Stage Completion', desc: 'When a stage completes' },
    { key: 'critical_bug_found', label: 'Critical Bugs', desc: 'Critical bugs found during build' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Email Notification Preferences</h2>

      <div className="space-y-3">
        {events.map(event => (
          <label key={event.key} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences[event.key as keyof typeof preferences]}
              onChange={e => setPreferences({
                ...preferences,
                [event.key]: e.target.checked,
              })}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <p className="font-semibold text-sm">{event.label}</p>
              <p className="text-xs text-gray-600">{event.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={savePreferences}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
```

---

## File Structure
```
src/lib/helix/
├── helix-email-notifications.ts (NEW)

src/app/settings/
├── notification-preferences.tsx (NEW)
```

---

## Dependencies
- Resend integration (existing in v1)
- user_notification_preferences table
- user email in profiles table

---

## Tech Stack
- Resend for email delivery
- TypeScript for type safety
- React for preferences UI

---

## Acceptance Criteria
1. sendCriticalEventEmail sends via Resend
2. Email subject matches event type
3. Email includes actionUrl when provided
4. notifyGateCheckFailure checks preferences before sending
5. notifyDeploymentTriggered checks preferences
6. NotificationPreferences loads user preferences
7. Toggling checkbox updates state
8. Save button persists preferences
9. Disabled events don't send emails
10. Preferences persist across sessions

---

## Testing Instructions
1. Set gate_check_failed=true in preferences
2. Trigger gate failure
3. Verify email sent to user
4. Set gate_check_failed=false
5. Trigger gate failure
6. Verify no email sent
7. Load preferences UI
8. Toggle checkboxes
9. Click Save
10. Verify preferences persist after reload

---

## Notes for the AI Agent
- Only critical events get emails to avoid fatigue
- User can control all event types
- HTML emails are professional and branded
- Action URLs let users jump directly to context
