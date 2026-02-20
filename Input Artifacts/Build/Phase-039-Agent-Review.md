# Phase 039 - Agent: Requirements Review

## Objective
Implement agent-assisted review of Feature Requirements Documents (FRDs) to identify gaps, ambiguities, untestable language, and suggest improvements for clarity and completeness.

## Prerequisites
- Pattern Shop Agent infrastructure (Phase 037)
- Feature Requirements Document (Phase 033)
- Requirements Document Editor (Phase 034)

## Context
Writing good requirements is difficult. Teams often miss edge cases, use vague language, or fail to define acceptance criteria. The agent can analyze FRDs and provide specific, actionable feedback to improve quality.

## Detailed Requirements

### User Prompt

In agent chat, user initiates review with commands like:

```
"Review this requirement"
"Review the current FRD for gaps"
"Check if this requirement is testable"
"Review [Feature Name] requirements"
```

The agent recognizes these patterns and analyzes the current FRD or specified FRD.

### Agent Analysis Framework

The agent evaluates FRDs on these dimensions:

**1. Ambiguity Detection:**
- Vague terms: "easy", "fast", "user-friendly", "robust"
- Unclear pronouns or references
- Subjective language without metrics
- Example: "The system should load quickly" → "unclear - define SLA (e.g., <2 seconds)"

**2. Missing Acceptance Criteria:**
- FRD lacks "Acceptance Criteria" section or it's empty
- Criteria lack GIVEN/WHEN/THEN format or are too vague
- Example: "Users can log in" (vague) vs "GIVEN valid email/password, WHEN user clicks Login, THEN page shows Dashboard" (testable)

**3. Testability:**
- Requirements that cannot be objectively verified
- Missing quantifiable metrics
- Example: "The UI should be intuitive" → "non-testable, consider: 'New users complete signup in <3 minutes'"

**4. Scope Clarity:**
- Requirements that might belong in a different feature or epic
- Out-of-scope items mentioned in main requirements
- Dependencies not clearly stated
- Example: "Send confirmation email" - is this part of Sign-up or a separate Email feature?

**5. Completeness:**
- Missing edge cases (error handling, validation, null values)
- Missing non-functional requirements (performance, security, accessibility)
- Example: "What happens if email is already registered? What if password is weak?"

**6. Consistency:**
- Conflicts with other FRDs or product overview
- Inconsistent terminology
- Example: "SignUp" in one FRD, "User Registration" in another

### Agent Response Format

The agent returns a structured review:

```json
{
  "action": "review_frd",
  "frdId": "frd-123",
  "frdTitle": "Email Sign-up",
  "issues": [
    {
      "id": "issue-1",
      "severity": "high",
      "type": "ambiguity",
      "section": "Requirements",
      "quote": "The system should provide a smooth sign-up experience",
      "message": "The term 'smooth' is vague. What does this mean? Consider: Sign-up should complete in <3 steps, <2 minutes",
      "suggestion": "Replace with quantifiable criteria: Sign-up completes in ≤3 user interactions and ≤2 minutes"
    },
    {
      "id": "issue-2",
      "severity": "high",
      "type": "missing_acceptance_criteria",
      "section": "Acceptance Criteria",
      "quote": "Users can create account with email and password",
      "message": "Acceptance criteria are vague and not testable. Add specific scenarios.",
      "suggestion": "GIVEN valid email and strong password, WHEN user clicks Create Account, THEN new user can log in\nGIVEN weak password, WHEN user clicks Create Account, THEN error message shows 'Password must be 8+ chars with numbers'"
    },
    {
      "id": "issue-3",
      "severity": "medium",
      "type": "missing_edge_cases",
      "section": "Requirements",
      "quote": null,
      "message": "Doesn't address what happens when email is already registered",
      "suggestion": "Add requirement: 'If email is already registered, show error: \"This email is already in use. Did you mean to log in?\" with link to login'"
    },
    {
      "id": "issue-4",
      "severity": "low",
      "type": "scope_clarity",
      "section": "Requirements",
      "quote": "Send confirmation email to verify address",
      "message": "Email sending might be a separate feature/task. Clarify if this is part of Sign-up or delegated to Email feature.",
      "suggestion": "Clarify dependency: 'Sends confirmation email (delegated to Email Verification task)' OR move email sending to separate requirement"
    }
  ],
  "summary": "4 issues found: 2 high severity (vague language, missing criteria), 1 medium (edge cases), 1 low (scope clarity)",
  "overallQuality": "fair",
  "estimatedCompleteness": 65
}
```

