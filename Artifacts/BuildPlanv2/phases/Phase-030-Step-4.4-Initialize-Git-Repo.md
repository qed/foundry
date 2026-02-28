# Phase 030: Step 4.4 — Initialize Git Repo

## Objective
Provide step-by-step git initialization instructions, collect GitHub repository URL, execute or guide user through git init, branch creation, and initial commit. Record evidence of successful repo setup.

## Prerequisites
- Step 4.3 completed (BuildPlan folder populated)
- Git installed on user's local machine
- GitHub account and access to create repositories

## Epic Context (Epic 4: Build Planning & Repo Setup)
Step 4.4 is the final step of Repo Setup (Stage 4), converting the local customized template into a version-controlled git repository. This enables team collaboration and tracking of all build-phase code changes.

## Context
After populating the BuildPlan folder, the repository needs to be initialized as a git repository with:
1. git init (create .git directory)
2. git checkout -b dev (create development branch)
3. git add . (stage all files)
4. git commit -m "Initial commit" (create initial commit)
5. git remote add origin [GITHUB_URL] (add remote if provided)
6. git push -u origin dev (push to GitHub if remote configured)

This step provides clear instructions for each OS and optionally automates some steps.

## Detailed Requirements

### 1. Git Initialization Instructions Component
Display step-by-step git commands:

```typescript
// Components: helix/GitInitInstructions.tsx

interface GitInitInstructionsProps {
  projectName: string;
  repoName?: string;
  onComplete?: (result: GitInitResult) => void;
}

interface GitInitResult {
  gitInitialized: boolean;
  devBranchCreated: boolean;
  initialCommitCreated: boolean;
  remoteAdded?: boolean;
  repositoryUrl?: string;
  timestamp: string;
}

export function GitInitInstructions({
  projectName,
  repoName = projectName,
  onComplete
}: GitInitInstructionsProps) {
  const [selectedOs, setSelectedOs] = useState<"mac-linux" | "windows">("mac-linux");
  const [showInstructions, setShowInstructions] = useState(true);
  const [copied, setCopied] = useState(false);

  const getInstructions = (os: string): string => {
    const commands = [
      "# Navigate to your project directory",
      `cd /path/to/${repoName}`,
      "",
      "# Initialize git repository",
      "git init",
      "",
      "# Create and switch to dev branch",
      "git checkout -b dev",
      "",
      "# Add all files to staging area",
      "git add .",
      "",
      '# Create initial commit',
      'git commit -m "Initial commit: Project setup from Foundry template"',
      "",
      "# (OPTIONAL) Add remote repository and push",
      "# Replace with your actual GitHub repository URL",
      "# git remote add origin https://github.com/your-org/your-repo.git",
      "# git push -u origin dev"
    ];

    if (os === "windows") {
      // Windows-specific adjustments
      commands[1] = `cd C:\\path\\to\\${repoName}`;
      return commands.join("\n");
    }

    return commands.join("\n");
  };

  const instructions = getInstructions(selectedOs);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* OS Selection */}
      <div className="flex gap-2">
        {(["mac-linux", "windows"] as const).map(os => (
          <button
            key={os}
            onClick={() => setSelectedOs(os)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedOs === os
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {os === "mac-linux" ? "macOS / Linux" : "Windows"}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
        <pre>{instructions}</pre>
      </div>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium"
      >
        {copied ? "✓ Copied" : "Copy Commands"}
      </button>

      {/* Details */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2">
        <p className="font-semibold">What these commands do:</p>
        <ul className="ml-4 space-y-1 list-disc">
          <li><code className="bg-blue-100 px-1 py-0.5 rounded">git init</code> — Creates a .git directory to track version history</li>
          <li><code className="bg-blue-100 px-1 py-0.5 rounded">git checkout -b dev</code> — Creates and switches to the dev branch (main branch for development)</li>
          <li><code className="bg-blue-100 px-1 py-0.5 rounded">git add .</code> — Stages all files in the project for commit</li>
          <li><code className="bg-blue-100 px-1 py-0.5 rounded">git commit</code> — Creates a snapshot of the staged files</li>
          <li><code className="bg-blue-100 px-1 py-0.5 rounded">git remote add origin</code> — (Optional) Connects to a GitHub repository</li>
          <li><code className="bg-blue-100 px-1 py-0.5 rounded">git push -u origin dev</code> — (Optional) Pushes code to GitHub</li>
        </ul>
      </div>
    </div>
  );
}
```

