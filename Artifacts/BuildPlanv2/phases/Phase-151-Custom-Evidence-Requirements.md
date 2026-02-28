# Phase 151 — Custom Evidence Requirements

## Objective
Configure what evidence is required per step. Options: text (min length), file (allowed types, min count), URL (validation pattern), checklist (required items). Build admin UI for configuration and validation engine at runtime.

## Prerequisites
- Phase 149 — Custom Stage and Step Definitions — Step definition structure
- Phase 135 — Core Helix Process Engine — Evidence system

## Epic Context
**Epic:** 19 — Process Customization & Advanced
**Phase:** 151 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Different steps require different evidence. A design review needs design documents. A test step needs test results. Rather than hard-coded evidence rules, let organizations configure what evidence each step requires. The system validates evidence at submission time.

---

## Detailed Requirements

### 1. Evidence Validation Service
#### File: `lib/helix/evidenceValidation.ts` (NEW)
```typescript
export interface EvidenceRequirement {
  stepId: string;
  type: 'text' | 'file' | 'url' | 'checklist';
  required: boolean;

  // For text
  minLength?: number;
  maxLength?: number;

  // For file
  allowedTypes?: string[];
  minCount?: number;
  maxCount?: number;

  // For URL
  urlPattern?: string;

  // For checklist
  checklistItems?: string[];
}

export interface EvidenceSubmission {
  stepId: string;
  type: 'text' | 'file' | 'url' | 'checklist';
  content?: string;
  files?: Array<{ name: string; type: string; size: number }>;
  url?: string;
  checklist?: Record<string, boolean>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEvidence(
  submission: EvidenceSubmission,
  requirement: EvidenceRequirement
): ValidationResult {
  const errors: string[] = [];

  if (requirement.type === 'text') {
    if (!submission.content) {
      if (requirement.required) {
        errors.push('Text evidence is required');
      }
      return { valid: errors.length === 0, errors };
    }

    if (requirement.minLength && submission.content.length < requirement.minLength) {
      errors.push(`Text must be at least ${requirement.minLength} characters`);
    }
    if (requirement.maxLength && submission.content.length > requirement.maxLength) {
      errors.push(`Text must be at most ${requirement.maxLength} characters`);
    }
  }

  if (requirement.type === 'file') {
    if (!submission.files || submission.files.length === 0) {
      if (requirement.required) {
        errors.push('File evidence is required');
      }
      return { valid: errors.length === 0, errors };
    }

    const minCount = requirement.minCount || 1;
    const maxCount = requirement.maxCount || 10;

    if (submission.files.length < minCount) {
      errors.push(`At least ${minCount} file(s) required`);
    }
    if (submission.files.length > maxCount) {
      errors.push(`At most ${maxCount} file(s) allowed`);
    }

    if (requirement.allowedTypes) {
      submission.files.forEach((file) => {
        if (!requirement.allowedTypes!.includes(file.type)) {
          errors.push(`File type ${file.type} not allowed. Allowed: ${requirement.allowedTypes!.join(', ')}`);
        }
      });
    }
  }

  if (requirement.type === 'url') {
    if (!submission.url) {
      if (requirement.required) {
        errors.push('URL evidence is required');
      }
      return { valid: errors.length === 0, errors };
    }

    if (requirement.urlPattern) {
      const regex = new RegExp(requirement.urlPattern);
      if (!regex.test(submission.url)) {
        errors.push(`URL does not match required pattern`);
      }
    }

    // Validate URL format
    try {
      new URL(submission.url);
    } catch {
      errors.push('Invalid URL format');
    }
  }

  if (requirement.type === 'checklist') {
    if (!submission.checklist || Object.keys(submission.checklist).length === 0) {
      if (requirement.required) {
        errors.push('Checklist evidence is required');
      }
      return { valid: errors.length === 0, errors };
    }

    if (requirement.checklistItems) {
      requirement.checklistItems.forEach((item) => {
        if (!submission.checklist![item]) {
          errors.push(`Checklist item required: "${item}"`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### 2. Evidence Requirements Configuration Component
#### File: `components/helix/admin/EvidenceRequirementConfig.tsx` (NEW)
```typescript
'use client';

import React, { useState } from 'react';

interface EvidenceRequirementConfigProps {
  step: any;
  onSave: (requirement: any) => void;
}

const EVIDENCE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'file', label: 'File Upload' },
  { value: 'url', label: 'URL' },
  { value: 'checklist', label: 'Checklist' },
];

