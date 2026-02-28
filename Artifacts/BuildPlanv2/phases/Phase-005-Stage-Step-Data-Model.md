# Phase 005 — Stage & Step Data Model

## Objective
Create a TypeScript configuration file that defines the entire Helix process: all 8 stages, 22 steps, evidence types, actor roles, and dependencies. This becomes the single source of truth for the process structure referenced by all other phases.

## Prerequisites
- Phase 001 — Helix Mode Database Migration — database tables ready

## Epic Context
**Epic:** 1 — Foundation & Mode Infrastructure
**Phase:** 005 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The Helix process is defined once and referenced everywhere: in the sidebar, gate checks, step detail pages, and AI agent prompts. A single source of truth ensures consistency and makes future changes easier. This configuration file encodes all metadata about the 22 steps across 8 stages, including what evidence is required, who must perform each step, and which tools/prompts are needed.

The data model uses TypeScript interfaces for type safety and includes helper functions to query the process definition.

---

## Detailed Requirements

### 1. Create Helix Process Configuration
#### File: `config/helix-process.ts` (NEW)
Define the complete Helix process structure with all 22 steps.

```typescript
/**
 * Helix Process Configuration
 * Single source of truth for all 8 stages and 22 steps
 */

export type ActorType = 'human' | 'claude' | 'both';
export type EvidenceType = 'text' | 'file' | 'url' | 'checklist';

export interface EvidenceRequirement {
  type: EvidenceType;
  description: string;
  minLength?: number; // For text
  maxLength?: number; // For text
  validFileTypes?: string[]; // For files (e.g., ['.pdf', '.md', '.docx'])
  checklistItems?: string[]; // For checklists
}

export interface StepConfig {
  key: string; // e.g., '1.1', '2.3'
  title: string;
  description: string;
  instructions: string;
  actor: ActorType;
  evidenceType: EvidenceType;
  evidenceRequirements: EvidenceRequirement;
  toolReference?: string; // Reference to Claude prompt/tool
  estimatedDuration?: string; // e.g., '30 minutes', '2 hours'
  notes?: string;
}

export interface StageConfig {
  number: number;
  title: string;
  description: string;
  steps: StepConfig[];
  gateCheckDescription: string;
  gateCheckItems: string[];
}

// ===== STAGE 1: PLANNING =====
const STAGE_1_PLANNING: StageConfig = {
  number: 1,
  title: 'Planning',
  description: 'Define the project scope, gather initial requirements, and outline the vision',
  gateCheckDescription: 'All planning steps complete and project brief documented',
  gateCheckItems: [
    'Project idea clearly defined',
    'Helix brainstorming completed',
    'Project brief saved and approved',
  ],
  steps: [
    {
      key: '1.1',
      title: 'Define Project Idea',
      description: 'Clearly articulate what the project is, what problem it solves, and why it matters',
      instructions:
        'Write a clear, concise description of your project. Include: what it is, the problem it solves, target users, and desired outcomes.',
      actor: 'human',
      evidenceType: 'text',
      evidenceRequirements: {
        type: 'text',
        description: 'Project idea statement',
        minLength: 100,
        maxLength: 1000,
      },
      estimatedDuration: '30 minutes',
    },
    {
      key: '1.2',
      title: 'Run Helix Brainstorming Prompt',
      description: 'Use AI to expand on your project idea and generate structured requirements',
      instructions:
        'Provide your project idea and let Claude suggest features, user flows, technical considerations, and potential challenges.',
      actor: 'both',
      evidenceType: 'text',
      evidenceRequirements: {
        type: 'text',
        description: 'AI-generated brainstorming output',
        minLength: 200,
      },
      toolReference: 'claude:helix-brainstorming-prompt',
      estimatedDuration: '15 minutes',
    },
    {
      key: '1.3',
      title: 'Save Project Brief',
      description: 'Compile planning results into a formal project brief document',
      instructions:
        'Create or upload a project brief document that synthesizes the project idea, brainstorming results, and initial scope. This becomes the reference document for all future stages.',
      actor: 'human',
      evidenceType: 'file',
      evidenceRequirements: {
        type: 'file',
        description: 'Project brief document (PDF, Word, or Markdown)',
        validFileTypes: ['.pdf', '.docx', '.md', '.txt'],
      },
      estimatedDuration: '45 minutes',
    },
  ],
};

// ===== STAGE 2: DOCUMENTATION =====
const STAGE_2_DOCUMENTATION: StageConfig = {
  number: 2,
  title: 'Documentation',
  description: 'Identify, gather, and organize all available documentation and undocumented knowledge',
  gateCheckDescription: 'All documentation gathered, verified complete, and organized',
  gateCheckItems: [
    'Available documentation identified',
    'Undocumented knowledge captured from champion',
    'All docs organized in single location',
    'Documentation completeness verified',
  ],
  steps: [
    {
      key: '2.1',
      title: 'Identify Available Documentation',
      description: 'Audit all existing documentation, resources, and reference materials',
      instructions:
        'List all documentation, design files, API docs, requirements docs, and other reference materials. Include links or storage locations.',
      actor: 'human',
      evidenceType: 'checklist',
      evidenceRequirements: {
        type: 'checklist',
        description: 'Checklist of documentation sources found',
        checklistItems: [
          'Design files or mockups',
          'Requirements or specification documents',
          'API documentation',
          'Architecture diagrams',
          'Existing codebase or templates',
          'User research or personas',
          'Brand guidelines or design system',
          'Other relevant materials',
        ],
      },
      estimatedDuration: '1 hour',
    },
    {
      key: '2.2',
      title: 'Prompt Champion for Undocumented Knowledge',
      description: 'Interview project champion to capture undocumented context and expertise',
      instructions:
        'Use the AI prompt to generate interview questions for the project champion. Record answers about implicit knowledge, constraints, trade-offs, and context not in written docs.',
      actor: 'both',
      evidenceType: 'text',
      evidenceRequirements: {
        type: 'text',
        description: 'Q&A summary from champion interview',
        minLength: 300,
      },
      toolReference: 'claude:helix-champion-interview-prompt',
      estimatedDuration: '1.5 hours',
    },
    {
      key: '2.3',
      title: 'Gather All Docs into One Folder',
      description: 'Consolidate all documentation into a single, organized repository',
      instructions:
        'Create a folder/space with all gathered documentation. Organize by category (specs, design, api, etc). Include a README with structure and navigation.',
      actor: 'human',
      evidenceType: 'url',
      evidenceRequirements: {
        type: 'url',
        description: 'Link to documentation folder or repository',
      },
      estimatedDuration: '1 hour',
    },
    {
      key: '2.4',
      title: 'Verify Documentation is Complete',
      description: 'Confirm that all necessary documentation is present and no critical gaps exist',
      instructions:
        'Review the complete documentation set. Identify any missing or incomplete docs. Create a checklist confirming completeness or a gap analysis if info is missing.',
      actor: 'human',
      evidenceType: 'checklist',
      evidenceRequirements: {
        type: 'checklist',
        description: 'Documentation completeness verification',
        checklistItems: [
          'All existing docs gathered',
          'Champion knowledge documented',
          'No critical gaps identified',
          'Docs are organized and accessible',
          'README/index created for navigation',
        ],
      },
      estimatedDuration: '1 hour',
    },
  ],
};

// ===== STAGE 3: BUILD PLANNING =====
const STAGE_3_BUILD_PLANNING: StageConfig = {
  number: 3,
  title: 'Build Planning',
  description: 'Create a detailed technical build plan and architecture',
  gateCheckDescription: 'Build plan created, saved, and quality reviewed',
  gateCheckItems: [
    'Building brief summary generated',
    'Build plan document saved',
    'Build plan quality review completed',
  ],
  steps: [
    {
      key: '3.1',
      title: 'Run Building Brief Summary Prompt',
      description: 'Use AI to generate a structured technical build plan from project and documentation',
      instructions:
        'Provide project brief and documentation to Claude. Receive a comprehensive build plan including architecture, tech stack, phases, and risk assessment.',
      actor: 'both',
      evidenceType: 'text',
      evidenceRequirements: {
        type: 'text',
        description: 'AI-generated build plan summary',
        minLength: 500,
      },
      toolReference: 'claude:helix-building-brief-prompt',
      estimatedDuration: '1 hour',
    },
    {
      key: '3.2',
      title: 'Build Plan Output Saved',
      description: 'Save the build plan in a structured document format',
      instructions:
        'Save the build plan to a persistent location (file, document, or database). Ensure clear sections for: Architecture, Tech Stack, Phase Breakdown, Risks, and Timeline.',
      actor: 'human',
      evidenceType: 'file',
      evidenceRequirements: {
        type: 'file',
        description: 'Build plan document',
        validFileTypes: ['.pdf', '.docx', '.md'],
      },
      estimatedDuration: '1 hour',
    },
    {
      key: '3.3',
      title: 'Review Build Plan Quality',
      description: 'Critically review the build plan for completeness, feasibility, and alignment',
      instructions:
        'Review the build plan against project requirements. Verify: feasibility, tech choices justified, phases realistic, risks identified, no critical gaps.',
      actor: 'human',
      evidenceType: 'text',
      evidenceRequirements: {
        type: 'text',
        description: 'Build plan review notes',
        minLength: 200,
      },
      estimatedDuration: '2 hours',
    },
  ],
};

// ===== STAGE 4: REPO SETUP =====
const STAGE_4_REPO_SETUP: StageConfig = {
  number: 4,
  title: 'Repo Setup',
  description: 'Initialize repository from template and populate build plan folder',
  gateCheckDescription: 'Repository initialized, configured, and ready for build',
  gateCheckItems: [
    'Repository template copied',
    'Placeholders replaced',
    'BuildPlan folder populated',
    'Git initialized and first commit made',
  ],
  steps: [
    {
      key: '4.1',
      title: 'Copy Repo Template',
      description: 'Use the Helix repo template as a starting point',
      instructions:
        'Copy the Helix project template (structure, config files, CI/CD setup, etc.). This provides the foundation for the project.',
      actor: 'both',
      evidenceType: 'url',
      evidenceRequirements: {
        type: 'url',
        description: 'Link to initialized repository',
      },
      toolReference: 'claude:helix-repo-setup-tool',
      estimatedDuration: '30 minutes',
    },
    {
      key: '4.2',
      title: 'Find-and-Replace Placeholders',
      description: 'Replace template placeholders with project-specific values',
      instructions:
        'Update all placeholders in the repo template (project name, description, author, urls, etc.) with your project details.',
      actor: 'both',
      evidenceType: 'checklist',
      evidenceRequirements: {
        type: 'checklist',
        description: 'Placeholder replacement verification',
        checklistItems: [
          'Project name updated',
          'Description updated',
          'Author/org info updated',
          'Config files customized',
          'README personalized',
          'Package.json/requirements updated',
        ],
      },
      estimatedDuration: '1 hour',
    },
    {
      key: '4.3',
      title: 'Populate BuildPlan Folder',
      description: 'Add build plan and documentation to the repository',
      instructions:
        'Copy the build plan and documentation folder into the /BuildPlan directory in the repo. Organize and link them for reference during build.',
      actor: 'human',
      evidenceType: 'checklist',
      evidenceRequirements: {
        type: 'checklist',
        description: 'BuildPlan folder contents verified',
        checklistItems: [
          'Build plan document added',
          'Documentation folder included',
          'Phases folder created',
          'README created for BuildPlan',
          'All files accessible from repo root',
        ],
      },
      estimatedDuration: '1 hour',
    },
    {
      key: '4.4',
      title: 'Initialize Git Repo',
      description: 'Initialize git repository and create initial commit',
      instructions:
        'Run `git init`, stage all files, and create an initial commit with message "initial: project setup from Helix template".',
      actor: 'both',
      evidenceType: 'url',
      evidenceRequirements: {
        type: 'url',
        description: 'Link to git commit or repository showing initial commit',
      },
      estimatedDuration: '15 minutes',
    },
  ],
};

// ===== STAGE 5: REVIEW =====
const STAGE_5_REVIEW: StageConfig = {
  number: 5,
  title: 'Review',
  description: 'Conduct pre-build review to ensure everything is ready',
  gateCheckDescription: 'Pre-build review completed and approved',
  gateCheckItems: ['Pre-build review checkpoint passed'],
  steps: [
    {
      key: '5.1',
      title: 'Pre-Build Review Checkpoint',
      description: 'Final review before build phase: verify all prerequisites met, risks addressed, team ready',
      instructions:
        'Conduct a comprehensive review: requirements clear, architecture sound, team trained, environment ready, timeline realistic, risks mitigated.',
      actor: 'human',
      evidenceType: 'checklist',
      evidenceRequirements: {
        type: 'checklist',
        description: 'Pre-build review verification',
        checklistItems: [
          'Requirements finalized and approved',
          'Architecture reviewed and validated',
          'Tech stack finalized',
          'Team roles and responsibilities defined',
          'Development environment set up',
          'CI/CD pipeline configured',
          'Build phases realistic and achievable',
          'Risks identified and mitigation planned',
          'Success criteria defined',
          'Go/no-go decision made',
        ],
      },
      estimatedDuration: '2 hours',
    },
  ],
};

// ===== STAGE 6: BUILD =====
const STAGE_6_BUILD: StageConfig = {
  number: 6,
  title: 'Build',
  description: 'Execute build phases according to plan',
  gateCheckDescription: 'All build phases completed',
  gateCheckItems: ['Build phases executed and features implemented'],
  steps: [
    {
      key: '6.1',
      title: 'Build Phases',
      description: 'Execute repeating build cycle for each phase in the build plan',
      instructions:
        'Follow the build plan phases sequentially. Each phase: implement features, write tests, commit code, document changes. Report status and blockers.',
      actor: 'both',
      evidenceType: 'url',
      evidenceRequirements: {
        type: 'url',
        description: 'Link to build phase progress or pull requests',
      },
      toolReference: 'claude:helix-build-phase-cycle',
      estimatedDuration: 'Varies by project (weeks/months)',
    },
  ],
};

// ===== STAGE 7: TESTING =====
const STAGE_7_TESTING: StageConfig = {
  number: 7,
  title: 'Testing',
  description: 'Test all features and verify quality',
  gateCheckDescription: 'All testing completed and quality gates passed',
  gateCheckItems: [
    'Per-phase testing status tracked',
    'End-to-end integration test completed',
  ],
  steps: [
    {
      key: '7.1',
      title: 'Track Per-Phase Testing Status',
      description: 'Document testing results for each build phase',
      instructions:
        'For each phase: list tests run, results (pass/fail), bugs found, fixes applied. Update test coverage metrics.',
      actor: 'human',
      evidenceType: 'text',
      evidenceRequirements: {
        type: 'text',
        description: 'Testing summary with results per phase',
        minLength: 200,
      },
      estimatedDuration: 'Varies (parallel with build)',
    },
    {
      key: '7.2',
      title: 'End-to-End Integration Test',
      description: 'Run full integration test of completed system',
      instructions:
        'Execute comprehensive end-to-end testing covering all features, user flows, edge cases, and integration points.',
      actor: 'human',
      evidenceType: 'text',
      evidenceRequirements: {
        type: 'text',
        description: 'E2E test results and sign-off',
        minLength: 300,
      },
      estimatedDuration: '2-3 days',
    },
  ],
};

// ===== STAGE 8: DEPLOYMENT =====
const STAGE_8_DEPLOYMENT: StageConfig = {
  number: 8,
  title: 'Deployment',
  description: 'Deploy to production and verify',
  gateCheckDescription: 'Successfully deployed to production with verification',
  gateCheckItems: [
    'Deployment preparation completed',
    'Deployed to production',
    'Post-deploy verification passed',
  ],
  steps: [
    {
      key: '8.1',
      title: 'Prepare for Deployment',
      description: 'Prepare all deployment artifacts and verification procedures',
      instructions:
        'Create deployment checklist: environment config, secrets, database migrations, rollback plan, monitoring setup, communication plan.',
      actor: 'human',
      evidenceType: 'checklist',
      evidenceRequirements: {
        type: 'checklist',
        description: 'Deployment readiness checklist',
        checklistItems: [
          'Environment configuration complete',
          'Secrets and credentials secured',
          'Database migrations prepared',
          'Rollback plan documented',
          'Monitoring and alerts configured',
          'Communication plan established',
          'Stakeholders notified',
          'Deployment window scheduled',
        ],
      },
      estimatedDuration: '1 day',
    },
    {
      key: '8.2',
      title: 'Deploy to Production',
      description: 'Execute deployment to production environment',
      instructions:
        'Execute deployment following the deployment plan. Monitor for errors. Verify all services online and responding.',
      actor: 'both',
      evidenceType: 'text',
      evidenceRequirements: {
        type: 'text',
        description: 'Deployment log and confirmation',
        minLength: 100,
      },
      estimatedDuration: '2-4 hours',
    },
    {
      key: '8.3',
      title: 'Post-Deploy Verification',
      description: 'Verify system is working correctly in production',
      instructions:
        'Run smoke tests, verify key features work, check monitoring/logs, confirm no errors, validate with stakeholders.',
      actor: 'human',
      evidenceType: 'checklist',
      evidenceRequirements: {
        type: 'checklist',
        description: 'Post-deploy verification checklist',
        checklistItems: [
          'Application loads without errors',
          'Key features verified working',
          'API endpoints responding',
          'Database connectivity confirmed',
          'Authentication/authorization working',
          'Monitoring showing normal metrics',
          'No error logs or alerts',
          'Stakeholder sign-off',
          'Documentation updated',
        ],
      },
      estimatedDuration: '4-8 hours',
    },
  ],
};

// ===== EXPORT =====
export const HELIX_STAGES: StageConfig[] = [
  STAGE_1_PLANNING,
  STAGE_2_DOCUMENTATION,
  STAGE_3_BUILD_PLANNING,
  STAGE_4_REPO_SETUP,
  STAGE_5_REVIEW,
  STAGE_6_BUILD,
  STAGE_7_TESTING,
  STAGE_8_DEPLOYMENT,
];

/**
 * Helper Functions
 */

/**
 * Get a stage by number
 */
export function getStage(stageNumber: number): StageConfig | undefined {
  return HELIX_STAGES.find((s) => s.number === stageNumber);
}

/**
 * Get a step by key (e.g., '1.1', '2.3')
 */
export function getStep(stepKey: string): StepConfig | undefined {
  const [stageNum] = stepKey.split('.').map(Number);
  const stage = getStage(stageNum);
  return stage?.steps.find((s) => s.key === stepKey);
}

/**
 * Get all steps in a stage
 */
export function getStageSteps(stageNumber: number): StepConfig[] {
  const stage = getStage(stageNumber);
  return stage?.steps || [];
}

/**
 * Get next step after a given key
 */
export function getNextStep(currentKey: string): StepConfig | undefined {
  const [stageNum, stepNum] = currentKey.split('.').map(Number);
  const stage = getStage(stageNum);

  if (!stage) return undefined;

  // Try to get next step in current stage
  const nextStepInStage = stage.steps[stepNum]; // stepNum is 1-indexed
  if (nextStepInStage) return nextStepInStage;

  // Try next stage's first step
  const nextStage = getStage(stageNum + 1);
  return nextStage?.steps[0];
}

/**
 * Get previous step before a given key
 */
export function getPreviousStep(currentKey: string): StepConfig | undefined {
  const [stageNum, stepNum] = currentKey.split('.').map(Number);
  const stage = getStage(stageNum);

  if (!stage) return undefined;

  // Try to get previous step in current stage
  const prevStepInStage = stage.steps[stepNum - 2]; // stepNum is 1-indexed
  if (prevStepInStage) return prevStepInStage;

  // Try previous stage's last step
  const prevStage = getStage(stageNum - 1);
  return prevStage?.steps[prevStage.steps.length - 1];
}

/**
 * Count total steps across all stages
 */
export function getTotalSteps(): number {
  return HELIX_STAGES.reduce((sum, stage) => sum + stage.steps.length, 0);
}

/**
 * Validate a step key format
 */
export function isValidStepKey(key: string): boolean {
  const parts = key.split('.');
  if (parts.length !== 2) return false;

  const [stageNum, stepNum] = parts.map(Number);
  if (!Number.isInteger(stageNum) || !Number.isInteger(stepNum)) return false;

  const stage = getStage(stageNum);
  if (!stage) return false;

  return stepNum >= 1 && stepNum <= stage.steps.length;
}
```

