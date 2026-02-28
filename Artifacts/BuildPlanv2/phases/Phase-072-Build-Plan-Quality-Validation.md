# Phase 072 — Build Plan Quality Validation

## Objective
Implement AI-powered build plan quality checks: validate phase sizing consistency, dependency chains, acceptance criteria testability, and coverage gaps. Produce quality report with improvement suggestions.

## Prerequisites
- Phase 071 — Build Plan In-App Viewer & Editor — plan edited and finalized

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 072 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
A build plan can be technically complete but have hidden quality issues: phases sized inconsistently, dependencies unclear, acceptance criteria untestable, or coverage gaps. This phase implements automated quality validation using Claude to review the plan against best practices and suggest improvements.

---

## Detailed Requirements

### 1. Quality Validation Service
#### File: `lib/helix/build-plan-validation.ts` (NEW)

```typescript
import { Phase } from './build-planning-state';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'sizing' | 'dependencies' | 'criteria' | 'coverage' | 'naming';
  message: string;
  affectedPhases?: string[];
  suggestion?: string;
}

export interface QualityReport {
  overallScore: number; // 0-100
  issues: ValidationIssue[];
  strengths: string[];
  improvementSuggestions: string[];
}

export class BuildPlanValidator {
  validate(phases: Phase[]): QualityReport {
    const issues: ValidationIssue[] = [];
    const strengths: string[] = [];
    const suggestions: string[] = [];

    // 1. Sizing Consistency
    const sizeGroups = this.groupBySize(phases);
    if (sizeGroups.inconsistent.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'sizing',
        message: `${sizeGroups.inconsistent.length} phases have non-standard size`,
        affectedPhases: sizeGroups.inconsistent.map((p) => p.id),
        suggestion: 'Most phases are 3-4h. Suggest adjusting outliers.',
      });
    } else {
      strengths.push('Consistent phase sizing (3-4h target)');
    }

    // 2. Dependency Clarity
    const deps = this.validateDependencies(phases);
    if (deps.missing.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'dependencies',
        message: `${deps.missing.length} phases lack clear prerequisites`,
        affectedPhases: deps.missing,
        suggestion: 'Add explicit prerequisites for each phase.',
      });
    } else {
      strengths.push('Clear dependency chain between phases');
    }

    // 3. Acceptance Criteria Quality
    const criteria = this.validateAcceptanceCriteria(phases);
    if (criteria.weak.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'criteria',
        message: `${criteria.weak.length} phases have weak acceptance criteria`,
        affectedPhases: criteria.weak,
        suggestion: 'Ensure criteria are specific and testable.',
      });
    } else {
      strengths.push('All phases have testable acceptance criteria');
    }

    // 4. Coverage
    const coverage = this.validateCoverage(phases);
    if (coverage.gaps.length > 0) {
      issues.push({
        severity: 'info',
        category: 'coverage',
        message: `Coverage gaps identified: ${coverage.gaps.join(', ')}`,
        suggestion: 'Consider adding phases for: testing, documentation, deployment.',
      });
    }

    // 5. Naming
    const naming = this.validateNaming(phases);
    if (naming.unclear.length > 0) {
      issues.push({
        severity: 'info',
        category: 'naming',
        message: `${naming.unclear.length} phases have unclear names`,
        affectedPhases: naming.unclear,
        suggestion: 'Use action-oriented verbs (Build, Implement, Test, Deploy).',
      });
    }

    // Calculate overall score
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const overallScore = Math.max(0, 100 - errorCount * 20 - warningCount * 5);

    suggestions.push(
      ...(deps.suggestions || []),
      ...(coverage.suggestions || [])
    );

    return {
      overallScore,
      issues,
      strengths,
      improvementSuggestions: suggestions,
    };
  }

  private groupBySize(phases: Phase[]) {
    const target = 3.5; // 3-4 hours
    const tolerance = 1.5;

    const consistent = phases.filter(
      (p) => Math.abs(p.estimatedHours - target) <= tolerance
    );
    const inconsistent = phases.filter(
      (p) => Math.abs(p.estimatedHours - target) > tolerance
    );

    return { consistent, inconsistent };
  }

  private validateDependencies(phases: Phase[]) {
    const missing = phases
      .filter((p) => !p.description || p.description.length < 10)
      .map((p) => p.id);

    return {
      missing,
      suggestions: [
        'Add explicit "Prerequisites" field to each phase spec',
        'Document cross-epic dependencies',
      ],
    };
  }

  private validateAcceptanceCriteria(phases: Phase[]) {
    const weak = phases
      .filter((p) => !p.acceptanceCriteria || p.acceptanceCriteria.length === 0)
      .map((p) => p.id);

    return { weak };
  }

  private validateCoverage(phases: Phase[]) {
    const phaseNames = phases.map((p) => p.name.toLowerCase());
    const gaps = [];

    if (!phaseNames.some((n) => n.includes('test'))) gaps.push('Testing');
    if (!phaseNames.some((n) => n.includes('deploy'))) gaps.push('Deployment');
    if (!phaseNames.some((n) => n.includes('doc'))) gaps.push('Documentation');

    return {
      gaps,
      suggestions: gaps.length > 0 ? [`Add phases for: ${gaps.join(', ')}`] : [],
    };
  }

  private validateNaming(phases: Phase[]) {
    const verbs = ['build', 'implement', 'test', 'deploy', 'setup', 'design'];
    const unclear = phases
      .filter((p) => !verbs.some((v) => p.name.toLowerCase().includes(v)))
      .map((p) => p.id);

    return { unclear };
  }
}
```

