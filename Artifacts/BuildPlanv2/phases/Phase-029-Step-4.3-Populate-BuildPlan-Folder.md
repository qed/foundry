# Phase 029: Step 4.3 — Populate BuildPlan Folder

## Objective
Guide users to copy the Build Plan files (from Step 3.2) into the repository's BuildPlan/ folder. Provide checklist of expected files and verification of completion.

## Prerequisites
- Step 4.1 completed (template copied locally)
- Step 4.2 completed (placeholders replaced)
- Build Plan files available as Artifacts (from Step 3.2)

## Epic Context (Epic 4: Build Planning & Repo Setup)
Step 4.3 embeds the Build Plan into the repository structure, making it a canonical reference for the Build stage. The BuildPlan/ folder becomes the source of truth for phases, requirements, and project planning.

## Context
After customizing the repository template, the next step is to populate the BuildPlan/ folder with all Build Plan files generated in Step 3. This includes:
- 00-Building-Brief-Summary.md (summary)
- phases/ folder with all Phase-NNN-*.md files
- Supporting files (roadmap.md, nextsteps.md, alignment.md, etc.)
- PhaseHistory/ folder for audit/archival of revisions

The step provides a checklist of expected files and verification that the folder is complete.

## Detailed Requirements

### 1. Build Plan File List Component
Display which files need to be copied:

```typescript
// Components: helix/BuildPlanFileList.tsx

interface BuildPlanFile {
  name: string;
  path: string;
  type: "summary" | "phase" | "supporting" | "folder";
  required: boolean;
  description: string;
}

interface BuildPlanFileListProps {
  projectId: string;
  onDownloadAll?: () => void;
}

export function BuildPlanFileList({ projectId, onDownloadAll }: BuildPlanFileListProps) {
  const [buildPlan, setBuildPlan] = useState<BuildPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const plan = await fetchBuildPlan(projectId);
        setBuildPlan(plan);
      } catch (err) {
        setError("Failed to load Build Plan");
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [projectId]);

  if (loading) {
    return <div className="p-6 text-center text-slate-600">Loading Build Plan...</div>;
  }

  if (error || !buildPlan) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const files: BuildPlanFile[] = [
    {
      name: "00-Building-Brief-Summary.md",
      path: "BuildPlan/00-Building-Brief-Summary.md",
      type: "summary",
      required: true,
      description: "Project summary and vision document"
    },
    {
      name: "phases/ folder",
      path: "BuildPlan/phases/",
      type: "folder",
      required: true,
      description: `Contains ${buildPlan.phases.length} phase specification files`
    },
    ...buildPlan.phases.map(phase => ({
      name: `Phase-${String(phase.number).padStart(3, "0")}-${phase.title}.md`,
      path: `BuildPlan/phases/Phase-${String(phase.number).padStart(3, "0")}-${phase.title}.md`,
      type: "phase" as const,
      required: true,
      description: `Phase specification: ${phase.title}`
    })),
    {
      name: "roadmap.md",
      path: "BuildPlan/roadmap.md",
      type: "supporting",
      required: false,
      description: "High-level project roadmap and milestones"
    },
    {
      name: "nextsteps.md",
      path: "BuildPlan/nextsteps.md",
      type: "supporting",
      required: false,
      description: "Next steps and immediate action items"
    },
    {
      name: "alignment.md",
      path: "BuildPlan/alignment.md",
      type: "supporting",
      required: false,
      description: "Stakeholder and design alignment document"
    },
    {
      name: "PhaseHistory/ folder",
      path: "BuildPlan/PhaseHistory/",
      type: "folder",
      required: false,
      description: "Archive of previous phase versions (optional)"
    }
  ];

  const requiredFiles = files.filter(f => f.required);
  const optionalFiles = files.filter(f => !f.required);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How to Populate BuildPlan/</h3>
        <ol className="space-y-2 text-sm text-blue-900 ml-4 list-decimal">
          <li>Create a <code className="bg-blue-100 px-1 py-0.5 rounded">BuildPlan/</code> folder in your project root (if not present)</li>
          <li>Download or access the Build Plan files from the Artifacts section</li>
          <li>Copy files to their correct paths as shown below</li>
          <li>Verify all required files are in place</li>
          <li>Return here and check each item as you go</li>
        </ol>
      </div>

      {/* Required Files */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Required Files</h3>
        <div className="space-y-2">
          {requiredFiles.map(file => (
            <BuildPlanFileItem key={file.path} file={file} />
          ))}
        </div>
        <p className="text-sm text-slate-600 ml-2">
          Total: {requiredFiles.length} items
        </p>
      </div>

      {/* Optional Files */}
      {optionalFiles.length > 0 && (
        <div className="space-y-4 border-t border-slate-200 pt-6">
          <h3 className="font-semibold text-lg">Optional Files</h3>
          <div className="space-y-2">
            {optionalFiles.map(file => (
              <BuildPlanFileItem key={file.path} file={file} optional />
            ))}
          </div>
          <p className="text-sm text-slate-600 ml-2">
            These files are recommended but not required to proceed
          </p>
        </div>
      )}

      {/* Download All Button */}
      {onDownloadAll && (
        <button
          onClick={onDownloadAll}
          className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
        >
          ↓ Download All Files as ZIP
        </button>
      )}
    </div>
  );
}

interface BuildPlanFileItemProps {
  file: BuildPlanFile;
  optional?: boolean;
}

function BuildPlanFileItem({ file, optional }: BuildPlanFileItemProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      className={`border rounded-lg p-4 transition ${
        checked
          ? "bg-green-50 border-green-200"
          : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="w-5 h-5 mt-1 rounded"
        />

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
              {file.path}
            </code>
            {optional && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Optional
              </span>
            )}
            {file.type === "folder" && (
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                Folder
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">{file.description}</p>
        </div>
      </div>
    </div>
  );
}
```

### 2. Verification Component
Check that all required files are in place:

```typescript
// Components: helix/BuildPlanFolderVerification.tsx

