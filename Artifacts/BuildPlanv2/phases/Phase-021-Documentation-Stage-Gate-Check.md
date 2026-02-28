# Phase 021: Documentation Stage Gate Check

## Phase Overview
**Stage:** Epic 3: Documentation Stage (Infrastructure)
**Phase:** 021
**Time Estimate:** 3-4 hours
**Complexity:** High

## Objective
Implement stage-level gate validation that ensures all 4 Documentation Stage steps (2.1-2.4) are complete with valid evidence before allowing advancement to Build Planning (Stage 3). This gate provides a comprehensive quality check and prevents incomplete documentation from blocking downstream work.

## Prerequisites
- Phases 015-020 complete and implemented
- All 4 step implementations functional (2.1-2.4)
- helix_steps and helix_stage_gates tables created
- Gate check engine from Epic 1 functional
- Evidence structures from phases 015-018 implemented

## Epic Context
Phase 021 completes the Documentation Stage infrastructure by implementing the stage-level gate. While individual steps have minimum gates (phase 015-018), the stage gate ensures comprehensive completeness: all steps done, all required evidence present, all gaps acknowledged. This is the final quality barrier before proceeding to build planning.

## Context
Gates serve multiple purposes:
1. **Quality assurance:** Ensure work meets standards before moving forward
2. **Process integrity:** Prevent skipping critical steps
3. **Team alignment:** Create checkpoints for review and approval
4. **Risk mitigation:** Flag incomplete work early

The Documentation Stage Gate validates that:
- All 4 steps are completed
- Each step has valid, substantive evidence
- Critical gaps are acknowledged
- Team is ready to proceed to build planning

## Detailed Requirements

### 1. Stage-Level Gate Validation
Create comprehensive gate check for Documentation Stage (stage_number = 2):

**Validation Rules:**

1. **Step 2.1 Validation**
   - Status: Must be `gate_status = 'passed'`
   - Evidence: Must have `evidence_data.categories` array with at least 1 category
   - Data Quality: At least 1 category must have `exists = true`
   - Completeness: All standard categories must be present in array (even if not checked)

2. **Step 2.2 Validation**
   - Status: Must be `gate_status = 'passed'`
   - Evidence: Must have `evidence_data.sections` object with 8 sections
   - Data Quality: At least 3 sections must have content (50+ characters)
   - Artifact: Must have artifact_id in evidence_data

3. **Step 2.3 Validation**
   - Status: Must be `gate_status = 'passed'`
   - Evidence: Must have `evidence_data.files` array with at least 1 file
   - Data Quality: Each file must have valid metadata (name, size, type, category)
   - Storage: All files must be accessible in Supabase Storage
   - Artifact References: All files must have artifact_id

4. **Step 2.4 Validation**
   - Status: Must be `gate_status = 'passed'`
   - Evidence: Must have `evidence_data.verification` object
   - Data Quality: verification object must have `all_gaps_acknowledged = true`
   - Gap Acknowledgment: All gaps in `category_gaps` array must have `acknowledged = true`
   - Status: verification.verification_status must be 'passed'

### 2. Gate Check UI Component
Create reusable `StageGateCheck.tsx` component that displays all requirements:

**Component Structure:**
```
┌─────────────────────────────────────────────────────┐
│ Documentation Stage Gate Check                      │
│                                                      │
│ Before you can proceed to Build Planning, we need   │
│ to verify your documentation is complete.           │
│                                                      │
│ ✓ Step 2.1: Identify Documentation      [View]     │
│ ✓ Step 2.2: Capture Knowledge           [View]     │
│ ✓ Step 2.3: Gather Documentation        [View]     │
│ ✓ Step 2.4: Verify Complete             [View]     │
│                                                      │
│ Quality Checks:                                     │
│ ✓ At least 1 documentation category     [View]     │
│ ✓ Knowledge capture: 3+ sections        [View]     │
│ ✓ Documentation files uploaded          [View]     │
│ ✓ All documentation gaps acknowledged   [View]     │
│                                                      │
│                    [View Full Report]              │
│                                                      │
│                    [← Back] [Pass Gate] [?]        │
└─────────────────────────────────────────────────────┘
```

**Gate Check Display Elements:**

