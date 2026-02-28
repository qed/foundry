# Phase 024: Build Plan Viewer

## Objective
Create an interactive UI component to display the complete Build Plan in a structured, readable format with tabs for summary and phases, searchable phase list, and detailed phase views with full markdown rendering.

## Prerequisites
- Phase 023 completed (Build Plan files uploaded and stored as Artifacts)
- Build Plan structure validated and stored in Supabase Storage
- evidence_data contains reference to Build Plan artifacts

## Epic Context (Epic 4: Build Planning & Repo Setup)
The Build Plan Viewer is a core UI component used throughout Steps 3.2–5.1 and later referenced during the Build stage (Stage 6). It provides the primary interface for reviewing, searching, and referencing phases during planning and building.

## Context
After the Build Plan files are saved in Step 3.2, users need a user-friendly way to view and navigate the plan. The Build Plan Viewer displays the complete structure with:
- Summary tab: brief project overview
- Phases tab: sortable, searchable list of all phases
- Phase detail panel: full specification for selected phase
- Search/filter across all phase content

This component is reusable across multiple steps and persists as part of the project interface.

## Detailed Requirements

### 1. Build Plan Viewer Container Component
Create the main viewer component with tab navigation:

```typescript
// Components: helix/BuildPlanViewer.tsx

interface Phase {
  number: number;
  title: string;
  content: string;
  epic: string;
  status?: "pending" | "in-progress" | "completed";
}

interface BuildPlan {
  summary: {
    content: string;
    fileName: string;
  };
  phases: Phase[];
  supportingFiles: Array<{
    name: string;
    type: string;
    content: string;
  }>;
}

interface BuildPlanViewerProps {
  projectId: string;
  readOnly?: boolean;
  onPhaseSelect?: (phase: Phase) => void;
}

export function BuildPlanViewer({ projectId, readOnly = true, onPhaseSelect }: BuildPlanViewerProps) {
  const [buildPlan, setBuildPlan] = useState<BuildPlan | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "phases" | "supporting">("summary");
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"number" | "title" | "epic">("number");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Build Plan on mount
  useEffect(() => {
    const loadBuildPlan = async () => {
      try {
        const plan = await fetchBuildPlanArtifacts(projectId);
        setBuildPlan(plan);
        if (plan.phases.length > 0) {
          setSelectedPhase(plan.phases[0]);
        }
      } catch (err) {
        setError("Failed to load Build Plan");
      } finally {
        setLoading(false);
      }
    };

    loadBuildPlan();
  }, [projectId]);

  const filteredPhases = useMemo(() => {
    if (!buildPlan) return [];

    let filtered = buildPlan.phases;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.title.toLowerCase().includes(query) ||
          p.content.toLowerCase().includes(query) ||
          p.epic.toLowerCase().includes(query) ||
          p.number.toString().includes(query)
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "epic":
          return a.epic.localeCompare(b.epic);
        case "number":
        default:
          return a.number - b.number;
      }
    });

    return filtered;
  }, [buildPlan, searchQuery, sortBy]);

  const handlePhaseSelect = (phase: Phase) => {
    setSelectedPhase(phase);
    onPhaseSelect?.(phase);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Loading Build Plan...</div>
      </div>
    );
  }

  if (error || !buildPlan) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900">Error Loading Build Plan</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-8">
          {["summary", "phases", "supporting"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === tab
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab === "summary" && "Summary"}
              {tab === "phases" && `Phases (${buildPlan.phases.length})`}
              {tab === "supporting" && "Supporting"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <SummaryTab summary={buildPlan.summary} />
      )}

      {/* Phases Tab */}
      {activeTab === "phases" && (
        <PhasesTab
          phases={buildPlan.phases}
          filteredPhases={filteredPhases}
          selectedPhase={selectedPhase}
          searchQuery={searchQuery}
          sortBy={sortBy}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          onPhaseSelect={handlePhaseSelect}
        />
      )}

      {/* Supporting Tab */}
      {activeTab === "supporting" && (
        <SupportingFilesTab files={buildPlan.supportingFiles} />
      )}

      {/* Phase Detail Panel */}
      {selectedPhase && (
        <PhaseDetailPanel phase={selectedPhase} readOnly={readOnly} />
      )}
    </div>
  );
}
```

### 2. Summary Tab Component
Display the Building Brief Summary with markdown rendering:

