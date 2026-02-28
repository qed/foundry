# Phase 027: Step 4.1 — Copy Repo Template

## Objective
Display the repository template structure and contents, guide users to copy the template to their local machine, and provide download-as-zip option. Capture evidence of template duplication.

## Prerequisites
- Stage 3 gate passed (Build Planning complete)
- Repository template available at Templates/repo-template/
- User has local development environment

## Epic Context (Epic 4: Build Planning & Repo Setup)
Step 4.1 is the first step of Stage 4 (Repo Setup), transitioning from planning to infrastructure. It provides the starting structure for the project repository.

## Context
Rather than scaffolding from scratch, Foundry projects use a standardized template. This step shows what's in the template and guides users to copy it to their local environment. The template includes:
- Directory structure (src/, components/, pages/, etc.)
- Configuration files (tsconfig.json, tailwind.config.ts, next.config.ts, etc.)
- Base components and utilities
- Environment variable template (.env.example)
- Git configuration (.gitignore, .github/ workflows)
- Documentation template (CLAUDE.md, README.md)

## Detailed Requirements

### 1. Template Contents Explorer Component
Display template directory structure as an interactive tree:

```typescript
// Components: helix/TemplateExplorer.tsx

interface TemplateFile {
  path: string;
  name: string;
  type: "file" | "directory";
  size?: number;
  content?: string;
  children?: TemplateFile[];
}

interface TemplateExplorerProps {
  onDownload?: () => void;
}

export function TemplateExplorer({ onDownload }: TemplateExplorerProps) {
  const [templateTree, setTemplateTree] = useState<TemplateFile | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["repo-template"]));
  const [selectedFile, setSelectedFile] = useState<TemplateFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const tree = await fetchTemplateStructure();
        setTemplateTree(tree);
      } catch (err) {
        setError("Failed to load template structure");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, []);

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-600">Loading template structure...</div>;
  }

  if (error || !templateTree) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Template Tree View */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Template Structure</h3>
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto font-mono text-sm">
          <TemplateTreeNode
            file={templateTree}
            level={0}
            expanded={expandedDirs}
            onToggle={toggleDir}
            onSelect={setSelectedFile}
            selected={selectedFile}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-600">
            {countFiles(templateTree)} files, {countDirs(templateTree)} directories
          </p>
          <button
            onClick={onDownload}
            className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
          >
            ↓ Download as ZIP
          </button>
        </div>
      </div>

      {/* File Preview */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">File Preview</h3>
        {selectedFile ? (
          <FilePreview file={selectedFile} />
        ) : (
          <div className="border border-slate-200 rounded-lg p-8 bg-slate-50 text-center text-slate-500">
            Select a file to preview
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplateTreeNodeProps {
  file: TemplateFile;
  level: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (file: TemplateFile) => void;
  selected: TemplateFile | null;
}

function TemplateTreeNode({
  file,
  level,
  expanded,
  onToggle,
  onSelect,
  selected
}: TemplateTreeNodeProps) {
  const isDir = file.type === "directory";
  const isExpanded = expanded.has(file.path);
  const isSelected = selected?.path === file.path;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer ${
          isSelected ? "bg-slate-200" : "hover:bg-slate-200"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (isDir) {
            onToggle(file.path);
          } else {
            onSelect(file);
          }
        }}
      >
        {isDir && (
          <span className="text-slate-600">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
        {!isDir && <span className="text-slate-400">•</span>}
        <span className={isDir ? "font-semibold" : ""}>{file.name}</span>
        {!isDir && file.size && (
          <span className="text-xs text-slate-500 ml-auto">
            {formatFileSize(file.size)}
          </span>
        )}
      </div>

      {isDir && isExpanded && file.children && (
        <div>
          {file.children.map(child => (
            <TemplateTreeNode
              key={child.path}
              file={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilePreview({ file }: { file: TemplateFile }) {
  const isText = isTextFile(file.name);

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
        <p className="text-sm font-mono text-slate-700">{file.path}</p>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto">
        {isText && file.content ? (
          <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words">
            {file.content.substring(0, 1000)}
            {file.content.length > 1000 && "..."}
          </pre>
        ) : (
          <p className="text-sm text-slate-500">Binary file or not available for preview</p>
        )}
      </div>
    </div>
  );
}

function countFiles(node: TemplateFile): number {
  if (node.type === "file") return 1;
  return (node.children || []).reduce((sum, child) => sum + countFiles(child), 0);
}

function countDirs(node: TemplateFile): number {
  if (node.type === "file") return 0;
  return (
    1 +
    (node.children || []).reduce((sum, child) => sum + countDirs(child), 0)
  );
}

function isTextFile(filename: string): boolean {
  const textExtensions = [
    ".json",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".css",
    ".md",
    ".yaml",
    ".yml",
    ".txt",
    ".env",
    ".gitignore"
  ];
  return textExtensions.some(ext => filename.endsWith(ext)) ||
         !filename.includes(".");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
```

