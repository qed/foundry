# PHASE 052 — Unit Tests for Helix MVP

## Objective
Write comprehensive Vitest unit tests covering all Helix MVP core logic. Achieve 40+ test cases covering happy paths, edge cases, error scenarios, and permission validation.

## Prerequisites
- Phase 001-051 completed (entire Helix MVP + polish + permissions)
- Vitest test framework configured
- Mock Supabase client available
- Test utilities and fixtures prepared

## Epic Context
**Epic 6 — MVP Polish & Cross-Cutting**
Phase 052 adds comprehensive test coverage for Helix. This cross-cutting concern ensures reliability, enables confident refactoring, and documents expected behavior.

## Context
The Helix MVP (Phases 001-051) includes complex logic:
- Gate check engine (validation rules, status transitions)
- Step data model (progression, locking, completion)
- Mode toggle (enabling/disabling Helix)
- Progress calculations (stage %, step %, duration)
- Evidence validation (type-specific rules)
- Export functions (ZIP generation, markdown)
- Permission checks (role-based access control)

This phase delivers unit tests covering:
- Core business logic (gate checks, step progression)
- Data models and calculations
- Permission validation
- Edge cases and error handling
- Evidence type handling
- Export functionality

## Detailed Requirements

### 1. Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/helix/**/*.ts', '!**/*.d.ts'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 2. Test Setup File
```typescript
// vitest.setup.ts
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
```

### 3. Gate Check Engine Tests
```typescript
// __tests__/helix/gate-check.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  canAdvanceToStep,
  validateGateCheck,
  evaluateGateConditions,
  GateCheckStatus,
} from '@/lib/helix/gate-check';
import { Step, Stage } from '@/types/helix';

describe('Gate Check Engine', () => {
  let testStage: Stage;
  let testSteps: Step[];

  beforeEach(() => {
    testSteps = [
      { key: 'step-1', name: 'Step 1', order: 1, completedAt: null },
      { key: 'step-2', name: 'Step 2', order: 2, completedAt: null },
      { key: 'step-3', name: 'Step 3', order: 3, completedAt: null },
    ] as Step[];

    testStage = {
      key: 'stage-1',
      name: 'Stage 1',
      steps: testSteps,
      completedAt: null,
    } as Stage;
  });

  describe('canAdvanceToStep', () => {
    it('should allow advancing to first step without prerequisites', () => {
      const result = canAdvanceToStep(testSteps[0], testSteps);
      expect(result).toBe(true);
    });

    it('should allow advancing to next step when previous step is complete', () => {
      testSteps[0].completedAt = new Date().toISOString();
      const result = canAdvanceToStep(testSteps[1], testSteps);
      expect(result).toBe(true);
    });

    it('should block advancing to next step when previous step is not complete', () => {
      const result = canAdvanceToStep(testSteps[1], testSteps);
      expect(result).toBe(false);
    });

    it('should allow returning to already-completed step', () => {
      testSteps[1].completedAt = new Date().toISOString();
      const result = canAdvanceToStep(testSteps[1], testSteps);
      expect(result).toBe(true);
    });

    it('should block advancing beyond last step', () => {
      testSteps.forEach((s, i) => {
        if (i < testSteps.length - 1) {
          s.completedAt = new Date().toISOString();
        }
      });
      const nonExistentStep = { key: 'step-99', name: 'Step 99', order: 99 } as Step;
      const result = canAdvanceToStep(nonExistentStep, testSteps);
      expect(result).toBe(false);
    });
  });

  describe('validateGateCheck', () => {
    it('should pass gate when all conditions met', () => {
      const conditions = [
        { key: 'test-1', label: 'Test 1', completed: true },
        { key: 'test-2', label: 'Test 2', completed: true },
      ];
      const result = validateGateCheck(conditions);
      expect(result.status).toBe('passed');
      expect(result.passed).toBe(true);
    });

    it('should fail gate when any condition not met', () => {
      const conditions = [
        { key: 'test-1', label: 'Test 1', completed: true },
        { key: 'test-2', label: 'Test 2', completed: false },
      ];
      const result = validateGateCheck(conditions);
      expect(result.status).toBe('failed');
      expect(result.passed).toBe(false);
      expect(result.failedItems).toContain('test-2');
    });

    it('should handle empty conditions array', () => {
      const result = validateGateCheck([]);
      expect(result.status).toBe('passed');
      expect(result.itemCount).toBe(0);
    });

    it('should calculate pass rate correctly', () => {
      const conditions = [
        { key: 'test-1', label: 'Test 1', completed: true },
        { key: 'test-2', label: 'Test 2', completed: false },
        { key: 'test-3', label: 'Test 3', completed: true },
        { key: 'test-4', label: 'Test 4', completed: false },
      ];
      const result = validateGateCheck(conditions);
      expect(result.passRate).toBe(0.5);
    });
  });

  describe('evaluateGateConditions', () => {
    it('should evaluate boolean conditions', () => {
      const condition = { type: 'boolean', value: true };
      const result = evaluateGateConditions([condition]);
      expect(result).toBe(true);
    });

    it('should evaluate aggregate conditions (AND)', () => {
      const conditions = [
        { type: 'aggregate', operator: 'AND', conditions: [{ type: 'boolean', value: true }, { type: 'boolean', value: true }] },
      ];
      const result = evaluateGateConditions(conditions);
      expect(result).toBe(true);
    });

    it('should fail aggregate AND when any sub-condition fails', () => {
      const conditions = [
        { type: 'aggregate', operator: 'AND', conditions: [{ type: 'boolean', value: true }, { type: 'boolean', value: false }] },
      ];
      const result = evaluateGateConditions(conditions);
      expect(result).toBe(false);
    });

    it('should evaluate aggregate conditions (OR)', () => {
      const conditions = [
        { type: 'aggregate', operator: 'OR', conditions: [{ type: 'boolean', value: false }, { type: 'boolean', value: true }] },
      ];
      const result = evaluateGateConditions(conditions);
      expect(result).toBe(true);
    });
  });
});
```

