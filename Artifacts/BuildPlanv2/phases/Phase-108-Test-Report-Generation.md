# Phase 108 — Test Report Generation

## Objective
Generate comprehensive test reports including executive summary, coverage statistics, phase-by-phase test results, bugs found, regression risks, and actionable recommendations. Export as markdown artifact.

## Prerequisites
- Phase 107 — Regression Detection Alerts — provides regression risk data
- Phase 105 — Test Coverage Tracking Per Phase — provides coverage metrics
- Phase 106 — Bug Tracking Integration — provides bug data

## Epic Context
**Epic:** 12 — Testing Intelligence — Steps 7.1-7.2 Enhancement
**Phase:** 108 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Testing data is scattered across multiple UIs: matrix, coverage, bugs, regressions. Stakeholders need a comprehensive view: "What's tested? What passed? What failed? What's the risk?" A test report consolidates all this into an executive summary with actionable recommendations.

This phase builds TestReport: aggregates all test data, generates markdown report with sections for summary, coverage stats, test results by phase, bugs, regressions, and recommendations. Report can be exported and shared.

---

## Detailed Requirements

### 1. Test Report Generation Service
#### File: `lib/helix/testing/report-generator.ts` (NEW)
Generate comprehensive test reports.

```typescript
export interface TestReport {
  executiveSummary: string;
  generatedAt: string;
  projectName: string;
  coverageStats: {
    overallCoverage: number;
    totalPhases: number;
    totalCriteria: number;
    tested: number;
    passed: number;
    failed: number;
  };
  phaseResults: Array<{
    phaseNumber: number;
    phaseTitle: string;
    coverage: number;
    result: 'pass' | 'fail' | 'partial';
    criteriaTested: number;
    criteriaTotal: number;
  }>;
  bugsFound: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    resolved: number;
  };
  regressionRisks: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
  markdown: string;
}

export const generateTestReport = async (
  projectId: string,
  projectName: string,
  coverageData: any[],
  bugData: any[],
  regressionData: any[]
): Promise<TestReport> => {
  const overallCoverage =
    coverageData.length > 0
      ? coverageData.reduce((sum, p) => sum + p.coverage, 0) / coverageData.length
      : 0;

  const coverageStats = {
    overallCoverage: Math.round(overallCoverage),
    totalPhases: coverageData.length,
    totalCriteria: coverageData.reduce((sum, p) => sum + p.totalCriteria, 0),
    tested: coverageData.reduce((sum, p) => sum + p.tested, 0),
    passed: coverageData.reduce((sum, p) => sum + p.passed, 0),
    failed: coverageData.reduce((sum, p) => sum + p.failed, 0),
  };

  const bugsFound = {
    total: bugData.length,
    critical: bugData.filter((b) => b.severity === 'critical').length,
    high: bugData.filter((b) => b.severity === 'high').length,
    medium: bugData.filter((b) => b.severity === 'medium').length,
    low: bugData.filter((b) => b.severity === 'low').length,
    open: bugData.filter((b) => b.status === 'open').length,
    resolved: bugData.filter((b) => b.status === 'resolved' || b.status === 'verified').length,
  };

  const regressionRisks = {
    critical: regressionData.filter((r) => r.risk === 'critical').length,
    high: regressionData.filter((r) => r.risk === 'high').length,
    medium: regressionData.filter((r) => r.risk === 'medium').length,
    low: regressionData.filter((r) => r.risk === 'low').length,
  };

  const recommendations = generateRecommendations(
    coverageStats,
    bugsFound,
    regressionRisks,
    coverageData
  );

  const markdown = generateMarkdown(
    projectName,
    coverageStats,
    coverageData,
    bugsFound,
    regressionRisks,
    recommendations
  );

  const executiveSummary = generateExecutiveSummary(coverageStats, bugsFound, regressionRisks);

  return {
    executiveSummary,
    generatedAt: new Date().toISOString(),
    projectName,
    coverageStats,
    phaseResults: coverageData,
    bugsFound,
    regressionRisks,
    recommendations,
    markdown,
  };
};

const generateExecutiveSummary = (
  coverage: any,
  bugs: any,
  regressions: any
): string => {
  const status =
    coverage.overallCoverage >= 80 ? 'GOOD' : coverage.overallCoverage >= 50 ? 'FAIR' : 'POOR';
  const bugStatus = bugs.critical === 0 && bugs.high === 0 ? 'HEALTHY' : 'AT RISK';

  return `
