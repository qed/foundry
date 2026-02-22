# Phase 131: Insights Lab - Slack Integration

## Objective
Enable Insights Lab to send Slack notifications for critical or high-scoring feedback, with configurable trigger rules per project.

## Prerequisites
- Phase 081: Insights Lab - Feedback Inbox (feedback collection and display)
- Slack API access (OAuth or webhook)
- Project settings capability

## Context
Teams want real-time alerts for important feedback without constantly checking Helix Foundry. Slack integration delivers notifications directly to team channels, ensuring visibility and rapid response to critical issues or high-priority feature requests.

## Detailed Requirements

### Slack Workspace Configuration
- **Setup Flow:**
  1. Project Settings > Integrations > Slack
  2. Button: "Connect to Slack"
  3. Redirects to Slack OAuth flow
  4. User selects workspace and grants permissions
  5. Returns to project settings with "Connected" status
  6. Shows workspace name and authorized user

- **Permissions Required:**
  - `chat:write` - Send messages
  - `incoming-webhook` - Allow webhook creation
  - `channels:read`, `groups:read` - List channels

### Notification Configuration
- **Settings Section:** Project Settings > Integrations > Slack Notifications
- **Webhook URL Management:**
  - Display: Connected Slack workspace name
  - Select channel from dropdown (populates from workspace)
  - Or: Enter custom webhook URL
  - "Save Channel" button

- **Notification Rules:**
  - Checkbox: "Notify on new critical feedback"
    - Triggered when feedback score ≥ 90 (critical)
    - Or when feedback contains severity keywords
  - Checkbox: "Notify on high-score feedback"
    - Triggered when feedback score ≥ 75
    - Customizable threshold (slider: 50-100)
  - Checkbox: "Notify on feature mentions"
    - Triggered when specific features mentioned
    - Feature selector dropdown
  - Checkbox: "Notify on category changes"
    - Triggered when high-volume category detected
    - Category selector

- **Frequency Control:**
  - "Send immediately" (default) - one notification per feedback item
  - "Daily digest" - batch notifications once per day at specified time
  - "Weekly digest" - batch notifications once per week
  - Customizable time (hour of day)

- **Message Customization (Optional):**
  - Template selector:
    - Standard (default)
    - Minimal (just title and link)
    - Detailed (includes full feedback text)
  - Custom prefix/suffix (optional)

### Slack Message Format
**Standard Message:**
```
📢 New High-Priority Feedback

Title: [Feedback Title]
Score: 92/100 (Critical)
Category: [Category]
Author: [User Name] (or "Anonymous")

"[Feedback text preview, first 150 chars]..."

Status: [Open/Reviewed/Addressed]
Feature Tags: [feature1, feature2]

👉 View in Insights Lab
https://helix-foundry.example.com/projects/.../insights-lab/feedback/...
```

**Digest Message (Daily):**
```
📊 Daily Feedback Digest

Critical Feedback: 2
- Feedback 1 (95/100)
- Feedback 2 (92/100)

High-Priority Feedback: 5
- Feedback 1 (78/100)
- ...

📈 Top Categories: Bug Reports (8), Feature Requests (5)

View All Feedback →
https://helix-foundry.example.com/projects/.../insights-lab
```

### Database Schema
```sql
ALTER TABLE projects ADD COLUMN slack_webhook_url TEXT ENCRYPTED;
ALTER TABLE projects ADD COLUMN slack_workspace_id TEXT;
ALTER TABLE projects ADD COLUMN slack_channel TEXT;
ALTER TABLE projects ADD COLUMN slack_connected_at TIMESTAMP;

CREATE TABLE slack_notification_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_type TEXT CHECK (rule_type IN ('critical', 'high_score', 'feature_mention', 'category_alert')),
  threshold INTEGER,
  feature_id UUID REFERENCES features(id),
  category TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE slack_notifications_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  feedback_id UUID REFERENCES feedback(id),
  rule_id UUID REFERENCES slack_notification_rules(id),
  sent_at TIMESTAMP DEFAULT now(),
  response_status TEXT
);

CREATE INDEX idx_slack_rules_project ON slack_notification_rules(project_id);
```

