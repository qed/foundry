# Phase 032: Step 5.1 — Pre-Build Review Checkpoint

## Objective
Implement a comprehensive final review checklist before the Build stage begins. Verify all project files, Build Plan consistency, AI agent readiness, documentation completeness, and team access. This is the final hard gate that unlocks Stage 6 (Build).

## Prerequisites
- Stage 4 gate passed (Repo Setup complete)
- All previous documentation artifacts collected
- Build Plan files embedded in repository
- Git repository initialized

## Epic Context (Epic 4: Build Planning & Repo Setup)
Step 5.1 is the culmination of Epic 4 (Build Planning & Repo Setup). This final checkpoint verifies that all planning and setup is complete, consistent, and detailed enough for the AI agent to begin building from Phase 001.

## Context
Before entering the Build stage, a comprehensive review ensures:
1. CLAUDE.md is project-specific and complete
2. BuildPlan files are internally consistent
3. Phase files have sufficient implementation detail
4. Slash commands reference correct paths and files
5. Roadmap shows Phase 001 as ready
6. Conventions are documented in nextsteps.md
7. .gitignore covers all necessary patterns
8. Environment variables are documented
9. Team members have repository access
10. Dev branch is set as the default working branch

This review checks the repository at the filesystem level and validates completeness before building begins.

## Detailed Requirements

### 1. Pre-Build Review Checklist Component
Create comprehensive checklist with 10 items:

