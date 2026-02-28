# Phase 114 — Production Monitoring Setup Guide

## Objective
Context-aware monitoring setup guide based on tech stack. Recommend tools: error tracking (Sentry), uptime (Pingdom), analytics (Vercel), logs (Supabase). Provide setup instructions per tool and verification checklist.

## Prerequisites
- Phase 113 — Deployment History and Rollback Tracking — provides deployment context
- Phase 089 — Project Brief (v1) — provides tech stack info

## Epic Context
**Epic:** 13 — Deployment Pipeline — Steps 8.1-8.3 Enhancement
**Phase:** 114 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
After deploying to production, visibility into health is critical. Without monitoring, downtime goes unnoticed and errors aren't caught. A monitoring setup guide tailored to the tech stack ensures proper instrumentation: error tracking, logging, uptime monitoring, performance analytics.

This phase builds MonitoringGuide: recommends monitoring tools based on tech stack, provides setup instructions, verification checklist, and links to dashboards.

---

## Detailed Requirements

### 1. Monitoring Guide Component
#### File: `components/helix/deployment/MonitoringGuide.tsx` (NEW)
Display monitoring setup instructions and verification.

```typescript
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, ExternalLink, Copy } from 'lucide-react';

interface MonitoringTool {
  name: string;
  category: 'errors' | 'uptime' | 'analytics' | 'logs' | 'performance';
  description: string;
  recommended: boolean;
  setupSteps: string[];
  verificationSteps: string[];
  dashboardUrl?: string;
  estimatedSetupTime: string;
  status?: 'configured' | 'pending' | 'not_configured';
}

interface MonitoringGuideProps {
  projectId: string;
  techStack: string;
}

export const MonitoringGuide: React.FC<MonitoringGuideProps> = ({
  projectId,
  techStack,
}) => {
  const [tools, setTools] = useState<MonitoringTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [completedTools, setCompletedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/deployment/monitoring-guide?techStack=${encodeURIComponent(
            techStack
          )}`
        );
        const data = await res.json();
        setTools(data.tools || []);
      } catch (error) {
        console.error('Failed to fetch monitoring guide:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [projectId, techStack]);

  const handleCompleteSetup = (toolName: string) => {
    const newSet = new Set(completedTools);
    newSet.add(toolName);
    setCompletedTools(newSet);
  };

  const categoryEmojis = {
    errors: '🚨',
    uptime: '⏱️',
    analytics: '📊',
    logs: '📝',
    performance: '⚡',
  };

  const categoryLabels = {
    errors: 'Error Tracking',
    uptime: 'Uptime Monitoring',
    analytics: 'Analytics',
    logs: 'Logging',
    performance: 'Performance',
  };

  const groupedTools = tools.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = [];
      acc[tool.category].push(tool);
      return acc;
    },
    {} as Record<string, MonitoringTool[]>
  );

  const completionPercent =
    tools.length > 0 ? ((completedTools.size / tools.length) * 100).toFixed(0) : '0';

  if (loading) {
    return <div className="text-slate-400">Loading monitoring setup guide...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Production Monitoring</h2>
        <span className="text-3xl font-bold text-cyan-400">{completionPercent}%</span>
      </div>

      {/* Completion Bar */}
      <div className="w-full bg-slate-700 rounded-full h-3">
        <div
          className="bg-cyan-500 h-3 rounded-full transition-all"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {/* Tools by Category */}
      <div className="space-y-8">
        {Object.entries(groupedTools).map(([category, categoryTools]) => (
          <div key={category}>
            <h3 className="text-xl font-bold text-white mb-4">
              {categoryEmojis[category as keyof typeof categoryEmojis]}{' '}
              {categoryLabels[category as keyof typeof categoryLabels]}
            </h3>

            <div className="space-y-3">
              {categoryTools.map((tool) => (
                <div
                  key={tool.name}
                  className={`p-4 rounded-lg border-l-4 transition-all ${
                    completedTools.has(tool.name)
                      ? 'bg-green-900 border-green-700'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <button
                    onClick={() =>
                      setExpandedTool(
                        expandedTool === tool.name ? null : tool.name
                      )
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white">
                          {tool.name}
                        </h4>
                        <p className="text-sm text-slate-300 mt-1">
                          {tool.description}
                        </p>
                        {tool.recommended && (
                          <span className="inline-block mt-2 text-xs bg-cyan-600 text-white px-2 py-1 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {completedTools.has(tool.name) ? (
                          <CheckCircle className="text-green-400" size={24} />
                        ) : (
                          <Circle className="text-slate-500" size={24} />
                        )}
                        <span className="text-slate-400">
                          {expandedTool === tool.name ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  </button>

                  {expandedTool === tool.name && (
                    <div className="mt-4 space-y-4 border-t border-slate-700 pt-4">
                      {/* Setup Steps */}
                      <div>
                        <h5 className="font-semibold text-white mb-2">Setup Steps</h5>
                        <ol className="space-y-2 text-sm text-slate-300">
                          {tool.setupSteps.map((step, idx) => (
                            <li key={idx} className="ml-4">
                              {idx + 1}. {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Verification Steps */}
                      <div>
                        <h5 className="font-semibold text-white mb-2">
                          Verification Checklist
                        </h5>
                        <ul className="space-y-2 text-sm text-slate-300">
                          {tool.verificationSteps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-1 accent-cyan-500"
                              />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Dashboard Link */}
                      {tool.dashboardUrl && (
                        <a
                          href={tool.dashboardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <ExternalLink size={16} />
                          Open Dashboard
                        </a>
                      )}

                      {/* Mark Complete */}
                      {!completedTools.has(tool.name) && (
                        <button
                          onClick={() => handleCompleteSetup(tool.name)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded transition-colors"
                        >
                          Mark as Complete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Setup Summary */}
      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-white mb-3">Setup Summary</h3>
        <p className="text-slate-300 mb-4">
          You've completed {completedTools.size} of {tools.length} monitoring tools.
        </p>
        {completedTools.size === tools.length && (
          <div className="bg-green-900 border-l-4 border-green-600 p-4 rounded">
            <p className="text-green-100">
              ✓ All monitoring tools configured! Your production environment is ready.
            </p>
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
components/helix/deployment/
├── MonitoringGuide.tsx (NEW)

lib/helix/deployment/
├── monitoring-guide.ts (NEW)

app/api/helix/projects/[projectId]/
├── deployment/
│   └── monitoring-guide/route.ts (NEW)
```

---

## Dependencies
- lucide-react (icons)
- Anthropic Claude API (optional for guide generation)

---

## Tech Stack for This Phase
- TypeScript
- React
- Next.js

---

## Acceptance Criteria
1. MonitoringGuide displays recommended tools by category
2. Tools filtered by tech stack (Next.js/Supabase recommendations)
3. Expandable sections show setup steps per tool
4. Verification checklist with checkboxes
5. Dashboard links open to external tools
6. Mark as Complete button tracks progress
7. Completion percentage updates in real-time
8. All recommended tools displayed first
9. Setup time estimated per tool
10. Summary shows total completion

---

## Testing Instructions
1. Render guide with Next.js/Supabase tech stack
2. Verify recommended tools appear
3. Expand tool and verify setup steps display
4. Click Mark Complete and verify progress
5. Verify completion percentage updates
6. Test with different tech stacks
7. Verify dashboard links are valid
8. Check verification checklist works
9. Test with all tools completed
10. Reload page and verify completion state persists

---

## Notes for the AI Agent
- Generate recommendations based on tech stack
- Provide copy-paste setup commands
- Link to official documentation
- Auto-detect if tools already configured
- Send alerts when monitoring detects issues