### Notification Trigger Logic
- When feedback submitted:
  1. Calculate feedback score
  2. Check against enabled rules:
     - Score ≥ critical threshold (90)? → Send critical notification
     - Score ≥ high_score threshold? → Send high-score notification
     - Mentions tracked feature? → Send feature mention notification
     - Category high-volume? → Send category alert
  3. Apply frequency setting:
     - Immediate: send now
     - Daily: queue for daily digest job
     - Weekly: queue for weekly digest job
  4. Send Slack message
  5. Log to slack_notifications_sent table

### Verification & Testing
- Test button: "Send Test Notification"
  - Sends sample notification to configured channel
  - Confirms webhook is working
  - Shows success/error message

### Error Handling
- Webhook URL invalid: show error, allow retry
- Channel not found: show error, re-prompt for channel
- Rate limited: queue and retry
- Webhook deleted on Slack side: show warning, offer to reconnect

## File Structure
```
/app/api/projects/[projectId]/integrations/slack/authorize/route.ts
/app/api/projects/[projectId]/integrations/slack/webhook/route.ts
/app/api/projects/[projectId]/integrations/slack/test/route.ts
/app/components/Settings/ProjectSettings/SlackIntegration.tsx
/app/components/Settings/ProjectSettings/SlackNotificationRules.tsx
/app/lib/slack/slackClient.ts
/app/lib/slack/notificationFormatter.ts
/app/lib/supabase/migrations/add-slack-integration.sql
/app/lib/jobs/slackDigestJob.ts
/app/hooks/useSlackIntegration.ts
```

## Acceptance Criteria
- [ ] Slack OAuth flow works and connects workspace
- [ ] Connected workspace name displays in settings
- [ ] Webhook URL stored securely (encrypted)
- [ ] Channel dropdown populates from connected workspace
- [ ] Notification rules can be enabled/disabled
- [ ] Critical feedback notification sends when score ≥ 90
- [ ] High-score notification sends when score ≥ threshold
- [ ] Feature mention notification sends when feature tagged
- [ ] Category alert triggers on high-volume detection
- [ ] Immediate notifications send without delay
- [ ] Daily digest batches notifications and sends once per day
- [ ] Weekly digest batches notifications and sends once per week
- [ ] Slack message format displays correctly
- [ ] Links in message are clickable and go to correct feedback
- [ ] Test notification sends successfully
- [ ] Error handling shows helpful messages
- [ ] Notifications don't send if rules disabled
- [ ] Multiple projects can have different Slack configs
- [ ] Notification history tracked in slack_notifications_sent table
- [ ] Rate limiting prevents spam

## Testing Instructions
1. Navigate to Project Settings > Integrations > Slack
2. Click "Connect to Slack"
3. Complete OAuth flow
4. Authorize Helix Foundry for workspace
5. Return to project settings, verify "Connected to [Workspace]"
6. Scroll to "Slack Notifications"
7. Select channel from dropdown
8. Click "Save Channel"
9. Enable rule: "Notify on critical feedback" (threshold 90)
10. Enable rule: "Notify on high-score feedback" (threshold 75)
11. Save settings
12. Click "Send Test Notification"
13. Check Slack channel for test message
14. Verify format is correct, link works
15. Go to Insights Lab and submit feedback with score 95
16. Verify Slack notification sent immediately to channel
17. Submit feedback with score 80
18. Verify Slack notification sent (≥75 rule)
19. Submit feedback with score 60
20. Verify no notification (below threshold)
21. Change frequency to "Daily digest"
22. Submit 3 more feedback items with high scores
23. Wait for daily digest job (or manually trigger)
24. Verify digest message sent to Slack with all items batched
25. Test feature mention rule:
    - Select feature in rule config
    - Submit feedback mentioning that feature
    - Verify notification sent
26. Test error handling: delete webhook on Slack side
27. Submit feedback and verify error message in project settings
28. Offer to reconnect and re-authorize