### 4. Step Data Model Tests
```typescript
// __tests__/helix/step-model.test.ts
import { describe, it, expect } from 'vitest';
import {
  getNextStep,
  isStepUnlocked,
  getStageProgress,
  calculateStepDuration,
  isStepOverdue,
} from '@/lib/helix/step-model';
import { Stage, Step } from '@/types/helix';

describe('Step Data Model', () => {
  const createTestSteps = (): Step[] => [
    {
      key: 'step-1',
      name: 'Step 1',
      order: 1,
      createdAt: new Date('2024-01-01').toISOString(),
      completedAt: new Date('2024-01-02').toISOString(),
    } as Step,
    {
      key: 'step-2',
      name: 'Step 2',
      order: 2,
      createdAt: new Date('2024-01-02').toISOString(),
      completedAt: null,
    } as Step,
    {
      key: 'step-3',
      name: 'Step 3',
      order: 3,
      createdAt: new Date('2024-01-03').toISOString(),
      completedAt: null,
    } as Step,
  ];

  describe('getNextStep', () => {
    it('should return first step when none started', () => {
      const steps = createTestSteps().map(s => ({ ...s, completedAt: null }));
      const next = getNextStep(steps);
      expect(next?.key).toBe('step-1');
    });

    it('should return next incomplete step', () => {
      const steps = createTestSteps();
      const next = getNextStep(steps);
      expect(next?.key).toBe('step-2');
    });

    it('should return null when all steps completed', () => {
      const steps = createTestSteps().map(s => ({
        ...s,
        completedAt: new Date().toISOString(),
      }));
      const next = getNextStep(steps);
      expect(next).toBeNull();
    });

    it('should return specific next step after given step', () => {
      const steps = createTestSteps();
      const next = getNextStep(steps, 'step-1');
      expect(next?.key).toBe('step-2');
    });
  });

  describe('isStepUnlocked', () => {
    it('should unlock first step', () => {
      const steps = createTestSteps();
      const result = isStepUnlocked(steps[0], steps);
      expect(result).toBe(true);
    });

    it('should unlock step when previous is complete', () => {
      const steps = createTestSteps();
      const result = isStepUnlocked(steps[1], steps);
      expect(result).toBe(true);
    });

    it('should lock step when previous incomplete', () => {
      const steps = createTestSteps().map(s => ({ ...s, completedAt: null }));
      const result = isStepUnlocked(steps[2], steps);
      expect(result).toBe(false);
    });

    it('should unlock completed step', () => {
      const steps = createTestSteps();
      const result = isStepUnlocked(steps[0], steps);
      expect(result).toBe(true);
    });
  });

  describe('getStageProgress', () => {
    it('should calculate 0% progress for no completed steps', () => {
      const steps = createTestSteps().map(s => ({ ...s, completedAt: null }));
      const progress = getStageProgress(steps);
      expect(progress).toBe(0);
    });

    it('should calculate 100% progress for all completed steps', () => {
      const steps = createTestSteps().map(s => ({
        ...s,
        completedAt: new Date().toISOString(),
      }));
      const progress = getStageProgress(steps);
      expect(progress).toBe(100);
    });

    it('should calculate 33% progress for 1 of 3 steps complete', () => {
      const steps = createTestSteps();
      const progress = getStageProgress(steps);
      expect(progress).toBeCloseTo(33.33, 1);
    });

    it('should handle empty step array', () => {
      const progress = getStageProgress([]);
      expect(progress).toBe(0);
    });
  });

  describe('calculateStepDuration', () => {
    it('should return null for incomplete step', () => {
      const step = createTestSteps()[1]; // Not completed
      const duration = calculateStepDuration(step);
      expect(duration).toBeNull();
    });

    it('should calculate duration for completed step', () => {
      const step = createTestSteps()[0]; // Completed on 2024-01-02
      const duration = calculateStepDuration(step);
      expect(duration).toBe(1); // 1 day
    });

    it('should handle same-day completion', () => {
      const now = new Date().toISOString();
      const step = {
        ...createTestSteps()[0],
        createdAt: now,
        completedAt: now,
      } as Step;
      const duration = calculateStepDuration(step);
      expect(duration).toBe(0);
    });
  });

  describe('isStepOverdue', () => {
    it('should not be overdue if deadline not set', () => {
      const step = createTestSteps()[1];
      const overdue = isStepOverdue(step);
      expect(overdue).toBe(false);
    });

    it('should not be overdue before deadline', () => {
      const step = {
        ...createTestSteps()[1],
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      } as Step;
      const overdue = isStepOverdue(step);
      expect(overdue).toBe(false);
    });

    it('should be overdue past deadline', () => {
      const step = {
        ...createTestSteps()[1],
        dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      } as Step;
      const overdue = isStepOverdue(step);
      expect(overdue).toBe(true);
    });
  });
});
```

