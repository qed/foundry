# Phase 096 — Commit Tracking Integration

## Objective
Enable manual commit entry and optional GitHub webhook integration to track commits associated with each build phase. Display commit history per phase with links to GitHub and commit count badges.

## Prerequisites
- Phase 095 — Build Progress Real-Time Updates — provides realtime phase status tracking
- Phase 093 — Build Session Tracking — links commits to sessions

## Epic Context
**Epic:** 11 — Build Phase Management — Step 6.1 Enhancement
**Phase:** 096 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Commits are the ground truth of code changes, but they're currently disconnected from phase tracking. Engineers must manually map which commits correspond to which phases, making it hard to trace what was built for each phase and associate code changes with requirements.

This phase adds commit tracking: engineers can manually paste commit hashes, or a GitHub webhook can auto-capture commits. Each phase shows a commit history with links to GitHub, and commit counts are displayed as badges.

---

## Detailed Requirements

### 1. Commit Tracker Component
#### File: `components/helix/build/CommitTracker.tsx` (NEW)
UI for adding commits and viewing commit history per phase.

```typescript
import React, { useState, useEffect } from 'react';
import { Git, Plus, ExternalLink, Copy, Trash2 } from 'lucide-react';
import { useCommitTracking } from '@/hooks/useCommitTracking';

interface CommitTrackerProps {
  projectId: string;
  phaseNumber: number;
  repoUrl?: string;
}

export const CommitTracker: React.FC<CommitTrackerProps> = ({
  projectId,
  phaseNumber,
  repoUrl,
}) => {
  const { commits, loading, addCommit, removeCommit } = useCommitTracking(
    projectId,
    phaseNumber
  );

  const [commitHash, setCommitHash] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [filesList, setFilesList] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddCommit = async () => {
    if (!commitHash.trim()) return;

    await addCommit({
      hash: commitHash,
      message: commitMessage,
      filesModified: filesList
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    });

    setCommitHash('');
    setCommitMessage('');
    setFilesList('');
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(hash);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getGitHubUrl = (hash: string) => {
    if (!repoUrl) return null;
    const cleanUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
    return `${cleanUrl}/commit/${hash}`;
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Git size={20} />
          Commits
        </h3>
        {commits.length > 0 && (
          <span className="bg-cyan-500 text-slate-900 text-xs font-bold px-2 py-1 rounded">
            {commits.length}
          </span>
        )}
      </div>

      {/* Add Commit Form */}
      <div className="bg-slate-700 p-4 rounded space-y-3">
        <div>
          <label className="block text-sm font-medium text-white mb-1">Commit Hash</label>
          <input
            type="text"
            value={commitHash}
            onChange={(e) => setCommitHash(e.target.value)}
            placeholder="abc123def456..."
            className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Commit Message</label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Implement feature..."
            className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Files Changed (one per line)</label>
          <textarea
            value={filesList}
            onChange={(e) => setFilesList(e.target.value)}
            placeholder="src/components/Foo.tsx&#10;lib/bar.ts"
            rows={3}
            className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <button
          onClick={handleAddCommit}
          disabled={loading || !commitHash.trim()}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Add Commit
        </button>
      </div>

      {/* Commits List */}
      {commits.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {commits.map((commit) => (
            <div key={commit.id} className="bg-slate-700 p-3 rounded text-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="font-mono text-cyan-400 text-xs">
                      {commit.hash.substring(0, 7)}
                    </code>
                    <button
                      onClick={() => handleCopyHash(commit.hash)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedId === commit.hash ? (
                        'Copied'
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  {commit.message && (
                    <p className="text-slate-300 text-xs mb-1">{commit.message}</p>
                  )}
                  {commit.filesModified && commit.filesModified.length > 0 && (
                    <p className="text-slate-500 text-xs">{commit.filesModified.length} files</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {getGitHubUrl(commit.hash) && (
                    <a
                      href={getGitHubUrl(commit.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => removeCommit(commit.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {commits.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-4">No commits tracked for this phase</p>
      )}
    </div>
  );
};
```