### 2. Quality Report Component
#### File: `components/helix/build-planning/QualityReport.tsx` (NEW)

```typescript
'use client';

import { QualityReport, ValidationIssue } from '@/lib/helix/build-plan-validation';
import { AlertCircle, CheckCircle, InfoIcon, TrendingUp } from 'lucide-react';

interface QualityReportProps {
  report: QualityReport;
  onDismiss?: () => void;
}

export function QualityReport({ report, onDismiss }: QualityReportProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-700 bg-green-50 border-green-200';
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <InfoIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className={`rounded-lg border p-6 space-y-4 ${getScoreColor(report.overallScore)}`}>
      {/* Score Card */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold">Build Plan Quality Score</p>
          <p className="text-3xl font-bold mt-1">{report.overallScore}/100</p>
        </div>
        <TrendingUp className="w-12 h-12 opacity-20" />
      </div>

      {/* Strengths */}
      {report.strengths.length > 0 && (
        <div className="bg-white bg-opacity-50 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Strengths
          </h3>
          <ul className="text-sm text-slate-700 space-y-1">
            {report.strengths.map((strength, idx) => (
              <li key={idx} className="flex gap-2">
                <span>✓</span> {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues */}
      {report.issues.length > 0 && (
        <div className="bg-white bg-opacity-50 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Issues Found</h3>
          <div className="space-y-2">
            {report.issues.map((issue, idx) => (
              <div
                key={idx}
                className="text-sm space-y-1 pb-2 border-b border-white border-opacity-50 last:border-0"
              >
                <div className="flex items-start gap-2">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{issue.message}</p>
                    {issue.suggestion && (
                      <p className="text-xs text-slate-600 mt-1">
                        💡 {issue.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Suggestions */}
      {report.improvementSuggestions.length > 0 && (
        <div className="bg-white bg-opacity-50 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Recommendations</h3>
          <ul className="text-sm text-slate-700 space-y-1">
            {report.improvementSuggestions.map((suggestion, idx) => (
              <li key={idx} className="flex gap-2">
                <span>→</span> {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="w-full px-3 py-2 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 border border-white border-opacity-50"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
```

---

## File Structure
```
lib/helix/
└── build-plan-validation.ts (NEW)

components/helix/build-planning/
└── QualityReport.tsx (NEW)
```

---

## Dependencies
- React 19+, lucide-react
- Phase interface

---

## Tech Stack for This Phase
- TypeScript, validation logic
- Pattern matching for naming/coverage

---

## Acceptance Criteria
1. BuildPlanValidator.validate analyzes phases for 5 categories
2. Returns overallScore 0-100 with penalty for issues
3. Identifies phases with non-standard sizing
4. Flags phases missing clear prerequisites
5. Detects weak/missing acceptance criteria
6. Suggests coverage gaps (testing, deployment, docs)
7. Scores naming based on action verbs
8. QualityReport displays score prominently
9. Shows strengths, issues, and improvement suggestions
10. Score color-coded: green 80+, amber 60-79, red <60

---

## Testing Instructions
1. Create BuildPlanValidator, call validate with sample phases
2. Verify overallScore calculated correctly
3. Test sizing check with 2h and 8h phases
4. Test dependency check with weak descriptions
5. Test criteria check with empty acceptanceCriteria
6. Test coverage check with no testing phase
7. Test naming check with unclear phase names
8. Mount QualityReport with various scores
9. Verify color-coding matches score ranges
10. Verify all issues displayed with suggestions

---

## Notes for the AI Agent
- Quality scoring weights can be adjusted based on user feedback.
- Validator uses heuristics; AI analysis (Phase 072) adds semantic understanding.
- Consider saving validation history for trend analysis in v2.