### 5. Mode Toggle Tests
```typescript
// __tests__/helix/mode-toggle.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toggleHelixMode, isHelixModeEnabled } from '@/lib/helix/mode-toggle';

describe('Mode Toggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('toggleHelixMode', () => {
    it('should enable Helix mode when disabled', async () => {
      const result = await toggleHelixMode('project-1', true);
      expect(result.enabled).toBe(true);
    });

    it('should disable Helix mode when enabled', async () => {
      await toggleHelixMode('project-1', true);
      const result = await toggleHelixMode('project-1', false);
      expect(result.enabled).toBe(false);
    });

    it('should update timestamp on toggle', async () => {
      const before = new Date();
      const result = await toggleHelixMode('project-1', true);
      const after = new Date();
      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw error for invalid project key', async () => {
      await expect(toggleHelixMode('', true)).rejects.toThrow();
    });
  });

  describe('isHelixModeEnabled', () => {
    it('should return false when mode not enabled', async () => {
      const enabled = await isHelixModeEnabled('project-1');
      expect(enabled).toBe(false);
    });

    it('should return true after enabling mode', async () => {
      await toggleHelixMode('project-1', true);
      const enabled = await isHelixModeEnabled('project-1');
      expect(enabled).toBe(true);
    });
  });
});
```

