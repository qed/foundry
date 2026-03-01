/**
 * Complete Helix process configuration.
 * Defines the 8 stages and 21 steps of the structured development process.
 */

export interface EvidenceRequirement {
  type: 'text' | 'file' | 'url' | 'checklist'
  label: string
  description: string
  required: boolean
}

export interface StepConfig {
  key: string
  stageNumber: number
  stepNumber: number
  title: string
  description: string
  evidenceRequirements: EvidenceRequirement[]
  deliverables: string[]
}

export interface StageConfig {
  number: number
  slug: string
  title: string
  description: string
  steps: StepConfig[]
  gateDescription: string
}

// ---------------------------------------------------------------------------
// Stage 1: Planning
// ---------------------------------------------------------------------------

const stage1Steps: StepConfig[] = [
  {
    key: '1.1',
    stageNumber: 1,
    stepNumber: 1,
    title: 'Define Project Idea',
    description: 'Articulate your project idea in structured form: project name, problem statement, target users, and a detailed project idea description. This becomes the foundation for brainstorming and all subsequent phases.',
    evidenceRequirements: [
      { type: 'text', label: 'Project Idea', description: 'Structured project idea with name, problem, users, and description', required: true },
    ],
    deliverables: ['Project idea definition', 'Problem statement'],
  },
  {
    key: '1.2',
    stageNumber: 1,
    stepNumber: 2,
    title: 'Brainstorming Prompt',
    description: 'Copy the Helix Brainstorming Prompt, run a 4-phase AI process in Claude Chat, and paste the resulting Project Brief back into Foundry.',
    evidenceRequirements: [
      { type: 'text', label: 'Brainstorming Output', description: 'Output from 4-phase brainstorming session with Claude', required: true },
    ],
    deliverables: ['Brainstorming output', 'Draft project brief'],
  },
  {
    key: '1.3',
    stageNumber: 1,
    stepNumber: 3,
    title: 'Save Project Brief',
    description: 'Upload or paste your final Project Brief document. This synthesizes your project idea and brainstorming into a formal brief that becomes the source of truth for the rest of the Helix process.',
    evidenceRequirements: [
      { type: 'file', label: 'Project Brief', description: 'Final project brief document (.pdf, .docx, .md, .txt)', required: true },
    ],
    deliverables: ['Project brief document'],
  },
]

// ---------------------------------------------------------------------------
// Stage 2: Documentation
// ---------------------------------------------------------------------------

const stage2Steps: StepConfig[] = [
  {
    key: '2.1',
    stageNumber: 2,
    stepNumber: 1,
    title: 'Identify Available Documentation',
    description: 'Audit all existing documentation, resources, and reference materials. List all documentation, design files, API docs, requirements docs, and other reference materials.',
    evidenceRequirements: [
      { type: 'checklist', label: 'Documentation Sources', description: 'Checklist of documentation sources found (design files, requirements, API docs, architecture diagrams, codebase, user research, brand guidelines, other materials)', required: true },
    ],
    deliverables: ['Documentation audit checklist'],
  },
  {
    key: '2.2',
    stageNumber: 2,
    stepNumber: 2,
    title: 'Prompt Champion for Undocumented Knowledge',
    description: 'Interview project champion to capture undocumented context and expertise. Use the AI prompt to generate interview questions and record answers about implicit knowledge, constraints, trade-offs, and context.',
    evidenceRequirements: [
      { type: 'text', label: 'Champion Interview', description: 'Q&A summary from champion interview, minimum 300 characters', required: true },
    ],
    deliverables: ['Champion interview Q&A summary'],
  },
  {
    key: '2.3',
    stageNumber: 2,
    stepNumber: 3,
    title: 'Gather All Docs into One Folder',
    description: 'Consolidate all documentation into a single, organized repository. Create a folder/space with all gathered documentation organized by category with a README.',
    evidenceRequirements: [
      { type: 'url', label: 'Documentation Folder', description: 'Link to documentation folder or repository', required: true },
    ],
    deliverables: ['Organized documentation folder', 'Documentation README'],
  },
  {
    key: '2.4',
    stageNumber: 2,
    stepNumber: 4,
    title: 'Verify Documentation is Complete',
    description: 'Confirm that all necessary documentation is present and no critical gaps exist. Review the complete documentation set and create a completeness checklist or gap analysis.',
    evidenceRequirements: [
      { type: 'checklist', label: 'Completeness Verification', description: 'Documentation completeness verification checklist (all existing docs gathered, champion knowledge documented, no critical gaps, docs organized and accessible, README/index created)', required: true },
    ],
    deliverables: ['Documentation completeness verification'],
  },
]