### 2. Commit Tracking Hook
#### File: `hooks/useCommitTracking.ts` (NEW)
Hook for commit operations.

```typescript
import { useState, useCallback, useEffect } from 'react';

export const useCommitTracking = (projectId: string, phaseNumber: number) => {
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCommits = async () => {
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/phases/${phaseNumber}/commits`
        );
        const data = await res.json();
        setCommits(data.commits || []);
      } catch (error) {
        console.error('Failed to fetch commits:', error);
      }
    };

    fetchCommits();
  }, [projectId, phaseNumber]);

  const addCommit = useCallback(
    async (commitData: { hash: string; message: string; filesModified: string[] }) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/helix/projects/${projectId}/phases/${phaseNumber}/commits`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commitData),
          }
        );
        const data = await res.json();
        setCommits([data.commit, ...commits]);
      } catch (error) {
        console.error('Failed to add commit:', error);
      } finally {
        setLoading(false);
      }
    },
    [projectId, phaseNumber, commits]
  );

  const removeCommit = useCallback(
    async (commitId: string) => {
      try {
        await fetch(
          `/api/helix/projects/${projectId}/phases/${phaseNumber}/commits/${commitId}`,
          { method: 'DELETE' }
        );
        setCommits((prev) => prev.filter((c) => c.id !== commitId));
      } catch (error) {
        console.error('Failed to remove commit:', error);
      }
    },
    [projectId, phaseNumber]
  );

  return {
    commits,
    loading,
    addCommit,
    removeCommit,
  };
};
```

### 3. GitHub Webhook Handler
#### File: `app/api/helix/webhooks/github/route.ts` (NEW)
Accept GitHub push webhook events and auto-capture commits.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const verifyGitHubSignature = (payload: string, signature: string): boolean => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === `sha256=${hash}`;
};

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('x-hub-signature-256') || '';

  if (!verifyGitHubSignature(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const event = JSON.parse(payload);

    if (event.action === 'opened' && event.pull_request) {
      const pr = event.pull_request;
      const commits = pr.commits;

      for (const commit of commits) {
        // Auto-capture commits from PR
        await supabase.from('helix_commits').insert({
          hash: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author.name,
          url: commit.html_url,
          createdAt: commit.commit.author.date,
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
```

---

## File Structure
```
components/helix/build/
├── CommitTracker.tsx (NEW)

hooks/
├── useCommitTracking.ts (NEW)

app/api/helix/projects/[projectId]/phases/[phaseNumber]/
├── commits/
│   ├── route.ts (NEW)
│   └── [commitId]/route.ts (NEW)

app/api/helix/webhooks/
├── github/
│   └── route.ts (NEW)
```

---

## Dependencies
- crypto (Node.js)
- Supabase
- lucide-react (icons)

---

## Tech Stack for This Phase
- TypeScript
- React
- Next.js
- Supabase
- GitHub API

---

## Acceptance Criteria
1. CommitTracker component renders commit form and history list
2. Adding commit with hash saves to database
3. Commit message and files list are optional but captured
4. Commit hash is displayed truncated to 7 chars
5. Copy button copies full hash and shows "Copied" feedback
6. GitHub URLs are generated correctly from repo URL
7. External link button opens GitHub commit page
8. Delete button removes commit from list
9. Commit count badge displays total commits
10. GitHub webhook validates signature correctly

---

## Testing Instructions
1. Render CommitTracker and add a commit manually
2. Verify commit appears in history list immediately
3. Copy commit hash and paste to verify correctness
4. Test GitHub link generation with sample repo URL
5. Click external link and verify navigation
6. Delete a commit and verify removal
7. Test API endpoint with valid commit data
8. Test webhook with valid GitHub signature
9. Test webhook rejects invalid signatures
10. Verify commits persist across page refresh

---

## Notes for the AI Agent
- Store GitHub repo URL in project settings
- Consider auto-populating commit message from GitHub API
- Add commit search/filter functionality
- Link commits to specific acceptance criteria
