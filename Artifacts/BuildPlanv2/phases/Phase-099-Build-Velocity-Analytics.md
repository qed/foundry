# Phase 099 — Build Velocity Analytics

## Objective
Track phase duration metrics, calculate velocity (phases completed per day/week), and visualize burndown chart showing remaining phases. Provide estimated completion date based on historical velocity.

## Prerequisites
- Phase 093 — Build Session Tracking — provides session duration data
- Phase 095 — Build Progress Real-Time Updates — provides live phase completions

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 099 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Without velocity metrics, it's impossible to estimate when the build will complete. How fast are phases completing? Are we accelerating or slowing? With 157 phases, tracking progress visually helps maintain momentum and plan resource allocation.

This phase builds VelocityAnalytics: calculates average phase duration, tracks velocity over time, generates burndown chart, and provides completion estimates. Dashboard shows key metrics: average time per phase, phases per day, estimated finish date.

---

## Detailed Requirements

### 1. Velocity Analytics Service
#### File: `lib/helix/analytics.ts` (NEW)
Core logic for calculating velocity metrics.

```typescript
import { Database } from '@/lib/database.types';

export interface VelocityMetrics {
  totalPhases: number;
  completedPhases: number;
  remainingPhases: number;
  averagePhaseDuration: number; // seconds
  completionRate: number; // phases per day
  estimatedCompletionDate: Date;
  burndownData: BurndownPoint[];
  velocityTrend: VelocityPoint[];
}

export interface BurndownPoint {
  date: string;
  phasesRemaining: number;
  idealRemaining: number;
}

export interface VelocityPoint {
  week: string;
  phasesCompleted: number;
  averageDuration: number;
}

export const calculateVelocityMetrics = async (
  projectId: string,
  phases: any[],
  completedPhases: any[]
): Promise<VelocityMetrics> => {
  const totalPhases = phases.length;
  const completed = completedPhases.length;
  const remaining = totalPhases - completed;

  // Calculate average phase duration
  const durations = completedPhases
    .map((p) => {
      if (p.started_at && p.completed_at) {
        return (
          new Date(p.completed_at).getTime() -
          new Date(p.started_at).getTime()
        ) / 1000;
      }
      return 0;
    })
    .filter((d) => d > 0);

  const averagePhaseDuration =
    durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0;

  // Calculate completion rate (phases per day)
  const oldestCompletion = new Date(
    Math.min(...completedPhases.map((p) => new Date(p.completed_at).getTime()))
  );
  const daysSinceStart = (Date.now() - oldestCompletion.getTime()) / (1000 * 60 * 60 * 24);
  const completionRate = daysSinceStart > 0 ? completed / daysSinceStart : 0;

  // Estimate completion date
  const daysUntilCompletion =
    completionRate > 0 ? remaining / completionRate : remaining * (averagePhaseDuration / (24 * 3600));
  const estimatedCompletionDate = new Date(
    Date.now() + daysUntilCompletion * 24 * 60 * 60 * 1000
  );

  // Generate burndown data
  const burndownData = generateBurndownData(completedPhases, remaining, totalPhases);

  // Generate velocity trend
  const velocityTrend = generateVelocityTrend(completedPhases);

  return {
    totalPhases,
    completedPhases: completed,
    remainingPhases: remaining,
    averagePhaseDuration,
    completionRate,
    estimatedCompletionDate,
    burndownData,
    velocityTrend,
  };
};

const generateBurndownData = (
  completedPhases: any[],
  remaining: number,
  total: number
): BurndownPoint[] => {
  const data: BurndownPoint[] = [];
  const startDate = new Date(
    Math.min(...completedPhases.map((p) => new Date(p.started_at).getTime()))
  );

  for (let i = 0; i <= 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const completedByDate = completedPhases.filter((p) => {
      const completedDate = new Date(p.completed_at);
      return completedDate <= date;
    }).length;

    const phasesRemaining = total - completedByDate;
    const idealRemaining = Math.max(0, total - (i * (total / 30)));

    data.push({
      date: date.toISOString().split('T')[0],
      phasesRemaining: Math.max(0, phasesRemaining),
      idealRemaining: Math.max(0, idealRemaining),
    });
  }

  return data;
};

const generateVelocityTrend = (completedPhases: any[]): VelocityPoint[] => {
  const weeklyData = new Map<string, any[]>();

  completedPhases.forEach((phase) => {
    const date = new Date(phase.completed_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const week = weekStart.toISOString().split('T')[0];

    if (!weeklyData.has(week)) {
      weeklyData.set(week, []);
    }
    weeklyData.get(week)!.push(phase);
  });

  return Array.from(weeklyData.entries())
    .map(([week, phases]) => {
      const durations = phases
        .map((p) => {
          if (p.started_at && p.completed_at) {
            return (
              new Date(p.completed_at).getTime() -
              new Date(p.started_at).getTime()
            ) / 1000;
          }
          return 0;
        })
        .filter((d) => d > 0);

      return {
        week,
        phasesCompleted: phases.length,
        averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0,
      };
    })
    .sort((a, b) => a.week.localeCompare(b.week));
};
```

