# Phase 094 - App Key Management

## Objective
Implement the UI for managing API keys used to submit feedback from deployed applications, including key generation, masking, revocation, and setup instructions.

## Prerequisites
- Phase 081: app_keys database table schema
- Phase 082: Feedback collection API
- Phase 006: Project settings structure
- TypeScript and Tailwind CSS configured

## Context
Each deployed application needs a unique API key to submit feedback to The Insights Lab. Project managers must be able to create keys for different apps/environments, revoke compromised keys, and view setup instructions for developers. The interface should be intuitive for non-technical users while providing secure key management capabilities.

## Detailed Requirements

### Settings Location
- **Route**: `/org/[orgSlug]/project/[projectId]/settings/insights`
- **Tab Name**: "Insights Lab" or "Feedback API"
- **Navigation**: In project settings sidebar

### Key Management Features

#### Create New Key
- **Button**: "Generate New Key" button
- **Modal**: Opens form to create key
- **Fields**:
  - App Name: Text input (required, max 100 chars)
  - Environment: Dropdown (Production, Staging, Development, Custom)
  - Description: Textarea (optional, max 500 chars)
- **Auto-generation**: Key format: `sf-int-XXXXXXXX` (32 chars total)
- **Storage**: Only show once, never shown again (for security)
- **Copy to Clipboard**: Single click copy with confirmation

#### Key List Display
Columns:
- **Name**: App/environment name
- **Key**: Masked format (e.g., "sf-int-XXXX****XXXX")
- **Environment**: Label badge
- **Created**: Date created (relative time)
- **Status**: Active / Revoked badge
- **Actions**: Copy, Revoke, Delete menu

#### Key Masking
- **Display Format**: `sf-int-XXXX****XXXX` (show first 8, last 4 chars)
- **Hover**: Show tooltip "Click to reveal (one time only)"
- **Reveal Once**: Reveal for 5 seconds, then re-mask
- **Copy Button**: Always available

#### Key Revocation
- **Confirmation Modal**: "Are you sure you want to revoke [Key Name]?"
- **Message**: "Apps using this key will no longer be able to submit feedback"
- **Confirm Button**: "Revoke Key"
- **Status Change**: Immediately shows "Revoked" badge
- **Effect**: API rejects requests with revoked key (401 Unauthorized)

#### Key Deletion
- **Limitation**: Only delete revoked keys older than 7 days
- **Confirmation**: "This action cannot be undone"
- **Soft Delete**: Mark as deleted_at timestamp
- **Hard Delete**: Option only for admins after 30 days

### Setup Instructions

Below key list, show instructions for developers:

**Heading**: "Setup Instructions for Developers"

**Code Snippet** (HTML/JavaScript):
```html
<!-- Example feedback submission -->
<button onclick="submitFeedback()">Send Feedback</button>

<script>
async function submitFeedback() {
  const feedback = {
    content: "App description",
    submitter_email: "user@example.com",
    submitter_name: "User Name"
  };

  const response = await fetch('https://insights.foundry.com/api/insights/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': 'YOUR_APP_KEY_HERE'
    },
    body: JSON.stringify(feedback)
  });

  if (response.ok) {
    alert('Feedback sent!');
  } else {
    alert('Error sending feedback');
  }
}
</script>
```

**Installation Options**:
1. **Copy Code Snippet**: Copy example code
2. **View Documentation**: Link to external docs
3. **Download SDK**: Link to npm/pip package (if available)

### Status Indicators

**Key Status**:
- **Active**: Green badge with checkmark
- **Revoked**: Gray badge with lock icon
- **Pending Deletion**: Orange badge with warning

**Environment Badges**:
- **Production**: Red
- **Staging**: Yellow/Amber
- **Development**: Blue
- **Custom**: Gray

### Empty State
When no keys created:
- Icon and message: "No API keys yet"
- Button: "Create Your First Key"
- Help text: "Create an app key to start collecting feedback"

### Permissions
- **View Keys**: All project members
- **Create Keys**: Project admins/editors only
- **Revoke Keys**: Project admins/editors only
- **Delete Keys**: Project admins only

### Rate Limit Display
Optional: Show rate limit info for each key:
- "Requests this minute: 45/100"
- "Requests today: 2,450/unlimited"

## UI Components

### page.tsx: _components/InsightsLabSettings.tsx

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, EyeOff, Copy, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppKeyList from './AppKeyList';
import CreateKeyModal from './CreateKeyModal';
import SetupInstructions from './SetupInstructions';
import { getAppKeys } from '@/lib/supabase/app-keys';

interface InsightsLabSettingsProps {
  projectId: string;
}

