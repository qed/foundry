# Phase 100 — Build Handoff System

## Objective
Generate structured handoff summaries when phases complete, capturing what was built, key decisions, known issues, and next-phase context. Load handoff summaries when starting new sessions to provide continuity between engineers.

## Prerequisites
- Phase 099 — Build Velocity Analytics — provides completion tracking
- Phase 093 — Build Session Tracking — provides session context
- Phase 097 — Alignment Report Viewer — provides alignment context

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 100 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
When one engineer completes a phase and another resumes later, critical context is lost: "What did they build exactly? What decisions were made? What's broken?" Handoff summaries bridge this gap by capturing key information that the next engineer needs to understand where things stand.

This phase builds a handoff system: when a phase completes, generate a summary; when starting a new session, load the previous handoff automatically. Handoffs include what was built, design decisions, known issues, test coverage, and next-phase dependencies.

---

## Detailed Requirements

### 1. Handoff Summary Generator
#### File: `lib/helix/handoff.ts` (NEW)
Generate handoff summaries from phase data.

```typescript
export interface HandoffSummary {
  id: string;
  phaseNumber: number;
  phaseTitle: string;
  completedAt: string;
  completedBy: string;
  summary: string;
  whatWasBuilt: string[];
  keyDecisions: Array<{
    decision: string;
    rationale: string;
  }>;
  knownIssues: Array<{
    issue: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    workaround?: string;
  }>;
  testCoverage: {
    acceptanceCriteria: number;
    acceptanceCriteriaTested: number;
    percentage: number;
  };
  filesModified: string[];
  commitCount: number;
  commitHashes: string[];
  nextPhaseContext: string;
  sessionDuration: number; // seconds
}

export const generateHandoffSummary = async (
  projectId: string,
  phaseNumber: number,
  phaseData: any,
  sessionData: any,
  commitData: any[],
  testData: any,
  alignmentData: any
): Promise<HandoffSummary> => {
  const whatWasBuilt = extractWhatWasBuilt(phaseData, alignmentData);
  const keyDecisions = extractKeyDecisions(phaseData, sessionData);
  const knownIssues = extractKnownIssues(testData, alignmentData);
  const filesModified = commitData.flatMap((c) => c.filesModified || []);

  const testCoverage = {
    acceptanceCriteria: phaseData.acceptanceCriteria?.length || 0,
    acceptanceCriteriaTested: testData?.testedCriteria?.length || 0,
    percentage:
      testData?.testedCriteria?.length && phaseData.acceptanceCriteria?.length
        ? (testData.testedCriteria.length / phaseData.acceptanceCriteria.length) * 100
        : 0,
  };

  const summary = `
Phase ${phaseNumber} — ${phaseData.phaseTitle} completed successfully.
${whatWasBuilt.length} major components built.
${commitData.length} commits made.
${testCoverage.percentage.toFixed(0)}% acceptance criteria tested.
`.trim();

  return {
    id: `handoff-${phaseNumber}-${Date.now()}`,
    phaseNumber,
    phaseTitle: phaseData.phaseTitle,
    completedAt: new Date().toISOString(),
    completedBy: sessionData.agentName || 'Unknown',
    summary,
    whatWasBuilt,
    keyDecisions,
    knownIssues,
    testCoverage,
    filesModified: [...new Set(filesModified)],
    commitCount: commitData.length,
    commitHashes: commitData.map((c) => c.hash),
    nextPhaseContext: generateNextPhaseContext(phaseNumber),
    sessionDuration: sessionData.duration || 0,
  };
};

const extractWhatWasBuilt = (phaseData: any, alignmentData: any): string[] => {
  const items: string[] = [];

  if (alignmentData?.addedItems) {
    items.push(...alignmentData.addedItems);
  }

  // Parse from phase requirements
  const requirementsMatch = phaseData.content?.match(/### \d+\. (.+?)\n/g);
  if (requirementsMatch) {
    items.push(
      ...requirementsMatch.map((r: string) => r.replace(/### \d+\. /, '').trim())
    );
  }

  return items;
};

const extractKeyDecisions = (
  phaseData: any,
  sessionData: any
): Array<{ decision: string; rationale: string }> => {
  if (!sessionData.notes) return [];

  const decisions: Array<{ decision: string; rationale: string }> = [];

  // Parse structured decisions from session notes
  const decisionRegex = /Decision:\s*(.+?)\s*Rationale:\s*(.+?)(?:Decision:|$)/g;
  let match;

  while ((match = decisionRegex.exec(sessionData.notes)) !== null) {
    decisions.push({
      decision: match[1].trim(),
      rationale: match[2].trim(),
    });
  }

  return decisions;
};

const extractKnownIssues = (
  testData: any,
  alignmentData: any
): Array<{ issue: string; severity: 'critical' | 'high' | 'medium' | 'low'; workaround?: string }> => {
  const issues: Array<{ issue: string; severity: 'critical' | 'high' | 'medium' | 'low'; workaround?: string }> = [];

  if (testData?.failedTests) {
    testData.failedTests.forEach((test: any) => {
      issues.push({
        issue: `Test failed: ${test.name}`,
        severity: test.severity || 'medium',
        workaround: test.workaround,
      });
    });
  }

  if (alignmentData?.deviations) {
    alignmentData.deviations.forEach((dev: any) => {
      if (dev.severity === 'critical' || dev.severity === 'high') {
        issues.push({
          issue: dev.item,
          severity: dev.severity,
        });
      }
    });
  }

  return issues;
};

const generateNextPhaseContext = (currentPhaseNumber: number): string => {
  const nextPhaseNum = currentPhaseNumber + 1;
  return `Next phase ${nextPhaseNum} depends on the components built in this phase. Ensure all acceptance criteria are met before starting phase ${nextPhaseNum}.`;
};
```