### 2. GitHub Repository URL Input
Accept and validate GitHub URL:

```typescript
// Components: helix/GitHubRepositorySetup.tsx

interface GitHubRepositorySetupProps {
  projectName: string;
  onConfirm: (url: string, pushToGitHub: boolean) => void;
}

export function GitHubRepositorySetup({
  projectName,
  onConfirm
}: GitHubRepositorySetupProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [pushToGitHub, setPushToGitHub] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return !pushToGitHub; // Not required if not pushing

    const githubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\.git$/;
    if (!githubUrlPattern.test(url)) {
      setUrlError(
        "Invalid GitHub URL. Expected format: https://github.com/org/repo.git"
      );
      return false;
    }

    setUrlError(null);
    return true;
  };

  const handleConfirm = () => {
    if (validateUrl(repoUrl)) {
      onConfirm(repoUrl, pushToGitHub);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 border border-slate-200 rounded-lg p-6">
      <div>
        <h3 className="font-semibold text-lg mb-2">GitHub Repository (Optional)</h3>
        <p className="text-sm text-slate-600 mb-4">
          If you have a GitHub repository ready, provide its URL to push your code.
          This step is optional; you can push later.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pushToGitHub}
            onChange={(e) => setPushToGitHub(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">
            I have a GitHub repository ready and want to push now
          </span>
        </label>
      </div>

      {pushToGitHub && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            GitHub Repository URL <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value);
              if (urlError) validateUrl(e.target.value);
            }}
            placeholder="https://github.com/your-org/your-repo.git"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
              urlError
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:ring-slate-900"
            }`}
          />
          {urlError && (
            <p className="text-sm text-red-600">{urlError}</p>
          )}
          <p className="text-xs text-slate-500">
            You can find this URL on your GitHub repository page (Code button)
          </p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
      >
        {pushToGitHub ? "Initialize Repo & Push to GitHub" : "Initialize Local Repo"}
      </button>
    </div>
  );
}
```

### 3. Execution Status Tracking
Component to track completion of git initialization:

```typescript
// Components: helix/GitInitStatusTracker.tsx

interface GitInitStep {
  id: string;
  name: string;
  command: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  description: string;
}

interface GitInitStatusTrackerProps {
  projectName: string;
  repositoryUrl?: string;
  pushToGitHub?: boolean;
  onComplete: (result: GitInitResult) => void;
}

