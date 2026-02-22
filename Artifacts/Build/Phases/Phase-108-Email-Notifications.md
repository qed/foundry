# Phase 108 - Email Notifications

## Objective
Implement email notifications sent on specific in-app events (mentions, assignments, critical feedback) with customizable user preferences and HTML email templates.

## Prerequisites
- Phase 107 (Notification System) completed
- Email service integration (Resend, SendGrid, or similar)
- User email addresses stored in auth.users

## Context
While in-app notifications are useful for active users, email notifications ensure users don't miss important events even when not logged in. Email preferences allow users to control notification frequency and types.

## Detailed Requirements

### Email Service Integration

#### Resend Setup (Recommended)
- Create Resend account and API key
- Environment variable: RESEND_API_KEY
- From address: noreply@helix-foundry.com

#### Alternative: SendGrid
- Create SendGrid account and API key
- From address: noreply@helix-foundry.com

### Notification Preferences Schema

#### user_notification_preferences table
```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email_on_mention BOOLEAN DEFAULT TRUE,
  email_on_comment BOOLEAN DEFAULT TRUE,
  email_on_assignment BOOLEAN DEFAULT TRUE,
  email_on_feedback BOOLEAN DEFAULT TRUE,
  email_digest BOOLEAN DEFAULT FALSE,
  email_digest_frequency VARCHAR(20) DEFAULT 'daily',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_notification_preferences_user ON user_notification_preferences(user_id);
```

### Email Trigger Events

#### Event: User Mentioned
- Triggered when user mentioned in comment or document
- Email sent immediately (or batched per preference)
- Subject: "You were mentioned on [Project Name]"
- Includes: Mentioner name, preview of comment, link to entity

#### Event: Comment on Owned Entity
- Triggered when comment added to entity user owns
- Subject: "New comment on [Entity Name]"
- Includes: Commenter name, comment preview, link to entity

#### Event: Work Order Assignment
- Triggered when user assigned to work order
- Subject: "You were assigned to [Work Order Name]"
- Includes: Assigner name, work order title, priority, due date, link

#### Event: Critical Feedback
- Triggered when critical/high-priority feedback submitted
- Subject: "Critical feedback received on [Entity]"
- Includes: Feedback content, entity link, action buttons

### Email Template System

#### Template Structure
All templates: HTML + Plain Text fallback

#### Mention Email Template
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>You were mentioned</h2>
    </div>
    <div class="content">
      <p><strong>{{mentionerName}}</strong> mentioned you in a comment:</p>
      <blockquote style="border-left: 4px solid #2563eb; padding-left: 16px; margin: 20px 0; color: #4b5563;">
        {{commentPreview}}
      </blockquote>
      <p>Entity: <strong>{{entityName}}</strong> ({{entityType}})</p>
      <a href="{{actionUrl}}" class="button">View in Helix Foundry</a>
      <div class="footer">
        <p>You received this email because you were mentioned on the Helix Foundry platform.</p>
        <p><a href="{{preferencesUrl}}">Update notification preferences</a></p>
      </div>
    </div>
  </div>
</body>
</html>
```

#### Comment Email Template
```html
<!-- Similar structure, customized for comment notification -->
```

#### Assignment Email Template
```html
<!-- Customized for work order assignment with priority and due date -->
```

### Database Schema for Email Log

#### email_log table
Track all emails sent for debugging and compliance:

```sql
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  email_address VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  template_name VARCHAR(100),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivery_status VARCHAR(20) DEFAULT 'pending',
  delivery_timestamp TIMESTAMP,
  error_message TEXT,
  resend_attempt_count INTEGER DEFAULT 0
);

CREATE INDEX idx_email_log_user ON email_log(user_id);
CREATE INDEX idx_email_log_sent_at ON email_log(sent_at DESC);
```

## Email Service Implementation

### Service Function
```typescript
interface EmailPayload {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
  replyTo?: string;
}