interface VerificationResult {
  status: "pending" | "verifying" | "success" | "failed";
  requiredFilesFound: number;
  requiredFilesTotal: number;
  optionalFilesFound: number;
  missingFiles: string[];
  timestamp: string;
}

interface BuildPlanFolderVerificationProps {
  projectId: string;
  onVerificationComplete: (result: VerificationResult) => void;
}

export function BuildPlanFolderVerification({
  projectId,
  onVerificationComplete
}: BuildPlanFolderVerificationProps) {
  const [folderPath, setFolderPath] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    if (!folderPath.trim()) {
      alert("Please enter the project folder path");
      return;
    }

    setVerifying(true);

    try {
      // In a real scenario, this would check the local filesystem
      // For now, we simulate a verification check
      const verificationResult: VerificationResult = {
        status: "success",
        requiredFilesFound: 5,
        requiredFilesTotal: 5,
        optionalFilesFound: 2,
        missingFiles: [],
        timestamp: new Date().toISOString()
      };

      setResult(verificationResult);
      onVerificationComplete(verificationResult);
    } catch (error) {
      const failureResult: VerificationResult = {
        status: "failed",
        requiredFilesFound: 2,
        requiredFilesTotal: 5,
        optionalFilesFound: 0,
        missingFiles: [
          "BuildPlan/00-Building-Brief-Summary.md",
          "BuildPlan/phases/",
          "BuildPlan/phases/Phase-001-*.md"
        ],
        timestamp: new Date().toISOString()
      };

      setResult(failureResult);
      onVerificationComplete(failureResult);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium">Project Folder Path</label>
        <input
          type="text"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          placeholder="e.g., /Users/user/projects/my-project or C:\projects\my-project"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <p className="text-xs text-slate-500">
          Enter the root path of your copied and customized project folder
        </p>
      </div>

      <button
        onClick={handleVerify}
        disabled={verifying || !folderPath.trim()}
        className={`w-full px-6 py-3 rounded-lg font-medium transition ${
          verifying || !folderPath.trim()
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
      >
        {verifying ? "Verifying..." : "Verify BuildPlan Folder"}
      </button>

      {result && (
        <VerificationResultDisplay result={result} />
      )}
    </div>
  );
}

function VerificationResultDisplay({ result }: { result: VerificationResult }) {
  const success = result.status === "success" && result.missingFiles.length === 0;

  return (
    <div
      className={`rounded-lg p-6 ${
        success
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200"
      }`}
    >
      <h3 className={`font-semibold mb-4 ${
        success ? "text-green-900" : "text-red-900"
      }`}>
        {success ? "✓ Verification Passed" : "✗ Verification Failed"}
      </h3>

      <div className="space-y-3">
        <div>
          <p className={`text-sm ${success ? "text-green-800" : "text-red-800"}`}>
            Required Files: <strong>{result.requiredFilesFound} / {result.requiredFilesTotal}</strong>
          </p>
          <div className="w-full bg-slate-200 rounded h-2 mt-1">
            <div
              className={`h-2 rounded ${success ? "bg-green-600" : "bg-red-600"}`}
              style={{ width: `${(result.requiredFilesFound / result.requiredFilesTotal) * 100}%` }}
            />
          </div>
        </div>

        {result.optionalFilesFound > 0 && (
          <p className={`text-sm ${success ? "text-green-800" : "text-red-800"}`}>
            Optional Files: <strong>{result.optionalFilesFound}</strong>
          </p>
        )}

        {result.missingFiles.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-red-900 mb-2">Missing Files:</p>
            <ul className="space-y-1 ml-4 list-disc">
              {result.missingFiles.map((file, idx) => (
                <li key={idx} className="text-sm text-red-800">
                  {file}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3. Evidence Storage
Store verification results in evidence_data:

```typescript
const storePopulationEvidence = async (
  projectId: string,
  verificationResult: VerificationResult
) => {
  const evidence = {
    step43_populate_buildplan: {
      timestamp: verificationResult.timestamp,
      status: verificationResult.status === "success" ? "completed" : "pending",
      requiredFilesFound: verificationResult.requiredFilesFound,
      requiredFilesTotal: verificationResult.requiredFilesTotal,
      optionalFilesFound: verificationResult.optionalFilesFound,
      missingFiles: verificationResult.missingFiles,
      verificationPassed: verificationResult.missingFiles.length === 0
    }
  };

  await updateHelix(projectId, "step-4.3", evidence);
};
```

### 4. Download All Files as ZIP
Provide bulk download option:

```typescript
// api/routes/buildplan/download-all.ts

export async function downloadAllBuildPlanFiles(
  req: Request,
  projectId: string
) {
  try {
    const zipBuffer = await generateBuildPlanZip(projectId);

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="BuildPlan.zip"',
        "Content-Length": zipBuffer.length.toString()
      }
    });
  } catch (error) {
    return new Response("Error generating Build Plan ZIP", { status: 500 });
  }
}