export function GitInitStatusTracker({
  projectName,
  repositoryUrl,
  pushToGitHub,
  onComplete
}: GitInitStatusTrackerProps) {
  const [steps, setSteps] = useState<GitInitStep[]>(() => {
    const baseSteps: GitInitStep[] = [
      {
        id: "git-init",
        name: "Initialize Git Repo",
        command: "git init",
        status: "pending",
        description: "Creates .git directory and initializes version control"
      },
      {
        id: "git-branch",
        name: "Create Dev Branch",
        command: "git checkout -b dev",
        status: "pending",
        description: "Creates and switches to dev branch"
      },
      {
        id: "git-add",
        name: "Stage Files",
        command: "git add .",
        status: "pending",
        description: "Stages all files for commit"
      },
      {
        id: "git-commit",
        name: "Create Initial Commit",
        command: 'git commit -m "Initial commit"',
        status: "pending",
        description: "Creates snapshot of initial state"
      }
    ];

    if (pushToGitHub && repositoryUrl) {
      baseSteps.push({
        id: "git-remote",
        name: "Add Remote Repository",
        command: `git remote add origin ${repositoryUrl}`,
        status: "pending",
        description: "Connects to GitHub repository"
      });

      baseSteps.push({
        id: "git-push",
        name: "Push to GitHub",
        command: "git push -u origin dev",
        status: "pending",
        description: "Uploads code to GitHub"
      });
    }

    return baseSteps;
  });

  const handleStepComplete = (stepId: string, status: "completed" | "failed") => {
    setSteps(prev =>
      prev.map(step =>
        step.id === stepId
          ? { ...step, status }
          : step
      )
    );
  };

  const handleAllComplete = () => {
    const allPassed = steps.every(s => s.status === "completed");
    const result: GitInitResult = {
      gitInitialized: steps.find(s => s.id === "git-init")?.status === "completed" || false,
      devBranchCreated: steps.find(s => s.id === "git-branch")?.status === "completed" || false,
      initialCommitCreated: steps.find(s => s.id === "git-commit")?.status === "completed" || false,
      remoteAdded: steps.find(s => s.id === "git-remote")?.status === "completed",
      repositoryUrl: repositoryUrl,
      timestamp: new Date().toISOString()
    };

    onComplete(result);
  };

  const completedCount = steps.filter(s => s.status === "completed").length;
  const allCompleted = completedCount === steps.length;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-blue-900">Git Initialization Progress</h3>
          <span className="text-lg font-bold text-blue-900">{completedCount}/{steps.length}</span>
        </div>
        <div className="w-full bg-blue-200 rounded h-3">
          <div
            className="bg-blue-900 h-3 rounded transition-all"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <GitInitStepItem
            key={step.id}
            step={step}
            onComplete={handleStepComplete}
          />
        ))}
      </div>

      {/* Complete Button */}
      {allCompleted && (
        <button
          onClick={handleAllComplete}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
        >
          ✓ All Steps Complete - Proceed
        </button>
      )}
    </div>
  );
}

interface GitInitStepItemProps {
  step: GitInitStep;
  onComplete: (stepId: string, status: "completed" | "failed") => void;
}

