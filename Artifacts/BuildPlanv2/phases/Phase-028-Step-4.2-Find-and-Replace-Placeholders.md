# Phase 028: Step 4.2 — Find-and-Replace Placeholders

## Objective
Identify all placeholders in the copied repository template, provide a form to input actual values, auto-populate some values from project context, generate find-and-replace instructions or pre-replaced template download.

## Prerequisites
- Step 4.1 completed (template copied to local machine)
- Project context available (name, org, tech stack, etc.)
- Build Plan summary available for reference

## Epic Context (Epic 4: Build Planning & Repo Setup)
Step 4.2 customizes the generic template to the specific project by replacing all placeholder strings with actual values. This ensures the template is project-specific before git initialization.

## Context
The repository template contains placeholder strings for values that vary per project:
- `[PROJECT_NAME]` → actual project name
- `[PROJECT_SLUG]` → URL-friendly project slug
- `[ORG]` → organization name
- `[ORG_SLUG]` → organization URL slug
- `[REPO_NAME]` → git repository name
- `[TECH_STACK]` → technology stack description
- `[DATE]` → current date
- `[GITHUB_URL]` → GitHub repository URL (optional)
- `[AUTHOR]` → project author/team
- `[DESCRIPTION]` → brief project description

This step provides a form to input these values and either:
1. Display find-and-replace commands for manual execution
2. Generate a pre-replaced template download

## Detailed Requirements

### 1. Placeholder Detection & Storage
Define standard placeholders and detection logic:

```typescript
// utils/templatePlaceholders.ts

export interface Placeholder {
  key: string;
  pattern: string;
  description: string;
  required: boolean;
  autoPopulatable?: boolean;
  example: string;
  helpText?: string;
}

export const STANDARD_PLACEHOLDERS: Placeholder[] = [
  {
    key: "PROJECT_NAME",
    pattern: "[PROJECT_NAME]",
    description: "Full project name (e.g., 'User Authentication System')",
    required: true,
    example: "My Awesome Project",
    helpText: "This will be used in documentation and UI titles"
  },
  {
    key: "PROJECT_SLUG",
    pattern: "[PROJECT_SLUG]",
    description: "URL-friendly project slug (auto-generated from name)",
    required: true,
    autoPopulatable: true,
    example: "my-awesome-project",
    helpText: "Auto-generated from project name; can be customized"
  },
  {
    key: "ORG",
    pattern: "[ORG]",
    description: "Organization or team name",
    required: true,
    example: "Acme Corp",
    helpText: "Your company or team name"
  },
  {
    key: "ORG_SLUG",
    pattern: "[ORG_SLUG]",
    description: "URL-friendly org slug (auto-generated)",
    required: true,
    autoPopulatable: true,
    example: "acme-corp",
    helpText: "Auto-generated from org name; can be customized"
  },
  {
    key: "REPO_NAME",
    pattern: "[REPO_NAME]",
    description: "Git repository name (usually matches project slug)",
    required: false,
    autoPopulatable: true,
    example: "my-awesome-project",
    helpText: "Repository name in GitHub; defaults to PROJECT_SLUG"
  },
  {
    key: "TECH_STACK",
    pattern: "[TECH_STACK]",
    description: "Technology stack description",
    required: false,
    autoPopulatable: true,
    example: "Next.js 16, TypeScript, Supabase, Tailwind CSS v4",
    helpText: "From your Build Plan summary"
  },
  {
    key: "DATE",
    pattern: "[DATE]",
    description: "Current date (YYYY-MM-DD format)",
    required: false,
    autoPopulatable: true,
    example: "2026-02-28",
    helpText: "Auto-set to today's date"
  },
  {
    key: "GITHUB_URL",
    pattern: "[GITHUB_URL]",
    description: "GitHub repository URL (optional)",
    required: false,
    example: "https://github.com/acme/my-awesome-project",
    helpText: "Full HTTPS URL to GitHub repo; can be added later"
  },
  {
    key: "AUTHOR",
    pattern: "[AUTHOR]",
    description: "Project author or team",
    required: false,
    example: "Your Name or Team",
    helpText: "Name of developer/team creating the project"
  },
  {
    key: "DESCRIPTION",
    pattern: "[DESCRIPTION]",
    description: "Brief project description",
    required: false,
    example: "A comprehensive system for managing user authentication",
    helpText: "One-liner description; used in package.json and README"
  }
];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-");
}

export interface PlaceholderValues {
  [key: string]: string;
}

export function generateDefaultValues(
  projectName?: string,
  orgName?: string,
  techStack?: string
): PlaceholderValues {
  const values: PlaceholderValues = {};

  // Auto-populate based on inputs
  if (projectName) {
    values.PROJECT_NAME = projectName;
    values.PROJECT_SLUG = slugify(projectName);
    values.REPO_NAME = slugify(projectName);
  }

  if (orgName) {
    values.ORG = orgName;
    values.ORG_SLUG = slugify(orgName);
  }

  if (techStack) {
    values.TECH_STACK = techStack;
  }

  // Auto-set date
  const today = new Date();
  values.DATE = today.toISOString().split("T")[0];

  return values;
}
```