```typescript
// Components: helix/PreBuildReviewChecklist.tsx

interface ReviewChecklistItem {
  id: string;
  title: string;
  description: string;
  category: "documentation" | "planning" | "infrastructure" | "setup";
  passed?: boolean;
  notes?: string;
  autoCheckable?: boolean;
  checkFunction?: (projectData: ProjectData) => boolean;
}

interface ProjectData {
  claudeMd?: string;
  buildPlanFiles?: string[];
  phases?: any[];
  gitignore?: string;
  envExample?: string;
  packageJson?: any;
  nextSteps?: string;
  repoUrl?: string;
}

const PRE_BUILD_CHECKLIST: ReviewChecklistItem[] = [
  {
    id: "claude-md-complete",
    title: "CLAUDE.md is accurate and project-specific",
    description:
      "CLAUDE.md contains project overview, key files, conventions, and slash commands specific to this project (not generic template)",
    category: "documentation",
    autoCheckable: true,
    checkFunction: (data) => {
      if (!data.claudeMd) return false;
      // Check for project-specific content (not placeholders)
      const hasProjectName = data.claudeMd.includes("[PROJECT_NAME]") === false;
      const hasSectionCount = (data.claudeMd.match(/^##\s/gm) || []).length >= 5;
      return hasProjectName && hasSectionCount;
    }
  },
  {
    id: "buildplan-consistency",
    title: "BuildPlan files are consistent with each other",
    description:
      "Phase count in roadmap.md matches actual phase files; phase numbers are sequential; no conflicting requirements",
    category: "planning"
  },
  {
    id: "phase-detail",
    title: "Phase files have sufficient detail for AI agent to build from",
    description:
      "Each phase spec includes: Objective, Prerequisites, Detailed Requirements with code examples, Acceptance Criteria (10+), Testing Instructions (10+)",
    category: "planning",
    autoCheckable: true,
    checkFunction: (data) => {
      if (!data.phases || data.phases.length === 0) return false;
      return data.phases.every(phase => {
        const reqCount = (phase.content.match(/### \d+\./gm) || []).length;
        const criteriaCount = (phase.content.match(/##\s+Acceptance Criteria/i) ? 1 : 0) +
                            (phase.content.match(/\d+\.\s+.*$/gm) || []).length;
        return reqCount >= 5 && criteriaCount >= 10;
      });
    }
  },
  {
    id: "slash-commands",
    title: "Slash commands (/build-phase, /align, /resume-phase) reference correct paths",
    description:
      "CLAUDE.md documents slash commands with accurate file paths and parameters; commands reference actual files in BuildPlan/",
    category: "documentation"
  },
  {
    id: "roadmap-phase001",
    title: "roadmap.md shows Phase 001 as ready to build",
    description:
      "roadmap.md indicates Phase 001 is the starting point; no dependencies on earlier phases; has clear success criteria",
    category: "planning"
  },
  {
    id: "conventions-documented",
    title: "nextsteps.md has project-specific conventions and immediate actions",
    description:
      "nextsteps.md includes code style, naming conventions, git workflow, testing patterns, and the first 3 actions to take in Build stage",
    category: "documentation"
  },
  {
    id: "gitignore-complete",
    title: ".gitignore covers all needed patterns",
    description:
      "Includes: node_modules/, .env, dist/, .next/, build artifacts, OS files (.DS_Store, Thumbs.db), IDE files (.vscode, .idea)",
    category: "infrastructure",
    autoCheckable: true,
    checkFunction: (data) => {
      if (!data.gitignore) return false;
      const patterns = ["node_modules", ".env", "dist", ".next", ".DS_Store", ".vscode"];
      return patterns.every(p => data.gitignore!.includes(p));
    }
  },
  {
    id: "env-documented",
    title: "Environment variables documented (.env.example, CLAUDE.md, or nextsteps.md)",
    description:
      "Lists all required env vars with descriptions; .env.example includes all keys; CLAUDE.md or nextsteps.md documents setup steps",
    category: "setup",
    autoCheckable: true,
    checkFunction: (data) => {
      if (!data.envExample) return false;
      return data.envExample.includes("=") && data.envExample.split("\n").length >= 3;
    }
  },
  {
    id: "team-access",
    title: "Team members have repository access",
    description:
      "GitHub repository is accessible to all team members with appropriate permissions (Owner for leads, Maintain/Triage for contributors)",
    category: "setup"
  },
  {
    id: "dev-branch-default",
    title: "Dev branch is set as default working branch",
    description:
      "GitHub repository settings show 'dev' as the default branch (not main); all pull requests default to dev as the base branch",
    category: "infrastructure"
  }
];

interface PreBuildReviewChecklistProps {
  projectId: string;
  projectName: string;
  repositoryUrl?: string;
  onApprove: (checklist: ReviewChecklistResult) => void;
  onRevisionRequest: (checklist: ReviewChecklistResult, notes: string) => void;
}

interface ReviewChecklistResult {
  timestamp: string;
  allPassed: boolean;
  itemsChecked: ReviewChecklistItem[];
  passedCount: number;
  totalCount: number;
  overallNotes: string;
  approverName?: string;
}

export function PreBuildReviewChecklist({
  projectId,
  projectName,
  repositoryUrl,
  onApprove,
  onRevisionRequest
}: PreBuildReviewChecklistProps) {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [checklist, setChecklist] = useState<ReviewChecklistItem[]>(PRE_BUILD_CHECKLIST);
  const [overallNotes, setOverallNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        // Fetch repository contents for validation
        const data = await fetchProjectData(projectId, repositoryUrl);
        setProjectData(data);

        // Auto-check items with check functions
        const updatedChecklist = checklist.map(item => {
          if (item.autoCheckable && item.checkFunction && data) {
            return { ...item, passed: item.checkFunction(data) };
          }
          return item;
        });
        setChecklist(updatedChecklist);
      } catch (err) {
        setError("Failed to load project data for review");
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [projectId]);

  const toggleItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, passed: !item.passed } : item
      )
    );
  };

  const updateItemNotes = (id: string, notes: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, notes } : item
      )
    );
  };

  const allPassed = checklist.every(item => item.passed);
  const passedCount = checklist.filter(item => item.passed).length;

  const handleApprove = () => {
    onApprove({
      timestamp: new Date().toISOString(),
      allPassed: true,
      itemsChecked: checklist,
      passedCount,
      totalCount: checklist.length,
      overallNotes,
      approverName: "User"
    });
  };

  const handleRevisionRequest = () => {
    onRevisionRequest(
      {
        timestamp: new Date().toISOString(),
        allPassed: false,
        itemsChecked: checklist,
        passedCount,
        totalCount: checklist.length,
        overallNotes
      },
      overallNotes
    );
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-600">Loading project for review...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-blue-900">Pre-Build Review Checklist</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">{passedCount}/{checklist.length}</div>
            <div className="text-sm text-blue-700">Items Passed</div>
          </div>
        </div>
        <div className="w-full bg-blue-200 rounded h-3">
          <div
            className="bg-blue-900 h-3 rounded transition-all"
            style={{ width: `${(passedCount / checklist.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-sm text-slate-600">Project Name</div>
          <div className="text-lg font-semibold">{projectName}</div>
        </div>
        {repositoryUrl && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="text-sm text-slate-600">Repository</div>
            <div className="text-xs font-mono text-slate-700 break-all">{repositoryUrl}</div>
          </div>
        )}
      </div>

      {/* Review Items by Category */}
      <div className="space-y-6">
        {["documentation", "planning", "infrastructure", "setup"].map(category => (
          <ReviewCategory
            key={category}
            category={category}
            items={checklist.filter(item => item.category === category)}
            onToggle={toggleItem}
            onNotesChange={updateItemNotes}
          />
        ))}
      </div>

      {/* Overall Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold">Overall Review Notes</label>
        <textarea
          placeholder="Any observations, concerns, or notes before approving Build stage..."
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={handleRevisionRequest}
          className="px-6 py-3 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg font-medium transition"
        >
          Request Revisions
        </button>
        <button
          onClick={handleApprove}
          disabled={!allPassed}
          className={`px-6 py-3 font-medium rounded-lg transition ${
            allPassed
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
          title={allPassed ? "Approve and unlock Build stage" : "Complete all items to approve"}
        >
          ✓ Approve & Start Building
        </button>
      </div>

      {!allPassed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
          <strong>Ready?</strong> All items must pass before you can begin the Build stage. Review any unchecked items above.
        </div>
      )}

      {allPassed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
          <strong>Ready to build!</strong> All pre-build checks passed. You can now proceed to Stage 6 (Build).
        </div>
      )}
    </div>
  );
}

// Category Component
const CATEGORY_LABELS: Record<string, { title: string; emoji: string }> = {
  documentation: { title: "Documentation", emoji: "📄" },
  planning: { title: "Planning & Phases", emoji: "📋" },
  infrastructure: { title: "Infrastructure", emoji: "⚙️" },
  setup: { title: "Setup & Access", emoji: "🔧" }
};

interface ReviewCategoryProps {
  category: string;
  items: ReviewChecklistItem[];
  onToggle: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

function ReviewCategory({
  category,
  items,
  onToggle,
  onNotesChange
}: ReviewCategoryProps) {
  const label = CATEGORY_LABELS[category] || { title: category, emoji: "•" };
  const categoryPassed = items.every(item => item.passed);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Category Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900">
              {label.emoji} {label.title}
            </h4>
          </div>
          <div className="text-right">
            {categoryPassed ? (
              <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded">
                ✓ All Passed
              </span>
            ) : (
              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded">
                {items.filter(i => i.passed).length}/{items.length} Passed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-200">
        {items.map((item) => (
          <ReviewItem
            key={item.id}
            item={item}
            onToggle={onToggle}
            onNotesChange={onNotesChange}
          />
        ))}
      </div>
    </div>
  );
}

interface ReviewItemProps {
  item: ReviewChecklistItem;
  onToggle: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

function ReviewItem({ item, onToggle, onNotesChange }: ReviewItemProps) {
  const [expandNotes, setExpandNotes] = useState(false);

  return (
    <div className="px-6 py-4 space-y-3">
      <div className="flex items-start gap-4">
        <button
          onClick={() => onToggle(item.id)}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition mt-1 ${
            item.passed
              ? "bg-green-600 border-green-600 text-white"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          {item.passed && "✓"}
        </button>

        <div className="flex-1">
          <h5 className="font-semibold text-slate-900">{item.title}</h5>
          <p className="text-sm text-slate-600 mt-1">{item.description}</p>

          {/* Notes Section */}
          {item.notes || expandNotes ? (
            <div className="mt-3">
              <textarea
                placeholder="Add notes..."
                value={item.notes || ""}
                onChange={(e) => onNotesChange(item.id, e.target.value)}
                onBlur={() => setExpandNotes(false)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          ) : (
            <button
              onClick={() => setExpandNotes(true)}
              className="text-xs text-slate-500 hover:text-slate-700 mt-2"
            >
              Add notes...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2. Project Data Fetching
Fetch repository contents for validation:

```typescript
// utils/projectDataFetcher.ts

async function fetchProjectData(
  projectId: string,
  repositoryUrl?: string
): Promise<ProjectData> {
  const data: ProjectData = {};

  try {
    // Fetch CLAUDE.md
    const claudeMd = await fetchFileFromGitHub(repositoryUrl, "CLAUDE.md");
    data.claudeMd = claudeMd;

    // Fetch BuildPlan files
    const buildPlanFiles = await listFilesInDirectory(repositoryUrl, "BuildPlan");
    data.buildPlanFiles = buildPlanFiles;

    // Fetch phases
    const phaseFiles = await listFilesInDirectory(repositoryUrl, "BuildPlan/phases");
    data.phases = await Promise.all(
      phaseFiles
        .filter(f => f.startsWith("Phase-"))
        .map(f => fetchFileFromGitHub(repositoryUrl, `BuildPlan/phases/${f}`))
    );

    // Fetch .gitignore
    data.gitignore = await fetchFileFromGitHub(repositoryUrl, ".gitignore");

    // Fetch .env.example
    data.envExample = await fetchFileFromGitHub(repositoryUrl, ".env.example");

    // Fetch nextsteps.md
    data.nextSteps = await fetchFileFromGitHub(repositoryUrl, "BuildPlan/nextsteps.md");

    return data;
  } catch (error) {
    console.error("Error fetching project data:", error);
    throw error;
  }
}

async function fetchFileFromGitHub(
  repositoryUrl: string | undefined,
  filePath: string
): Promise<string | null> {
  if (!repositoryUrl) return null;

  // Use GitHub API to fetch file content
  const [org, repo] = repositoryUrl
    .replace("https://github.com/", "")
    .replace(".git", "")
    .split("/");

  try {
    const response = await fetch(
      `https://api.github.com/repos/${org}/${repo}/contents/${filePath}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch (error) {
    return null;
  }
}

async function listFilesInDirectory(
  repositoryUrl: string | undefined,
  dirPath: string
): Promise<string[]> {
  if (!repositoryUrl) return [];

  const [org, repo] = repositoryUrl
    .replace("https://github.com/", "")
    .replace(".git", "")
    .split("/");

  try {
    const response = await fetch(
      `https://api.github.com/repos/${org}/${repo}/contents/${dirPath}`
    );

    if (!response.ok) return [];

    const files = await response.json();
    return files.map((f: any) => f.name);
  } catch (error) {
    return [];
  }
}
```

### 3. Evidence Storage
Store review results and unlock Stage 6:

```typescript
const storePreBuildReviewEvidence = async (
  projectId: string,
  result: ReviewChecklistResult,
  approved: boolean
) => {
  const evidence = {
    step51_pre_build_review: {
      timestamp: result.timestamp,
      status: approved ? "approved" : "revision-requested",
      passedCount: result.passedCount,
      totalCount: result.totalCount,
      allPassed: result.allPassed,
      overallNotes: result.overallNotes,
      itemsChecked: result.itemsChecked.map(item => ({
        id: item.id,
        title: item.title,
        passed: item.passed,
        notes: item.notes
      })),
      approverName: result.approverName
    }
  };

  await updateHelix(projectId, "step-5.1", evidence);

  // If approved, mark stage 5 as complete and unlock stage 6
  if (approved) {
    await updateStageGate(projectId, "stage-5", {
      status: "passed",
      timestamp: new Date().toISOString()
    });

    // Unlock stage 6 (Build)
    await unlockStage(projectId, "stage-6");
  }
};
```

### 4. Step 5.1 Page Integration
Integrate checklist into step page:

```typescript
// /steps/step-5.1/page.tsx

export default function Step51Page() {
  const { projectId, projectName } = useProjectContext();
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [approved, setApproved] = useState(false);

  const handleApprove = async (result: ReviewChecklistResult) => {
    await storePreBuildReviewEvidence(projectId, result, true);
    setApproved(true);
  };

  const handleRevisionRequest = async (
    result: ReviewChecklistResult,
    notes: string
  ) => {
    await storePreBuildReviewEvidence(projectId, result, false);
    // TODO: Show revision request UI
  };

  return (
    <StepDetailView
      stepKey="step-5.1"
      title="Pre-Build Review Checkpoint"
      objective="Final comprehensive review before entering the Build stage"
    >
      <div className="space-y-8">
        {!approved ? (
          <PreBuildReviewChecklist
            projectId={projectId}
            projectName={projectName}
            repositoryUrl={repositoryUrl}
            onApprove={handleApprove}
            onRevisionRequest={handleRevisionRequest}
          />
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center space-y-4">
            <h2 className="text-3xl font-bold text-green-900">✓ Build Stage Unlocked</h2>
            <p className="text-green-700 text-lg">
              All pre-build checks passed. You are ready to begin Phase 001 of the Build stage.
            </p>
            <button
              onClick={() => navigateToStage("stage-6")}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Start Build Stage (Phase 001)
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
/steps/step-5.1/
├── page.tsx (step page)
├── PreBuildReviewChecklist.tsx (main checklist component)
└── utils/projectDataFetcher.ts (data fetching logic)
```

## Dependencies
- GitHub API access (for fetching repository files)
- Build Plan files (from Step 4.3)
- helix_steps table for evidence storage
- Stage unlock system

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (database)
- GitHub API
- React hooks

## Acceptance Criteria
1. Checklist loads with all 10 items visible
2. Auto-checkable items (CLAUDE.md, .gitignore, env vars) are evaluated based on repository contents
3. Manual items (slash commands, team access, dev branch) have toggles for user verification
4. Toggle buttons work; clicking toggles pass/fail state
5. Each item can have notes added and edited
6. Progress bar updates to show passed/total items
7. Category sections group items by type with category icons/labels
8. "Approve & Start Building" button is disabled until all items pass
9. "Request Revisions" button works and stores feedback
10. Approval stores evidence and unlocks Stage 6 (Build)

## Testing Instructions
1. **Load Checklist**: Open step 5.1; verify all 10 items display
2. **Auto-Check**: Verify CLAUDE.md, .gitignore, env vars are auto-evaluated
3. **Manual Toggles**: Click 3 manual items; verify they toggle; check progress
4. **Add Notes**: Add notes to 2 items; verify they persist
5. **Progress Bar**: Check 5 items; verify progress bar shows 50%
6. **Categories**: Verify items grouped by Documentation, Planning, Infrastructure, Setup
7. **Approve Disabled**: Try to click "Approve" with unchecked items; verify disabled
8. **Approve Enabled**: Check all 10 items; verify "Approve" button becomes enabled
9. **Revision Request**: Request revisions with notes; verify stored
10. **Success State**: Approve review; verify success message and navigation to Build stage

## Notes for AI Agent
- Auto-check functions use heuristic-based validation; they flag potential issues but don't override user judgment
- GitHub API fetch is optional; the review can proceed without fetching repository contents
- CLAUDE.md validation checks for project-specific content (not placeholder strings)
- The review can request revisions without requiring all items to pass
- Phase 001 readiness is assumed after Build Plan quality review (Step 3.3)
- Consider adding links to open files in GitHub for users to review directly
- The dev branch setting is specific to GitHub; other Git hosting may differ
- Environment variables validation is flexible; checks for presence of .env.example and variable definitions
- Consider adding a "Download Review Report" PDF option for documentation
- This is the final hard gate before Stage 6 (Build); no bypass available