### 6. Evidence Validation Tests
```typescript
// __tests__/helix/evidence-validation.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateEvidence,
  validateTextEvidence,
  validateChecklistEvidence,
  validateFileEvidence,
} from '@/lib/helix/evidence-validation';
import { Evidence } from '@/types/helix';

describe('Evidence Validation', () => {
  describe('validateTextEvidence', () => {
    it('should validate text evidence with content', () => {
      const evidence = {
        type: 'text',
        title: 'Test',
        content: 'This is test content',
      } as Evidence;
      const result = validateTextEvidence(evidence);
      expect(result.valid).toBe(true);
    });

    it('should reject text evidence without content', () => {
      const evidence = {
        type: 'text',
        title: 'Test',
        content: '',
      } as Evidence;
      const result = validateTextEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content is required');
    });

    it('should reject text evidence with only whitespace', () => {
      const evidence = {
        type: 'text',
        title: 'Test',
        content: '   \n\t  ',
      } as Evidence;
      const result = validateTextEvidence(evidence);
      expect(result.valid).toBe(false);
    });

    it('should validate content length >= 10 characters', () => {
      const evidence = {
        type: 'text',
        title: 'Test',
        content: 'Short',
      } as Evidence;
      const result = validateTextEvidence(evidence);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateChecklistEvidence', () => {
    it('should validate checklist with completed items', () => {
      const evidence = {
        type: 'checklist',
        title: 'Test Checklist',
        checklistItems: [
          { label: 'Item 1', completed: true },
          { label: 'Item 2', completed: true },
        ],
      } as Evidence;
      const result = validateChecklistEvidence(evidence);
      expect(result.valid).toBe(true);
    });

    it('should require at least one completed item', () => {
      const evidence = {
        type: 'checklist',
        title: 'Test Checklist',
        checklistItems: [
          { label: 'Item 1', completed: false },
          { label: 'Item 2', completed: false },
        ],
      } as Evidence;
      const result = validateChecklistEvidence(evidence);
      expect(result.valid).toBe(false);
    });

    it('should reject empty checklist', () => {
      const evidence = {
        type: 'checklist',
        title: 'Test Checklist',
        checklistItems: [],
      } as Evidence;
      const result = validateChecklistEvidence(evidence);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFileEvidence', () => {
    it('should validate file evidence with proper data', () => {
      const evidence = {
        type: 'file',
        title: 'Test File',
        fileName: 'test.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
      } as Evidence;
      const result = validateFileEvidence(evidence);
      expect(result.valid).toBe(true);
    });

    it('should reject file over max size', () => {
      const evidence = {
        type: 'file',
        title: 'Large File',
        fileName: 'large.zip',
        fileSize: 600 * 1024 * 1024, // 600MB
        fileType: 'application/zip',
      } as Evidence;
      const result = validateFileEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('500MB');
    });

    it('should validate allowed file types', () => {
      const evidence = {
        type: 'file',
        title: 'Executable',
        fileName: 'malware.exe',
        fileSize: 1024,
        fileType: 'application/exe',
      } as Evidence;
      const result = validateFileEvidence(evidence);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEvidence', () => {
    it('should validate any evidence type', () => {
      const textEvidence = {
        type: 'text',
        title: 'Test',
        content: 'This is valid content',
      } as Evidence;
      const result = validateEvidence(textEvidence);
      expect(result.valid).toBe(true);
    });

    it('should return errors for invalid evidence', () => {
      const invalidEvidence = {
        type: 'text',
        title: 'Test',
        content: '',
      } as Evidence;
      const result = validateEvidence(invalidEvidence);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
```

### 7. Permission Validation Tests
```typescript
// __tests__/helix/permissions.test.ts
import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
} from '@/lib/permissions/definitions';

describe('Permission System', () => {
  describe('hasPermission', () => {
    it('should grant TOGGLE_HELIX_MODE to LEADER', () => {
      const result = hasPermission('LEADER', 'TOGGLE_HELIX_MODE');
      expect(result.allowed).toBe(true);
    });

    it('should deny TOGGLE_HELIX_MODE to DEVELOPER', () => {
      const result = hasPermission('DEVELOPER', 'TOGGLE_HELIX_MODE');
      expect(result.allowed).toBe(false);
    });

    it('should grant COMPLETE_HELIX_STEP to DEVELOPER', () => {
      const result = hasPermission('DEVELOPER', 'COMPLETE_HELIX_STEP');
      expect(result.allowed).toBe(true);
    });

    it('should deny all Helix permissions to VIEWER except VIEW_HELIX_PROCESS', () => {
      expect(hasPermission('VIEWER', 'VIEW_HELIX_PROCESS').allowed).toBe(true);
      expect(hasPermission('VIEWER', 'COMPLETE_HELIX_STEP').allowed).toBe(false);
      expect(hasPermission('VIEWER', 'OVERRIDE_GATE_CHECK').allowed).toBe(false);
    });

    it('should deny all Helix permissions to GUEST', () => {
      expect(hasPermission('GUEST', 'VIEW_HELIX_PROCESS').allowed).toBe(false);
      expect(hasPermission('GUEST', 'COMPLETE_HELIX_STEP').allowed).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should allow when all permissions granted', () => {
      const result = hasAllPermissions('LEADER', [
        'TOGGLE_HELIX_MODE',
        'OVERRIDE_GATE_CHECK',
      ]);
      expect(result.allowed).toBe(true);
    });

    it('should deny when any permission missing', () => {
      const result = hasAllPermissions('DEVELOPER', [
        'COMPLETE_HELIX_STEP',
        'TOGGLE_HELIX_MODE', // Developer doesn't have this
      ]);
      expect(result.allowed).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should allow when at least one permission granted', () => {
      const result = hasAnyPermission('VIEWER', [
        'TOGGLE_HELIX_MODE',
        'VIEW_HELIX_PROCESS', // Viewer has this
      ]);
      expect(result.allowed).toBe(true);
    });

    it('should deny when no permissions granted', () => {
      const result = hasAnyPermission('GUEST', [
        'TOGGLE_HELIX_MODE',
        'OVERRIDE_GATE_CHECK',
      ]);
      expect(result.allowed).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return all LEADER permissions', () => {
      const permissions = getPermissionsForRole('LEADER');
      expect(permissions).toContain('TOGGLE_HELIX_MODE');
      expect(permissions).toContain('COMPLETE_HELIX_STEP');
      expect(permissions).toContain('OVERRIDE_GATE_CHECK');
    });

    it('should return limited VIEWER permissions', () => {
      const permissions = getPermissionsForRole('VIEWER');
      expect(permissions).toContain('VIEW_HELIX_PROCESS');
      expect(permissions).not.toContain('COMPLETE_HELIX_STEP');
    });
  });
});
```