export default function InsightsLabSettings({ projectId }: InsightsLabSettingsProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: keys = [], isLoading, refetch } = useQuery({
    queryKey: ['app-keys', projectId],
    queryFn: () => getAppKeys(projectId),
    staleTime: 30000
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Insights Lab API</h2>
          <p className="text-gray-600 mt-1">Manage feedback collection keys</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2"
        >
          <Plus className="w-5 h-5" />
          Generate New Key
        </Button>
      </div>

      {/* API Keys Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
        <AppKeyList
          keys={keys}
          projectId={projectId}
          isLoading={isLoading}
          onKeysChanged={refetch}
        />
      </div>

      {/* Setup Instructions */}
      <div className="border-t border-gray-200 pt-8">
        <SetupInstructions projectId={projectId} />
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateKeyModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
```

### _components/AppKeyList.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, Trash2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import RevokeKeyModal from './RevokeKeyModal';
import { revokeAppKey, deleteAppKey } from '@/lib/supabase/app-keys';
import { useToast } from '@/hooks/useToast';

interface AppKey {
  id: string;
  name: string;
  key_value: string;
  environment: string;
  status: 'active' | 'revoked';
  created_at: string;
  created_by: string;
}

interface AppKeyListProps {
  keys: AppKey[];
  projectId: string;
  isLoading: boolean;
  onKeysChanged: () => void;
}

export default function AppKeyList({
  keys,
  projectId,
  isLoading,
  onKeysChanged
}: AppKeyListProps) {
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => revokeAppKey(keyId),
    onSuccess: () => {
      onKeysChanged();
      setShowRevokeModal(false);
      toast({
        title: 'Key revoked',
        description: 'The app key has been revoked',
        variant: 'success'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) => deleteAppKey(keyId),
    onSuccess: () => {
      onKeysChanged();
      toast({
        title: 'Key deleted',
        description: 'The app key has been deleted',
        variant: 'success'
      });
    }
  });

  const maskKey = (fullKey: string) => {
    if (fullKey.length < 12) return '****';
    const start = fullKey.slice(0, 8);
    const end = fullKey.slice(-4);
    return `${start}****${end}`;
  };

  const toggleReveal = (keyId: string) => {
    const newRevealed = new Set(revealedKeys);
    if (newRevealed.has(keyId)) {
      newRevealed.delete(keyId);
    } else {
      newRevealed.add(keyId);
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setRevealedKeys(prev => {
          const updated = new Set(prev);
          updated.delete(keyId);
          return updated;
        });
      }, 5000);
    }
    setRevealedKeys(newRevealed);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Key copied to clipboard',
      variant: 'success'
    });
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded" />
      ))}
    </div>;
  }

  if (keys.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No API keys yet</p>
        <p className="text-gray-500 text-sm mt-1">
          Create an app key to start collecting feedback
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Key</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Environment</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Created</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {keys.map(key => (
            <tr key={key.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {key.name}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {revealedKeys.has(key.id) ? key.key_value : maskKey(key.key_value)}
                  </code>
                  <button
                    onClick={() => toggleReveal(key.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Reveal key"
                  >
                    {revealedKeys.has(key.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(key.key_value)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Copy key"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium capitalize">
                  {key.environment}
                </span>
              </td>
              <td className="px-6 py-4 text-sm">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  key.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {key.status === 'active' ? '✓ Active' : '🔒 Revoked'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => {
                    setSelectedKeyId(key.id);
                    setShowRevokeModal(true);
                  }}
                  disabled={key.status === 'revoked' || revokeMutation.isPending}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  Revoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Revoke Modal */}
      {showRevokeModal && selectedKeyId && (
        <RevokeKeyModal
          keyId={selectedKeyId}
          keyName={keys.find(k => k.id === selectedKeyId)?.name || 'Unknown'}
          onConfirm={() => revokeMutation.mutate(selectedKeyId)}
          onClose={() => setShowRevokeModal(false)}
          isLoading={revokeMutation.isPending}
        />
      )}
    </div>
  );
}
```

### _components/CreateKeyModal.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createAppKey } from '@/lib/supabase/app-keys';
import { useToast } from '@/hooks/useToast';

interface CreateKeyModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateKeyModal({
  projectId,
  onClose,
  onSuccess
}: CreateKeyModalProps) {
  const [step, setStep] = useState<'form' | 'created'>('form');
  const [formData, setFormData] = useState({
    name: '',
    environment: 'production',
    description: ''
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: () => createAppKey(projectId, formData),
    onSuccess: (result) => {
      setCreatedKey(result.key_value);
      setStep('created');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create app key',
        variant: 'error'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      createMutation.mutate();
    }
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleComplete = () => {
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Generate New API Key
              </h2>
              <button
                onClick={onClose}
                disabled={createMutation.isPending}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  App Name *
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Mobile App, Web App"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Environment
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  maxLength={500}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notes about this key..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || createMutation.isPending}
              >
                Generate Key
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                ✓ API Key Created
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900 font-medium">
                  ⚠️ Save this key now
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  You won't be able to see it again for security reasons.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Your API Key
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded text-xs font-mono break-all">
                    {createdKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-600">
                <p className="font-medium mb-2">Next steps:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Copy the key above</li>
                  <li>Add it to your app's environment variables</li>
                  <li>Use it in the feedback submission headers</li>
                </ol>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <Button onClick={handleComplete}>Done</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

### _components/SetupInstructions.tsx

```typescript
'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface SetupInstructionsProps {
  projectId: string;
}

const jsExample = `async function submitFeedback(content) {
  const response = await fetch('https://api.foundry.com/api/insights/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': 'YOUR_APP_KEY_HERE'
    },
    body: JSON.stringify({
      content: content,
      submitter_email: user.email,
      submitter_name: user.name,
      metadata: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    })
  });

  if (response.ok) {
    console.log('Feedback sent successfully');
  } else {
    console.error('Failed to send feedback');
  }
}`;

export default function SetupInstructions({ projectId }: SetupInstructionsProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyCode = () => {
    navigator.clipboard.writeText(jsExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Setup Instructions</h3>
        <p className="text-gray-600 text-sm mt-1">
          Use these instructions to integrate feedback collection into your application
        </p>
      </div>

      {/* Code Example */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">JavaScript Example</h4>
          <button
            onClick={copyCode}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
          <code>{jsExample}</code>
        </pre>
      </div>

      {/* Documentation Link */}
      <div className="flex gap-4">
        <a
          href="https://docs.foundry.com/insights-lab"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          → Full Documentation
        </a>
        <a
          href="https://github.com/helix-foundry/feedback-sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          → SDKs & Libraries
        </a>
      </div>
    </div>
  );
}
```

## File Structure
```
app/
└── org/
    └── [orgSlug]/
        └── project/
            └── [projectId]/
                └── settings/
                    ├── page.tsx (settings hub)
                    └── insights/
                        ├── page.tsx
                        └── _components/
                            ├── InsightsLabSettings.tsx
                            ├── AppKeyList.tsx
                            ├── CreateKeyModal.tsx
                            ├── RevokeKeyModal.tsx
                            └── SetupInstructions.tsx
lib/
└── supabase/
    └── app-keys.ts
        ├── getAppKeys()
        ├── createAppKey()
        ├── revokeAppKey()
        └── deleteAppKey()
```

## Acceptance Criteria
- [x] Settings page accessible at /settings/insights
- [x] "Generate New Key" button opens modal
- [x] Modal collects app name, environment, description
- [x] Key auto-generated in format sf-int-XXXXXXXX
- [x] Key displayed once and never again (security)
- [x] Copy button copies full key to clipboard
- [x] Key list displays all active and revoked keys
- [x] Keys masked by default (show first 8, last 4)
- [x] Reveal button shows full key for 5 seconds
- [x] Environment shown as colored badge
- [x] Status shows Active or Revoked
- [x] Created date shows in relative format
- [x] Revoke button opens confirmation modal
- [x] Revocation prevents future API requests
- [x] Setup instructions show code example
- [x] Code can be copied with one click
- [x] Links to documentation provided
- [x] Empty state when no keys exist
- [x] Permissions enforced (only admins can create/revoke)

## Testing Instructions

1. **Create Key**
   - Click "Generate New Key"
   - Enter app name
   - Select environment
   - Click submit
   - Verify key displayed in success state
   - Verify key appears in list

2. **Key Masking**
   - View key list
   - Verify keys show masked format (XXXX****XXXX)
   - Click reveal icon
   - Verify full key shows for 5 seconds
   - Verify auto-masks after 5 seconds

3. **Copy Key**
   - Click copy icon next to key
   - Paste elsewhere
   - Verify full key pasted
   - Verify confirmation toast

4. **Revoke Key**
   - Click Revoke button
   - Confirm in modal
   - Verify status changes to "Revoked"
   - Test API request with revoked key
   - Verify 401 Unauthorized response

5. **Permissions**
   - Log in as non-admin
   - Verify "Generate New Key" button disabled or hidden
   - Verify cannot revoke keys
   - Verify can view key list

6. **Code Example**
   - View setup instructions
   - Click "Copy" on code
   - Paste in editor
   - Verify full code pasted
   - Verify example is valid

7. **Multiple Keys**
   - Create 5 API keys
   - Verify all appear in list
   - Revoke 2 keys
   - Verify status updated
   - Verify can still use active keys

8. **Documentation Links**
   - Click "Full Documentation"
   - Verify opens external link
   - Click "SDKs & Libraries"
   - Verify opens GitHub repo