```typescript
// Components: helix/SummaryTab.tsx

interface SummaryTabProps {
  summary: {
    content: string;
    fileName: string;
  };
}

export function SummaryTab({ summary }: SummaryTabProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Extract markdown sections
  const sections = useMemo(() => {
    const sectionRegex = /^##\s+(.+?)$/gm;
    const matches = [...summary.content.matchAll(sectionRegex)];

    return matches.map((match, idx) => ({
      title: match[1],
      startIdx: match.index!,
      endIdx: matches[idx + 1]?.index ?? summary.content.length
    }));
  }, [summary.content]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          Source: <code className="bg-blue-100 px-2 py-1 rounded">{summary.fileName}</code>
        </p>
      </div>

      {sections.length > 0 ? (
        <div className="space-y-2">
          {sections.map((section) => (
            <div key={section.title} className="border border-slate-200 rounded-lg">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 font-semibold flex justify-between items-center"
              >
                <span>{section.title}</span>
                <span className="text-slate-400">
                  {expandedSections.includes(section.title) ? "▼" : "▶"}
                </span>
              </button>
              {expandedSections.includes(section.title) && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <div className="prose prose-sm max-w-none">
                    {renderMarkdown(
                      summary.content.substring(section.startIdx, section.endIdx)
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          {renderMarkdown(summary.content)}
        </div>
      )}
    </div>
  );
}
```

### 3. Phases Tab with Search & Sort
Display filterable, sortable phase list:

```typescript
// Components: helix/PhasesTab.tsx

interface PhasesTabProps {
  phases: Phase[];
  filteredPhases: Phase[];
  selectedPhase: Phase | null;
  searchQuery: string;
  sortBy: "number" | "title" | "epic";
  onSearchChange: (query: string) => void;
  onSortChange: (sort: "number" | "title" | "epic") => void;
  onPhaseSelect: (phase: Phase) => void;
}

export function PhasesTab({
  phases,
  filteredPhases,
  selectedPhase,
  searchQuery,
  sortBy,
  onSearchChange,
  onSortChange,
  onPhaseSelect
}: PhasesTabProps) {
  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Search Phases</label>
          <input
            type="text"
            placeholder="Search by title, number, epic, or content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="min-w-fit">
          <label className="block text-sm font-medium mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="number">Phase Number</option>
            <option value="title">Title</option>
            <option value="epic">Epic</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-slate-600">
        Showing {filteredPhases.length} of {phases.length} phases
        {searchQuery && ` (filtered by "${searchQuery}")`}
      </div>

      {/* Phase List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredPhases.length > 0 ? (
          filteredPhases.map((phase) => (
            <PhaseListItem
              key={phase.number}
              phase={phase}
              isSelected={selectedPhase?.number === phase.number}
              onClick={() => onPhaseSelect(phase)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-slate-500">
            No phases match your search
          </div>
        )}
      </div>
    </div>
  );
}

interface PhaseListItemProps {
  phase: Phase;
  isSelected: boolean;
  onClick: () => void;
}

function PhaseListItem({ phase, isSelected, onClick }: PhaseListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border transition ${
        isSelected
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white border-slate-200 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">Phase {String(phase.number).padStart(3, "0")}</div>
          <div className={`text-sm ${isSelected ? "text-slate-100" : "text-slate-700"}`}>
            {phase.title}
          </div>
        </div>
        {phase.epic && (
          <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ml-2 ${
            isSelected
              ? "bg-slate-700 text-slate-100"
              : "bg-slate-100 text-slate-700"
          }`}>
            {phase.epic}
          </span>
        )}
      </div>
    </button>
  );
}
```

### 4. Phase Detail Panel
Full phase specification viewer with markdown rendering:

```typescript
// Components: helix/PhaseDetailPanel.tsx

interface PhaseDetailPanelProps {
  phase: Phase;
  readOnly?: boolean;
}

export function PhaseDetailPanel({ phase, readOnly = true }: PhaseDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPhase = async () => {
    await navigator.clipboard.writeText(phase.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">
            Phase {String(phase.number).padStart(3, "0")} — {phase.title}
          </h2>
          {phase.epic && (
            <p className="text-sm text-slate-600 mt-1">
              Epic: <span className="font-semibold">{phase.epic}</span>
            </p>
          )}
        </div>
        <button
          onClick={handleCopyPhase}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
        >
          {copied ? "✓ Copied" : "Copy Phase"}
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6 prose prose-sm max-w-none">
        {renderMarkdown(phase.content)}
      </div>

      {/* Status Footer (if tracked) */}
      {phase.status && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-sm">
          Status: <span className="font-semibold capitalize">{phase.status}</span>
        </div>
      )}
    </div>
  );
}
```

### 5. Supporting Files Tab
Display additional Build Plan documentation:

```typescript
// Components: helix/SupportingFilesTab.tsx

interface SupportingFile {
  name: string;
  type: string;
  content: string;
}

