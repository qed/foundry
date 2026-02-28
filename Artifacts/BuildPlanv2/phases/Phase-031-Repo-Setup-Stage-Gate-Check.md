# Phase 031: Repo Setup Stage Gate Check (Stage 4)

## Objective
Validate that Stage 4 (Repo Setup) is complete by confirming all steps (4.1–4.4) have been executed with proper evidence. Unlock Stage 5 (Review) on pass.

## Prerequisites
- Step 4.1 completed (template copied)
- Step 4.2 completed (placeholders replaced)
- Step 4.3 completed (BuildPlan folder verified)
- Step 4.4 completed (git repository initialized)

## Epic Context (Epic 4: Build Planning & Repo Setup)
This stage gate ensures the repository infrastructure is properly set up before the final pre-build review. It validates that the project template is customized, Build Plan is embedded, and version control is initialized.

## Context
Stage 4 gate verifies:
1. Step 4.1: Repository template was copied
2. Step 4.2: Placeholders were replaced with project values
3. Step 4.3: BuildPlan folder is populated with all required files
4. Step 4.4: Git repository is initialized and ready for development

## Detailed Requirements

### 1. Stage 4 Gate Validation Logic
Implement gate checks for all Repo Setup steps:

```typescript
// utils/stageGates.ts

interface StageGateStatus {
  canPass: boolean;
  step41: { complete: boolean; evidence: string | null };
  step42: { complete: boolean; evidence: string | null; method?: "manual" | "download" };
  step43: { complete: boolean; evidence: string | null; verificationPassed?: boolean };
  step44: { complete: boolean; evidence: string | null; gitInitialized?: boolean };
  failureReasons: string[];
}

export async function checkStage4Gate(projectId: string): Promise<StageGateStatus> {
  const evidence = await fetchHelix(projectId).then(h => h.evidence_data || {});
  const status: StageGateStatus = {
    canPass: true,
    step41: { complete: false, evidence: null },
    step42: { complete: false, evidence: null },
    step43: { complete: false, evidence: null },
    step44: { complete: false, evidence: null },
    failureReasons: []
  };

  // Check Step 4.1: Template Copied
  const step41Evidence = evidence.step41_template_copy;
  if (step41Evidence?.evidence?.copied) {
    status.step41.complete = true;
    status.step41.evidence = step41Evidence.timestamp;
  } else {
    status.canPass = false;
    status.failureReasons.push("Step 4.1: Repository template not confirmed as copied");
  }

  // Check Step 4.2: Placeholders Replaced
  const step42Evidence = evidence.step42_placeholder_replacement;
  if (step42Evidence?.values && Object.keys(step42Evidence.values).length > 0) {
    status.step42.complete = true;
    status.step42.evidence = step42Evidence.timestamp;
    status.step42.method = step42Evidence.method;
  } else {
    status.canPass = false;
    status.failureReasons.push("Step 4.2: Placeholder replacements not completed");
  }

  // Check Step 4.3: BuildPlan Folder Populated
  const step43Evidence = evidence.step43_populate_buildplan;
  if (
    step43Evidence?.verificationPassed &&
    step43Evidence.requiredFilesFound === step43Evidence.requiredFilesTotal
  ) {
    status.step43.complete = true;
    status.step43.evidence = step43Evidence.timestamp;
    status.step43.verificationPassed = true;
  } else {
    status.canPass = false;
    const reason = step43Evidence?.missingFiles?.length
      ? `${step43Evidence.missingFiles.length} files missing`
      : "BuildPlan folder verification not completed";
    status.failureReasons.push(`Step 4.3: ${reason}`);
  }

  // Check Step 4.4: Git Repository Initialized
  const step44Evidence = evidence.step44_git_init;
  if (
    step44Evidence?.gitInitialized &&
    step44Evidence.devBranchCreated &&
    step44Evidence.initialCommitCreated
  ) {
    status.step44.complete = true;
    status.step44.evidence = step44Evidence.timestamp;
    status.step44.gitInitialized = true;
  } else {
    status.canPass = false;
    const missing = [];
    if (!step44Evidence?.gitInitialized) missing.push("git init");
    if (!step44Evidence?.devBranchCreated) missing.push("dev branch");
    if (!step44Evidence?.initialCommitCreated) missing.push("initial commit");
    status.failureReasons.push(
      `Step 4.4: Incomplete git setup (missing: ${missing.join(", ")})`
    );
  }

  // Additional checks
  if (status.canPass) {
    // Verify repo URL is provided if git was initialized
    if (step44Evidence?.repositoryUrl) {
      const urlValid = step44Evidence.repositoryUrl.match(
        /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\.git$/
      );
      if (!urlValid) {
        status.canPass = false;
        status.failureReasons.push("Step 4.4: GitHub repository URL is invalid format");
      }
    }
  }

  return status;
}

export async function updateStage4Gate(projectId: string, status: StageGateStatus) {
  const gateRecord = {
    stageKey: "stage-4",
    status: status.canPass ? "passed" : "failed",
    timestamp: new Date().toISOString(),
    failureReasons: status.failureReasons,
    evidenceData: {
      step41: status.step41,
      step42: status.step42,
      step43: status.step43,
      step44: status.step44
    }
  };

  // Save to helix_stage_gates table
  await updateStageGateTable(projectId, gateRecord);

  // If passed, unlock Stage 5
  if (status.canPass) {
    await unlockStage(projectId, "stage-5");
  }
}
```