Testing Status: ${status} (${coverage.overallCoverage}% coverage)
Bug Status: ${bugStatus} (${bugs.open} open, ${bugs.critical} critical)
Regression Risk: ${regressions.critical + regressions.high > 0 ? 'HIGH' : 'LOW'}

${coverage.tested}/${coverage.totalCriteria} acceptance criteria tested.
${bugs.total} bugs found, ${bugs.resolved} resolved.
${regressions.critical + regressions.high} high-severity regressions detected.
  `.trim();
};

const generateRecommendations = (coverage: any, bugs: any, regressions: any, phases: any[]): string[] => {
  const recommendations: string[] = [];

  if (coverage.overallCoverage < 80) {
    recommendations.push(
      `Increase test coverage to 80%+. Currently at ${coverage.overallCoverage}%.`
    );
  }

  if (bugs.critical > 0) {
    recommendations.push(`Address all ${bugs.critical} critical bugs before deployment.`);
  }

  if (bugs.open > 10) {
    recommendations.push(`High open bug count (${bugs.open}). Prioritize bug triage.`);
  }

  const lowCoveragePhases = phases.filter((p) => p.coverage < 50);
  if (lowCoveragePhases.length > 0) {
    recommendations.push(
      `Improve coverage on ${lowCoveragePhases.length} phases with < 50% coverage.`
    );
  }

  if (regressions.critical > 0 || regressions.high > 0) {
    recommendations.push(
      `Re-test ${regressions.critical + regressions.high} phases for regressions.`
    );
  }

  return recommendations;
};

const generateMarkdown = (
  projectName: string,
  coverage: any,
  phases: any[],
  bugs: any,
  regressions: any,
  recommendations: string[]
): string => {
  const timestamp = new Date().toLocaleString();

  return `# Test Report — ${projectName}

**Generated:** ${timestamp}

## Executive Summary

**Overall Coverage:** ${coverage.overallCoverage}%
**Total Phases:** ${coverage.totalPhases}
**Acceptance Criteria Tested:** ${coverage.tested}/${coverage.totalCriteria}
**Bugs Found:** ${bugs.total} (${bugs.critical} critical, ${bugs.high} high)
**Regressions Detected:** ${regressions.critical + regressions.high + regressions.medium + regressions.low}

---

## Coverage Statistics

| Metric | Count |
|--------|-------|
| Overall Coverage | ${coverage.overallCoverage}% |
| Phases Tested | ${phases.filter((p) => p.coverage > 0).length} |
| Criteria Passed | ${coverage.passed} |
| Criteria Failed | ${coverage.failed} |

---

## Results by Phase

| Phase | Coverage | Result | Details |
|-------|----------|--------|---------|
${phases.map((p) => `| Phase ${p.phaseNumber} | ${p.coverage.toFixed(0)}% | ${p.result} | ${p.criteriaTested}/${p.criteriaTotal} |`).join('\n')}

---

## Bug Report

**Total:** ${bugs.total}
- Critical: ${bugs.critical}
- High: ${bugs.high}
- Medium: ${bugs.medium}
- Low: ${bugs.low}

**Status:**
- Open: ${bugs.open}
- Resolved: ${bugs.resolved}

---

## Regression Risks

**Critical:** ${regressions.critical}
**High:** ${regressions.high}
**Medium:** ${regressions.medium}
**Low:** ${regressions.low}

---

## Recommendations

