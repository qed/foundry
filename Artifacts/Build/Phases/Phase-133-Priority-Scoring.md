# Phase 133: Insights Lab - Priority Scoring

## Objective
Implement AI-powered priority scoring for feedback items based on frequency, severity, and feature importance, enabling intelligent prioritization.

## Prerequisites
- Phase 081: Insights Lab - Feedback Inbox (feedback collection)
- Phase 090: Insights Lab - Feature Tagging & Categorization (feature linking)
- AI/Agent capability for scoring
- Feedback data with categories and features

## Context
Teams receive many feedback items daily. Manual prioritization is time-consuming and subjective. AI-powered priority scoring automatically ranks feedback based on objective signals: how often similar feedback appears, severity of the issue, and importance of affected features.

## Detailed Requirements

### Priority Score Algorithm
- **Frequency Score (0-30 points):**
  - Count similar feedback in last 30 days
  - Similarity: same category + same top feature mentioned
  - 1-2 similar: 5 points, 3-5: 10 points, 6-10: 15 points, 11-20: 20 points, 20+: 30 points

- **Severity Score (0-40 points):**
  - AI analyzes text for severity keywords and sentiment
  - Keywords: "critical", "broken", "blocking", "urgent", "blocked", "crash", "error"
  - Explicit score if provided by user (1-100 scale, mapped to 0-40)
  - Sentiment analysis: negative sentiment adds points
  - Bug reports > Feature requests > Suggestions
  - Scoring: Low severity (1-20): 0 points, Medium (21-60): 20 points, High (61-80): 30 points, Critical (81-100): 40 points

- **Feature Importance Score (0-30 points):**
  - Lookup feature mentioned in feedback
  - Rank by: usage metrics, number of linked requirements, number of linked work orders
  - Core/foundational features: 30 points, Important: 20 points, Nice-to-have: 10 points, Other: 0 points
  - If multiple features mentioned, take max

- **Total Priority Score: 0-100**
  - Sum of three components
  - Displayed as number and visual indicator (low/medium/high/critical)

### Priority Score Calculation Triggers
- On feedback submission: calculate immediately
- On feedback update: recalculate
- Nightly job: recalculate all feedback (as frequency counts change)
- When feature importance changes: recalculate affected feedback

### Database Changes
```sql
ALTER TABLE feedback ADD COLUMN priority_score INTEGER DEFAULT 0;
ALTER TABLE feedback ADD COLUMN priority_tier TEXT CHECK (priority_tier IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low';
ALTER TABLE feedback ADD COLUMN priority_score_components JSONB;
ALTER TABLE feedback ADD COLUMN priority_updated_at TIMESTAMP;

CREATE TABLE feature_importance_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  feature_id UUID NOT NULL REFERENCES features(id),
  importance_tier TEXT CHECK (importance_tier IN ('critical', 'important', 'nice-to-have', 'low')),
  rationale TEXT,
  last_updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(project_id, feature_id)
);
```

### UI Display in Feedback Inbox
- **Score Badge on Feedback Items:**
  - Color-coded: red for critical, orange for high, yellow for medium, gray for low
  - Display number (e.g., "87/100")
  - Hover tooltip: breakdown of score components:
    - Frequency: 25/30
    - Severity: 40/40
    - Feature Importance: 22/30

- **Sort by Priority:**
  - Inbox dropdown: "Sort By" includes "Priority (High to Low)"
  - Default sort when analytics suggest prioritization
  - Sorts by priority_score DESC

- **Filter by Priority Tier:**
  - Filter pills: All, Low, Medium, High, Critical
  - Quick filter to see only high-priority items

- **Priority Explanation:**
  - Expandable section in feedback detail view
  - Shows score breakdown
  - Explains each component
  - Examples: "Score boosted because 12 similar feedback items reported this in last 30 days"

### Score Component Transparency
- Display breakdown in feedback detail:
  ```
  Priority Score: 87/100 (Critical)

  Components:
  • Frequency (12 similar items): 30/30
  • Severity (Error + Blocking): 40/40
  • Feature Importance (Core): 17/30

  Why This Priority:
  This issue affects core login functionality and has been
  reported multiple times this month. Customers report it as
  blocking their workflows.
  ```

### Feature Importance Configuration
- Project Settings > Insights Lab > Feature Importance
- Table of all features
- Column: Importance Tier (dropdown: Critical, Important, Nice-to-have, Low)
- Column: Rationale (text field)
- Bulk edit: select features and change tier
- Importance-guided wizard: helps auto-detect from usage data
- When importance changed, trigger recalculation of all feedback for that feature

### Inbox Improvements from Priority Scoring
- **Smart Inbox:**
  - Top section: Critical items (score 80+)
  - Middle section: High items (60-79)
  - Bottom section: Medium/Low items
  - Collapsible sections