1. **Step Completion Status** (4 items)
   - Step 2.1: Identify Documentation
     - Icon: CheckCircle2 (green) or AlertCircle (red)
     - Status: "Complete" or "Incomplete"
     - [View Details] link

2. **Quality Requirements** (4+ items)
   - At least 1 documentation category identified
   - Knowledge capture: 3+ sections with content
   - At least 1 documentation file uploaded
   - All documentation gaps acknowledged
   - For each: Icon (pass/fail), description, [View Details]

3. **Overall Status**
   - Progress bar: X of Y checks passing
   - Status message: "Ready for Build Planning" or "X checks remaining"
   - Help text explaining what's blocking

4. **Action Buttons**
   - "[View Full Report]" - Opens detailed gate check report with all evidence
   - "[← Back]" - Return to previous view
   - "[Pass Gate]" - Only enabled when all checks pass
   - Help icon with gate explanation

### 3. Gate Check Logic
Create validation function in `lib/helix/gate-checks/documentation.ts`:

```typescript
interface DocumentationGateCheckResult {
  stage_number: number;
  stage_name: string;
  checks_total: number;
  checks_passed: number;
  gate_status: 'passed' | 'failed';
  timestamp: string;

  step_checks: {
    step_key: string;
    step_name: string;
    status: 'complete' | 'incomplete' | 'missing';
    evidence_present: boolean;
    evidence_valid: boolean;
    errors: string[];
  }[];

  quality_checks: {
    check_id: string;
    check_name: string;
    required: boolean;
    status: 'pass' | 'fail';
    details: string;
    evidence_reference: string;
  }[];

  blocking_issues: string[];
  warnings: string[];
}

async function checkDocumentationStageGate(
  projectId: string,
  stageNumber: number = 2
): Promise<DocumentationGateCheckResult>
```

### 4. Specific Gate Check Validations
Implementation details for each check:

**Check: Step 2.1 Complete**
```typescript
async function validateStep21(projectId: string): Promise<CheckResult> {
  const step = await getHelix Step(projectId, '2-1');

  if (!step || step.gate_status !== 'passed') {
    return { pass: false, error: 'Step 2.1 not completed' };
  }

  const categories = step.evidence_data?.categories || [];
  if (categories.length === 0) {
    return { pass: false, error: 'No documentation categories identified' };
  }

  const checked = categories.filter(c => c.exists).length;
  if (checked === 0) {
    return { pass: false, error: 'No documentation categories marked as existing' };
  }

  return { pass: true, detail: `${checked} of ${categories.length} categories identified` };
}
```

**Check: Step 2.2 Complete**
```typescript
async function validateStep22(projectId: string): Promise<CheckResult> {
  const step = await getHelixStep(projectId, '2-2');

  if (!step || step.gate_status !== 'passed') {
    return { pass: false, error: 'Step 2.2 not completed' };
  }

  const sections = step.evidence_data?.sections || {};
  const completed = Object.values(sections).filter(
    (s: any) => s.content.length > 50
  ).length;

  if (completed < 3) {
    return { pass: false, error: `Only ${completed} of 8 sections completed (need 3)` };
  }

  if (!step.evidence_data?.artifact_id) {
    return { pass: false, error: 'Knowledge capture artifact not created' };
  }

  return { pass: true, detail: `${completed} sections completed, artifact created` };
}
```

**Check: Step 2.3 Complete**
```typescript
async function validateStep23(projectId: string): Promise<CheckResult> {
  const step = await getHelixStep(projectId, '2-3');

  if (!step || step.gate_status !== 'passed') {
    return { pass: false, error: 'Step 2.3 not completed' };
  }

  const files = step.evidence_data?.files || [];
  if (files.length === 0) {
    return { pass: false, error: 'No documentation files uploaded' };
  }

  // Verify files exist in storage
  const missingFiles = [];
  for (const file of files) {
    const exists = await checkFileInStorage(file.storage_path);
    if (!exists) missingFiles.push(file.file_name);
  }

  if (missingFiles.length > 0) {
    return { pass: false, error: `Files missing from storage: ${missingFiles.join(', ')}` };
  }

  return { pass: true, detail: `${files.length} files uploaded and accessible` };
}
```