---

## File Structure
```
config/
└── helix-process.ts (NEW)
```

---

## Dependencies
- TypeScript v5+ (existing)

---

## Tech Stack for This Phase
- TypeScript for type definitions and helper functions
- Configuration as code pattern

---

## Acceptance Criteria
1. helix-process.ts exports HELIX_STAGES array with 8 StageConfig objects
2. Each StageConfig contains: number, title, description, steps array, gateCheckDescription, gateCheckItems
3. Total of 22 steps distributed across 8 stages (3+4+3+4+1+1+2+3 = 21... verify count)
4. Each StepConfig contains: key, title, description, instructions, actor, evidenceType, evidenceRequirements
5. Helper function getStep(stepKey) returns correct step or undefined
6. Helper function getStage(stageNumber) returns correct stage or undefined
7. Helper function getNextStep() returns next step or undefined if at end
8. Helper function getPreviousStep() returns previous step or undefined if at start
9. Helper function getTotalSteps() returns 22
10. isValidStepKey() correctly validates step key format

---

## Testing Instructions
1. Import HELIX_STAGES and verify array length equals 8
2. Call getStage(1) and verify returns Planning stage
3. Call getStep('1.1') and verify returns Define Project Idea step
4. Call getStage(1).steps.length and verify equals 3 steps
5. Call getStageSteps(2) and verify returns 4 documentation steps
6. Call getTotalSteps() and verify returns 22
7. Call getNextStep('1.3') and verify returns step 2.1
8. Call getPreviousStep('2.1') and verify returns step 1.3
9. Call isValidStepKey('1.1') and verify returns true
10. Call isValidStepKey('99.1') and verify returns false

---

## Notes for the AI Agent
- This configuration file is the single source of truth; any updates to the process must be made here
- The step count should total 22: verify by summing each stage's steps array length
- Actor types ('human', 'claude', 'both') guide who performs each step; used in Phase 007+ for validation
- Evidence requirements are detailed and specific; they inform UI component generation in later phases
- Tool references (e.g., 'claude:helix-brainstorming-prompt') are placeholders for future AI integration
- The configuration is immutable after export; to modify, update the source and re-export
- Phase 005 is a pure data layer phase; no UI or database changes required
- The helper functions are used throughout later phases in gate checks, navigation, and validation
