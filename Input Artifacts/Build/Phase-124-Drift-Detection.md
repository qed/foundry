# Phase 124: Control Room - Drift Detection

## Objective
Detect and alert when requirements in the Pattern Shop change and these changes may affect corresponding blueprints in the Control Room. Flag blueprints that may be out of sync with their source requirements.

## Prerequisites
- Phase 046: Control Room - Blueprint Basics (blueprint structure)
- Phase 026: Feature Repository (feature and requirement linking)
- Phase 037: Pattern Shop - Agent Integration (requirement management)
- GitHub integration (Phase 026 or later for code comparison)

## Context
As requirements evolve in Pattern Shop, blueprints in Control Room may become outdated. Drift detection identifies these misalignments and alerts architects to review and update affected blueprints, maintaining consistency between requirements and implementation plans.

## Detailed Requirements

### Drift Detection Logic
- **Requirement Changed Detection:**
  - When requirement is updated in Pattern Shop, detect changes:
    - Description modified
    - Acceptance criteria changed
    - Status changed (New → Draft → Published)
    - Linked features changed
  - Identify all blueprints linked to this requirement
  - Create drift alert for each affected blueprint

- **Code Changed Detection (MVP):**
  - For MVP, use GitHub integration to poll code changes
  - Compare blueprint implementation plan against recent commits in linked code
  - Flag as "code_changed" if commits don't match implementation steps
  - (Full code diffing deferred to future phases)

### Database Schema
```sql
CREATE TABLE drift_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id),
  requirement_id UUID REFERENCES requirements(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('requirement_changed', 'code_changed')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  description TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_drift_alerts_project ON drift_alerts(project_id);
CREATE INDEX idx_drift_alerts_blueprint ON drift_alerts(blueprint_id);
CREATE INDEX idx_drift_alerts_status ON drift_alerts(status);
```

### Alert Creation Triggers
- Trigger on `requirements` table UPDATE
- Check all blueprints with FK to this requirement
- Create drift_alert with type 'requirement_changed'
- Set severity based on change magnitude:
  - Description/acceptance criteria change: medium
  - Status change: high
  - Minor edits: low

### Alert Management
- Mark alert as "acknowledged" (admin reviewed but not ready to resolve)
- Mark alert as "resolved" (blueprint updated to match requirement)
- Bulk actions: select multiple alerts and mark as acknowledged/resolved
- Filter alerts by status, alert_type, severity
- Automated cleanup: resolve alerts when blueprint is updated in response to requirement change

### Control Room UI
- "Drift Alerts" widget in Control Room dashboard
  - Shows count of new alerts: red badge
  - Shows count of acknowledged alerts: yellow badge
  - Click to open alerts panel
- Alerts panel:
  - List of all alerts with filters (status, type, severity)
  - Each alert shows:
    - Alert type badge (Requirement Changed / Code Changed)
    - Severity level (low/medium/high)
    - Blueprint name and link
    - Requirement name and link
    - Change description preview
    - "Acknowledge" and "Resolve" buttons
    - Timestamp
  - Bulk actions: "Mark as Acknowledged", "Mark as Resolved"

### Blueprint View Integration
- When viewing a blueprint with active drift alerts:
  - Banner at top: "This blueprint has 2 drift alerts. Review changes."
  - Inline alerts at relevant sections (if alert is tied to specific requirement)
  - "View All Alerts" button links to alerts panel

### Drift Detection Rules (Phase MVP)
- For now: requirement_changed alerts only
- Code change detection deferred (placeholder for GitHub integration)
- Focus: notify when requirements shift significantly

## File Structure
```
/app/api/projects/[projectId]/blueprints/drift/route.ts
/app/api/projects/[projectId]/blueprints/[blueprintId]/drift/route.ts
/app/components/ControlRoom/DriftAlerts/DriftAlertsWidget.tsx
/app/components/ControlRoom/DriftAlerts/DriftAlertsPanel.tsx
/app/components/ControlRoom/DriftAlerts/DriftAlert.tsx
/app/lib/supabase/migrations/create-drift-alerts.sql
/app/lib/drift/driftDetectionService.ts
/app/hooks/useDriftAlerts.ts
```

## Acceptance Criteria
- [ ] drift_alerts table created with correct schema
- [ ] Trigger fires when requirement is updated
- [ ] Drift alert created for each affected blueprint
- [ ] Alert includes accurate description of change
- [ ] Severity level correctly set based on change type
- [ ] Drift Alerts widget displays in Control Room dashboard
- [ ] Alert count badge shows correct number of new/acknowledged alerts
- [ ] Alerts can be filtered by status (new, acknowledged, resolved)
- [ ] Alerts can be filtered by type (requirement_changed, code_changed)
- [ ] Alerts can be filtered by severity (low, medium, high)
- [ ] Clicking alert navigates to blueprint with relevant context
- [ ] "Acknowledge" button changes status and badge updates
- [ ] "Resolve" button changes status and removes alert from active list
- [ ] Bulk actions select/deselect multiple alerts
- [ ] Bulk mark as acknowledged/resolved works correctly
- [ ] Blueprint view shows drift banner when active alerts exist
- [ ] Inline alert notifications display at relevant sections
- [ ] Test with 20+ drift alerts across multiple blueprints

## Testing Instructions
1. Open Control Room and verify Drift Alerts widget displays (initially empty)
2. Go to Pattern Shop and edit a requirement:
   - Change description
   - Add new acceptance criteria
   - Publish changes
3. Return to Control Room and verify new drift alert appears in widget
4. Click on widget to open Alerts panel
5. Verify alert details:
   - Type shows "Requirement Changed"
   - Severity is "medium"
   - Description shows what changed
   - Blueprint name and requirement name both visible
6. Click alert to navigate to blueprint
7. Verify blue banner at top says blueprint has drift alerts
8. Go back to Alerts panel
9. Click "Acknowledge" on the alert
10. Verify status changes and badge color updates (yellow)
11. Create 3 more drift alerts by editing other requirements
12. Use filter to show only "new" alerts
13. Select multiple alerts with checkboxes
14. Use "Mark as Acknowledged" bulk action
15. Verify all selected alerts update at once
16. Edit a blueprint to address the requirement change
17. Verify drift alert can be marked "Resolved"
18. Check that resolved alert is removed from widget counts