**Check: Step 2.4 Complete**
```typescript
async function validateStep24(projectId: string): Promise<CheckResult> {
  const step = await getHelixStep(projectId, '2-4');

  if (!step || step.gate_status !== 'passed') {
    return { pass: false, error: 'Step 2.4 not completed' };
  }

  const verification = step.evidence_data?.verification || {};
  if (verification.verification_status !== 'passed') {
    return { pass: false, error: 'Verification did not pass' };
  }

  if (!verification.all_gaps_acknowledged) {
    const gaps = step.evidence_data?.category_gaps || [];
    const unacknowledged = gaps.filter((g: any) => !g.acknowledged).length;
    return { pass: false, error: `${unacknowledged} gaps not acknowledged` };
  }

  return { pass: true, detail: 'All gaps acknowledged and verified' };
}
```

### 5. Database Updates
Update helix_stage_gates table when gate passes:

```sql
UPDATE helix_stage_gates
SET
  gate_status = 'passed',
  gate_check_result = '{"stage_number": 2, "checks_passed": 8, ...}'::jsonb,
  last_checked_at = NOW(),
  can_advance = true,
  updated_at = NOW()
WHERE
  project_id = $1
  AND stage_number = 2;
```

### 6. Gate Check Results Storage
Store detailed gate check results in helix_stage_gates table:

```json
{
  "gate_status": "passed",
  "gate_check_result": {
    "stage_number": 2,
    "stage_name": "Documentation",
    "checks_total": 8,
    "checks_passed": 8,
    "gate_status": "passed",
    "checked_at": "2026-02-28T20:00:00Z",
    "checked_by": "user_123",
    "step_checks": [
      {
        "step_key": "2-1",
        "step_name": "Identify Documentation",
        "status": "complete",
        "evidence_present": true,
        "evidence_valid": true,
        "errors": []
      },
      // ... more steps
    ],
    "quality_checks": [
      {
        "check_id": "doc_inventory_exists",
        "check_name": "At least 1 documentation category identified",
        "required": true,
        "status": "pass",
        "details": "6 of 12 categories identified",
        "evidence_reference": "step_2-1"
      },
      // ... more checks
    ],
    "blocking_issues": [],
    "warnings": []
  },
  "can_advance": true
}
```

### 7. Component Breakdown

#### File: `components/helix/StageGateCheck.tsx`
```typescript
interface StageGateCheckProps {
  projectId: string;
  stageNumber: number;
  stageName: string;
  onPass?: () => void;        // Called when gate passes
  onFail?: (errors: string[]) => void;
  readOnly?: boolean;         // Disable "Pass Gate" button
  showDetails?: boolean;      // Show full check details
}

interface GateCheckState {
  checking: boolean;
  result: DocumentationGateCheckResult | null;
  error: string | null;
}

export function StageGateCheck(props: StageGateCheckProps) {
  // Fetch gate check results
  // Render check status for each step and quality check
  // Disable/enable Pass Gate button based on results
  // Handle Pass Gate click
}
```

#### File: `lib/helix/gate-checks/documentation.ts`
```typescript
export async function checkDocumentationStageGate(
  projectId: string
): Promise<DocumentationGateCheckResult>

export async function validateStep21(projectId: string): Promise<CheckResult>
export async function validateStep22(projectId: string): Promise<CheckResult>
export async function validateStep23(projectId: string): Promise<CheckResult>
export async function validateStep24(projectId: string): Promise<CheckResult>

export async function validateQualityRequirements(
  projectId: string
): Promise<CheckResult[]>
```

#### File: `lib/helix/gate-checks/base.ts`
```typescript
// Reusable gate check infrastructure for all stages
interface GateCheckConfig {
  stageNumber: number;
  stageName: string;
  stepKeys: string[];
  qualityChecks: QualityCheckDefinition[];
}

export function createStageGateCheck(config: GateCheckConfig) {
  // Returns reusable gate check factory
  // Can be used for stages 1-4
}
```

#### File: `api/helix/gate-check/route.ts`
```typescript
// POST /api/helix/gate-check
// Request: { projectId, stageNumber }
// Response: DocumentationGateCheckResult
// Handles: Run gate check, update helix_stage_gates, return results
```

