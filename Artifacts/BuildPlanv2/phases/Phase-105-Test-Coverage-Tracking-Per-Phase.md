# Phase 105 — Test Coverage Tracking Per Phase

## Objective
Build coverage dashboard showing per-phase test status metrics: total acceptance criteria, tested, passed, failed, skipped. Visualize overall coverage percentage and heat map by coverage level. Enable coverage report export.

## Prerequisites
- Phase 104 — Integration Test Checklist Generator — provides cross-phase testing context
- Phase 103 — Test Results Capture And Storage — provides test result data

## Epic Context
**Epic:** 12 — Testing Intelligence — Steps 7.1-7.2 Enhancement
**Phase:** 105 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Without a per-phase coverage view, it's impossible to see which phases are well-tested and which lack testing. Some phases may have 0% test coverage while others are complete. A coverage dashboard provides visibility and accountability.

This phase builds CoverageDashboard: shows metrics per phase (total criteria, tested, passed, failed, skipped), overall coverage %, and heat map visualization where colors represent coverage level (green = 80%+, yellow = 50-80%, red = 0-50%).

---

## Detailed Requirements

### 1. Coverage Dashboard Component
#### File: `components/helix/testing/CoverageDashboard.tsx` (NEW)
Per-phase test coverage visualization.

```typescript
import React, { useState, useEffect } from 'react';
import { Download, TrendingUp } from 'lucide-react';

interface PhaseMetrics {
  phaseNumber: number;
  phaseTitle: string;
  totalCriteria: number;
  tested: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
}

interface CoverageDashboardProps {
  projectId: string;
}

export const CoverageDashboard: React.FC<CoverageDashboardProps> = ({
  projectId,
}) => {
  const [metrics, setMetrics] = useState<PhaseMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'phase' | 'coverage' | 'passed'>('coverage');

  useEffect(() => {
    const fetchCoverage = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/testing/coverage`
        );
        const data = await res.json();
        setMetrics(data.metrics || []);
      } catch (error) {
        console.error('Failed to fetch coverage metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoverage();
  }, [projectId]);

  const handleExportReport = async () => {
    try {
      const res = await fetch(
        `/api/helix/projects/${projectId}/testing/coverage-report`,
        { method: 'POST' }
      );
      const data = await res.json();
      // Trigger download
      const element = document.createElement('a');
      element.href = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(data.report);
      element.download = 'coverage-report.md';
      element.click();
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'bg-green-900 border-green-600';
    if (coverage >= 50) return 'bg-yellow-900 border-yellow-600';
    return 'bg-red-900 border-red-600';
  };

  const getCoverageBgColor = (coverage: number) => {
    if (coverage >= 80) return '#065f46';
    if (coverage >= 50) return '#713f12';
    return '#7f1d1d';
  };

  const sortedMetrics = [...metrics].sort((a, b) => {
    switch (sortBy) {
      case 'coverage':
        return b.coverage - a.coverage;
      case 'passed':
        return b.passed - a.passed;
      case 'phase':
      default:
        return a.phaseNumber - b.phaseNumber;
    }
  });

  const overallCoverage =
    metrics.length > 0
      ? (metrics.reduce((sum, m) => sum + m.coverage, 0) / metrics.length).toFixed(1)
      : '0';

  const totalCriteria = metrics.reduce((sum, m) => sum + m.totalCriteria, 0);
  const totalTested = metrics.reduce((sum, m) => sum + m.tested, 0);
  const totalPassed = metrics.reduce((sum, m) => sum + m.passed, 0);
  const totalFailed = metrics.reduce((sum, m) => sum + m.failed, 0);

  if (loading) {
    return <div className="text-slate-400">Loading coverage data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-xs text-slate-400 mb-1">Overall Coverage</p>
          <p className="text-2xl font-bold text-white">{overallCoverage}%</p>
        </div>
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-xs text-slate-400 mb-1">Total Criteria</p>
          <p className="text-2xl font-bold text-white">{totalCriteria}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-xs text-slate-400 mb-1">Tested</p>
          <p className="text-2xl font-bold text-cyan-400">{totalTested}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-xs text-slate-400 mb-1">Passed</p>
          <p className="text-2xl font-bold text-green-400">{totalPassed}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded">
          <p className="text-xs text-slate-400 mb-1">Failed</p>
          <p className="text-2xl font-bold text-red-400">{totalFailed}</p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2">
        <label className="text-sm text-slate-400">Sort by:</label>
        {['phase', 'coverage', 'passed'].map((option) => (
          <button
            key={option}
            onClick={() => setSortBy(option as any)}
            className={`text-sm px-3 py-1 rounded transition-colors ${
              sortBy === option
                ? 'bg-cyan-500 text-slate-900 font-semibold'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
        <button
          onClick={handleExportReport}
          className="ml-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded transition-colors flex items-center gap-2 text-sm"
        >
          <Download size={16} />
          Export Report
        </button>
      </div>

      {/* Coverage Heat Map */}
      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Coverage Heat Map</h3>
        <div className="grid grid-cols-4 gap-3">
          {sortedMetrics.map((metric) => (
            <div
              key={metric.phaseNumber}
              className={`p-4 rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity ${getCoverageColor(
                metric.coverage
              )}`}
              title={`Phase ${metric.phaseNumber}: ${metric.coverage.toFixed(0)}%`}
            >
              <p className="text-sm font-semibold text-white">P{metric.phaseNumber}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {metric.coverage.toFixed(0)}%
              </p>
              <p className="text-xs text-slate-300 mt-1">
                {metric.tested}/{metric.totalCriteria}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900">
              <th className="border border-slate-700 px-4 py-2 text-left text-sm font-semibold text-white">
                Phase
              </th>
              <th className="border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-white">
                Total
              </th>
              <th className="border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-white">
                Tested
              </th>
              <th className="border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-white">
                Passed
              </th>
              <th className="border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-white">
                Failed
              </th>
              <th className="border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-white">
                Coverage
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMetrics.map((metric) => (
              <tr key={metric.phaseNumber} className="border border-slate-700 hover:bg-slate-800">
                <td className="px-4 py-2">
                  <p className="font-semibold text-white">Phase {metric.phaseNumber}</p>
                  <p className="text-xs text-slate-400">{metric.phaseTitle}</p>
                </td>
                <td className="px-4 py-2 text-center text-white">{metric.totalCriteria}</td>
                <td className="px-4 py-2 text-center text-cyan-400">{metric.tested}</td>
                <td className="px-4 py-2 text-center text-green-400">{metric.passed}</td>
                <td className="px-4 py-2 text-center text-red-400">{metric.failed}</td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-16 bg-slate-700 rounded h-2">
                      <div
                        className="h-2 rounded transition-all"
                        style={{
                          width: `${metric.coverage}%`,
                          backgroundColor: getCoverageBgColor(metric.coverage),
                        }}
                      />
                    </div>
                    <span className="text-white font-semibold">
                      {metric.coverage.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

## File Structure
```
components/helix/testing/
├── CoverageDashboard.tsx (NEW)

app/api/helix/projects/[projectId]/
├── testing/
│   ├── coverage/route.ts (NEW)
│   └── coverage-report/route.ts (NEW)
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
- Supabase

---

## Acceptance Criteria
1. CoverageDashboard displays overall coverage percentage
2. Summary stats show total criteria, tested, passed, failed
3. Heat map shows phases color-coded by coverage (green/yellow/red)
4. Sort buttons change order by phase number, coverage, or passed count
5. Detailed table shows per-phase metrics
6. Coverage progress bar displays visually in table
7. Export Report button generates markdown file
8. Hover over heat map tile shows percentage tooltip
9. Coverage calculation is correct (tested / total * 100)
10. Dashboard updates when test results change

---

## Testing Instructions
1. Render CoverageDashboard with sample phase metrics
2. Verify overall coverage calculation
3. Test sort by coverage (highest first)
4. Test sort by passed count
5. Check heat map colors match coverage levels
6. Click Export Report and verify download
7. Test with 0%, 50%, 100% coverage phases
8. Verify detailed table metrics accuracy
9. Test responsive layout on mobile
10. Test performance with 157 phases

---

## Notes for the AI Agent
- Generate markdown report with summaries
- Highlight low-coverage phases (< 50%)
- Link to phase details from table
- Add trend analysis (coverage over time)