- **Dashboard Widget:**
  - "Top Priority Items This Week": shows 5 items with highest scores
  - Quick stats: "X critical items, Y high items"
  - Link to full inbox

## File Structure
```
/app/api/projects/[projectId]/insights-lab/feedback/[feedbackId]/priority/route.ts
/app/api/projects/[projectId]/insights-lab/feedback/recalculate-priority/route.ts
/app/api/projects/[projectId]/settings/feature-importance/route.ts
/app/components/InsightsLab/FeedbackInbox/PriorityBadge.tsx
/app/components/InsightsLab/FeedbackInbox/PriorityBreakdown.tsx
/app/components/InsightsLab/FeedbackInbox/FeedbackItem.tsx (updated)
/app/lib/priority/priorityScorer.ts
/app/lib/priority/severityAnalyzer.ts
/app/lib/supabase/migrations/add-priority-scoring.sql
/app/lib/jobs/recalculatePriority.ts
/app/hooks/usePriorityScoring.ts
```

## Acceptance Criteria
- [ ] priority_score column added to feedback table
- [ ] priority_tier column added and derived correctly
- [ ] Priority score calculated immediately on feedback submission
- [ ] Frequency component counts similar feedback accurately
- [ ] Severity component uses keywords and sentiment
- [ ] Feature importance component ranks features correctly
- [ ] Total score is sum of components (0-100 range)
- [ ] Priority badge displays on feedback items with correct color
- [ ] Badge shows numeric score (e.g., "87/100")
- [ ] Hover tooltip shows component breakdown
- [ ] Inbox can be sorted by priority (high to low)
- [ ] Filter pills available: All, Low, Medium, High, Critical
- [ ] Filter works correctly when applied
- [ ] Score explanation in feedback detail view
- [ ] Explanation includes why score is high/low
- [ ] Feature importance can be configured in project settings
- [ ] Changing feature importance triggers recalculation
- [ ] Nightly recalculation job updates all feedback scores
- [ ] Smart inbox groups items by priority tier
- [ ] Dashboard widget shows top 5 priority items
- [ ] Multiple feedback items compared and ranked correctly
- [ ] Test with 100+ feedback items

## Testing Instructions
1. Go to Project Settings > Insights Lab > Feature Importance
2. Configure features:
   - "User Authentication" → Critical
   - "Payment Processing" → Important
   - "Dark Mode" → Nice-to-have
3. Save settings
4. Go to Insights Lab > Feedback Inbox
5. **Test Single Feedback Priority:**
   - Submit feedback: "Login is broken, can't access account" (score 95)
   - Verify priority badge shows high score (80+)
   - Hover badge and see breakdown:
     - Severity high (keywords: broken, critical function)
     - Feature importance high (Authentication = Critical)
     - Frequency low (first report)
   - Click feedback detail and read explanation
6. **Test Frequency Component:**
   - Submit 5 more feedback items mentioning "login is broken"
   - Submit feedback #6: "Login not working"
   - Verify priority_score increased (frequency component increased)
   - Explanation should say "6 similar items reported"
7. **Test Feature Importance Component:**
   - Submit feedback about Dark Mode (marked as Nice-to-have)
   - Even if critical issue, score should be lower than login issues
   - Compare scores and verify feature importance factored in
8. **Test Sorting:**
   - Inbox: sort by "Priority (High to Low)"
   - Verify critical/high items appear first
   - Refresh and verify sort persists
9. **Test Filtering:**
   - Apply filter: "Critical" (score 80+)
   - Verify only critical items show
   - Apply filter: "Medium"
   - Verify score range 40-60 items show
10. **Test Feature Importance Change:**
    - Go to settings and change "Dark Mode" from Nice-to-have to Critical
    - Go back to Inbox
    - Find Dark Mode feedback items
    - Verify priority_score increased
    - Verify they now appear higher in priority sort
11. **Test Explanation Clarity:**
    - Open feedback detail with score 67
    - Read explanation: should explain each component clearly
    - Example: "This is medium priority because it affects an important feature but has only been reported once"
12. **Test Smart Inbox Organization:**
    - Verify inbox sections:
      - Top: Critical (80+)
      - Middle: High (60-79)
      - Bottom: Medium (40-59)
    - Items within sections sorted by date
13. **Test Dashboard Widget:**
    - Go to main dashboard
    - Verify "Top Priority Items This Week" widget shows
    - Shows 5 items with highest scores
    - Shows stat: "2 critical items, 5 high items"
14. **Test Recalculation:**
    - Manually trigger nightly recalculation job
    - Verify all feedback scores updated
    - Verify changes reflected in UI