### 2. Handoff Display Component
#### File: `components/helix/build/HandoffSummary.tsx` (NEW)
Display previous handoff when loading a phase.

```typescript
import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, FileText } from 'lucide-react';

interface HandoffSummaryProps {
  projectId: string;
  phaseNumber: number;
}

export const HandoffSummary: React.FC<HandoffSummaryProps> = ({
  projectId,
  phaseNumber,
}) => {
  const [handoff, setHandoff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchHandoff = async () => {
      try {
        // Try to get handoff from previous phase
        const prevPhaseNum = phaseNumber - 1;
        const res = await fetch(
          `/api/helix/projects/${projectId}/phases/${prevPhaseNum}/handoff`
        );
        const data = await res.json();
        if (data.handoff) {
          setHandoff(data.handoff);
        }
      } catch (error) {
        console.error('Failed to fetch handoff:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHandoff();
  }, [projectId, phaseNumber]);

  if (loading || !handoff) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 rounded-lg border border-blue-700">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">
            Handoff from Phase {handoff.phaseNumber}
          </h3>
          <p className="text-blue-200 text-sm">{handoff.summary}</p>
        </div>
        <span className="text-blue-300 text-2xl">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-blue-700 pt-4">
          {/* What Was Built */}
          {handoff.whatWasBuilt.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-blue-200 mb-2 flex items-center gap-2">
                <CheckCircle size={16} />
                What Was Built
              </h4>
              <ul className="space-y-1">
                {handoff.whatWasBuilt.map((item: string, idx: number) => (
                  <li key={idx} className="text-sm text-blue-100">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Decisions */}
          {handoff.keyDecisions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-blue-200 mb-2">Key Decisions</h4>
              <div className="space-y-2">
                {handoff.keyDecisions.map((decision: any, idx: number) => (
                  <div key={idx} className="bg-blue-900 p-2 rounded text-sm">
                    <p className="text-blue-100 font-medium">{decision.decision}</p>
                    <p className="text-blue-300 text-xs mt-1">{decision.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Known Issues */}
          {handoff.knownIssues.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-blue-200 mb-2 flex items-center gap-2">
                <AlertCircle size={16} />
                Known Issues
              </h4>
              <div className="space-y-2">
                {handoff.knownIssues.map((issue: any, idx: number) => (
                  <div key={idx} className="bg-blue-900 p-2 rounded text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-100">{issue.issue}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded font-semibold ${
                          issue.severity === 'critical'
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-600 text-white'
                        }`}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    {issue.workaround && (
                      <p className="text-blue-300 text-xs">Workaround: {issue.workaround}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Coverage */}
          <div>
            <h4 className="text-sm font-semibold text-blue-200 mb-2">Test Coverage</h4>
            <div className="bg-blue-900 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-100">
                  {handoff.testCoverage.acceptanceCriteriaTested} of{' '}
                  {handoff.testCoverage.acceptanceCriteria} criteria tested
                </span>
                <span className="text-lg font-bold text-cyan-400">
                  {handoff.testCoverage.percentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-blue-800 rounded h-2">
                <div
                  className="bg-cyan-500 h-2 rounded"
                  style={{ width: `${handoff.testCoverage.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-blue-900 p-3 rounded text-xs text-blue-200 space-y-1">
            <p>Completed by: {handoff.completedBy}</p>
            <p>Session duration: {formatDuration(handoff.sessionDuration)}</p>
            <p>Commits: {handoff.commitCount}</p>
            <p>Files modified: {handoff.filesModified.length}</p>
          </div>

          <p className="text-sm text-blue-300 italic">{handoff.nextPhaseContext}</p>
        </div>
      )}
    </div>
  );
};
```

---

## File Structure
```
lib/helix/
├── handoff.ts (NEW)

components/helix/build/
├── HandoffSummary.tsx (NEW)

app/api/helix/projects/[projectId]/phases/[phaseNumber]/
├── handoff/route.ts (NEW)
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
1. HandoffSummary generates when phase completes
2. Summary includes what was built, decisions, known issues
3. Test coverage percentage calculates correctly
4. Known issues list includes severity level
5. Handoff displays automatically when loading previous phase's handoff
6. Handoff is collapsible/expandable
7. Files modified list is comprehensive
8. Session duration formats as H:MM
9. Next phase context provides guidance
10. Handoffs persist across sessions

---

## Testing Instructions
1. Complete a phase and generate handoff
2. Verify all handoff fields populated correctly
3. Verify math on test coverage percentage
4. Start new session and verify handoff loads
5. Test expand/collapse functionality
6. Verify session duration calculation
7. Test with phase having no issues
8. Test with phase having all critical issues
9. Verify handoff persists on page refresh
10. Test handoff data structure integrity

---

## Notes for the AI Agent
- Store handoffs in helix_handoffs table
- Create cascade where phase completion -> auto-generate handoff
- Link handoff to next phase display
- Consider summarizing with Claude API for conciseness