async function generateBuildPlanZip(projectId: string): Promise<Buffer> {
  const JSZip = require("jszip");
  const zip = new JSZip();

  // Fetch all Build Plan artifacts
  const plan = await fetchBuildPlan(projectId);

  // Add summary
  if (plan.summary) {
    zip.file("00-Building-Brief-Summary.md", plan.summary.content);
  }

  // Add phases
  const phasesFolder = zip.folder("phases");
  for (const phase of plan.phases) {
    const fileName = `Phase-${String(phase.number).padStart(3, "0")}-${phase.title}.md`;
    phasesFolder?.file(fileName, phase.content);
  }

  // Add supporting files
  for (const file of plan.supportingFiles) {
    zip.file(file.name, file.content);
  }

  return await zip.generateAsync({ type: "nodebuffer" });
}
```

### 5. Step 4.3 Page Integration
Combine components into step page:

```typescript
// /steps/step-4.3/page.tsx

export default function Step43Page() {
  const { projectId } = useProjectContext();
  const [showVerification, setShowVerification] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState(false);

  const handleDownloadAll = async () => {
    const response = await fetch(`/api/buildplan/download-all?projectId=${projectId}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BuildPlan.zip";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleVerificationComplete = async (result: VerificationResult) => {
    if (result.missingFiles.length === 0) {
      setVerificationPassed(true);
      await storePopulationEvidence(projectId, result);
    }
  };

  return (
    <StepDetailView
      stepKey="step-4.3"
      title="Populate BuildPlan Folder"
      objective="Copy all Build Plan files into your repository's BuildPlan/ folder"
    >
      <div className="space-y-8">
        {/* File List */}
        <section>
          <BuildPlanFileList
            projectId={projectId}
            onDownloadAll={handleDownloadAll}
          />
        </section>

        {/* Verification */}
        <section className="border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-bold mb-4">Verify Folder Contents</h2>
          {!showVerification ? (
            <button
              onClick={() => setShowVerification(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
            >
              Check My BuildPlan Folder
            </button>
          ) : (
            <BuildPlanFolderVerification
              projectId={projectId}
              onVerificationComplete={handleVerificationComplete}
            />
          )}
        </section>

        {/* Success Message */}
        {verificationPassed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <h3 className="font-semibold text-green-900 mb-2">✓ BuildPlan Folder Complete</h3>
            <p className="text-green-700 mb-4">
              Ready to proceed to Step 4.4: Initialize Git Repo
            </p>
            <button
              onClick={() => navigateToStep("step-4.4")}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Next: Step 4.4
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
/steps/step-4.3/
├── page.tsx (step page)
├── BuildPlanFileList.tsx
├── BuildPlanFolderVerification.tsx
└── api/buildplan/download-all.ts
```

## Dependencies
- Build Plan artifacts from Step 3.2
- BuildPlanViewer component (Phase 024)
- evidence_data storage
- Artifact download functionality

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (storage)
- jszip (zip file generation)
- React hooks

## Acceptance Criteria
1. File list displays summary, all phases, and supporting files with correct paths
2. Required vs. optional files are clearly distinguished
3. Each file has checkbox for user to confirm copying
4. Download all files as ZIP option is available
5. Verification component accepts project folder path
6. Verification checks presence of all required files
7. Verification results show count of found files and list of missing files
8. Verification success requires all required files to be present
9. Evidence is stored with verification result and timestamp
10. User can proceed to Step 4.4 only after verification passes

## Testing Instructions
1. **Load Page**: Open step 4.3; verify file list displays with summary, phases, and supporting files
2. **File Paths**: Verify all file paths show correct structure (BuildPlan/phases/, etc.)
3. **Checkbox Interaction**: Click checkboxes; verify they toggle and persist
4. **Download All**: Click download button; verify zip downloads with all files
5. **Verification Input**: Enter project folder path; click verify
6. **Success State**: With complete folder, verify success message and green checkmarks
7. **Failure State**: With missing files, verify red message and list of missing files
8. **Count Accuracy**: Verify required/optional file counts match Build Plan
9. **Evidence Storage**: After successful verification, check evidence_data table
10. **Navigation**: After success, verify "Next" button navigates to step 4.4

## Notes for AI Agent
- The verification in this simplified version doesn't actually check the filesystem; in production, use fs.readdir or similar
- Consider adding a "Manual Checklist" mode where users can check items as they copy files
- The file list could include file sizes to help users understand what they're copying
- Consider adding an "Expand All" button for the file list
- The PhaseHistory/ folder is optional but recommended for tracking phase revisions
- Consider adding a "Preview" button that opens the Build Plan Viewer to see current files
- The verification can be visual (screenshots) or automated (filesystem check); this design accommodates both
