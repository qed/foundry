# Phase 070 — Build Plan Generation: Phase Files

## Objective
Implement batch generation of individual phase specification files following the Phase Template, with progress indicator and file preview capability.

## Prerequisites
- Phase 069 — Build Plan Generation: Summary — summary finalized

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 070 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Beyond the summary, each phase needs a detailed specification file (Phase-NNN-Title.md) containing objective, prerequisites, context, requirements, acceptance criteria, testing instructions, etc. Claude generates these specs for all phases sequentially, and the UI shows progress, allows previewing individual specs, and saves them to the database.

---

## Detailed Requirements

### 1. Phase File Generation Component
#### File: `components/helix/build-planning/PhaseFileGeneration.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Phase } from '@/lib/helix/build-planning-state';
import { FileText, CheckCircle, Loader } from 'lucide-react';

interface GeneratedPhase {
  id: string;
  number: number;
  title: string;
  content: string;
  isComplete: boolean;
}

interface PhaseFileGenerationProps {
  phases: Phase[];
  projectName: string;
  onFilesGenerated: (files: GeneratedPhase[]) => void;
}

export function PhaseFileGeneration({
  phases,
  projectName,
  onFilesGenerated,
}: PhaseFileGenerationProps) {
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedPhase[]>([]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [selectedFile, setSelectedFile] = useState<GeneratedPhase | null>(null);

  const progress = (generatedFiles.length / phases.length) * 100;

  // Simulate batch generation (in real implementation, calls Claude API)
  useEffect(() => {
    if (!isGenerating || currentPhaseIndex >= phases.length) return;

    const timer = setTimeout(async () => {
      const phase = phases[currentPhaseIndex];
      const phaseNumber = 100 + currentPhaseIndex; // 100, 101, 102, etc.

      // In production, call Claude API to generate spec
      const generatedFile: GeneratedPhase = {
        id: phase.id,
        number: phaseNumber,
        title: `${phaseNumber} — ${phase.name}`,
        content: generateMockSpec(phaseNumber, phase, projectName),
        isComplete: true,
      };

      setGeneratedFiles((prev) => [...prev, generatedFile]);
      setCurrentPhaseIndex((prev) => prev + 1);
      setSelectedFile(generatedFile);
    }, 1500); // Simulate generation delay

    return () => clearTimeout(timer);
  }, [isGenerating, currentPhaseIndex, phases, projectName]);

  useEffect(() => {
    if (currentPhaseIndex >= phases.length && isGenerating) {
      setIsGenerating(false);
      onFilesGenerated(generatedFiles);
    }
  }, [currentPhaseIndex, phases.length, isGenerating, generatedFiles, onFilesGenerated]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-purple-900 mb-2">
          Phase Spec Generation
        </h2>
        <p className="text-sm text-purple-700">
          Generating detailed specification for each phase...
        </p>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Progress</span>
          <span className="text-sm font-bold text-slate-900">
            {generatedFiles.length} / {phases.length}
          </span>
        </div>
        <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-purple-600 h-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 2-Column Layout: File List + Preview */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* File List (Left) */}
        <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">
              Generated Phases
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {generatedFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition ${
                  selectedFile?.id === file.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {file.isComplete ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Loader className="w-4 h-4 text-blue-600 animate-spin" />
                  )}
                  <span className="text-sm font-medium text-slate-900">
                    Phase {file.number}
                  </span>
                </div>
                <p className="text-xs text-slate-600 truncate">{file.title}</p>
              </button>
            ))}

            {/* Current Generation */}
            {isGenerating && currentPhaseIndex < phases.length && (
              <div className="px-4 py-3 border-b border-slate-100 bg-blue-50">
                <div className="flex items-center gap-2 mb-1">
                  <Loader className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm font-medium text-blue-900">
                    Generating...
                  </span>
                </div>
                <p className="text-xs text-blue-700">
                  Phase {100 + currentPhaseIndex}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preview (Right) */}
        {selectedFile ? (
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                {selectedFile.title}
              </p>
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <pre className="flex-1 overflow-auto p-4 bg-white text-xs font-mono text-slate-700">
              {selectedFile.content.substring(0, 1000)}...
            </pre>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50">
            <p className="text-slate-500 text-sm">
              Select a phase spec to preview
            </p>
          </div>
        )}
      </div>

      {/* Completion Message */}
      {!isGenerating && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-sm font-semibold text-green-900 mb-1">
            ✅ All {generatedFiles.length} phase specs generated!
          </p>
          <p className="text-xs text-green-700">
            Ready to review and save to your project.
          </p>
        </div>
      )}
    </div>
  );
}

function generateMockSpec(
  phaseNumber: number,
  phase: Phase,
  projectName: string
): string {
  return `# Phase ${phaseNumber} — ${phase.name}

## Objective
${phase.description}

## Prerequisites
- Phase ${phaseNumber - 1} — [Previous Phase Name] — builds foundation for this work

## Epic Context
**Epic:** [N] — [Epic Name]
**Phase:** ${phaseNumber} of 157
**Estimated Effort:** ${phase.estimatedHours} hours (~${Math.ceil(phase.estimatedHours / 4)} day(s))

## Context
${phase.description}

---

## Detailed Requirements

${phase.objectives
  .map(
    (obj, i) => `
### ${i + 1}. [Component/Task Name]
#### File: \`path/to/file.ts\` (NEW/UPDATED)
Description and implementation details.

\`\`\`typescript
// Code example
\`\`\`
`
  )
  .join('')}

---

## File Structure
\`\`\`
src/
├── components/
├── lib/
└── utils/
\`\`\`

---

## Dependencies
- [List dependencies]

---

## Tech Stack for This Phase
- [Technologies used]

---

## Acceptance Criteria
${phase.acceptanceCriteria.map((ac) => `${ac}`).join('\n')}

---

## Testing Instructions
1. [Test scenario 1]
2. [Test scenario 2]
...

---

## Notes for the AI Agent
- Implementation should focus on user experience.
- Consider performance implications of design choices.
`;
}
```

---

## File Structure
```
components/helix/build-planning/
└── PhaseFileGeneration.tsx (NEW)
```

---

## Dependencies
- React 19+, lucide-react
- Tailwind CSS

---

## Tech Stack for This Phase
- TypeScript, React Hooks
- Progress tracking
- File preview

---

## Acceptance Criteria
1. Displays progress bar 0-100%
2. Shows current generation status
3. Generated files list displays with checkmarks
4. Preview pane shows selected file content
5. Generation completes for all phases
6. onFilesGenerated callback fires with all files
7. Responsive layout on mobile and desktop

---

## Testing Instructions
1. Mount PhaseFileGeneration with 5 phases
2. Verify progress bar increments
3. Verify file list updates as each generates
4. Click file, verify preview updates
5. Wait for completion, verify success message
6. Verify onFilesGenerated fires with all files
7. Test with 20+ phases, verify scrolling works

---

## Notes for the AI Agent
- Mock generation uses 1.5s delay per phase; production should call Claude API.
- Phase numbers (100+) are placeholder; integrate with actual numbering system.
- File content is mock; production should generate from phase metadata and Claude.