export function EvidenceRequirementConfig({
  step,
  onSave,
}: EvidenceRequirementConfigProps) {
  const [requirement, setRequirement] = useState(step.evidenceRequirement || {
    type: 'text',
    required: true,
  });
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    onSave(requirement);
    setEditing(false);
  };

  const handleChange = (field: string, value: any) => {
    setRequirement({ ...requirement, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Current Requirement Summary */}
      {!editing && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">Evidence Required</p>
              <p className="text-sm text-blue-800 mt-1">
                Type: <span className="font-mono">{requirement.type}</span>
              </p>
              {requirement.minLength && (
                <p className="text-sm text-blue-800">Min Length: {requirement.minLength}</p>
              )}
              {requirement.minCount && (
                <p className="text-sm text-blue-800">Min Files: {requirement.minCount}</p>
              )}
              {requirement.checklistItems && (
                <p className="text-sm text-blue-800">
                  Checklist Items: {requirement.checklistItems.length}
                </p>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1 bg-blue-200 text-blue-700 rounded text-sm hover:bg-blue-300"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Evidence Configuration Form */}
      {editing && (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          {/* Evidence Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Evidence Type</label>
            <select
              value={requirement.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {EVIDENCE_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>

          {/* Required Checkbox */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={requirement.required !== false}
              onChange={(e) => handleChange('required', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Required</span>
          </label>

          {/* Type-Specific Fields */}
          {requirement.type === 'text' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Minimum Length</label>
                <input
                  type="number"
                  value={requirement.minLength || 0}
                  onChange={(e) => handleChange('minLength', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Maximum Length</label>
                <input
                  type="number"
                  value={requirement.maxLength || 0}
                  onChange={(e) => handleChange('maxLength', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </>
          )}

          {requirement.type === 'file' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Allowed File Types</label>
                <input
                  type="text"
                  value={(requirement.allowedTypes || []).join(', ')}
                  onChange={(e) =>
                    handleChange('allowedTypes', e.target.value.split(',').map(t => t.trim()))
                  }
                  placeholder="e.g., application/pdf, image/png"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Files</label>
                  <input
                    type="number"
                    value={requirement.minCount || 1}
                    onChange={(e) => handleChange('minCount', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Maximum Files</label>
                  <input
                    type="number"
                    value={requirement.maxCount || 10}
                    onChange={(e) => handleChange('maxCount', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </>
          )}

          {requirement.type === 'url' && (
            <div>
              <label className="block text-sm font-medium mb-2">URL Pattern (regex)</label>
              <input
                type="text"
                value={requirement.urlPattern || ''}
                onChange={(e) => handleChange('urlPattern', e.target.value)}
                placeholder="e.g., ^https://github\\.com/.*"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          )}

          {requirement.type === 'checklist' && (
            <div>
              <label className="block text-sm font-medium mb-2">Checklist Items (one per line)</label>
              <textarea
                value={(requirement.checklistItems || []).join('\n')}
                onChange={(e) =>
                  handleChange('checklistItems', e.target.value.split('\n').filter(l => l.trim()))
                }
                placeholder="Item 1\nItem 2\nItem 3"
                className="w-full px-3 py-2 border rounded-lg text-sm h-24"
              />
            </div>
          )}

          {/* Save/Cancel */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Save Configuration
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Evidence Validation API
#### File: `app/api/v1/helix/evidence/validate/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateEvidence } from '@/lib/helix/evidenceValidation';
import { verifyApiKey } from '@/lib/auth/apiKeys';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const verified = await verifyApiKey(apiKey);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const result = validateEvidence(body.submission, body.requirement);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Evidence validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Structure
```
lib/
└── helix/
    └── evidenceValidation.ts (NEW)
components/
└── helix/
    └── admin/
        └── EvidenceRequirementConfig.tsx (NEW)
app/
└── api/
    └── v1/
        └── helix/
            └── evidence/
                └── validate/
                    └── route.ts (NEW)
```

---

## Acceptance Criteria
1. Text evidence requires minimum/maximum length validation
2. File evidence requires type and count validation
3. URL evidence requires format and optional pattern validation
4. Checklist evidence requires all items to be checked
5. Admin UI allows configuring evidence per step
6. Validation engine returns detailed error messages
7. API endpoint validates evidence submissions
8. Validation is deterministic and repeatable
9. Evidence configuration stored with step definitions
10. Missing required evidence blocks step completion

---

## Testing Instructions
1. Configure text evidence with minLength=100
2. Submit text <100 chars, verify validation fails
3. Submit text >100 chars, verify validation passes
4. Configure file evidence with type=pdf, minCount=1
5. Submit non-pdf, verify rejected
6. Submit pdf, verify accepted
7. Configure checklist with 3 items
8. Submit incomplete checklist, verify rejected
9. Submit complete checklist, verify accepted
10. Call validation API, verify results correct

---

## Notes for the AI Agent
- Validation happens at step evidence submission
- Errors prevent step progression
- Consider file size limits in validation
- Pattern validation uses regex for maximum flexibility
- Future enhancement: dynamic evidence requirements based on conditions