async function sendEmail(payload: EmailPayload): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Load template
    const htmlContent = await loadTemplate(
      payload.template,
      'html',
      payload.variables
    );
    const textContent = await loadTemplate(
      payload.template,
      'text',
      payload.variables
    );

    // Send via Resend
    const response = await resend.emails.send({
      from: 'Helix Foundry <noreply@helix-foundry.com>',
      to: payload.to,
      subject: payload.subject,
      html: htmlContent,
      text: textContent,
      replyTo: payload.replyTo,
    });

    if (!response.data?.id) {
      throw new Error('Failed to send email');
    }

    // Log send attempt
    await logEmailSent({
      email_address: payload.to,
      event_type: payload.template,
      subject: payload.subject,
      template_name: payload.template,
      delivery_status: 'sent',
      delivery_timestamp: new Date(),
    });

    return {
      success: true,
      messageId: response.data.id,
    };
  } catch (error) {
    // Log error
    await logEmailSent({
      email_address: payload.to,
      event_type: payload.template,
      subject: payload.subject,
      template_name: payload.template,
      delivery_status: 'failed',
      error_message: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Email Trigger on Mention
```typescript
async function notifyOnMentionEmail(
  comment: Comment,
  mentionedUserId: string
) {
  // Check user preferences
  const preferences = await getUserNotificationPreferences(mentionedUserId);
  if (!preferences.email_on_mention) return;

  // Get mentioned user email
  const user = await getUser(mentionedUserId);
  if (!user.email) return;

  // Get mentioner info
  const mentioner = await getUser(comment.author_id);

  // Send email
  await sendEmail({
    to: user.email,
    subject: `You were mentioned on ${comment.entity_type}`,
    template: 'mention-email',
    variables: {
      mentionerName: mentioner.name,
      commentPreview: comment.content.substring(0, 200),
      entityName: await getEntityName(comment.entity_type, comment.entity_id),
      entityType: comment.entity_type,
      actionUrl: `${process.env.APP_URL}/project/${comment.project_id}/entity/${comment.entity_type}/${comment.entity_id}`,
      preferencesUrl: `${process.env.APP_URL}/settings/notifications`,
    },
  });
}
```

## File Structure
```
src/
├── lib/
│   ├── email/
│   │   ├── service.ts           (send email function)
│   │   ├── templates.ts         (load & render templates)
│   │   ├── triggers.ts          (trigger events)
│   │   └── preferences.ts       (user preferences)
│   ├── email-templates/
│   │   ├── mention-email.html
│   │   ├── mention-email.txt
│   │   ├── comment-email.html
│   │   ├── comment-email.txt
│   │   ├── assignment-email.html
│   │   ├── assignment-email.txt
│   │   ├── feedback-email.html
│   │   └── feedback-email.txt
│   └── types/
│       └── email.ts
├── components/
│   └── settings/
│       └── NotificationPreferences.tsx
├── app/settings/
│   └── notifications/
│       └── page.tsx             (preferences page)
└── app/api/
    ├── users/
    │   └── notification-preferences/
    │       └── route.ts         (GET/PATCH preferences)
    └── email/
        ├── send-test/
        │   └── route.ts         (test email endpoint)
        └── templates/
            └── preview/
                └── route.ts     (preview template for dev)
```

## API Routes

### GET /api/users/notification-preferences
Get user notification preferences:

```
Headers: Authorization: Bearer token

Response:
{
  email_on_mention: boolean,
  email_on_comment: boolean,
  email_on_assignment: boolean,
  email_on_feedback: boolean,
  email_digest: boolean,
  email_digest_frequency: 'daily' | 'weekly'
}
```

### PATCH /api/users/notification-preferences
Update notification preferences:

```
Headers: Authorization: Bearer token

Body:
{
  email_on_mention?: boolean,
  email_on_comment?: boolean,
  email_on_assignment?: boolean,
  email_on_feedback?: boolean,
  email_digest?: boolean,
  email_digest_frequency?: string
}

Response:
{
  success: true,
  updated_at: string
}
```

## Settings UI

#### NotificationPreferences Component
```typescript
interface NotificationPreferencesProps {
  currentPreferences: UserNotificationPreferences;
  onSave: (preferences: UserNotificationPreferences) => void;
}

export function NotificationPreferences({
  currentPreferences,
  onSave,
}: NotificationPreferencesProps) {
  // Toggle switches for each notification type
  // Save button
  // Success toast
}
```

Located at: `/settings/notifications`

## Acceptance Criteria
- [ ] user_notification_preferences table created
- [ ] Email service integration working (Resend or SendGrid)
- [ ] Email templates created for all event types
- [ ] sendEmail function sends HTML + text emails
- [ ] Email sent on mention (respecting preferences)
- [ ] Email sent on comment (respecting preferences)
- [ ] Email sent on assignment (respecting preferences)
- [ ] email_log table tracks all sends
- [ ] Email delivery tracking working
- [ ] NotificationPreferences component renders toggles
- [ ] User can update preferences
- [ ] Plain text email fallback functional
- [ ] Links in email point to correct URLs
- [ ] Subject lines informative and not too long
- [ ] Email branding consistent (logo, colors, footer)
- [ ] Unsubscribe/preferences link in every email
- [ ] Performance: email send < 1 second
- [ ] Retry logic for failed sends
- [ ] User can disable all emails
- [ ] Test email endpoint for development
- [ ] Email preview endpoint for template development

## Testing Instructions

### Service Function Tests
```typescript
// email.test.ts
describe('Email Service', () => {
  it('sends email with correct payload', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      template: 'mention-email',
      variables: { mentionerName: 'John', commentPreview: 'Test comment' },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('logs email send attempt', async () => {
    await sendEmail({...});

    const log = await getEmailLog('test@example.com');
    expect(log.length).toBeGreaterThan(0);
  });

  it('respects user preferences', async () => {
    // Set preferences to not receive mention emails
    await updateUserPreferences(userId, { email_on_mention: false });

    // Trigger mention
    await notifyOnMentionEmail(comment, userId);

    // Verify email not sent
    const log = await getEmailLog(user.email);
    expect(log).not.toContain({ event_type: 'mention' });
  });
});
```

### Integration Tests
```bash
# Send test email
curl -X POST http://localhost:3000/api/email/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"to": "user@example.com"}'

# Get preferences
curl http://localhost:3000/api/users/notification-preferences \
  -H "Authorization: Bearer {token}"

# Update preferences
curl -X PATCH http://localhost:3000/api/users/notification-preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"email_on_mention": false}'
```

### Manual Testing
1. Have user A mention user B in a comment
2. Wait and check user B's email inbox
3. Verify email received with correct subject
4. Click link in email and verify navigation to correct entity
5. Update notification preferences to disable mention emails
6. Have user A mention user B again
7. Verify email NOT sent
8. Re-enable mention emails
9. Verify email sent again
10. Test comment notification email
11. Test assignment notification email (when feature implemented)
12. Test email with special characters in content
13. Test email preview endpoint for template development
14. Check email_log table for all sent emails
15. Test plain text email fallback in email client
16. Test unsubscribe link in email footer