### 2. Placeholder Input Form Component
Create form for entering placeholder values:

```typescript
// Components: helix/PlaceholderForm.tsx

interface PlaceholderFormProps {
  projectId: string;
  projectName?: string;
  onValuesSubmit: (values: PlaceholderValues) => void;
}

export function PlaceholderForm({
  projectId,
  projectName,
  onValuesSubmit
}: PlaceholderFormProps) {
  const [values, setValues] = useState<PlaceholderValues>(() =>
    generateDefaultValues(projectName)
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));

    // Auto-update slugs when names change
    if (key === "PROJECT_NAME") {
      setValues(prev => ({ ...prev, PROJECT_SLUG: slugify(value) }));
    }
    if (key === "ORG") {
      setValues(prev => ({ ...prev, ORG_SLUG: slugify(value) }));
    }

    // Clear error for this field
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateValues = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    for (const placeholder of STANDARD_PLACEHOLDERS) {
      if (placeholder.required && !values[placeholder.key]?.trim()) {
        newErrors[placeholder.key] = `${placeholder.description} is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateValues()) {
      onValuesSubmit(values);
    }
  };

  const requiredPlaceholders = STANDARD_PLACEHOLDERS.filter(p => p.required);
  const optionalPlaceholders = STANDARD_PLACEHOLDERS.filter(p => !p.required);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Required Fields */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Required Values</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requiredPlaceholders.map(placeholder => (
            <PlaceholderField
              key={placeholder.key}
              placeholder={placeholder}
              value={values[placeholder.key] || ""}
              onChange={(value) => handleChange(placeholder.key, value)}
              error={errors[placeholder.key]}
            />
          ))}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="space-y-4 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          {showAdvanced ? "▼" : "▶"} Optional Values ({optionalPlaceholders.length})
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {optionalPlaceholders.map(placeholder => (
              <PlaceholderField
                key={placeholder.key}
                placeholder={placeholder}
                value={values[placeholder.key] || ""}
                onChange={(value) => handleChange(placeholder.key, value)}
                error={errors[placeholder.key]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-sm text-slate-600">
          <strong>Provided values:</strong> {Object.keys(values).filter(k => values[k]?.trim()).length} / {Object.keys(values).length}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
        >
          Continue to Next Step
        </button>
      </div>
    </form>
  );
}

interface PlaceholderFieldProps {
  placeholder: Placeholder;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function PlaceholderField({
  placeholder,
  value,
  onChange,
  error
}: PlaceholderFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        {placeholder.description}
        {placeholder.required && <span className="text-red-600 ml-1">*</span>}
        {placeholder.autoPopulatable && (
          <span className="text-xs text-slate-500 ml-1">(auto-populated)</span>
        )}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder.example}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-slate-300 focus:ring-slate-900"
        }`}
      />

      {placeholder.helpText && (
        <p className="text-xs text-slate-500">{placeholder.helpText}</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

### 3. Find-and-Replace Instructions Display
Show commands for manual find-and-replace:

```typescript
// Components: helix/FindReplaceInstructions.tsx

interface FindReplaceInstructionsProps {
  values: PlaceholderValues;
  onCopy: (command: string) => void;
}

export function FindReplaceInstructions({
  values,
  onCopy
}: FindReplaceInstructionsProps) {
  const [selectedOs, setSelectedOs] = useState<"mac" | "windows" | "vscode">("mac");
  const [copied, setCopied] = useState(false);

  const instructions = generateInstructions(values, selectedOs);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Option 1: Manual Find-and-Replace</h3>

      <div className="flex gap-2">
        {(["mac", "windows", "vscode"] as const).map(os => (
          <button
            key={os}
            onClick={() => setSelectedOs(os)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedOs === os
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {os === "mac" ? "macOS" : os === "windows" ? "Windows" : "VS Code"}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
        <pre>{instructions}</pre>
      </div>

      <button
        onClick={handleCopy}
        className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium"
      >
        {copied ? "✓ Copied" : "Copy Commands"}
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold mb-2">Instructions:</p>
        <ol className="space-y-1 ml-4 list-decimal">
          <li>Copy the commands above</li>
          <li>Open your project folder in terminal/PowerShell</li>
          <li>Paste and run the commands</li>
          <li>Return here when complete</li>
        </ol>
      </div>
    </div>
  );
}

function generateInstructions(values: PlaceholderValues, os: string): string {
  const commands: string[] = [];

  if (os === "mac") {
    commands.push("# Find-and-replace in project directory\n");
    for (const [key, value] of Object.entries(values)) {
      if (value?.trim()) {
        const placeholder = STANDARD_PLACEHOLDERS.find(p => p.key === key);
        const pattern = placeholder?.pattern || `[${key}]`;
        commands.push(
          `find . -type f -not -path '*/\\.git/*' -exec sed -i '' 's/${pattern.replace(/\[/g, "\\[")}/${value.replace(/\//g, "\\/")}/' {} +`
        );
      }
    }
  } else if (os === "windows") {
    commands.push("# Find-and-replace in project directory\n");
    for (const [key, value] of Object.entries(values)) {
      if (value?.trim()) {
        const placeholder = STANDARD_PLACEHOLDERS.find(p => p.key === key);
        const pattern = placeholder?.pattern || `[${key}]`;
        commands.push(
          `Get-ChildItem -Path . -Recurse -Exclude .git -File | ForEach-Object { (Get-Content $_.FullName).Replace('${pattern}', '${value}') | Set-Content $_.FullName }`
        );
      }
    }
  } else if (os === "vscode") {
    commands.push("# Using VS Code Find and Replace (Ctrl+H or Cmd+Shift+H)\n");
    commands.push("# Use these patterns:\n");
    for (const [key, value] of Object.entries(values)) {
      if (value?.trim()) {
        const placeholder = STANDARD_PLACEHOLDERS.find(p => p.key === key);
        const pattern = placeholder?.pattern || `[${key}]`;
        commands.push(`Find: ${pattern}`);
        commands.push(`Replace: ${value}\n`);
      }
    }
  }

  return commands.join("\n");
}
```

### 4. Pre-Replaced Template Download
Server-side generation of customized template:

```typescript
// api/routes/template/download-customized.ts

export async function downloadCustomizedTemplate(req: Request, values: PlaceholderValues) {
  try {
    const zipBuffer = await generateCustomizedTemplateZip(values);

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="repo-template-customized.zip"',
        "Content-Length": zipBuffer.length.toString()
      }
    });
  } catch (error) {
    return new Response("Error generating customized template", { status: 500 });
  }
}

async function generateCustomizedTemplateZip(values: PlaceholderValues): Promise<Buffer> {
  const JSZip = require("jszip");
  const zip = new JSZip();
  const templatePath = "./Templates/repo-template";

  const addToZip = async (dirPath: string, zipPath: string) => {
    const files = await fs.promises.readdir(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const zipFilePath = path.join(zipPath, file);
      const stat = await fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        await addToZip(fullPath, zipFilePath);
      } else {
        let content = await fs.promises.readFile(fullPath, "utf-8");

        // Apply replacements for text files
        if (isTextFile(file)) {
          for (const [key, value] of Object.entries(values)) {
            if (value?.trim()) {
              const placeholder = STANDARD_PLACEHOLDERS.find(p => p.key === key);
              const pattern = placeholder?.pattern || `[${key}]`;
              const regex = new RegExp(pattern.replace(/\[/g, "\\[").replace(/\]/g, "\\]"), "g");
              content = content.replace(regex, value);
            }
          }
        }

        zip.file(zipFilePath, content);
      }
    }
  };

  await addToZip(templatePath, "repo-template");
  return await zip.generateAsync({ type: "nodebuffer" });
}
```

### 5. Step 4.2 Page Integration
Combine all components into step page with two options:

```typescript
// /steps/step-4.2/page.tsx

export default function Step42Page() {
  const { projectId, projectName } = useProjectContext();
  const [phase, setPhase] = useState<"input" | "options">("input");
  const [placeholderValues, setPlaceholderValues] = useState<PlaceholderValues | null>(null);
  const [selectedOption, setSelectedOption] = useState<"manual" | "download" | null>(null);

  const handleValuesSubmit = (values: PlaceholderValues) => {
    setPlaceholderValues(values);
    setPhase("options");
  };

  const handleDownloadCustomized = async () => {
    const response = await fetch("/api/template/download-customized", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(placeholderValues)
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "repo-template-customized.zip";
    a.click();
    window.URL.revokeObjectURL(url);

    // Store evidence
    await updateEvidenceData(projectId, "step-4.2", {
      step42_placeholder_replacement: {
        method: "download",
        values: placeholderValues,
        timestamp: new Date().toISOString()
      }
    });

    navigateToStep("step-4.3");
  };

  const handleManualComplete = async () => {
    await updateEvidenceData(projectId, "step-4.2", {
      step42_placeholder_replacement: {
        method: "manual",
        values: placeholderValues,
        timestamp: new Date().toISOString()
      }
    });

    navigateToStep("step-4.3");
  };

  return (
    <StepDetailView
      stepKey="step-4.2"
      title="Find-and-Replace Placeholders"
      objective="Replace all template placeholders with project-specific values"
    >
      <div className="space-y-8">
        {phase === "input" && (
          <PlaceholderForm
            projectId={projectId}
            projectName={projectName}
            onValuesSubmit={handleValuesSubmit}
          />
        )}

        {phase === "options" && placeholderValues && (
          <div className="space-y-8">
            {/* Option 1: Manual */}
            <section>
              <FindReplaceInstructions values={placeholderValues} onCopy={() => {}} />
              <button
                onClick={handleManualComplete}
                className="mt-4 w-full px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
              >
                I've Completed Find-and-Replace Manually
              </button>
            </section>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or</span>
              </div>
            </div>

            {/* Option 2: Download */}
            <section>
              <h3 className="font-semibold text-lg mb-4">Option 2: Download Pre-Replaced Template</h3>
              <p className="text-slate-600 mb-4">
                Download the template with all placeholders already replaced with your values.
              </p>
              <button
                onClick={handleDownloadCustomized}
                className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
              >
                ↓ Download Customized Template
              </button>
            </section>
          </div>
        )}
      </div>
    </StepDetailView>
  );
}
```

## File Structure
```
/steps/step-4.2/
├── page.tsx (step page)
├── PlaceholderForm.tsx
├── FindReplaceInstructions.tsx
└── api/template/download-customized.ts

/utils/
└── templatePlaceholders.ts (placeholder definitions)
```

## Dependencies
- Repository template files
- Build Plan summary (for tech stack auto-population)
- Project context (name, org)
- jszip library
- Node.js fs and path modules (server-side)

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (optional)
- jszip (zip file generation)
- Node.js fs module

## Acceptance Criteria
1. Form displays all 10 standard placeholders with descriptions and examples
2. Required fields are marked and validated on submit
3. Project name auto-populates project slug when changed
4. Organization name auto-populates org slug when changed
5. Tech stack is auto-populated from Build Plan if available
6. Current date is auto-populated in DATE field
7. Manual find-and-replace instructions display for Mac, Windows, and VS Code
8. Instructions correctly reference placeholder patterns and values
9. Instructions can be copied to clipboard
10. Download option generates customized zip with all replacements applied

## Testing Instructions
1. **Load Form**: Open step 4.2; verify placeholder form loads with all required fields
2. **Auto-Population**: Enter project name; verify project slug auto-updates
3. **Slug Generation**: Try various inputs (spaces, special chars); verify slugs are URL-friendly
4. **Validation**: Try submitting with empty required field; verify error message
5. **Manual Instructions**: Fill form; select "Manual" option; verify instructions contain your values
6. **Copy Instructions**: Click copy button; paste in text editor; verify all commands present
7. **OS Switching**: Switch between Mac/Windows/VS Code tabs; verify instruction differences
8. **Download Option**: Select "Download" option; click download; extract zip; verify placeholders replaced
9. **Evidence Storage**: Complete step; verify evidence_data contains method and values
10. **Auto-Populate Tech Stack**: Create project with tech stack in Build Plan; verify field pre-fills

## Notes for AI Agent
- The placeholder pattern matching is simple string replacement; consider more robust parsing if needed
- Slug generation is intentionally simple (lowercase, dash-separated); adjust if needed for locale
- Text file detection uses extension heuristic; update list if needed for other file types
- The pre-replaced download option is more user-friendly; manual option is fallback
- Consider adding validation for GitHub URLs (if provided)
- The find-and-replace commands vary by OS; ensure accuracy for each platform
- Consider adding a "Preview" option that shows what values will be replaced in key files