**Issue Fields:**
- `id`: Unique issue identifier
- `severity`: 'low', 'medium', 'high'
- `type`: 'ambiguity', 'missing_acceptance_criteria', 'missing_edge_cases', 'testability', 'consistency', 'scope_clarity'
- `section`: Which FRD section (Overview, Requirements, Acceptance Criteria, etc.)
- `quote`: Exact text from FRD (nullable if issue is about missing content)
- `message`: Human-readable description of the issue
- `suggestion`: Actionable fix or improvement

### Review Display UI

Agent response renders in chat with issue panel:

```
┌─ FRD Review: Email Sign-up ──────────────────────┐
│ Overall Quality: Fair (65% complete)             │
│ Issues Found: 4 (2 High, 1 Medium, 1 Low)       │
│                                                  │
│ HIGH SEVERITY ─────────────────────────────────  │
│ [Issue 1] Ambiguity: "smooth" is vague           │
│ Quote: "The system should provide a smooth..."  │
│ Suggestion: Replace with "Sign-up completes      │
│            in ≤3 steps, <2 minutes"             │
│ [Add Comment] [Insert into FRD]                 │
│                                                  │
│ [Issue 2] Missing Criteria: Acceptance...       │
│ Quote: "Users can create account..."            │
│ Suggestion: "GIVEN valid email and strong...    │
│ [Add Comment] [Insert into FRD]                 │
│                                                  │
│ MEDIUM SEVERITY ────────────────────────────────  │
│ [Issue 3] Missing Edge Cases: Email exists      │
│ [Add Comment] [Insert into FRD]                 │
│                                                  │
│ LOW SEVERITY ───────────────────────────────────  │
│ [Issue 4] Scope Clarity: Email sending...       │
│ [Add Comment] [Insert into FRD]                 │
│                                                  │
│ [Review Full Report] [Dismiss]                  │
└──────────────────────────────────────────────────┘
```

### Integration with Comments

(Defer to Phase 044 for full comment implementation, but allow preview here)

When user clicks "Add Comment" on an issue:
1. Add comment thread to FRD
2. Anchor comment to relevant section
3. Pre-populate comment text with suggestion

When user clicks "Insert into FRD":
1. Open editor in center panel
2. Navigate to relevant section
3. Insert suggestion text (as blockquote or highlighted text)
4. User can edit and accept

### System Prompt Enhancement

Update agent system prompt (Phase 037) to include:

```
When reviewing FRDs:
1. Check for vague, subjective language (fast, easy, user-friendly, robust)
2. Ensure acceptance criteria are testable and specific
3. Identify missing edge cases and error scenarios
4. Verify scope is clear (not overlapping with other features)
5. Check for consistency with other FRDs and product overview
6. Look for missing non-functional requirements (performance, security, accessibility)
7. Suggest concrete improvements with examples
8. Rate overall quality/completeness as percentage
9. Prioritize issues by severity (high/medium/low)

Format response as JSON with issues array.
```

## Database Schema
No new tables. Uses Phase 026 schema.

**Optional Enhancement (Phase 044+):**
- FRD Comments table for storing review feedback
- Issue tracking table for persistent review records

## API Routes

### POST /api/projects/[projectId]/agent/shop (existing)

Enhanced to support review requests:

**Body (for FRD review):**
```json
{
  "message": "Review this requirement",
  "conversationId": "conv-uuid",
  "context": {
    "selectedNodeId": "feature-1",
    "frdId": "frd-123"
  }
}
```

**Response:** Agent response with review JSON as before (streaming)

### GET /api/requirements-documents/[docId]/issues (optional, Phase 044+)

Fetch stored review issues for a document:

**Response:**
```json
{
  "issues": [
    {
      "id": "issue-1",
      "severity": "high",
      "type": "ambiguity",
      "section": "Requirements",
      "quote": "...",
      "message": "...",
      "suggestion": "..."
    }
  ]
}
```

## UI Components

### FRDReviewPanel Component
**Path:** `/components/PatternShop/FRDReviewPanel.tsx`

Displays review results in chat.