export function SupportingFilesTab({ files }: { files: SupportingFile[] }) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No supporting files available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div key={file.name} className="border border-slate-200 rounded-lg">
          <button
            onClick={() => setExpandedFile(expandedFile === file.name ? null : file.name)}
            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{file.name}</div>
              <div className="text-xs text-slate-500">{file.type}</div>
            </div>
            <span className="text-slate-400">
              {expandedFile === file.name ? "▼" : "▶"}
            </span>
          </button>
          {expandedFile === file.name && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 prose prose-sm max-w-none">
              {renderMarkdown(file.content)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 6. Data Fetching Functions
Load Build Plan artifacts from Supabase Storage:

```typescript
const fetchBuildPlanArtifacts = async (projectId: string): Promise<BuildPlan> => {
  // Fetch from evidence_data reference
  const stepEvidence = await fetchStepEvidence(projectId, "step-3.2");
  const artifactIds = stepEvidence.step32_build_plan.artifacts;

  // Load summary
  const summaryId = artifactIds.summary;
  const summaryContent = await downloadArtifact(projectId, summaryId);

  // Load phases
  const phaseIds = artifactIds.phases;
  const phases = await Promise.all(
    phaseIds.map(async (id) => {
      const content = await downloadArtifact(projectId, id);
      return parsePhaseContent(content);
    })
  );

  // Load supporting files
  const supportingIds = artifactIds.supporting;
  const supportingFiles = await Promise.all(
    supportingIds.map(async (id) => {
      const content = await downloadArtifact(projectId, id);
      const fileName = await getArtifactFileName(id);
      return {
        name: fileName,
        type: classifyFileType(fileName),
        content
      };
    })
  );

  return {
    summary: { content: summaryContent, fileName: "Building-Brief-Summary.md" },
    phases,
    supportingFiles
  };
};

const parsePhaseContent = (content: string): Phase => {
  const numberMatch = content.match(/^# Phase (\d{3})/m);
  const titleMatch = content.match(/^# Phase \d{3}: (.+)$/m);
  const epicMatch = content.match(/## Epic Context[^\n]*\n(.*?)\n/s);
  const objectiveMatch = content.match(/## Objective\n(.*?)\n/s);

  return {
    number: parseInt(numberMatch?.[1] || "0", 10),
    title: titleMatch?.[1] || "Untitled",
    content,
    epic: epicMatch?.[1]?.trim() || "General",
    status: "pending"
  };
};
```

## File Structure
```
/components/helix/
├── BuildPlanViewer.tsx (main container)
├── SummaryTab.tsx (summary display)
├── PhasesTab.tsx (searchable phase list)
├── PhaseDetailPanel.tsx (full phase view)
├── SupportingFilesTab.tsx (additional files)
└── buildPlanUtils.ts (fetch and parse utilities)
```

## Dependencies
- Build Plan artifacts stored in Supabase Storage (Phase 023)
- evidence_data with artifact references (Phase 023)
- Markdown rendering library (remark, react-markdown)
- React hooks (useState, useEffect, useMemo)

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (storage, database)
- react-markdown or equivalent
- React hooks

## Acceptance Criteria
1. BuildPlanViewer loads Build Plan from Supabase Storage on mount
2. Summary tab displays full Building Brief Summary with markdown formatting
3. Summary tab extracts and renders ## sections with collapsible expand/collapse
4. Phases tab displays all phases in a scrollable list
5. Phases tab search filter works across phase number, title, epic, and content
6. Phases tab sort options (number, title, epic) correctly reorder list
7. Clicking a phase in the list displays full phase details in PhaseDetailPanel
8. Phase detail panel renders phase markdown with proper heading hierarchy
9. Phase detail panel shows phase number, title, and epic in header
10. Supporting files tab displays all additional files with collapsible content

## Testing Instructions
1. **Load & Display**: Open BuildPlanViewer; verify summary tab loads and displays full Building Brief
2. **Sections**: In summary tab, verify ## sections extract and render as collapsible sections
3. **Phase List**: Verify all phases display in order with correct numbering and titles
4. **Search Filter**: Search for a phase title; verify results filter correctly; search for part of content; verify match
5. **Sort Options**: Sort by title; verify alphabetical order; sort by epic; verify epic grouping
6. **Phase Selection**: Click a phase in list; verify PhaseDetailPanel displays that phase's full content
7. **Markdown Rendering**: In phase detail, verify markdown headers, lists, code blocks render correctly
8. **Epic Display**: Verify epic is displayed in both phase list item and phase detail header
9. **Copy Phase**: Click "Copy Phase" button; paste in text editor; verify full phase content
10. **Supporting Files**: Verify supporting tab displays roadmap, nextsteps, alignment files; expand/collapse works

## Notes for AI Agent
- The BuildPlanViewer is a read-only component in this phase; editing support is not required
- Markdown rendering should support GFM (GitHub Flavored Markdown) with code syntax highlighting
- Consider memoizing filtered/sorted phases to avoid unnecessary re-renders on large phase lists
- The viewer should handle large Build Plans (50+ phases) efficiently; consider pagination if needed
- This component is reused in Steps 3.3, 4.3, and 5.1, so keep it flexible for different contexts
- Add a "View in Artifacts" link to download the original phase file directly
- Consider adding phase progress tracking (completion status) if phases are built incrementally
