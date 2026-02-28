# Phase 110 — Environment Configuration Manager

## Objective
Track environment configurations (dev, staging, production) as key-value pairs. Compare environments side-by-side highlighting differences. Flag missing configs in production and provide setup instructions.

## Prerequisites
- Phase 109 — Deployment Checklist Generator — provides deployment context
- Phase 089 — Project Brief (v1) — provides environment information

## Epic Context
**Epic:** 13 — Deployment Pipeline — Steps 8.1-8.3 Enhancement
**Phase:** 110 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Environment configuration is often scattered across .env files, deployment notes, and team memory. When deploying to production, engineers miss required configs, breaking the application. A centralized manager ensures all environments have proper configurations.

This phase builds EnvironmentManager: stores non-sensitive config key-value pairs per environment. Compares environments to highlight differences. Flags missing configs that should exist in production.

---

## Detailed Requirements

### 1. Environment Manager Component
#### File: `components/helix/deployment/EnvironmentManager.tsx` (NEW)
Manage and compare environment configurations.

```typescript
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';

interface ConfigItem {
  key: string;
  dev?: string;
  staging?: string;
  production?: string;
}

interface EnvironmentManagerProps {
  projectId: string;
}

export const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({
  projectId,
}) => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'edit' | 'compare'>('edit');
  const [newKey, setNewKey] = useState('');
  const [showValues, setShowValues] = useState(false);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/deployment/configs`
        );
        const data = await res.json();
        setConfigs(data.configs || []);
      } catch (error) {
        console.error('Failed to fetch configs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [projectId]);

  const handleAddConfig = () => {
    if (!newKey.trim()) return;
    const existing = configs.find((c) => c.key === newKey);
    if (!existing) {
      setConfigs([...configs, { key: newKey }]);
      setNewKey('');
    }
  };

  const handleUpdateConfig = (
    key: string,
    environment: 'dev' | 'staging' | 'production',
    value: string
  ) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.key === key
          ? { ...c, [environment]: value }
          : c
      )
    );
  };

  const handleDeleteConfig = (key: string) => {
    setConfigs((prev) => prev.filter((c) => c.key !== key));
  };

  const handleSaveConfigs = async () => {
    try {
      await fetch(`/api/helix/projects/${projectId}/deployment/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });
    } catch (error) {
      console.error('Failed to save configs:', error);
    }
  };

  const getMissingInProduction = () => {
    return configs.filter((c) => c.production === undefined || c.production === '');
  };

  const getDifferencesByEnvironment = (env: 'dev' | 'staging' | 'production') => {
    return configs.filter((c) => {
      const others = Object.entries(c)
        .filter(([k]) => k !== 'key' && k !== env)
        .map(([_, v]) => v);
      const current = c[env];
      return others.some((o) => o !== current);
    });
  };

  if (loading) {
    return <div className="text-slate-400">Loading configs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Environment Configuration</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowValues(!showValues)}
            className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded transition-colors flex items-center gap-2"
          >
            {showValues ? <EyeOff size={18} /> : <Eye size={18} />}
            {showValues ? 'Hide' : 'Show'} Values
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'edit' ? 'compare' : 'edit')}
            className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded transition-colors"
          >
            {viewMode === 'edit' ? 'Compare' : 'Edit'} View
          </button>
        </div>
      </div>

      {/* Missing Configs Alert */}
      {getMissingInProduction().length > 0 && (
        <div className="bg-orange-900 border-l-4 border-orange-600 p-4 rounded-lg">
          <p className="text-orange-100 font-semibold mb-2">
            Missing Configs in Production:
          </p>
          <ul className="text-orange-200 text-sm space-y-1">
            {getMissingInProduction().map((c) => (
              <li key={c.key}>• {c.key}</li>
            ))}
          </ul>
        </div>
      )}

      {viewMode === 'edit' ? (
        /* Edit Mode */
        <div className="space-y-4">
          {/* Add Config */}
          <div className="bg-slate-800 p-4 rounded-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="CONFIG_KEY"
                className="flex-1 bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                onClick={handleAddConfig}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Add
              </button>
            </div>
          </div>

          {/* Config Items */}
          <div className="space-y-3">
            {configs.map((config) => (
              <div key={config.key} className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{config.key}</h3>
                  <button
                    onClick={() => handleDeleteConfig(config.key)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {['dev', 'staging', 'production'].map((env) => (
                    <div key={env}>
                      <label className="block text-xs text-slate-400 mb-1 font-semibold">
                        {env.toUpperCase()}
                      </label>
                      <input
                        type={showValues ? 'text' : 'password'}
                        value={
                          config[env as keyof typeof config] || ''
                        }
                        onChange={(e) =>
                          handleUpdateConfig(
                            config.key,
                            env as 'dev' | 'staging' | 'production',
                            e.target.value
                          )
                        }
                        className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="(not set)"
                      />
                      {config[env as keyof typeof config] ===
                        undefined || config[env as keyof typeof config] === '' ? (
                        <p className="text-xs text-red-400 mt-1">Missing</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveConfigs}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded transition-colors"
          >
            Save All Configs
          </button>
        </div>
      ) : (
        /* Compare Mode */
        <div className="space-y-6">
          {['dev', 'staging', 'production'].map((env) => {
            const differences = getDifferencesByEnvironment(env as any);
            return (
              <div key={env} className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {env.toUpperCase()} Differences
                </h3>
                {differences.length === 0 ? (
                  <p className="text-slate-400 text-sm">No differences detected</p>
                ) : (
                  <div className="space-y-2">
                    {differences.map((c) => (
                      <div key={c.key} className="bg-slate-700 p-2 rounded text-sm">
                        <p className="font-mono text-white">{c.key}</p>
                        <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
                          <div>
                            <p className="text-slate-400">Dev:</p>
                            <p className="text-slate-300">{c.dev || '(not set)'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Staging:</p>
                            <p className="text-slate-300">{c.staging || '(not set)'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Production:</p>
                            <p className="text-slate-300">{c.production || '(not set)'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

---

## File Structure
```
components/helix/deployment/
├── EnvironmentManager.tsx (NEW)

app/api/helix/projects/[projectId]/
├── deployment/
│   └── configs/route.ts (NEW)
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
1. EnvironmentManager displays all config keys
2. Add Config form allows entering new key
3. Edit mode shows values for dev, staging, production
4. Show/hide button toggles value visibility
5. Missing configs in production are highlighted
6. Compare mode shows differences between environments
7. Configs can be deleted
8. Values can be saved to database
9. Missing configs alert displays at top
10. Compare view identifies which configs differ by environment

---

## Testing Instructions
1. Add new config key and verify appears in list
2. Enter values for dev, staging, production
3. Click Show Values and verify visibility
4. Toggle Hide Values and verify encryption
5. Test Compare view and verify differences highlight
6. Add missing production config and verify alert
7. Delete config and verify removal
8. Save configs and reload page, verify persistence
9. Test with 20+ configs for performance
10. Verify non-sensitive (no passwords) data only

---

## Notes for the AI Agent
- Never store sensitive data (passwords, API keys)
- Consider using Supabase Vault for secrets
- Link to secret management system
- Sync with actual deployment environment