### 2. Stage Gate Checkpoint UI
Display gate status with clear pass/fail messaging:

```typescript
// Components: helix/Stage4GateCheckpoint.tsx

interface Stage4GateCheckpointProps {
  projectId: string;
  onPass?: () => void;
}

export function Stage4GateCheckpoint({
  projectId,
  onPass
}: Stage4GateCheckpointProps) {
  const [gateStatus, setGateStatus] = useState<StageGateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkGate = async () => {
      try {
        const status = await checkStage4Gate(projectId);
        setGateStatus(status);

        if (status.canPass) {
          await updateStage4Gate(projectId, status);
        }
      } catch (err) {
        setError("Failed to check stage gate");
      } finally {
        setLoading(false);
      }
    };

    checkGate();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Checking stage completion...</div>
      </div>
    );
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
          {gateStatus.canPass ? "✓ Stage 4 Complete" : "✗ Stage 4 Incomplete"}
        </h2>
        <p>
          {gateStatus.canPass
            ? "All Repo Setup steps completed. Ready to proceed to Pre-Build Review."
            : "Some requirements not met. Please complete all steps before proceeding."}
        </p>
      </div>

      {/* Step Checklist */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Stage Requirements</h3>

        <StepCheckItem
          number={1}
          title="Step 4.1: Copy Repo Template"
          complete={gateStatus.step41.complete}
          evidence={gateStatus.step41.evidence}
        />

        <StepCheckItem
          number={2}
          title="Step 4.2: Find-and-Replace Placeholders"
          complete={gateStatus.step42.complete}
          evidence={gateStatus.step42.evidence}
          detail={gateStatus.step42.method ? `(${gateStatus.step42.method} method)` : undefined}
        />

        <StepCheckItem
          number={3}
          title="Step 4.3: Populate BuildPlan Folder"
          complete={gateStatus.step43.complete}
          evidence={gateStatus.step43.evidence}
          detail={gateStatus.step43.verificationPassed ? "(verified)" : undefined}
        />

        <StepCheckItem
          number={4}
          title="Step 4.4: Initialize Git Repo"
          complete={gateStatus.step44.complete}
          evidence={gateStatus.step44.evidence}
          detail={gateStatus.step44.gitInitialized ? "(git + dev branch)" : undefined}
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

      {/* Success Info */}
      {gateStatus.canPass && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-green-900">Repository Ready</h4>
          <ul className="text-sm text-green-700 space-y-1 ml-4 list-disc">
            <li>Repository template customized with project values</li>
            <li>Build Plan files embedded in BuildPlan/ folder</li>
            <li>Git repository initialized with dev branch and initial commit</li>
            <li>Ready for code development in Stage 6</li>
          </ul>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
        {gateStatus.canPass ? (
          <p className="text-sm text-blue-700">
            Stage 5 (Pre-Build Review) is now available. Proceed to the comprehensive final review
            before entering the Build stage.
          </p>
        ) : (
          <p className="text-sm text-blue-700">
            Please complete the blockers above to unlock Stage 5.
          </p>
        )}
      </div>

      {/* Action Button */}
      {gateStatus.canPass && (
        <button
          onClick={onPass}
          className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
        >
          Proceed to Stage 5 (Pre-Build Review)
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
  detail?: string;
}

function StepCheckItem({ number, title, complete, evidence, detail }: StepCheckItemProps) {
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
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{title}</h4>
            {detail && <span className="text-xs text-slate-500">{detail}</span>}
          </div>
          {complete && evidence && (
            <p className="text-xs text-slate-500 mt-2">
              ✓ Completed: {evidence.substring(0, 10)}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3. Stage Gate Page Integration
Create dedicated gate checkpoint page:

```typescript
// /stage-gates/stage-4/page.tsx