// ---------------------------------------------------------------------------
// Stage 3: Build Planning
// ---------------------------------------------------------------------------

const stage3Steps: StepConfig[] = [
  {
    key: '3.1',
    stageNumber: 3,
    stepNumber: 1,
    title: 'Run Building Brief Summary Prompt',
    description: 'Use AI to generate a structured technical build plan from project brief and documentation. Receive a comprehensive build plan including architecture, tech stack, phases, and risk assessment.',
    evidenceRequirements: [
      { type: 'text', label: 'Build Plan Summary', description: 'AI-generated build plan summary, minimum 500 characters', required: true },
    ],
    deliverables: ['AI-generated build plan summary'],
  },
  {
    key: '3.2',
    stageNumber: 3,
    stepNumber: 2,
    title: 'Build Plan Output Saved',
    description: 'Save the build plan in a structured document format with clear sections for Architecture, Tech Stack, Phase Breakdown, Risks, and Timeline.',
    evidenceRequirements: [
      { type: 'file', label: 'Build Plan Document', description: 'Build plan document (.pdf, .docx, .md)', required: true },
    ],
    deliverables: ['Build plan document'],
  },
  {
    key: '3.3',
    stageNumber: 3,
    stepNumber: 3,
    title: 'Review Build Plan Quality',
    description: 'Critically review the build plan for completeness, feasibility, and alignment. Verify feasibility, tech choices justified, phases realistic, risks identified, and no critical gaps.',
    evidenceRequirements: [
      { type: 'text', label: 'Review Notes', description: 'Build plan review notes, minimum 200 characters', required: true },
    ],
    deliverables: ['Build plan review notes'],
  },
]

// ---------------------------------------------------------------------------
// Stage 4: Repo Setup
// ---------------------------------------------------------------------------

const stage4Steps: StepConfig[] = [
  {
    key: '4.1',
    stageNumber: 4,
    stepNumber: 1,
    title: 'Copy Repo Template',
    description: 'Use the Helix repo template as a starting point. Copy the Helix project template (structure, config files, CI/CD setup, etc.) to provide the foundation for the project.',
    evidenceRequirements: [
      { type: 'url', label: 'Repository Link', description: 'Link to initialized repository', required: true },
    ],
    deliverables: ['Initialized repository from template'],
  },
  {
    key: '4.2',
    stageNumber: 4,
    stepNumber: 2,
    title: 'Find-and-Replace Placeholders',
    description: 'Replace template placeholders with project-specific values: project name, description, author, URLs, etc.',
    evidenceRequirements: [
      { type: 'checklist', label: 'Placeholder Verification', description: 'Placeholder replacement verification (project name, description, author/org info, config files, README, package.json/requirements updated)', required: true },
    ],
    deliverables: ['Configured repository with project-specific values'],
  },
  {
    key: '4.3',
    stageNumber: 4,
    stepNumber: 3,
    title: 'Populate BuildPlan Folder',
    description: 'Add build plan and documentation to the repository. Copy the build plan and documentation folder into the /BuildPlan directory and organize them for reference during build.',
    evidenceRequirements: [
      { type: 'checklist', label: 'BuildPlan Contents', description: 'BuildPlan folder contents verified (build plan document added, documentation folder included, phases folder created, README created, all files accessible from repo root)', required: true },
    ],
    deliverables: ['Populated BuildPlan folder in repository'],
  },
  {
    key: '4.4',
    stageNumber: 4,
    stepNumber: 4,
    title: 'Initialize Git Repo',
    description: 'Initialize git repository and create initial commit with message "initial: project setup from Helix template".',
    evidenceRequirements: [
      { type: 'url', label: 'Initial Commit', description: 'Link to git commit or repository showing initial commit', required: true },
    ],
    deliverables: ['Git repository with initial commit'],
  },
]

// ---------------------------------------------------------------------------
// Stage 5: Pre-Build Review
// ---------------------------------------------------------------------------

