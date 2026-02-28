# Phase 111 — Deployment Readiness Gate

## Objective
Automated readiness check before deployment: verify all phases built, minimum test coverage met, no open critical bugs, deployment checklist complete. Calculate readiness score (0-100) and block deployment if critical items fail.

## Prerequisites
- Phase 110 — Environment Configuration Manager — provides configuration readiness
- Phase 108 — Test Report Generation — provides test coverage data
- Phase 106 — Bug Tracking Integration — provides bug data

## Epic Context
**Epic:** 13 — Deployment Pipeline — Steps 8.1-8.3 Enhancement
**Phase:** 111 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Deploying with untested code, open critical bugs, or missing configurations crashes production. Without automated readiness gates, engineers manually check dozens of items and miss critical failures. A readiness gate enforces deployment criteria before allowing release.

This phase builds ReadinessGate: checks phases built, test coverage meets threshold (configurable), no open critical bugs, all production configs set, deployment checklist complete. Shows readiness score and blocks deployment if critical checks fail.

---

## Detailed Requirements

### 1. Readiness Gate Service
#### File: `lib/helix/deployment/readiness.ts` (NEW)
Check deployment readiness and calculate score.

```typescript
export interface ReadinessCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  critical: boolean;
}

export interface ReadinessResult {
  score: number; // 0-100
  canDeploy: boolean;
  checks: ReadinessCheck[];
  estimatedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const checkDeploymentReadiness = async (
  projectId: string,
  projectData: any,
  phases: any[],
  testData: any,
  bugData: any[],
  configData: any[],
  checklistData: any[]
): Promise<ReadinessResult> => {
  const checks: ReadinessCheck[] = [];

  // Check 1: All phases built
  const builtPhases = phases.filter((p) => p.status === 'completed').length;
  const allPhasesBuilt = builtPhases === phases.length;
  checks.push({
    name: 'All Phases Built',
    status: allPhasesBuilt ? 'pass' : 'fail',
    message: `${builtPhases}/${phases.length} phases complete`,
    critical: true,
  });

  // Check 2: Test coverage threshold
  const coverageThreshold = projectData.coverageThreshold || 80;
  const coverage = testData.coverage || 0;
  const coverageMet = coverage >= coverageThreshold;
  checks.push({
    name: `Test Coverage (${coverageThreshold}%+)`,
    status: coverageMet ? 'pass' : coverage >= coverageThreshold - 10 ? 'warning' : 'fail',
    message: `Coverage: ${coverage}%`,
    critical: true,
  });

  // Check 3: No open critical bugs
  const criticalBugs = bugData.filter((b) => b.severity === 'critical' && b.status === 'open');
  checks.push({
    name: 'No Critical Bugs',
    status: criticalBugs.length === 0 ? 'pass' : 'fail',
    message: `${criticalBugs.length} open critical bugs`,
    critical: true,
  });

  // Check 4: No open high bugs
  const highBugs = bugData.filter((b) => b.severity === 'high' && b.status === 'open');
  checks.push({
    name: 'High Severity Bugs',
    status: highBugs.length === 0 ? 'pass' : highBugs.length <= 5 ? 'warning' : 'fail',
    message: `${highBugs.length} open high-severity bugs`,
    critical: false,
  });

  // Check 5: Production configs complete
  const requiredConfigs = configData.filter((c) => c.required);
  const missingConfigs = requiredConfigs.filter(
    (c) => c.production === undefined || c.production === ''
  );
  checks.push({
    name: 'Production Configs Set',
    status: missingConfigs.length === 0 ? 'pass' : 'fail',
    message: `${requiredConfigs.length - missingConfigs.length}/${requiredConfigs.length} configs set`,
    critical: true,
  });

  // Check 6: Deployment checklist complete
  const checklistItems = checklistData.filter((c) => c.critical);
  const completedItems = checklistItems.filter((c) => c.completed);
  checks.push({
    name: 'Critical Checklist Items',
    status: completedItems.length === checklistItems.length ? 'pass' : 'warning',
    message: `${completedItems.length}/${checklistItems.length} items complete`,
    critical: false,
  });

  // Check 7: Database migrations ready
  checks.push({
    name: 'Database Migrations',
    status: projectData.databaseReady ? 'pass' : 'warning',
    message: projectData.databaseReady ? 'Ready' : 'Pending review',
    critical: false,
  });

  // Calculate score
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const score = Math.round(
    (passCount / checks.length) * 100 - (warningCount / checks.length) * 10
  );

  // Determine if can deploy
  const criticalFailed = checks.filter((c) => c.critical && c.status === 'fail');
  const canDeploy = criticalFailed.length === 0;

  // Estimate risk level
  let estimatedRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (score < 50) estimatedRiskLevel = 'critical';
  else if (score < 70) estimatedRiskLevel = 'high';
  else if (score < 85) estimatedRiskLevel = 'medium';

  return {
    score: Math.max(0, Math.min(100, score)),
    canDeploy,
    checks,
    estimatedRiskLevel,
  };
};
```