export default function Stage4GatePage() {
  const { projectId } = useProjectContext();

  const handlePass = () => {
    navigateToStage("stage-5");
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Stage 4: Repo Setup</h1>
        <p className="text-slate-600">
          Final verification that repository infrastructure is complete and ready for development
        </p>
      </div>

      <Stage4GateCheckpoint projectId={projectId} onPass={handlePass} />
    </div>
  );
}
```

## File Structure
```
/components/helix/
├── Stage4GateCheckpoint.tsx (gate UI)
└── utils/stageGates.ts (updated with stage 4 logic)

/stage-gates/
└── stage-4/page.tsx (gate checkpoint page)
```

## Dependencies
- Evidence data from Steps 4.1–4.4
- helix_stage_gates table
- Stage unlock system
- Navigation utilities

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (database)
- React hooks

## Acceptance Criteria
1. Gate checks for Step 4.1 completion (template copied)
2. Gate checks for Step 4.2 completion (placeholders replaced)
3. Gate checks for Step 4.3 completion (BuildPlan folder verified)
4. Gate checks for Step 4.4 completion (git initialized with dev branch and commit)
5. If any requirement fails, gate status is "failed" with clear failure reasons
6. If all requirements pass, gate status is "passed"
7. UI displays pass/fail with individual step checks and details
8. Failure reasons are specific (e.g., "Step 4.3: 3 files missing")
9. If gate passes, Stage 5 is unlocked automatically
10. Gate status is saved to helix_stage_gates table with timestamp

## Testing Instructions
1. **Load Gate**: Open stage 4 gate checkpoint; verify all four steps are checked
2. **Incomplete Step 4.1**: Clear Step 4.1 evidence; reload gate; verify failure with reason
3. **Incomplete Step 4.2**: Clear Step 4.2 evidence; reload gate; verify failure
4. **Incomplete Step 4.3**: Mark Step 4.3 verification as failed; reload gate; verify failure
5. **Incomplete Step 4.4**: Clear git init evidence; reload gate; verify failure
6. **All Complete**: Ensure all steps complete with proper evidence; reload gate; verify pass
7. **Pass Button**: With gate passed, click "Proceed to Stage 5"; verify navigation
8. **Database Update**: After pass, check helix_stage_gates table; verify entry created
9. **Failure List**: With failures, verify all failure reasons displayed
10. **Detail Info**: Verify step details (method, branch, verification status) shown when appropriate

## Notes for AI Agent
- Stage 4 gate is hard-blocking; no way to skip it
- Repository URL in Step 4.4 is optional but recommended; gate passes either way
- All required files from Step 4.3 must be verified as present
- Git initialization requires at least: git init, dev branch, initial commit
- Remote push to GitHub is optional; gate passes without it
- Consider adding a "Retry" button to re-check gate without page reload
- Store gate timestamp for audit trail of when stage was completed
- This is the final gate before entering Build stage