```typescript
interface FRDReviewResult {
  frdId: string;
  frdTitle: string;
  issues: ReviewIssue[];
  summary: string;
  overallQuality: string;
  estimatedCompleteness: number;
}

interface ReviewIssue {
  id: string;
  severity: 'low' | 'medium' | 'high';
  type: string;
  section: string;
  quote: string | null;
  message: string;
  suggestion: string;
}

export default function FRDReviewPanel({ review }: { review: FRDReviewResult }) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const issuesBySeverity = groupBy(review.issues, 'severity');
  const severityOrder = ['high', 'medium', 'low'];

  return (
    <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">{review.frdTitle}</h3>
        <p className="text-sm text-gray-600 mt-1">{review.summary}</p>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span>Overall Quality: <strong>{review.overallQuality}</strong></span>
          <span>Completeness: <strong>{review.estimatedCompleteness}%</strong></span>
        </div>
      </div>

      <div className="space-y-3">
        {severityOrder.map((severity) => {
          const issuesAtSeverity = issuesBySeverity[severity] || [];
          if (issuesAtSeverity.length === 0) return null;

          const severityColor = {
            high: 'red',
            medium: 'yellow',
            low: 'blue',
          }[severity];

          return (
            <div key={severity}>
              <h4 className={`text-sm font-semibold text-${severityColor}-700 mb-2`}>
                {severity.toUpperCase()} SEVERITY ({issuesAtSeverity.length})
              </h4>

              <div className="space-y-2">
                {issuesAtSeverity.map((issue) => (
                  <ReviewIssueCard
                    key={issue.id}
                    issue={issue}
                    isExpanded={expandedIssueId === issue.id}
                    onToggle={() =>
                      setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2">
        <button className="text-sm px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Review Full Report
        </button>
        <button className="text-sm px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Dismiss
        </button>
      </div>
    </div>
  );
}
```

### ReviewIssueCard Component
**Path:** `/components/PatternShop/ReviewIssueCard.tsx`

Individual issue display with expand/collapse.

```typescript
interface ReviewIssueCardProps {
  issue: ReviewIssue;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function ReviewIssueCard({
  issue,
  isExpanded,
  onToggle,
}: ReviewIssueCardProps) {
  return (
    <div className="bg-white p-3 rounded border border-gray-200">
      <button
        onClick={onToggle}
        className="w-full text-left flex items-start gap-2 hover:bg-gray-50 p-2 -m-2"
      >
        <ChevronDown
          size={16}
          className={`flex-shrink-0 transition-transform ${
            isExpanded ? '' : '-rotate-90'
          }`}
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{issue.message}</p>
          <p className="text-xs text-gray-500 mt-1">Section: {issue.section}</p>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 ml-6 space-y-2 text-sm">
          {issue.quote && (
            <div className="bg-gray-50 p-2 rounded border-l-2 border-gray-400 italic text-gray-600">
              "{issue.quote}"
            </div>
          )}

          <div>
            <p className="font-semibold text-gray-700 text-xs">Suggestion:</p>
            <p className="text-gray-700 mt-1">{issue.suggestion}</p>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                /* Add comment */
              }}
              className="text-xs px-2 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
            >
              Add Comment
            </button>
            <button
              onClick={() => {
                /* Insert into FRD */
              }}
              className="text-xs px-2 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
            >
              Insert into FRD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## File Structure
```
components/PatternShop/
  FRDReviewPanel.tsx          (review results display)
  ReviewIssueCard.tsx         (individual issue)

lib/
  agent/
    reviewPrompt.ts           (build review system prompt)
    parseReview.ts            (parse agent response)
```

## Acceptance Criteria
- [ ] User can request FRD review via agent chat
- [ ] Agent analyzes current FRD
- [ ] Agent response includes structured issues with severity
- [ ] UI displays issues grouped by severity (high/medium/low)
- [ ] Issues include type, quote, message, and suggestion
- [ ] User can expand/collapse individual issues
- [ ] "Add Comment" button pre-populates comment with suggestion
- [ ] "Insert into FRD" opens editor and highlights suggested text
- [ ] Overall quality and completeness percentage displayed
- [ ] Review handles multiple issues (10+ issues) without performance issues

## Testing Instructions

1. **Test review request:**
   - Create FRD with vague language: "The system should be fast and user-friendly"
   - In agent chat: "Review this requirement"
   - Verify agent response includes issues

2. **Test issue display:**
   - Verify issues are grouped by severity
   - Verify high-severity issues appear first
   - Verify all issue fields (quote, message, suggestion) display

3. **Test expand/collapse:**
   - Click issue to expand
   - Verify suggestion displays
   - Click again to collapse

4. **Test insert suggestion:**
   - Click "Insert into FRD" on an issue
   - Verify editor opens in center panel
   - Verify suggested text is highlighted or inserted

5. **Test edge cases:**
   - Review FRD with no issues (perfect FRD)
   - Verify "No issues found" message or similar
   - Review FRD with 20+ issues
   - Verify UI handles many issues without lag

6. **Test different FRD types:**
   - Review Epic-level FRD
   - Review Task-level FRD
   - Verify agent provides appropriate feedback for each level

## Dependencies
- Phase 026: Database schema
- Phase 033: Feature Requirements Document
- Phase 034: Requirements editor
- Phase 037: Agent infrastructure
- Phase 044: Comments (for integration)
