# Phase 097 — Alignment Report Viewer

## Objective
Build a viewer for alignment reports that show how the build deviated from specifications. Display deviations, dropped items, added items, new conventions, and documentation changes in a structured, diff-aware format.

## Prerequisites
- Phase 092 — Phase Spec Viewer — provides markdown viewing capabilities
- Phase 087 — Build Plan Editor UI — establishes document editing patterns

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 097 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
During build execution, plans change. Code requirements shift, architecture decisions evolve, and documentation gets updated. Currently, these changes aren't tracked or visible. The alignment process (from v1) identifies deviations but lacks a viewer to present them.

This phase creates AlignmentReport viewer: displays what deviated from the spec, what was dropped/added, new conventions discovered, and docs updated. Historical alignment reports per phase show evolution over time.

---

## Detailed Requirements

### 1. Alignment Report Viewer Component
#### File: `components/helix/build/AlignmentReportViewer.tsx` (NEW)
Component for displaying alignment reports with structured sections.

```typescript
import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Plus, Trash2, FileText } from 'lucide-react';

interface AlignmentReport {
  id: string;
  phaseNumber: number;
  timestamp: string;
  specVersion: string;
  deviations: Deviation[];
  droppedItems: string[];
  addedItems: string[];
  newConventions: Convention[];
  docsUpdated: DocChange[];
  summary: string;
}

interface Deviation {
  item: string;
  original: string;
  actual: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

interface Convention {
  name: string;
  description: string;
  appliesTo: string[];
}

interface DocChange {
  file: string;
  section: string;
  change: string;
}

interface AlignmentReportViewerProps {
  report: AlignmentReport;
  onSaveAnnotation?: (key: string, value: any) => void;
}

export const AlignmentReportViewer: React.FC<AlignmentReportViewerProps> = ({
  report,
  onSaveAnnotation,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['deviations', 'summary'])
  );

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const severityConfig = {
    critical: { color: 'text-red-400', bg: 'bg-red-900' },
    high: { color: 'text-orange-400', bg: 'bg-orange-900' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-900' },
    low: { color: 'text-blue-400', bg: 'bg-blue-900' },
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg border-l-4 border-cyan-500">
        <h2 className="text-2xl font-bold text-white mb-2">Alignment Report</h2>
        <p className="text-slate-400 text-sm mb-4">Phase {report.phaseNumber} — {report.timestamp}</p>
        <p className="text-slate-300">{report.summary}</p>
      </div>

      {/* Deviations */}
      <div className="bg-slate-800 p-6 rounded-lg">
        <button
          onClick={() => toggleSection('deviations')}
          className="w-full flex items-center justify-between text-lg font-semibold text-white hover:text-cyan-400 transition-colors"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={20} />
            Deviations
            {report.deviations.length > 0 && (
              <span className="ml-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                {report.deviations.length}
              </span>
            )}
          </span>
          <span>{expandedSections.has('deviations') ? '▼' : '▶'}</span>
        </button>

        {expandedSections.has('deviations') && (
          <div className="mt-4 space-y-3">
            {report.deviations.length === 0 ? (
              <p className="text-slate-400 text-sm">No deviations recorded</p>
            ) : (
              report.deviations.map((dev, idx) => {
                const config = severityConfig[dev.severity];
                return (
                  <div key={idx} className={`${config.bg} border-l-4 border-slate-600 p-4 rounded`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{dev.item}</h4>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${config.color}`}>
                        {dev.severity}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-300">
                      <div>
                        <p className="text-slate-400 text-xs">Expected:</p>
                        <p className="font-mono text-xs">{dev.original}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Actual:</p>
                        <p className="font-mono text-xs">{dev.actual}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Reason:</p>
                        <p>{dev.reason}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Dropped Items */}
      {report.droppedItems.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-lg">
          <button
            onClick={() => toggleSection('dropped')}
            className="w-full flex items-center justify-between text-lg font-semibold text-white hover:text-cyan-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Trash2 size={20} />
              Dropped Items
              <span className="ml-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
                {report.droppedItems.length}
              </span>
            </span>
            <span>{expandedSections.has('dropped') ? '▼' : '▶'}</span>
          </button>

          {expandedSections.has('dropped') && (
            <div className="mt-4 space-y-2">
              {report.droppedItems.map((item, idx) => (
                <div key={idx} className="bg-slate-700 p-3 rounded text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Added Items */}
      {report.addedItems.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-lg">
          <button
            onClick={() => toggleSection('added')}
            className="w-full flex items-center justify-between text-lg font-semibold text-white hover:text-cyan-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Plus size={20} />
              Added Items
              <span className="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                {report.addedItems.length}
              </span>
            </span>
            <span>{expandedSections.has('added') ? '▼' : '▶'}</span>
          </button>

          {expandedSections.has('added') && (
            <div className="mt-4 space-y-2">
              {report.addedItems.map((item, idx) => (
                <div key={idx} className="bg-slate-700 p-3 rounded text-sm text-green-300">
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Conventions */}
      {report.newConventions.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-lg">
          <button
            onClick={() => toggleSection('conventions')}
            className="w-full flex items-center justify-between text-lg font-semibold text-white hover:text-cyan-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={20} />
              New Conventions
              <span className="ml-2 bg-cyan-600 text-white text-xs px-2 py-1 rounded">
                {report.newConventions.length}
              </span>
            </span>
            <span>{expandedSections.has('conventions') ? '▼' : '▶'}</span>
          </button>

          {expandedSections.has('conventions') && (
            <div className="mt-4 space-y-3">
              {report.newConventions.map((conv, idx) => (
                <div key={idx} className="bg-slate-700 p-3 rounded">
                  <h4 className="font-semibold text-cyan-300 mb-2">{conv.name}</h4>
                  <p className="text-sm text-slate-300 mb-2">{conv.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {conv.appliesTo.map((item, i) => (
                      <span key={i} className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Docs Updated */}
      {report.docsUpdated.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-lg">
          <button
            onClick={() => toggleSection('docs')}
            className="w-full flex items-center justify-between text-lg font-semibold text-white hover:text-cyan-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText size={20} />
              Docs Updated
              <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                {report.docsUpdated.length}
              </span>
            </span>
            <span>{expandedSections.has('docs') ? '▼' : '▶'}</span>
          </button>

          {expandedSections.has('docs') && (
            <div className="mt-4 space-y-2">
              {report.docsUpdated.map((doc, idx) => (
                <div key={idx} className="bg-slate-700 p-3 rounded text-sm">
                  <p className="text-slate-300 font-mono">{doc.file}</p>
                  {doc.section && <p className="text-slate-400 text-xs mt-1">{doc.section}</p>}
                  {doc.change && <p className="text-slate-400 text-xs mt-1">{doc.change}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## File Structure
```
components/helix/build/
├── AlignmentReportViewer.tsx (NEW)

lib/helix/
├── alignment.ts (NEW) — utilities for parsing/storing alignment reports
```

---

## Dependencies
- lucide-react (icons)
- TypeScript

---

## Tech Stack for This Phase
- TypeScript
- React
- Next.js

---

## Acceptance Criteria
1. AlignmentReportViewer renders with all report sections
2. Sections expand/collapse on button click
3. Deviations display with severity color coding
4. Deviations show original, actual, and reason
5. Dropped items list renders with Trash2 icon
6. Added items list renders with Plus icon
7. New conventions show name, description, applies-to tags
8. Docs updated section shows file path and changes
9. Badges show count of items in each section
10. All sections remain collapsed until clicked, except deviations and summary

---

## Testing Instructions
1. Render AlignmentReportViewer with sample report data
2. Click section buttons and verify expand/collapse behavior
3. Verify severity color coding matches config
4. Test with empty arrays (no deviations, etc.)
5. Test with 50+ deviations for performance
6. Verify original/actual diff is readable
7. Test section navigation with keyboard
8. Verify badges accurately count items
9. Test scrolling in long sections
10. Verify report data persists on page refresh

---

## Notes for the AI Agent
- Integrate with Phase 100 handoff system
- Store alignment reports in helix_alignment_reports table
- Add ability to export alignment reports as markdown
- Consider timeline view of alignment changes across phases
