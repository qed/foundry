# Phase 130: Assembly Floor - Work Order Sync Alerts

## Objective
Detect when blueprints are significantly updated and alert owners of work orders extracted from those blueprints. Provide suggestions to update work orders based on blueprint changes.

## Prerequisites
- Phase 061: Assembly Floor - Work Order CRUD (work order structure)
- Phase 046: Control Room - Blueprint Basics (blueprint updates)
- Phase 124: Drift Detection (similar alert mechanism)
- Change detection capability

## Context
When blueprints are updated, the work orders extracted from them may become outdated. Sync alerts notify work order owners that the underlying blueprint has changed, preventing teams from implementing requirements that have since been modified or superseded.

## Detailed Requirements

### Sync Alert Detection
- Trigger on blueprint UPDATE
- Compare changes:
  - Content sections modified (>20% change threshold)
  - Implementation plan altered
  - Linked requirements changed
  - Acceptance criteria updated
- Identify work orders extracted from this blueprint:
  - Work orders with `source_blueprint_id` = this blueprint
  - Only alert if WO status is not Complete (drafts, in progress, in review)
- Create wo_sync_alert for each affected work order

### Database Schema
```sql
CREATE TABLE wo_sync_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id),
  change_type TEXT CHECK (change_type IN ('content_changed', 'requirements_changed', 'acceptance_criteria_changed')),
  change_summary TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_wo_sync_alerts_work_order ON wo_sync_alerts(work_order_id);
CREATE INDEX idx_wo_sync_alerts_blueprint ON wo_sync_alerts(blueprint_id);
CREATE INDEX idx_wo_sync_alerts_status ON wo_sync_alerts(status);
```

### Sync Alert Content
- Change summary: plain-English description of what changed
  - Example: "Implementation plan section updated: 'Database schema' now requires 'Add email_verified field'"
- Link to blueprint for full context
- Suggestion for update (provided by agent if enabled)
- Timestamp of blueprint change

### Work Order View Integration
- When viewing work order with active sync alerts:
  - Banner at top: "Blueprint updated. Review changes."
  - Alert count badge
  - Link to alerts panel
  - Inline notification with change summary

- **Alerts Panel on Work Order:**
  - List of all sync alerts for this WO
  - Grouped by source blueprint
  - For each alert:
    - Blueprint name (clickable link)
    - Change type and summary
    - Timestamp
    - "Acknowledge" and "Resolve" buttons
    - Agent-suggested update (if available)

### Agent-Suggested Updates (Optional Enhancement)
- When alert created, agent can analyze work order against blueprint changes
- Suggest specific updates to WO implementation plan:
  - "Add step: 'Migrate email field to user_verified table'"
  - "Remove step: 'Create legacy_email column' (no longer needed)"
- Suggestions presented in alert with:
  - Current WO step
  - Suggested change
  - Reasoning
  - "Accept Suggestion" button

### API Endpoints
- `GET /api/projects/:projectId/work-orders/:woId/sync-alerts` - List alerts
- `PATCH /api/projects/:projectId/work-orders/:woId/sync-alerts/:alertId` - Update alert status
- `POST /api/projects/:projectId/work-orders/:woId/sync-alerts/:alertId/accept-suggestion` - Accept suggested update

### Notifications
- When sync alert created: notify work order assignee
- Notification includes:
  - Work order title
  - Blueprint name
  - Change summary
  - Link to review alert
- Notification goes to assignee in UI, and optionally to email/Slack

### Sync Alert Resolution
- Mark as "acknowledged": WO owner reviewed but hasn't updated yet
- Mark as "resolved": WO updated to reflect blueprint changes, or alert no longer relevant
- Bulk actions: select multiple alerts and mark as acknowledged/resolved

## File Structure
```
/app/api/projects/[projectId]/work-orders/[woId]/sync-alerts/route.ts
/app/api/projects/[projectId]/work-orders/[woId]/sync-alerts/[alertId]/route.ts
/app/components/AssemblyFloor/WorkOrderView/SyncAlertsBanner.tsx
/app/components/AssemblyFloor/WorkOrderView/SyncAlertsPanel.tsx
/app/components/AssemblyFloor/WorkOrderView/SyncAlert.tsx
/app/lib/supabase/migrations/create-wo-sync-alerts.sql
/app/lib/sync/syncAlertService.ts
/app/lib/agents/syncAlertSuggestions.ts
/app/hooks/useSyncAlerts.ts
```

## Acceptance Criteria
- [ ] wo_sync_alerts table created with correct schema
- [ ] Trigger fires when blueprint is updated
- [ ] Sync alert created for each affected work order
- [ ] Alert includes accurate change summary
- [ ] Only alerts active work orders (not complete ones)
- [ ] Work order view shows sync alert banner when alerts exist
- [ ] Banner text: "Blueprint updated. Review changes."
- [ ] Alerts panel lists all sync alerts for work order
- [ ] Each alert shows blueprint name, change type, summary
- [ ] "Acknowledge" button changes status to "acknowledged"
- [ ] "Resolve" button changes status to "resolved"
- [ ] Multiple sync alerts can be managed independently
- [ ] Notifications sent to work order assignee when alert created
- [ ] Notification includes work order title, blueprint name, change summary
- [ ] Agent can suggest updates to work order based on blueprint changes
- [ ] Suggested updates include reasoning
- [ ] "Accept Suggestion" button applies update
- [ ] Bulk actions: select multiple alerts and mark as acknowledged
- [ ] Test with 5+ work orders affected by single blueprint change

## Testing Instructions
1. Create blueprint with implementation plan
2. Create 3 work orders extracted from this blueprint
3. Assign work orders to different team members
4. Status: one Draft, one In Progress, one In Review
5. Edit blueprint:
   - Change implementation plan section
   - Update acceptance criteria
   - Add new linked requirement
6. Save blueprint changes
7. Navigate to each work order view
8. Verify sync alert banner appears on all three
9. Click to open alerts panel
10. Verify alert details:
    - Blueprint name correct
    - Change type shows what was modified
    - Change summary readable
    - Timestamp accurate
11. Verify notification was sent to assignee
12. Click "Acknowledge" on one alert
13. Verify status changes in panel
14. Close and reopen panel, verify persisted
15. Test agent suggestion:
    - Edit blueprint to make significant change
    - Create sync alert
    - Verify suggested update appears in alert
    - Click "Accept Suggestion"
    - Verify work order updated
16. Select multiple alerts with checkboxes
17. Bulk "Mark as Acknowledged"
18. Verify all selected alerts updated
19. Create a work order and mark it Complete
20. Update blueprint
21. Verify no sync alert created for completed work order
22. Test with 10 work orders affected by blueprint change
23. Verify all alerts created quickly
24. Verify UI remains responsive with multiple alerts

### Change Detection Threshold
- Content difference >20% character count or >5 lines
- Acceptance criteria: any addition, removal, or significant modification
- Implementation plan: any step added, removed, or significantly rewritten
- Linked requirements: any addition or removal