## File Structure
```
/components/helix/
  ├── StageGateCheck.tsx                (Reusable gate check component)
  ├── GateCheckStep.tsx                 (Individual step check item)
  ├── GateCheckQuality.tsx              (Individual quality check item)
  ├── GateCheckSummary.tsx              (Overall status summary)
  ├── GateCheckReport.tsx               (Full detailed report)
  └── GateCheckDetails.tsx              (Detailed view for each check)

/lib/helix/gate-checks/
  ├── base.ts                           (Reusable gate check infrastructure)
  ├── documentation.ts                  (Documentation stage validation)
  ├── types.ts                          (Shared types)
  └── helpers.ts                        (Shared validation helpers)

/api/helix/
  └── gate-check/
      └── route.ts                      (POST gate check, GET status)
```

## Dependencies

### Database
- `helix_steps` table (query all 4 steps)
- `helix_stage_gates` table (update gate status)
- `artifacts` table (verify artifact references)

### Supabase
- Storage bucket (verify files accessible)
- Database queries for evidence validation
- RLS policies for access control

### Components
- React hooks (useState, useEffect, useCallback)
- StepOutputCard component (from Phase 020)
- Toast notification system
- Modal/dialog for detailed report

### Libraries
- `lucide-react` icons (CheckCircle2, AlertCircle, XCircle)
- Date formatting utilities

## Tech Stack
- **Frontend:** Next.js 16+, TypeScript, React
- **Styling:** Tailwind CSS v4
- **Icons:** lucide-react
- **Database:** Supabase PostgreSQL
- **API:** Next.js API Routes

## Acceptance Criteria

1. **Gate Check Component Renders**: Component displays all step checks and quality checks with proper icons and status
2. **Step Validation Works**: All 4 steps validated correctly (complete/incomplete status determined)
3. **Quality Checks Pass**: All 8 quality checks validate correctly and return appropriate pass/fail status
4. **Gate Status Correct**: Overall gate status is "passed" only when all checks pass, "failed" otherwise
5. **Evidence Validation**: Gate check verifies evidence exists, is valid, and accessible
6. **Gap Acknowledgment**: Gate fails if any gaps not acknowledged in step 2.4
7. **Database Updated**: Passing gate updates helix_stage_gates with gate_status='passed' and check results
8. **Pass Gate Button**: Button only enabled when gate_status='passed', disabled with tooltip otherwise
9. **Error Messages Clear**: Failed checks show clear error messages explaining what's missing or invalid
10. **Report Generation**: Full detailed report can be exported showing all checks, evidence, and results

## Testing Instructions

1. **Test All Steps Complete**
   - Complete all 4 steps (2.1-2.4) with valid evidence
   - Open gate check
   - Verify all 4 steps show "complete" with checkmarks
   - Verify all quality checks pass
   - Verify overall status: "Ready for Build Planning"