### 2. Readiness Gate UI Component
#### File: `components/helix/deployment/ReadinessGate.tsx` (NEW)
Display readiness status and block deployment.

```typescript
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Lock } from 'lucide-react';

interface ReadinessResult {
  score: number;
  canDeploy: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    critical: boolean;
  }>;
  estimatedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ReadinessGateProps {
  projectId: string;
}

export const ReadinessGate: React.FC<ReadinessGateProps> = ({
  projectId,
}) => {
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadiness = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/deployment/readiness`
        );
        const data = await res.json();
        setResult(data.result);
      } catch (error) {
        console.error('Failed to fetch readiness:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReadiness();
  }, [projectId]);

  if (loading) {
    return <div className="text-slate-400">Checking deployment readiness...</div>;
  }

  if (!result) {
    return <div className="text-red-400">Failed to check readiness</div>;
  }

  const riskColors = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };

  const riskBgColors = {
    low: 'bg-green-900 border-green-700',
    medium: 'bg-yellow-900 border-yellow-700',
    high: 'bg-orange-900 border-orange-700',
    critical: 'bg-red-900 border-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Readiness Score */}
      <div
        className={`p-8 rounded-lg border-2 text-center ${
          riskBgColors[result.estimatedRiskLevel]
        }`}
      >
        <p className={`text-sm font-semibold mb-2 ${riskColors[result.estimatedRiskLevel]}`}>
          {result.estimatedRiskLevel.toUpperCase()} RISK
        </p>
        <p className="text-5xl font-bold text-white mb-2">{result.score}</p>
        <p className="text-white text-lg mb-4">Readiness Score</p>

        {result.canDeploy ? (
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors">
            Deploy to Production
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-white">
            <Lock size={24} />
            <span>Deployment Blocked</span>
          </div>
        )}
      </div>

      {/* Readiness Checks */}
      <div className="space-y-3">
        {result.checks.map((check) => {
          const Icon =
            check.status === 'pass'
              ? CheckCircle
              : check.status === 'fail'
                ? AlertCircle
                : AlertTriangle;
          const color =
            check.status === 'pass'
              ? 'text-green-400'
              : check.status === 'fail'
                ? 'text-red-400'
                : 'text-yellow-400';
          const bgColor =
            check.status === 'pass'
              ? 'bg-green-900 border-green-700'
              : check.status === 'fail'
                ? 'bg-red-900 border-red-700'
                : 'bg-yellow-900 border-yellow-700';

          return (
            <div
              key={check.name}
              className={`p-4 rounded-lg border-l-4 ${bgColor}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={color} size={20} />
                <div className="flex-1">
                  <p className="text-white font-semibold">{check.name}</p>
                  <p className="text-sm text-slate-300">{check.message}</p>
                </div>
                {check.critical && (
                  <span className="text-xs bg-red-600 text-white px-2 py-1 rounded font-bold">
                    CRITICAL
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deployment Status */}
      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-white mb-3">Deployment Status</h3>
        {result.canDeploy ? (
          <p className="text-green-300">
            All critical checks passed. Deployment is ready to proceed.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-red-300 font-semibold">Deployment cannot proceed:</p>
            <ul className="text-red-200 text-sm space-y-1 ml-4">
              {result.checks
                .filter((c) => c.critical && c.status === 'fail')
                .map((c) => (
                  <li key={c.name}>• {c.message}</li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## File Structure
```
lib/helix/deployment/
├── readiness.ts (NEW)

components/helix/deployment/
├── ReadinessGate.tsx (NEW)

app/api/helix/projects/[projectId]/
├── deployment/
│   └── readiness/route.ts (NEW)
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
1. ReadinessGate checks all phases built
2. ReadinessGate checks test coverage >= threshold
3. ReadinessGate checks no open critical bugs
4. ReadinessGate checks production configs complete
5. ReadinessGate checks deployment checklist
6. Readiness score calculates 0-100
7. Can deploy button appears only when all critical checks pass
8. Risk level shown (low/medium/high/critical)
9. Failed critical checks listed
10. Deploy button blocked with lock icon when not ready

---

## Testing Instructions
1. Check readiness with all checks passing (score = 100)
2. Fail one critical check and verify score/deploy block
3. Verify risk level color changes by score
4. Check with missing production config
5. Check with open critical bug
6. Check with low test coverage
7. Verify can deploy button enabled only when all critical pass
8. Test with different coverage thresholds
9. Verify each check message is accurate
10. Test score calculation with multiple failures

---

## Notes for the AI Agent
- Make readiness threshold configurable per project
- Store readiness history for trend tracking
- Alert team if readiness drops
- Integrate with deployment system
- Auto-block deployment if critical checks fail