### 2. Velocity Analytics Dashboard Component
#### File: `components/helix/build/VelocityAnalytics.tsx` (NEW)
Display metrics and charts.

```typescript
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Calendar, Zap } from 'lucide-react';

interface VelocityAnalyticsProps {
  projectId: string;
}

export const VelocityAnalytics: React.FC<VelocityAnalyticsProps> = ({
  projectId,
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/analytics/velocity`
        );
        const data = await res.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch velocity metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [projectId]);

  if (loading || !metrics) {
    return <div className="text-slate-400">Loading analytics...</div>;
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const progressPercent = (metrics.completedPhases / metrics.totalPhases) * 100;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300">Completion Rate</h3>
            <TrendingUp className="text-cyan-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">
            {metrics.completionRate.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">phases per day</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300">Avg Duration</h3>
            <Zap className="text-yellow-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">
            {formatDuration(metrics.averagePhaseDuration)}
          </p>
          <p className="text-xs text-slate-400 mt-1">per phase</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300">Est. Completion</h3>
            <Calendar className="text-green-400" size={20} />
          </div>
          <p className="text-lg font-bold text-white">
            {new Date(metrics.estimatedCompletionDate).toLocaleDateString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {Math.ceil(
              (new Date(metrics.estimatedCompletionDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )}{' '}
            days remaining
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-800 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Overall Progress</h3>
          <span className="text-sm font-bold text-cyan-400">
            {metrics.completedPhases} / {metrics.totalPhases}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className="bg-cyan-500 h-3 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">{progressPercent.toFixed(1)}% complete</p>
      </div>

      {/* Burndown Chart */}
      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Burndown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.burndownData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="phasesRemaining"
              stroke="#ef4444"
              name="Actual"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="idealRemaining"
              stroke="#94a3b8"
              strokeDasharray="5 5"
              name="Ideal"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Velocity Trend */}
      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Weekly Velocity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.velocityTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="week" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="phasesCompleted" fill="#06b6d4" name="Phases Completed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

---

## File Structure
```
lib/helix/
├── analytics.ts (NEW)

components/helix/build/
├── VelocityAnalytics.tsx (NEW)

app/api/helix/projects/[projectId]/
├── analytics/
│   └── velocity/route.ts (NEW)
```

---

## Dependencies
- recharts (charts)
- lucide-react (icons)
- TypeScript

---

## Tech Stack for This Phase
- TypeScript
- React
- Recharts
- Next.js

---

## Acceptance Criteria
1. Completion rate badge shows phases per day
2. Average duration shows in hours and minutes
3. Estimated completion date calculates correctly
4. Progress bar width matches completion percentage
5. Burndown chart shows actual vs ideal remaining phases
6. Velocity trend bar chart shows phases per week
7. All metrics update when new phases complete
8. Chart tooltips display on hover
9. Metrics are calculated correctly from session data
10. All charts responsive and readable on mobile

---

## Testing Instructions
1. Create sample phase completion data spanning weeks
2. Calculate velocity metrics and verify math
3. Verify burndown chart matches expected shape
4. Test with constant velocity (all phases same duration)
5. Test with accelerating/decelerating velocity
6. Verify estimated completion date is reasonable
7. Test progress bar updates as phases complete
8. Verify charts are readable with 157 data points
9. Test with edge cases (0 completed, all completed)
10. Performance test with large datasets

---

## Notes for the AI Agent
- Use Recharts shared tooltip for better UX
- Consider projecting different velocity scenarios
- Add export analytics as PDF/CSV
- Link to phase details when clicking burndown points