const stage5Steps: StepConfig[] = [
  {
    key: '5.1',
    stageNumber: 5,
    stepNumber: 1,
    title: 'Pre-Build Review Checkpoint',
    description: 'Final review before build phase: verify all prerequisites met, risks addressed, team ready. Conduct a comprehensive review of requirements, architecture, environment, timeline, and risks.',
    evidenceRequirements: [
      { type: 'checklist', label: 'Pre-Build Review', description: 'Pre-build review verification (requirements finalized, architecture reviewed, tech stack finalized, team roles defined, dev environment set up, CI/CD configured, build phases realistic, risks identified, success criteria defined, go/no-go decision made)', required: true },
    ],
    deliverables: ['Pre-build review checklist', 'Go/no-go decision'],
  },
]

// ---------------------------------------------------------------------------
// Stage 6: Build
// ---------------------------------------------------------------------------

const stage6Steps: StepConfig[] = [
  {
    key: '6.1',
    stageNumber: 6,
    stepNumber: 1,
    title: 'Build Phases',
    description: 'Execute repeating build cycle for each phase in the build plan. Each phase: implement features, write tests, commit code, document changes. Report status and blockers.',
    evidenceRequirements: [
      { type: 'url', label: 'Build Progress', description: 'Link to build phase progress or pull requests', required: true },
    ],
    deliverables: ['Implemented features per build phase', 'Pull requests'],
  },
]

// ---------------------------------------------------------------------------
// Stage 7: Testing
// ---------------------------------------------------------------------------

const stage7Steps: StepConfig[] = [
  {
    key: '7.1',
    stageNumber: 7,
    stepNumber: 1,
    title: 'Track Per-Phase Testing Status',
    description: 'Document testing results for each build phase. For each phase: list tests run, results (pass/fail), bugs found, fixes applied. Update test coverage metrics.',
    evidenceRequirements: [
      { type: 'text', label: 'Testing Summary', description: 'Testing summary with results per phase, minimum 200 characters', required: true },
    ],
    deliverables: ['Per-phase testing results', 'Test coverage metrics'],
  },
  {
    key: '7.2',
    stageNumber: 7,
    stepNumber: 2,
    title: 'End-to-End Integration Test',
    description: 'Run full integration test of completed system. Execute comprehensive end-to-end testing covering all features, user flows, edge cases, and integration points.',
    evidenceRequirements: [
      { type: 'text', label: 'E2E Test Results', description: 'E2E test results and sign-off, minimum 300 characters', required: true },
    ],
    deliverables: ['E2E test results', 'Integration test sign-off'],
  },
]

// ---------------------------------------------------------------------------
// Stage 8: Deployment
// ---------------------------------------------------------------------------

const stage8Steps: StepConfig[] = [
  {
    key: '8.1',
    stageNumber: 8,
    stepNumber: 1,
    title: 'Prepare for Deployment',
    description: 'Prepare all deployment artifacts and verification procedures. Create deployment checklist: environment config, secrets, database migrations, rollback plan, monitoring setup, communication plan.',
    evidenceRequirements: [
      { type: 'checklist', label: 'Deployment Readiness', description: 'Deployment readiness checklist (environment configuration, secrets secured, database migrations prepared, rollback plan, monitoring configured, communication plan, stakeholders notified, deployment window scheduled)', required: true },
    ],
    deliverables: ['Deployment readiness checklist', 'Rollback plan'],
  },
  {
    key: '8.2',
    stageNumber: 8,
    stepNumber: 2,
    title: 'Deploy to Production',
    description: 'Execute deployment to production environment. Monitor for errors. Verify all services online and responding.',
    evidenceRequirements: [
      { type: 'text', label: 'Deployment Log', description: 'Deployment log and confirmation, minimum 100 characters', required: true },
    ],
    deliverables: ['Deployment log', 'Production deployment confirmation'],
  },
  {
    key: '8.3',
    stageNumber: 8,
    stepNumber: 3,
    title: 'Post-Deploy Verification',
    description: 'Verify system is working correctly in production. Run smoke tests, verify key features, check monitoring/logs, confirm no errors, validate with stakeholders.',
    evidenceRequirements: [
      { type: 'checklist', label: 'Post-Deploy Verification', description: 'Post-deploy verification checklist (app loads without errors, key features verified, API endpoints responding, database connectivity confirmed, auth/authz working, monitoring normal, no error logs, stakeholder sign-off, documentation updated)', required: true },
    ],
    deliverables: ['Post-deploy verification checklist', 'Stakeholder sign-off'],
  },
]