### 8. Export Function Tests
```typescript
// __tests__/helix/export.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  generateTextEvidenceMd,
  generateChecklistEvidenceMd,
  sanitizeFileName,
  formatBytes,
} from '@/lib/helix/export';
import { Evidence } from '@/types/helix';

describe('Export Functions', () => {
  describe('generateTextEvidenceMd', () => {
    it('should generate markdown for text evidence', () => {
      const evidence = {
        type: 'text',
        title: 'Test Evidence',
        content: 'This is test content',
        createdAt: new Date('2024-01-01').toISOString(),
        createdBy: 'testuser',
      } as Evidence;

      const md = generateTextEvidenceMd(evidence);
      expect(md).toContain('# Text Evidence: Test Evidence');
      expect(md).toContain('This is test content');
      expect(md).toContain('testuser');
    });

    it('should include created date', () => {
      const evidence = {
        type: 'text',
        title: 'Test',
        content: 'Content',
        createdAt: new Date('2024-01-01').toISOString(),
      } as Evidence;

      const md = generateTextEvidenceMd(evidence);
      expect(md).toContain('Created:');
    });
  });

  describe('generateChecklistEvidenceMd', () => {
    it('should generate checklist markdown', () => {
      const evidence = {
        type: 'checklist',
        title: 'Test Checklist',
        checklistItems: [
          { label: 'Item 1', completed: true },
          { label: 'Item 2', completed: false },
        ],
        createdAt: new Date('2024-01-01').toISOString(),
      } as Evidence;

      const md = generateChecklistEvidenceMd(evidence);
      expect(md).toContain('# Checklist Evidence: Test Checklist');
      expect(md).toContain('[x] Item 1');
      expect(md).toContain('[ ] Item 2');
      expect(md).toContain('Completion: 1 / 2');
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize filename', () => {
      const result = sanitizeFileName('Test File (2024) #1.pdf');
      expect(result).toBe('test-file-2024-1pdf');
    });

    it('should handle spaces', () => {
      const result = sanitizeFileName('My Test File');
      expect(result).toBe('my-test-file');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(100);
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should remove invalid characters', () => {
      const result = sanitizeFileName('test@#$%file.txt');
      expect(result).not.toContain('@');
      expect(result).not.toContain('#');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle large files', () => {
      const result = formatBytes(1536 * 1024);
      expect(result).toContain('MB');
    });
  });
});
```