function GitInitStepItem({ step, onComplete }: GitInitStepItemProps) {
  const isCompleted = step.status === "completed";

  return (
    <div
      className={`border rounded-lg p-4 ${
        isCompleted
          ? "bg-green-50 border-green-200"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold ${
                isCompleted ? "bg-green-600" : "bg-slate-300"
              }`}
            >
              {isCompleted ? "✓" : "•"}
            </div>
            <h4 className="font-semibold">{step.name}</h4>
          </div>

          <code className="block bg-slate-100 px-3 py-2 rounded text-sm font-mono mb-2">
            {step.command}
          </code>

          <p className="text-sm text-slate-600">{step.description}</p>
        </div>

        {!isCompleted && (
          <div className="flex gap-2">
            <button
              onClick={() => onComplete(step.id, "completed")}
              className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded hover:bg-green-200 transition whitespace-nowrap"
            >
              Done
            </button>
            <button
              onClick={() => onComplete(step.id, "failed")}
              className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded hover:bg-red-200 transition"
            >
              Issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4. Evidence Storage
Store git initialization results:

```typescript
const storeGitInitEvidence = async (
  projectId: string,
  result: GitInitResult
) => {
  const evidence = {
    step44_git_init: {
      timestamp: result.timestamp,
      status: result.gitInitialized && result.devBranchCreated && result.initialCommitCreated
        ? "completed"
        : "partial",
      gitInitialized: result.gitInitialized,
      devBranchCreated: result.devBranchCreated,
      initialCommitCreated: result.initialCommitCreated,
      remoteAdded: result.remoteAdded,
      repositoryUrl: result.repositoryUrl
    }
  };

  await updateHelix(projectId, "step-4.4", evidence);
};
```

### 5. Step 4.4 Page Integration
Combine all components:

```typescript
// /steps/step-4.4/page.tsx

export default function Step44Page() {
  const { projectId, projectName } = useProjectContext();
  const [phase, setPhase] = useState<"instructions" | "github-setup" | "tracking">("instructions");
  const [repoUrl, setRepoUrl] = useState("");
  const [pushToGitHub, setPushToGitHub] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleGithubSetup = (url: string, push: boolean) => {
    setRepoUrl(url);
    setPushToGitHub(push);
    setPhase("tracking");
  };

  const handleInitComplete = async (result: GitInitResult) => {
    await storeGitInitEvidence(projectId, result);
    setCompleted(true);
  };

  return (
    <StepDetailView
      stepKey="step-4.4"
      title="Initialize Git Repo"
      objective="Create a git repository and prepare for code version control"
    >
      <div className="space-y-8">
        {/* Instructions */}
        {phase === "instructions" && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Git Initialization Instructions</h2>
            <GitInitInstructions projectName={projectName} />
            <button
              onClick={() => setPhase("github-setup")}
              className="mt-6 w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
            >
              Next: Configure GitHub (Optional)
            </button>
          </section>
        )}

        {/* GitHub Setup */}
        {phase === "github-setup" && (
          <section>
            <h2 className="text-2xl font-bold mb-4">GitHub Repository Setup</h2>
            <GitHubRepositorySetup
              projectName={projectName}
              onConfirm={handleGithubSetup}
            />
          </section>
        )}

        {/* Tracking */}
        {phase === "tracking" && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Track Your Progress</h2>
            <p className="text-slate-600 mb-6">
              Follow the commands below in your terminal. Mark each step as complete when done.
            </p>
            <GitInitStatusTracker
              projectName={projectName}
              repositoryUrl={repoUrl}
              pushToGitHub={pushToGitHub}
              onComplete={handleInitComplete}
            />
          </section>
        )}

        {/* Success */}
        {completed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <h3 className="font-semibold text-green-900 mb-2">✓ Git Repository Initialized</h3>
            <p className="text-green-700 mb-4">
              Stage 4 (Repo Setup) is now complete. Ready to proceed to the Pre-Build Review.
            </p>
            <button
              onClick={() => navigateToStep("stage-gate-4")}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Proceed to Stage Gate Review
            </button>
          </div>
        )}
      </div>
    </StepDetailView>
  );
}
```

## File Structure
```
/steps/step-4.4/
├── page.tsx (step page)
├── GitInitInstructions.tsx
├── GitHubRepositorySetup.tsx
├── GitInitStatusTracker.tsx
└── api/git/init.ts (optional server-side helper)
```

## Dependencies
- Git installed on user's machine
- GitHub account (optional, for pushing)
- Project folder from Step 4.3
- evidence_data storage

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (database)
- React hooks
- Git CLI (external)

## Acceptance Criteria
1. Git instructions display for Mac/Linux and Windows with appropriate commands
2. Instructions can be copied to clipboard
3. Optional GitHub repository URL input is provided
4. GitHub URL validation checks for HTTPS format and .git extension
5. Status tracker displays all git initialization steps
6. Each step can be marked as "Done" or "Issue"
7. Progress bar updates as steps are completed
8. All steps must be completed before proceeding
9. Results are stored in evidence_data with timestamp and step statuses
10. On completion, Stage 4 is marked complete and Stage 5 becomes available

## Testing Instructions
1. **Load Instructions**: Open step 4.4; verify git commands display for default OS
2. **OS Switch**: Switch to Windows tab; verify commands change appropriately
3. **Copy Commands**: Click copy button; paste in text editor; verify all commands present
4. **GitHub URL**: Click "Push to GitHub"; enter invalid URL; verify error message
5. **URL Format**: Enter valid URL (https://github.com/org/repo.git); verify accepts
6. **Skip GitHub**: Don't select "Push to GitHub"; click next; verify no push steps shown
7. **Step Tracking**: Mark steps as "Done" in sequence; verify progress bar updates
8. **All Steps**: Complete all steps; verify button to proceed appears
9. **Evidence Storage**: After completion, verify evidence_data contains all statuses
10. **Navigation**: After success, click proceed button; verify navigation to next stage

## Notes for AI Agent
- The instructions are static text; in production, consider making them more dynamic based on detected OS
- The GitHub URL validation is basic; consider more robust validation or OAuth flow for future versions
- Status tracking is manual (user clicks "Done"); consider automation if CI/CD integration is added
- The dev branch is set as the working branch; main branch can be created later
- Consider adding a "Test Connection" button for GitHub URLs to verify access
- The initial commit message is fixed; consider allowing customization
- For users uncomfortable with CLI, consider providing a Git GUI alternative link
