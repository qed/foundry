# Phase 026: Build Planning Stage Gate Check (Stage 3)

## Objective
Validate that Stage 3 (Build Planning) is complete by confirming all steps (3.1–3.3) have been executed, evidence is present, and the Build Plan meets the quality gate. Unlock Stage 4 (Repo Setup) on pass.

## Prerequisites
- Step 3.1 completed (Q&A session results stored)
- Step 3.2 completed (Build Plan files uploaded and validated)
- Step 3.3 completed (quality review passed)
- All evidence_data properly populated

## Epic Context (Epic 4: Build Planning & Repo Setup)
This stage gate is the quality checkpoint between Build Planning (Stage 3) and Repo Setup (Stage 4). It ensures the project is well-planned before infrastructure work begins.

## Context
Stage gates enforce a hard stop before proceeding. Stage 3 gate verifies:
1. Step 3.1 Q&A results exist
2. Step 3.2 Build Plan structure is valid (summary + 1+ phases)
3. Step 3.3 quality review has all items passed
4. Build Plan has sufficient detail for building

## Detailed Requirements

### 1. Stage Gate Validation Logic
Implement checklist of pass/fail conditions:

```typescript
// utils/stageGates.ts

interface StageGateStatus {
  canPass: boolean;
  step31: { complete: boolean; evidence: string | null };
  step32: { complete: boolean; evidence: string | null; errors: string[] };
  step33: { complete: boolean; evidence: string | null };
  failureReasons: string[];
}

export async function checkStage3Gate(projectId: string): Promise<StageGateStatus> {
  const evidence = await fetchHelix(projectId).then(h => h.evidence_data || {});
  const status: StageGateStatus = {
    canPass: true,
    step31: { complete: false, evidence: null },
    step32: { complete: false, evidence: null, errors: [] },
    step33: { complete: false, evidence: null },
    failureReasons: []
  };

  // Check Step 3.1: Q&A Session Results
  const step31Evidence = evidence.step31_qa_session;
  if (step31Evidence?.artifactId) {
    status.step31.complete = true;
    status.step31.evidence = step31Evidence.artifactId;
  } else {
    status.canPass = false;
    status.failureReasons.push("Step 3.1: Building Brief Summary Q&A results not submitted");
  }

  // Check Step 3.2: Build Plan Structure
  const step32Evidence = evidence.step32_build_plan;
  if (step32Evidence?.artifacts) {
    const { summary, phases } = step32Evidence.artifacts;

    // Validate summary exists
    if (!summary) {
      status.step32.errors.push("Missing summary file");
    }

    // Validate phases exist and count
    if (!phases || phases.length === 0) {
      status.step32.errors.push("No phase files found");
    } else if (phases.length < 5) {
      status.step32.errors.push("Insufficient phases (minimum 5 phases for buildable project)");
    }

    // Validate structure metadata
    if (step32Evidence.planStructure?.phaseCount > 0) {
      status.step32.complete = true;
      status.step32.evidence = step32Evidence.artifacts.summary;
    }

    if (status.step32.errors.length > 0) {
      status.canPass = false;
      status.failureReasons.push(
        `Step 3.2: Build Plan structure invalid - ${status.step32.errors.join(", ")}`
      );
    }
  } else {
    status.canPass = false;
    status.failureReasons.push("Step 3.2: Build Plan files not saved");
  }

  // Check Step 3.3: Quality Review Passed
  const step33Evidence = evidence.step33_quality_review;
  if (step33Evidence?.status === "approved" && step33Evidence.allPassed) {
    status.step33.complete = true;
    status.step33.evidence = step33Evidence.timestamp;
  } else {
    status.canPass = false;
    const reason = step33Evidence?.status === "revision-requested"
      ? "Quality review requested revisions"
      : "Quality review not completed or not all items passed";
    status.failureReasons.push(`Step 3.3: ${reason}`);
  }

  return status;
}

// Update stage gate status
export async function updateStage3Gate(projectId: string, status: StageGateStatus) {
  const gateRecord = {
    stageKey: "stage-3",
    status: status.canPass ? "passed" : "failed",
    timestamp: new Date().toISOString(),
    failureReasons: status.failureReasons,
    evidenceData: {
      step31: status.step31,
      step32: status.step32,
      step33: status.step33
    }
  };

  // Save to helix_stage_gates table
  await updateStagaGateTable(projectId, gateRecord);

  // If passed, unlock Stage 4
  if (status.canPass) {
    await unlockStage(projectId, "stage-4");
  }
}
```

### 2. Stage Gate Checkpoint UI
Display gate status with clear pass/fail messaging:

```typescript
// Components: helix/StageGateCheckpoint.tsx

interface StageGateCheckpointProps {
  projectId: string;
  stageKey: "stage-3";
  onPass?: () => void;
}

export function StageGateCheckpoint({
  projectId,
  stageKey,
  onPass
}: StageGateCheckpointProps) {
  const [gateStatus, setGateStatus] = useState<StageGateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkGate = async () => {
      try {
        const status =
          stageKey === "stage-3"
            ? await checkStage3Gate(projectId)
            : await checkStage4Gate(projectId);
        setGateStatus(status);

        if (status.canPass) {
          await updateStage3Gate(projectId, status);
        }
      } catch (err) {
        setError("Failed to check stage gate");
      } finally {
        setLoading(false);
      }
    };

    checkGate();
  }, [projectId, stageKey]);

  if (loading) {
    return <div className="p-6 text-center">Checking stage completion...</div>;
  }

  if (error || !gateStatus) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div
        className={`rounded-lg p-6 text-white ${
          gateStatus.canPass ? "bg-green-600" : "bg-red-600"
        }`}
      >
        <h2 className="text-2xl font-bold mb-2">
          {gateStatus.canPass ? "✓ Stage 3 Complete" : "✗ Stage 3 Incomplete"}
        </h2>
        <p>
          {gateStatus.canPass
            ? "All Build Planning steps completed. Ready to proceed to Repo Setup."
            : "Some requirements not met. Please complete all steps before proceeding."}
        </p>
      </div>

      {/* Step Checklist */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Stage Requirements</h3>

        <StepCheckItem
          number={1}
          title="Step 3.1: Building Brief Summary Prompt"
          complete={gateStatus.step31.complete}
          evidence={gateStatus.step31.evidence}
        />

        <StepCheckItem
          number={2}
          title="Step 3.2: Save Build Plan Output"
          complete={gateStatus.step32.complete}
          evidence={gateStatus.step32.evidence}
          errors={gateStatus.step32.errors}
        />

        <StepCheckItem
          number={3}
          title="Step 3.3: Review Build Plan Quality"
          complete={gateStatus.step33.complete}
          evidence={gateStatus.step33.evidence}
        />
      </div>

      {/* Failure Reasons */}
      {gateStatus.failureReasons.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-900 mb-2">Blockers</h4>
          <ul className="space-y-1">
            {gateStatus.failureReasons.map((reason, idx) => (
              <li key={idx} className="text-sm text-red-700">
                • {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
        {gateStatus.canPass ? (
          <p className="text-sm text-blue-700">
            Stage 4 (Repo Setup) is now available. Proceed to Step 4.1 to copy the repository template.
          </p>
        ) : (
          <p className="text-sm text-blue-700">
            Please complete the blockers above to unlock Stage 4.
          </p>
        )}
      </div>

      {/* Action Button */}
      {gateStatus.canPass && (
        <button
          onClick={onPass}
          className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
        >
          Proceed to Stage 4 (Repo Setup)
        </button>
      )}
    </div>
  );
}

interface StepCheckItemProps {
  number: number;
  title: string;
  complete: boolean;
  evidence?: string | null;
  errors?: string[];
}

function StepCheckItem({ number, title, complete, evidence, errors }: StepCheckItemProps) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
            complete ? "bg-green-600" : "bg-slate-300"
          }`}
        >
          {complete ? "✓" : number}
        </div>

        <div className="flex-1">
          <h4 className="font-semibold">{title}</h4>
          {errors && errors.length > 0 && (
            <div className="mt-2 text-sm text-red-700 space-y-1">
              {errors.map((err, idx) => (
                <div key={idx}>• {err}</div>
              ))}
            </div>
          )}
          {complete && evidence && (
            <p className="text-xs text-slate-500 mt-2">
              Verified: {evidence.substring(0, 12)}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

## File Structure
```
/components/helix/
├── StageGateCheckpoint.tsx (gate UI)
└── utils/stageGates.ts (gate logic)

/db/
└── schema.ts (helix_stage_gates table definition)
```

## Dependencies
- Step 3.1 evidence (Q&A artifact ID)
- Step 3.2 evidence (Build Plan structure metadata)
- Step 3.3 evidence (quality review approval)
- helix_stage_gates table
- Stage unlock system

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (database)
- React hooks

## Acceptance Criteria
1. Gate checks for Step 3.1 completion (Q&A artifact exists)
2. Gate checks for Step 3.2 completion (summary + 1+ phases)
3. Gate checks for Step 3.3 completion (quality review passed, all items checked)
4. If any requirement fails, gate status is "failed" with clear failure reasons
5. If all requirements pass, gate status is "passed"
6. UI displays pass/fail with individual step checks
7. Failure reasons are specific (e.g., "Step 3.2: Missing phase files")
8. If gate passes, Stage 4 is unlocked automatically
9. UI provides navigation to next stage on pass
10. Gate status is saved to helix_stage_gates table with timestamp

## Testing Instructions
1. **Load Gate**: Open stage gate checkpoint; verify it checks all three steps
2. **Incomplete Step 3.1**: Clear Step 3.1 evidence; reload gate; verify failure with reason
3. **Incomplete Step 3.2**: Clear Step 3.2 evidence; reload gate; verify failure with reason
4. **Incomplete Step 3.3**: Clear Step 3.3 evidence; reload gate; verify failure with reason
5. **All Complete**: Ensure all steps complete; reload gate; verify pass status
6. **Pass Button**: With gate passed, click "Proceed to Stage 4"; verify navigation
7. **Database Update**: After pass, check helix_stage_gates table; verify entry created
8. **Failure List**: With failures, verify all failure reasons displayed
9. **Evidence Display**: Verify evidence IDs/timestamps shown for each step
10. **Unlock Stage 4**: After gate pass, verify Stage 4 is unlocked/available

## Notes for AI Agent
- The stage gate is hard-blocking; no way to skip it
- Minimum 5 phases is a heuristic; adjust if needed for projects with fewer phases
- If quality review has revisions requested, gate fails; user must re-review after revisions
- Consider adding a "Retry" button to re-check gate without page reload
- The gate status should be cacheable to avoid repeated checks
- Store gate timestamp for audit trail and to show when stage was completed