### 9. Progress Calculation Tests
```typescript
// __tests__/helix/progress.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateProcessProgress,
  calculateStageProgress,
  calculateEvidenceProgress,
  estimateTimeRemaining,
} from '@/lib/helix/progress';

describe('Progress Calculations', () => {
  describe('calculateProcessProgress', () => {
    it('should calculate 0% for no completed stages', () => {
      const stages = [
        { key: 'stage-1', completedAt: null },
        { key: 'stage-2', completedAt: null },
      ];
      const progress = calculateProcessProgress(stages);
      expect(progress).toBe(0);
    });

    it('should calculate 100% for all completed stages', () => {
      const now = new Date().toISOString();
      const stages = [
        { key: 'stage-1', completedAt: now },
        { key: 'stage-2', completedAt: now },
      ];
      const progress = calculateProcessProgress(stages);
      expect(progress).toBe(100);
    });

    it('should calculate percentage for partially completed', () => {
      const stages = [
        { key: 'stage-1', completedAt: new Date().toISOString() },
        { key: 'stage-2', completedAt: null },
        { key: 'stage-3', completedAt: null },
      ];
      const progress = calculateProcessProgress(stages);
      expect(progress).toBeCloseTo(33.33, 1);
    });
  });

  describe('estimateTimeRemaining', () => {
    it('should estimate time based on average stage duration', () => {
      const stages = [
        { key: 'stage-1', completedAt: new Date().toISOString(), startedAt: new Date(Date.now() - 86400000).toISOString() }, // 1 day
        { key: 'stage-2', completedAt: new Date().toISOString(), startedAt: new Date(Date.now() - 172800000).toISOString() }, // 2 days
      ];
      const estimate = estimateTimeRemaining(stages, 3);
      expect(estimate).toBeGreaterThan(0);
    });

    it('should return 0 for completed process', () => {
      const stages = Array.from({ length: 8 }).map((_, i) => ({
        key: `stage-${i}`,
        completedAt: new Date().toISOString(),
      }));
      const estimate = estimateTimeRemaining(stages, 8);
      expect(estimate).toBe(0);
    });
  });
});
```

## File Structure
```
__tests__/helix/
├── gate-check.test.ts           (Gate check logic tests)
├── step-model.test.ts           (Step data model tests)
├── mode-toggle.test.ts          (Mode toggle tests)
├── evidence-validation.test.ts  (Evidence validation tests)
├── permissions.test.ts          (Permission system tests)
├── export.test.ts               (Export function tests)
├── progress.test.ts             (Progress calculation tests)
└── fixtures/                    (Test fixtures and mocks)
    ├── stages.ts
    ├── steps.ts
    └── evidence.ts

vitest.config.ts                 (Vitest configuration)
vitest.setup.ts                  (Test setup file)
```

## Dependencies
- vitest (test framework)
- @testing-library/react (React testing)
- @testing-library/user-event (user interaction testing)
- typescript (for test types)

## Tech Stack
- Vitest test framework
- jsdom environment for React components
- TypeScript for type safety
- Mocked Supabase client

## Acceptance Criteria
1. Gate check engine tests cover can advance, validation, condition evaluation (8+ tests)
2. Step model tests cover progression, locking, progress calculation (8+ tests)
3. Mode toggle tests cover enabling/disabling Helix (3+ tests)
4. Evidence validation tests cover all types (text, checklist, file) (8+ tests)
5. Permission tests cover role-based access (8+ tests)
6. Export function tests cover markdown generation and sanitization (6+ tests)
7. Progress calculation tests cover stage and process progress (5+ tests)
8. All tests use descriptive names and proper arrange-act-assert pattern
9. Test coverage >80% for all tested modules
10. All tests pass with zero warnings or failures

## Testing Instructions
1. **Run all tests**: `npm test` or `vitest`
2. **Run specific test file**: `vitest gate-check.test.ts`
3. **Run with coverage**: `vitest --coverage`
4. **Watch mode**: `vitest --watch`
5. **Debug mode**: `vitest --inspect-brk`
6. **Verify coverage**: Open `coverage/index.html` in browser
7. **Test permissions**: Run permission tests in isolation
8. **Test export**: Verify export function generates valid markdown
9. **Test progress**: Verify progress calculations with various stage counts
10. **Edge cases**: Run tests with edge case data (0 items, all complete, etc.)

## Notes for AI Agent
- Vitest is faster than Jest—prefer for unit tests
- Mock Supabase client—don't use real database in tests
- Use beforeEach for test setup to ensure clean state
- Test edge cases: empty arrays, null values, boundary conditions
- Aim for 40+ test cases covering happy paths and edge cases
- Use descriptive test names that explain what's being tested
- Group tests with describe blocks by feature/function
- Mock external dependencies (API calls, storage)
- Test error handling and validation failures
- Verify permission checks at both UI and API levels
- Future enhancement: add integration tests for API routes
- Consider snapshot testing for export markdown format (optional)
