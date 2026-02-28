# Phase 023: Step 3.2 — Save Build Plan Output

## Objective
Accept the Build Plan output files (generated from Step 3.1 Q&A session), validate their structure, parse and display the plan, and store all files as Artifacts under the "3-Build-Planning" folder. Capture evidence of the parsed plan structure.

## Prerequisites
- Step 3.1 completed (Building Brief Summary Q&A results obtained)
- Build Plan output files generated (in any format: markdown, txt, zip)
- User has access to file upload UI

## Epic Context (Epic 4: Build Planning & Repo Setup)
Step 3.2 transitions the Q&A analysis (Step 3.1) into structured, formalized Build Plan files. These files become the source of truth for the Build stage (Stage 6). The parsed plan structure is reviewed in Step 3.3 before approval.

## Context
After running the Building Brief Summary prompt in Claude Cowork (Step 3.1), the user generates structured output including:
- A summary document (Building-Brief-Summary.md)
- Phase files (Phase-001-*.md through Phase-NNN-*.md)
- Potentially supporting files (roadmap.md, nextsteps.md, alignment.md, etc.)

This step provides an upload interface to collect these files, validates their structure and naming conventions, and stores them as Artifacts for downstream use.

## Detailed Requirements

### 1. Build Plan File Upload Interface
Create a multi-file upload component with drag-and-drop support:

```typescript
// Components: helix/BuildPlanUpload.tsx

interface BuildPlanUploadProps {
  stepKey: string;
  projectId: string;
}

export function BuildPlanUpload({ stepKey, projectId }: BuildPlanUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);

  const handleDragDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.currentTarget.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => e.preventDefault()}
        onDrop={handleDragDrop}
      >
        <input
          type="file"
          multiple
          accept=".md,.txt,.zip"
          onChange={handleFileSelect}
          className="hidden"
          id="buildplan-upload"
        />
        <label htmlFor="buildplan-upload" className="cursor-pointer">
          <p>Drag and drop Build Plan files here, or click to select</p>
          <p className="text-sm text-slate-500">Accepts: .md, .txt, .zip</p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h3>Selected Files ({files.length})</h3>
          <ul className="space-y-1">
            {files.map((file, idx) => (
              <li key={idx} className="flex justify-between items-center text-sm">
                <span>{file.name}</span>
                <button
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="text-xs text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => validateAndUploadFiles(files)}
        disabled={files.length === 0}
        className="btn btn-primary"
      >
        Validate & Upload Build Plan
      </button>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-full bg-slate-200 rounded h-2">
          <div
            className="bg-slate-900 h-2 rounded"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

### 2. Build Plan File Parsing & Validation
Implement file parsing logic to extract and validate structure:

```typescript
interface ParsedBuildPlan {
  summary: {
    id: string;
    fileName: string;
    content: string;
    sectionCount: number;
  } | null;
  phases: Array<{
    number: number;
    title: string;
    fileName: string;
    artifactId: string;
    epic?: string;
    description?: string;
  }>;
  supportingFiles: Array<{
    fileName: string;
    type: "roadmap" | "nextsteps" | "alignment" | "other";
    artifactId: string;
  }>;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

const parseBuildPlanFiles = async (files: File[]): Promise<ParsedBuildPlan> => {
  const result: ParsedBuildPlan = {
    summary: null,
    phases: [],
    supportingFiles: [],
    validation: { isValid: true, errors: [], warnings: [] }
  };

  for (const file of files) {
    // Handle zip files
    if (file.type === "application/zip" || file.name.endsWith(".zip")) {
      const zipContent = await parseZip(file);
      for (const [name, content] of Object.entries(zipContent)) {
        await processFileContent(name, content as string, result);
      }
    } else {
      const content = await file.text();
      await processFileContent(file.name, content, result);
    }
  }

  // Validation checks
  if (!result.summary) {
    result.validation.errors.push("Missing summary file (00-Building-Brief-Summary.md or similar)");
    result.validation.isValid = false;
  }

  if (result.phases.length === 0) {
    result.validation.errors.push("No phase files found (expected Phase-NNN-*.md format)");
    result.validation.isValid = false;
  }

  // Check for gaps in phase numbering
  const phaseNumbers = result.phases.map(p => p.number).sort((a, b) => a - b);
  for (let i = 0; i < phaseNumbers.length - 1; i++) {
    if (phaseNumbers[i + 1] - phaseNumbers[i] !== 1) {
      result.validation.warnings.push(`Gap in phase numbering: ${phaseNumbers[i]} -> ${phaseNumbers[i + 1]}`);
    }
  }

  return result;
};

const processFileContent = async (
  fileName: string,
  content: string,
  result: ParsedBuildPlan
) => {
  // Match summary pattern
  if (fileName.includes("Building-Brief-Summary") || fileName.startsWith("00-")) {
    result.summary = {
      id: generateId(),
      fileName,
      content,
      sectionCount: (content.match(/^##\s/gm) || []).length
    };
    return;
  }

  // Match phase pattern: Phase-NNN-*.md
  const phaseMatch = fileName.match(/Phase-(\d{3})-(.+?)\.md/);
  if (phaseMatch) {
    const [, phaseNum, phaseTitle] = phaseMatch;
    const epicMatch = content.match(/## Epic Context.*?\n(.*?)\n/s);
    const descMatch = content.match(/## Objective\n(.*?)\n/s);

    result.phases.push({
      number: parseInt(phaseNum, 10),
      title: phaseTitle.replace(/[-_]/g, " "),
      fileName,
      artifactId: generateId(),
      epic: epicMatch?.[1]?.trim(),
      description: descMatch?.[1]?.trim()
    });
    return;
  }

  // Match supporting files
  if (
    fileName.includes("roadmap") ||
    fileName.includes("nextsteps") ||
    fileName.includes("alignment") ||
    fileName.includes("summary")
  ) {
    let type: "roadmap" | "nextsteps" | "alignment" | "other" = "other";
    if (fileName.includes("roadmap")) type = "roadmap";
    if (fileName.includes("nextsteps")) type = "nextsteps";
    if (fileName.includes("alignment")) type = "alignment";

    result.supportingFiles.push({
      fileName,
      type,
      artifactId: generateId()
    });
  }
};
```

### 3. Build Plan Display & Preview
Display the parsed plan structure for user review before final storage:

```typescript
// Components: helix/BuildPlanPreview.tsx

export function BuildPlanPreview({ plan }: { plan: ParsedBuildPlan }) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      {plan.summary && (
        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-2">Building Brief Summary</h3>
          <p className="text-sm text-slate-600 mb-4">
            {plan.summary.sectionCount} sections
          </p>
          <div className="prose prose-sm max-w-none">
            {renderMarkdown(plan.summary.content.substring(0, 500))}
            {plan.summary.content.length > 500 && (
              <p className="text-slate-500">...</p>
            )}
          </div>
        </div>
      )}

      {/* Validation Results */}
      {!plan.validation.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-900 mb-2">Validation Errors</h4>
          <ul className="space-y-1">
            {plan.validation.errors.map((error, idx) => (
              <li key={idx} className="text-sm text-red-700">• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">Warnings</h4>
          <ul className="space-y-1">
            {plan.validation.warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-yellow-700">• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Phases Overview */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Phases ({plan.phases.length})</h3>
        <div className="space-y-1">
          {plan.phases.map((phase) => (
            <div key={phase.number} className="border border-slate-200 rounded-lg">
              <button
                onClick={() => setExpandedPhase(
                  expandedPhase === phase.number ? null : phase.number
                )}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex justify-between items-center"
              >
                <div>
                  <span className="font-semibold">Phase {String(phase.number).padStart(3, '0')}</span>
                  <span className="ml-3 text-slate-700">{phase.title}</span>
                  {phase.epic && (
                    <span className="ml-3 text-xs bg-slate-100 px-2 py-1 rounded">
                      {phase.epic}
                    </span>
                  )}
                </div>
                <span className="text-slate-400">
                  {expandedPhase === phase.number ? "▼" : "▶"}
                </span>
              </button>
              {expandedPhase === phase.number && phase.description && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <p className="text-sm text-slate-700">{phase.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Supporting Files */}
      {plan.supportingFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Supporting Files</h3>
          <ul className="space-y-1">
            {plan.supportingFiles.map((file) => (
              <li key={file.fileName} className="text-sm text-slate-700">
                • {file.fileName}
                <span className="ml-2 text-xs bg-slate-100 px-2 py-1 rounded">
                  {file.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 4. Artifact Storage & Evidence Capture
Store parsed files in Supabase Storage under "3-Build-Planning" folder:

```typescript
const storeArtifacts = async (plan: ParsedBuildPlan, projectId: string) => {
  const artifacts = {
    summary: null as string | null,
    phases: [] as string[],
    supporting: [] as string[]
  };

  // Store summary
  if (plan.summary) {
    const summaryId = await uploadArtifact(
      projectId,
      plan.summary.content,
      plan.summary.fileName,
      "3-Build-Planning"
    );
    artifacts.summary = summaryId;
  }

  // Store phases
  for (const phase of plan.phases) {
    const phaseId = await uploadArtifact(
      projectId,
      "", // Content would be read from file
      phase.fileName,
      "3-Build-Planning/phases"
    );
    artifacts.phases.push(phaseId);
  }

  // Store supporting files
  for (const file of plan.supportingFiles) {
    const fileId = await uploadArtifact(
      projectId,
      "", // Content would be read from file
      file.fileName,
      "3-Build-Planning"
    );
    artifacts.supporting.push(fileId);
  }

  return artifacts;
};

// Update evidence_data in helix_steps
const updateEvidenceData = async (
  projectId: string,
  stepKey: string,
  plan: ParsedBuildPlan,
  artifactIds: any
) => {
  const evidence = {
    step32_build_plan: {
      timestamp: new Date().toISOString(),
      status: "saved",
      planStructure: {
        summaryFile: plan.summary?.fileName,
        phaseCount: plan.phases.length,
        phaseNumbers: plan.phases.map(p => p.number),
        supportingFileCount: plan.supportingFiles.length,
        epicsList: [...new Set(plan.phases.map(p => p.epic).filter(Boolean))]
      },
      artifacts: artifactIds,
      validation: {
        isValid: plan.validation.isValid,
        errorCount: plan.validation.errors.length,
        warningCount: plan.validation.warnings.length
      }
    }
  };

  await updateHelix(projectId, stepKey, evidence);
};
```

### 5. Error Handling & Retry Logic
Implement graceful error handling for upload failures:

```typescript
const handleUploadError = (error: Error) => {
  if (error.message.includes("validation")) {
    return "Build Plan structure invalid. Check file naming and format.";
  }
  if (error.message.includes("storage")) {
    return "Storage error. Please check your connection and try again.";
  }
  return "Upload failed. Please try again.";
};
```

## File Structure
```
/steps/step-3.2/
├── page.tsx (StepDetailView)
├── BuildPlanUpload.tsx (upload interface)
├── BuildPlanPreview.tsx (display parsed plan)
└── parseUtils.ts (parsing and validation logic)

/artifacts/
├── 3-Build-Planning/
│   ├── 00-Building-Brief-Summary.md
│   ├── phases/
│   │   ├── Phase-001-*.md
│   │   ├── Phase-002-*.md
│   │   └── ...
│   ├── roadmap.md
│   ├── nextsteps.md
│   └── alignment.md
```

## Dependencies
- Step 3.1 Q&A results (input data source)
- Supabase Storage (artifact persistence)
- helix_steps table (evidence storage)
- File parsing libraries (markdown, zip)
- React hooks (useState, useCallback)

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (storage, database)
- jszip (for zip file parsing)
- React hooks, standard File API

## Acceptance Criteria
1. Upload interface accepts .md, .txt, and .zip files via drag-drop and file select
2. Zip files are automatically extracted and individual files parsed
3. Parser correctly identifies summary file (Building-Brief-Summary.md or 00-*.md)
4. Parser extracts phase files matching Phase-NNN-*.md pattern with correct numbering
5. Phase number, title, epic, and description are correctly extracted from phase files
6. Supporting files (roadmap, nextsteps, alignment) are categorized correctly
7. Validation checks for missing summary and missing phases; displays errors
8. Validation checks for gaps in phase numbering; displays warnings
9. Parsed plan preview displays summary excerpt, all phases with descriptions, and supporting files
10. Successfully validated plans are stored as Artifacts; evidence_data captures plan structure metadata

## Testing Instructions
1. **File Upload**: Upload 5 individual .md files; verify all appear in selected files list; remove one; verify update
2. **Zip Upload**: Create a zip with 12 phase files + summary; upload; verify automatic extraction and parsing
3. **Summary Detection**: Upload files with summary named "00-Brief.md"; verify it's detected and displayed
4. **Phase Parsing**: Upload Phase-001-Intro.md, Phase-002-Setup.md, Phase-003-Core.md; verify all parsed with correct numbers
5. **Phase Details**: Upload phase file with objective and epic context sections; verify extraction in preview
6. **Supporting Files**: Include roadmap.md, nextsteps.md, alignment.md; verify all categorized in preview
7. **Validation Error**: Upload only phase files without summary; verify error message; add summary; verify success
8. **Phase Gap Warning**: Upload Phase-001, Phase-002, Phase-005; verify warning about gap in numbering
9. **Artifact Storage**: Complete upload; navigate to Artifacts panel; verify "3-Build-Planning" folder contains all files
10. **Evidence Persistence**: Refresh page; verify evidence_data shows plan structure with phase count and artifact IDs

## Notes for AI Agent
- The parser is intentionally flexible to handle variations in file naming and structure; adjust regex patterns if needed
- Zip extraction is optional but recommended; provide clear messaging if zip parsing fails
- Phase numbering validation warns but doesn't block; gaps may be intentional (e.g., phases added later)
- The preview is read-only; editing happens in Step 3.3 (Review Build Plan Quality)
- Consider storing raw Build Plan file content in a separate artifact folder (PhaseHistory) for audit trails
- If supporting files are missing, warn but don't error; they can be added in Step 3.3 or later
- The evidence capture should include epic list for Step 3.3 quality review checks