// ---------------------------------------------------------------------------
// Full Stage Configurations
// ---------------------------------------------------------------------------

export const HELIX_STAGES: StageConfig[] = [
  {
    number: 1,
    slug: 'planning',
    title: 'Planning',
    description: 'Define your project idea, brainstorm with AI, and create a formal Project Brief.',
    steps: stage1Steps,
    gateDescription: 'All planning deliverables completed: project idea, brainstorming output, and project brief saved.',
  },
  {
    number: 2,
    slug: 'documentation',
    title: 'Documentation',
    description: 'Gather, organize, and verify all project documentation and undocumented knowledge.',
    steps: stage2Steps,
    gateDescription: 'All documentation gathered, verified complete, and organized.',
  },
  {
    number: 3,
    slug: 'build-planning',
    title: 'Build Planning',
    description: 'Generate a structured technical build plan from project brief and documentation.',
    steps: stage3Steps,
    gateDescription: 'Build plan created, saved, and quality reviewed.',
  },
  {
    number: 4,
    slug: 'repo-setup',
    title: 'Repo Setup',
    description: 'Initialize repository from template, configure project-specific values, and make initial commit.',
    steps: stage4Steps,
    gateDescription: 'Repository initialized, configured, and ready for build.',
  },
  {
    number: 5,
    slug: 'review',
    title: 'Pre-Build Review',
    description: 'Final review checkpoint before entering the build phase.',
    steps: stage5Steps,
    gateDescription: 'Pre-build review completed and approved.',
  },
  {
    number: 6,
    slug: 'build',
    title: 'Build',
    description: 'Execute repeating build cycles for each phase in the build plan.',
    steps: stage6Steps,
    gateDescription: 'All build phases completed.',
  },
  {
    number: 7,
    slug: 'testing',
    title: 'Testing',
    description: 'Track per-phase testing and run end-to-end integration tests.',
    steps: stage7Steps,
    gateDescription: 'All testing completed and quality gates passed.',
  },
  {
    number: 8,
    slug: 'deployment',
    title: 'Deployment',
    description: 'Prepare, deploy to production, and verify post-deployment.',
    steps: stage8Steps,
    gateDescription: 'Successfully deployed to production with verification.',
  },
]

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/** Get a stage config by number */
export function getStage(stageNumber: number): StageConfig | undefined {
  return HELIX_STAGES.find((s) => s.number === stageNumber)
}

/** Get a step config by key (e.g., '1.1', '2.3') */
export function getStep(stepKey: string): StepConfig | undefined {
  for (const stage of HELIX_STAGES) {
    const step = stage.steps.find((s) => s.key === stepKey)
    if (step) return step
  }
  return undefined
}

/** Get all steps for a given stage number */
export function getStageSteps(stageNumber: number): StepConfig[] {
  return getStage(stageNumber)?.steps ?? []
}

/** Get the next step after a given step key */
export function getNextStep(stepKey: string): StepConfig | undefined {
  const allSteps = HELIX_STAGES.flatMap((s) => s.steps)
  const idx = allSteps.findIndex((s) => s.key === stepKey)
  return idx >= 0 && idx < allSteps.length - 1 ? allSteps[idx + 1] : undefined
}

/** Get the previous step before a given step key */
export function getPreviousStep(stepKey: string): StepConfig | undefined {
  const allSteps = HELIX_STAGES.flatMap((s) => s.steps)
  const idx = allSteps.findIndex((s) => s.key === stepKey)
  return idx > 0 ? allSteps[idx - 1] : undefined
}

/** Get total number of steps across all stages */
export function getTotalSteps(): number {
  return HELIX_STAGES.reduce((sum, stage) => sum + stage.steps.length, 0)
}

/** Check if a step key is valid */
export function isValidStepKey(stepKey: string): boolean {
  return getStep(stepKey) !== undefined
}

/** Get a stage config by slug */
export function getStageBySlug(slug: string): StageConfig | undefined {
  return HELIX_STAGES.find((s) => s.slug === slug)
}