### 2. Installation Instructions Component
Display step-by-step copy instructions:

```typescript
// Components: helix/TemplateInstallInstructions.tsx

export function TemplateInstallInstructions() {
  const [selectedOs, setSelectedOs] = useState<"mac" | "windows" | "linux">("mac");
  const [copied, setCopied] = useState(false);

  const instructions: Record<string, string[]> = {
    mac: [
      "# Copy the template to your local environment\n",
      "# Option 1: Using terminal (recommended)",
      "cd ~/your/projects/directory",
      "cp -r /path/to/Foundry/Templates/repo-template your-project-name",
      "cd your-project-name",
      "",
      "# Option 2: Using Finder",
      "# 1. Open Finder and navigate to ~/your/projects/directory",
      "# 2. Navigate to /path/to/Foundry/Templates/",
      "# 3. Right-click repo-template and select 'Copy'",
      "# 4. In your projects directory, right-click and select 'Paste'",
      "# 5. Rename the copy to your project name"
    ],
    windows: [
      "# Copy the template to your local environment\n",
      "# Option 1: Using PowerShell (recommended)",
      "cd C:\\your\\projects\\directory",
      "Copy-Item -Path 'C:\\path\\to\\Foundry\\Templates\\repo-template' -Destination 'your-project-name' -Recurse",
      "cd your-project-name",
      "",
      "# Option 2: Using File Explorer",
      "# 1. Open File Explorer and navigate to C:\\your\\projects\\directory",
      "# 2. Navigate to C:\\path\\to\\Foundry\\Templates\\",
      "# 3. Right-click repo-template and select 'Copy'",
      "# 4. In your projects directory, right-click and select 'Paste'",
      "# 5. Rename the copy to your project name"
    ],
    linux: [
      "# Copy the template to your local environment\n",
      "# Using terminal",
      "cd ~/your/projects/directory",
      "cp -r /path/to/Foundry/Templates/repo-template your-project-name",
      "cd your-project-name"
    ]
  };

  const command = instructions[selectedOs].join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        {(["mac", "windows", "linux"] as const).map(os => (
          <button
            key={os}
            onClick={() => setSelectedOs(os)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedOs === os
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {os === "mac" ? "macOS" : os === "windows" ? "Windows" : "Linux"}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
        <pre>{command}</pre>
      </div>

      <button
        onClick={handleCopy}
        className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium"
      >
        {copied ? "✓ Copied" : "Copy Commands"}
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold mb-2">After copying:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Replace <code>your-project-name</code> with your actual project name</li>
          <li>Replace <code>/path/to</code> with the actual path on your system</li>
          <li>Navigate into the new directory</li>
          <li>Proceed to Step 4.2 (Find-and-Replace Placeholders)</li>
        </ul>
      </div>
    </div>
  );
}
```

### 3. Download Template as ZIP
Implement server-side zip generation and download:

```typescript
// api/routes/template/download.ts

export async function downloadTemplateZip(req: Request) {
  try {
    const zipBuffer = await generateTemplateZip();

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="repo-template.zip"',
        "Content-Length": zipBuffer.length.toString()
      }
    });
  } catch (error) {
    return new Response("Error generating template ZIP", { status: 500 });
  }
}

async function generateTemplateZip(): Promise<Buffer> {
  const JSZip = require("jszip");
  const zip = new JSZip();
  const templatePath = "./Templates/repo-template";

  // Add all template files recursively
  const addToZip = async (dirPath: string, zipPath: string) => {
    const files = await fs.promises.readdir(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const zipFilePath = path.join(zipPath, file);
      const stat = await fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        await addToZip(fullPath, zipFilePath);
      } else {
        const content = await fs.promises.readFile(fullPath);
        zip.file(zipFilePath, content);
      }
    }
  };

  await addToZip(templatePath, "repo-template");
  return await zip.generateAsync({ type: "nodebuffer" });
}
```

### 4. Evidence Capture Component
Simple confirmation that template was copied:

```typescript
// Components: helix/TemplateCopyConfirmation.tsx

interface TemplateCopyConfirmationProps {
  onConfirm: (evidence: string) => void;
}

export function TemplateCopyConfirmation({ onConfirm }: TemplateCopyConfirmationProps) {
  const [copied, setCopied] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const handleConfirm = () => {
    const evidence = {
      copied: copied,
      folderPath: folderPath,
      screenshotId: screenshot?.name,
      timestamp: new Date().toISOString()
    };

    onConfirm(JSON.stringify(evidence));
  };

  return (
    <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="font-semibold text-blue-900">Confirm Template Copy</h3>

      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={copied}
            onChange={(e) => setCopied(e.target.checked)}
            className="w-5 h-5"
          />
          <span className="text-sm font-medium">
            I have copied the template to my local machine
          </span>
        </label>

        <div>
          <label className="block text-sm font-medium mb-2">
            Project Folder Path (optional)
          </label>
          <input
            type="text"
            placeholder="e.g., ~/projects/my-project or C:\projects\my-project"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Screenshot (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setScreenshot(e.currentTarget.files?.[0] || null)}
            className="w-full text-sm"
          />
          {screenshot && (
            <p className="text-xs text-slate-600 mt-1">
              File: {screenshot.name}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={!copied}
        className={`w-full px-4 py-2 rounded-lg font-medium transition ${
          copied
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
      >
        Confirm & Continue
      </button>
    </div>
  );
}
```

### 5. Step 4.1 Page Integration
Integrate all components into the step page:

```typescript
// /steps/step-4.1/page.tsx

export default function Step41Page() {
  const { projectId } = useProjectContext();
  const [showInstructions, setShowInstructions] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleDownload = async () => {
    const response = await fetch("/api/template/download");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "repo-template.zip";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleConfirmCopy = async (evidence: string) => {
    await updateEvidenceData(projectId, "step-4.1", {
      step41_template_copy: {
        evidence: JSON.parse(evidence),
        timestamp: new Date().toISOString()
      }
    });

    setCompleted(true);
  };

  return (
    <StepDetailView
      stepKey="step-4.1"
      title="Copy Repo Template"
      objective="Select the repository template and copy it to your local machine for customization."
    >
      <div className="space-y-8">
        {/* Template Explorer */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Repository Template Contents</h2>
          <TemplateExplorer onDownload={handleDownload} />
        </section>

        {/* Instructions */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Copy Instructions</h2>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {showInstructions ? "Hide" : "Show"} Step-by-Step Instructions
          </button>
          {showInstructions && (
            <div className="mt-4">
              <TemplateInstallInstructions />
            </div>
          )}
        </section>

        {/* Confirmation */}
        {!completed && (
          <section>
            <TemplateCopyConfirmation onConfirm={handleConfirmCopy} />
          </section>
        )}

        {completed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <h3 className="font-semibold text-green-900 mb-2">✓ Template Copied</h3>
            <p className="text-green-700 mb-4">
              Ready to proceed to Step 4.2: Find-and-Replace Placeholders
            </p>
            <button
              onClick={() => navigateToStep("step-4.2")}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Next: Step 4.2
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
/steps/step-4.1/
├── page.tsx (step page)
├── TemplateExplorer.tsx
├── TemplateInstallInstructions.tsx
├── TemplateCopyConfirmation.tsx
└── api/template/download.ts

/Templates/
└── repo-template/ (source template)
```

## Dependencies
- Repository template source files
- Artifact storage for downloaded zip
- File system access (server-side)
- jszip library (zip generation)

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (optional for storage)
- jszip (zip file generation)
- Node.js fs module (server-side)

## Acceptance Criteria
1. Template structure displays as interactive tree with expand/collapse
2. File preview shows content for selected text files (first 1000 chars)
3. File count and directory count are calculated and displayed
4. "Download as ZIP" button generates and downloads repo-template.zip
5. Installation instructions available for Mac, Windows, and Linux
6. Instructions can be copied to clipboard
7. Instructions include clear placeholder notes (replace folder paths, project name)
8. Confirmation checkbox confirms template was copied
9. Optional folder path input allows user to document where template was copied
10. Evidence stored in evidence_data with timestamp on confirmation

## Testing Instructions
1. **Load Page**: Open step 4.1; verify template explorer loads and shows directory tree
2. **Expand/Collapse**: Click directories in tree; verify expand/collapse works; verify files shown
3. **File Preview**: Click .json, .ts, .md files; verify content displays in preview; click binary file; verify "not available" message
4. **File Counts**: Verify file and directory counts match actual template
5. **Download ZIP**: Click "Download as ZIP"; verify zip downloads; extract and verify contents match template
6. **OS Instructions**: Switch between Mac/Windows/Linux tabs; verify instructions change appropriately
7. **Copy Commands**: Click "Copy Commands"; paste in text editor; verify completeness
8. **Checkbox Confirmation**: Try to confirm without checking "copied" checkbox; verify button disabled
9. **Folder Path**: Enter optional folder path; confirm; verify saved in evidence
10. **Evidence Storage**: After confirmation, navigate away and back; verify evidence persists

## Notes for AI Agent
- The template path is configurable; can be updated if template location changes
- The zip generation is server-side to avoid bundling template into client code
- File preview limits to 1000 characters to avoid loading large files
- Text file detection is heuristic-based; consider expanding list of text extensions if needed
- Consider adding a "Validate Template" check to verify all required files are present
- The confirmation is lightweight (checkbox + optional path); users can upload screenshots if needed
- Instructions assume users have terminal/PowerShell access; consider adding GUI alternatives if needed