2. **Test Step Missing**
   - Skip step 2.3 (don't upload files)
   - Open gate check
   - Verify step 2.3 shows "incomplete"
   - Verify quality check "At least 1 documentation file" fails
   - Verify "Pass Gate" button disabled
   - Verify error message explains issue

3. **Test Insufficient Evidence**
   - Complete step 2.2 with only 1 section filled
   - Open gate check
   - Verify check "Knowledge capture: 3+ sections" fails
   - Verify error shows actual vs. required
   - Verify gate blocked

4. **Test Gaps Not Acknowledged**
   - Complete step 2.4 but don't acknowledge a missing gap
   - Open gate check
   - Verify check "All documentation gaps acknowledged" fails
   - Verify error message specific
   - Verify gate blocked

5. **Test Quality Checks**
   - Verify each quality check validates independently
   - Complete step 2.1 with 0 categories checked
   - Verify "At least 1 category" check fails
   - Complete step 2.3 with 1 file
   - Verify "At least 1 file" check passes
   - Verify count shown in check ("1 files uploaded")

6. **Test Gate Check Results Storage**
   - Run gate check with all passes
   - Query helix_stage_gates table
   - Verify gate_status = 'passed'
   - Verify gate_check_result jsonb contains all checks
   - Verify last_checked_at timestamp recent
   - Verify can_advance = true

7. **Test Files Accessible**
   - Upload file in step 2.3
   - Move file in Supabase Storage to different location
   - Run gate check
   - Verify check "Documentation files accessible" fails
   - Verify error message shows missing file
   - Move file back, re-run gate check, verify passes

8. **Test Pass Gate Button**
   - Open gate with all checks failing
   - Verify "Pass Gate" button disabled with tooltip
   - Verify button text explains why disabled
   - Complete steps to pass all checks
   - Verify button enables
   - Click button, verify submission succeeds

9. **Test Report Generation**
   - Open gate check with mix of pass/fail checks
   - Click "View Full Report"
   - Verify report contains:
     - All step checks with status
     - All quality checks with details
     - Evidence references
     - Timestamps and user info
   - Verify report exportable/downloadable

10. **Test Mobile Responsive**
    - Resize to mobile (375px)
    - Verify checks stack vertically
    - Verify all icons and status visible
    - Verify buttons accessible
    - Verify report readable on mobile

## Notes for AI Agent

### Implementation Guidance
- Create gate check as pure function first (testable)
- Separate validation logic from UI rendering
- Cache gate check results (don't re-run on every render)
- Use useCallback to prevent unnecessary re-renders
- Implement proper error handling and logging

### Validation Function Structure
```typescript
// Create validation functions for each step
async function validateStep(projectId, stepKey): Promise<{
  pass: boolean;
  detail: string;
  errors: string[];
  warnings: string[];
}> {
  // 1. Fetch step evidence
  // 2. Validate structure
  // 3. Validate content quality
  // 4. Verify referenced files/artifacts
  // 5. Return result
}

// Call all validations in parallel
async function checkDocumentationStageGate(projectId) {
  const checks = await Promise.all([
    validateStep21(projectId),
    validateStep22(projectId),
    validateStep23(projectId),
    validateStep24(projectId),
    validateQualityRequirements(projectId),
  ]);

  const totalChecks = checks.length;
  const passedChecks = checks.filter(c => c.pass).length;

  return {
    gate_status: passedChecks === totalChecks ? 'passed' : 'failed',
    checks_total: totalChecks,
    checks_passed: passedChecks,
    // ... detailed results
  };
}
```

### Quality Checks Configuration
```typescript
// lib/helix/gate-checks/documentation.ts
const QUALITY_CHECKS: QualityCheckDefinition[] = [
  {
    id: 'inventory_categories',
    name: 'At least 1 documentation category identified',
    validate: (stepData) => stepData['2-1']?.categories.some(c => c.exists),
  },
  {
    id: 'knowledge_sections',
    name: 'Knowledge capture: 3+ sections with content',
    validate: (stepData) => {
      const sections = stepData['2-2']?.sections || {};
      const withContent = Object.values(sections).filter(s => s.content.length > 50);
      return withContent.length >= 3;
    },
  },
  // ... more checks
];
```

### Styling Notes
- Use green checkmark for passing checks: `text-green-600`
- Use red X for failing checks: `text-red-600`
- Use gray circle for not applicable: `text-gray-400`
- Overall status color based on gate result
- Disable button with opacity: `opacity-50 cursor-not-allowed`

### Performance Optimization
- Cache gate check results for 5 minutes
- Only re-run if step status changes
- Use shallow equality for result comparison
- Lazy load detailed report (modal/expansion)

### Error Handling
- Log detailed errors server-side
- Show user-friendly error messages
- Distinguish between:
  - Missing steps/evidence (hard block)
  - Insufficient evidence quality (hard block)
  - Warnings (soft, not blocking)
- Provide actionable remediation steps

### Testing Strategy
- Unit test each validation function
- Integration test full gate check flow
- Test with various levels of completeness
- Test edge cases (missing data, corrupted data)
- Test concurrency (multiple gate checks)

### Common Pitfalls
- Don't assume step exists (check for null)
- Don't ignore missing evidence (require all)
- Don't show gate passed if any critical check fails
- Ensure validation consistent across steps
- Don't lock gate checks permanently (allow re-runs)
- Test gate check with partial/incomplete evidence

### Future Enhancements
- Stakeholder approval workflow (before passing gate)
- Automatic remediation suggestions
- Gate check notifications to team
- Dependency tracking between stages
- Historical gate check reports
- Performance analytics (how long to complete stage)

---

**Phase Author:** Helix Documentation Stage Design Team
**Version:** 1.0
**Last Updated:** 2026-02-28
**Status:** Ready for Implementation