${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

*Report generated by Foundry v2 Helix Testing Intelligence*
  `;
};
```

### 2. Test Report Component
#### File: `components/helix/testing/TestReport.tsx` (NEW)
Display and export test reports.

```typescript
import React, { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';

interface TestReportProps {
  projectId: string;
  projectName: string;
}

export const TestReport: React.FC<TestReportProps> = ({
  projectId,
  projectName,
}) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/helix/projects/${projectId}/testing/report`,
        { method: 'POST' }
      );
      const data = await res.json();
      setReport(data.report);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!report) return;
    const element = document.createElement('a');
    element.href =
      'data:text/markdown;charset=utf-8,' + encodeURIComponent(report.markdown);
    element.download = `test-report-${Date.now()}.md`;
    element.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Test Report</h2>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {report && (
            <button
              onClick={handleExportMarkdown}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Export
            </button>
          )}
        </div>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="bg-slate-800 p-6 rounded-lg border-l-4 border-cyan-500">
            <h3 className="text-xl font-bold text-white mb-4">Executive Summary</h3>
            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
              {report.executiveSummary}
            </pre>
          </div>

          {/* Coverage Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-slate-800 p-4 rounded">
              <p className="text-xs text-slate-400 mb-1">Coverage</p>
              <p className="text-2xl font-bold text-cyan-400">
                {report.coverageStats.overallCoverage}%
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded">
              <p className="text-xs text-slate-400 mb-1">Phases</p>
              <p className="text-2xl font-bold text-white">
                {report.coverageStats.totalPhases}
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded">
              <p className="text-xs text-slate-400 mb-1">Bugs</p>
              <p className="text-2xl font-bold text-red-400">
                {report.bugsFound.total}
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded">
              <p className="text-xs text-slate-400 mb-1">Passed</p>
              <p className="text-2xl font-bold text-green-400">
                {report.coverageStats.passed}
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded">
              <p className="text-xs text-slate-400 mb-1">Failed</p>
              <p className="text-2xl font-bold text-orange-400">
                {report.coverageStats.failed}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-white mb-4">Recommendations</h3>
              <ul className="space-y-2">
                {report.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="text-slate-300 flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated Time */}
          <p className="text-xs text-slate-500 text-center">
            Report generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
      )}

      {!report && !loading && (
        <div className="bg-slate-800 p-8 rounded-lg text-center">
          <p className="text-slate-400 mb-4">No report generated yet</p>
          <button
            onClick={handleGenerateReport}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 px-6 rounded transition-colors"
          >
            Generate First Report
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## File Structure
```
lib/helix/testing/
├── report-generator.ts (NEW)

components/helix/testing/
├── TestReport.tsx (NEW)

app/api/helix/projects/[projectId]/
├── testing/
│   └── report/route.ts (NEW)
```

---

## Dependencies
- lucide-react (icons)
- Supabase

---

## Tech Stack for This Phase
- TypeScript
- React
- Next.js

---

## Acceptance Criteria
1. TestReport aggregates coverage, bug, and regression data
2. Executive summary provides high-level overview
3. Report includes all statistics (coverage %, bugs, regressions)
4. Recommendations are actionable and context-aware
5. Markdown export includes all sections
6. Generate button compiles report from latest data
7. Stats grid displays key metrics
8. Report can be exported as .md file
9. Generated timestamp shows when report was created
10. Report updates when test data changes

---

## Testing Instructions
1. Generate test report and verify data accuracy
2. Check executive summary matches actual coverage
3. Export as markdown and verify content
4. Open markdown in editor and verify formatting
5. Test with 0 bugs, 0 regressions
6. Test with multiple critical bugs
7. Verify recommendations are present
8. Test with different coverage levels
9. Verify timestamp is correct
10. Test performance with large datasets

---

## Notes for the AI Agent
- Store generated reports as artifacts
- Allow filtered reports (by phase, by epic)
- Email report to stakeholders on request
- Track report history for trend analysis
