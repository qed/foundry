/**
 * Complete Helix process configuration.
 * Defines the 8 stages and 22 steps of the structured development process.
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
// Stage 1: Discovery
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
      { type: 'text', label: 'Project Brief', description: 'Final project brief document', required: true },
    ],
    deliverables: ['Project brief document'],
  },
]

// ---------------------------------------------------------------------------
// Stage 2: Requirements
// ---------------------------------------------------------------------------

const stage2Steps: StepConfig[] = [
  {
    key: '2.1',
    stageNumber: 2,
    stepNumber: 1,
    title: 'Functional Requirements',
    description: 'Document detailed functional requirements based on discovery findings.',
    evidenceRequirements: [
      { type: 'text', label: 'Requirements Document', description: 'Detailed functional requirements', required: true },
    ],
    deliverables: ['Functional requirements document', 'User stories'],
  },
  {
    key: '2.2',
    stageNumber: 2,
    stepNumber: 2,
    title: 'Non-Functional Requirements',
    description: 'Define performance, security, scalability, and other non-functional requirements.',
    evidenceRequirements: [
      { type: 'checklist', label: 'NFR Checklist', description: 'Non-functional requirements checklist', required: true },
    ],
    deliverables: ['Non-functional requirements specification'],
  },
  {
    key: '2.3',
    stageNumber: 2,
    stepNumber: 3,
    title: 'Requirements Prioritization',
    description: 'Prioritize requirements using MoSCoW or similar framework.',
    evidenceRequirements: [
      { type: 'text', label: 'Priority Matrix', description: 'Prioritized requirements matrix', required: true },
    ],
    deliverables: ['Prioritized requirements list', 'MVP definition'],
  },
]

// ---------------------------------------------------------------------------
// Stage 3: Architecture
// ---------------------------------------------------------------------------

const stage3Steps: StepConfig[] = [
  {
    key: '3.1',
    stageNumber: 3,
    stepNumber: 1,
    title: 'System Architecture Design',
    description: 'Design high-level system architecture including component interactions and data flow.',
    evidenceRequirements: [
      { type: 'text', label: 'Architecture Document', description: 'System architecture design document', required: true },
    ],
    deliverables: ['Architecture diagram', 'Component specification'],
  },
  {
    key: '3.2',
    stageNumber: 3,
    stepNumber: 2,
    title: 'Technology Stack Selection',
    description: 'Select and justify technology choices for the project.',
    evidenceRequirements: [
      { type: 'text', label: 'Tech Stack Rationale', description: 'Technology selection rationale', required: true },
    ],
    deliverables: ['Technology stack document', 'Trade-off analysis'],
  },
  {
    key: '3.3',
    stageNumber: 3,
    stepNumber: 3,
    title: 'Data Model Design',
    description: 'Design the data model, database schema, and data flow patterns.',
    evidenceRequirements: [
      { type: 'text', label: 'Data Model', description: 'Data model and schema design', required: true },
    ],
    deliverables: ['ERD diagram', 'Schema definition'],
  },
]

// ---------------------------------------------------------------------------
// Stage 4: Implementation
// ---------------------------------------------------------------------------

const stage4Steps: StepConfig[] = [
  {
    key: '4.1',
    stageNumber: 4,
    stepNumber: 1,
    title: 'Core Feature Development',
    description: 'Implement core features based on prioritized requirements.',
    evidenceRequirements: [
      { type: 'text', label: 'Implementation Notes', description: 'Core feature implementation notes and decisions', required: true },
    ],
    deliverables: ['Working core features', 'Code review records'],
  },
  {
    key: '4.2',
    stageNumber: 4,
    stepNumber: 2,
    title: 'Integration Development',
    description: 'Build integrations between components and external services.',
    evidenceRequirements: [
      { type: 'file', label: 'Integration Docs', description: 'Integration documentation and test results', required: true },
    ],
    deliverables: ['Integration documentation', 'API contracts'],
  },
  {
    key: '4.3',
    stageNumber: 4,
    stepNumber: 3,
    title: 'UI/UX Implementation',
    description: 'Implement user interface and user experience based on design specifications.',
    evidenceRequirements: [
      { type: 'text', label: 'UI Implementation', description: 'UI implementation notes and screenshots', required: true },
    ],
    deliverables: ['Implemented UI', 'Accessibility compliance report'],
  },
]

// ---------------------------------------------------------------------------
// Stage 5: Testing
// ---------------------------------------------------------------------------

const stage5Steps: StepConfig[] = [
  {
    key: '5.1',
    stageNumber: 5,
    stepNumber: 1,
    title: 'Unit & Integration Testing',
    description: 'Write and run unit tests and integration tests for all core components.',
    evidenceRequirements: [
      { type: 'text', label: 'Test Report', description: 'Unit and integration test coverage report', required: true },
    ],
    deliverables: ['Test suite', 'Coverage report'],
  },
  {
    key: '5.2',
    stageNumber: 5,
    stepNumber: 2,
    title: 'End-to-End Testing',
    description: 'Conduct end-to-end testing of critical user flows.',
    evidenceRequirements: [
      { type: 'checklist', label: 'E2E Test Checklist', description: 'End-to-end test scenarios checklist', required: true },
    ],
    deliverables: ['E2E test results', 'Bug report'],
  },
  {
    key: '5.3',
    stageNumber: 5,
    stepNumber: 3,
    title: 'Performance Testing',
    description: 'Conduct performance and load testing to validate NFRs.',
    evidenceRequirements: [
      { type: 'text', label: 'Performance Report', description: 'Performance test results and analysis', required: true },
    ],
    deliverables: ['Performance benchmarks', 'Optimization recommendations'],
  },
]

// ---------------------------------------------------------------------------
// Stage 6: Deployment
// ---------------------------------------------------------------------------

const stage6Steps: StepConfig[] = [
  {
    key: '6.1',
    stageNumber: 6,
    stepNumber: 1,
    title: 'Deployment Pipeline Setup',
    description: 'Configure CI/CD pipeline and deployment infrastructure.',
    evidenceRequirements: [
      { type: 'text', label: 'Pipeline Config', description: 'CI/CD pipeline configuration details', required: true },
    ],
    deliverables: ['CI/CD pipeline', 'Deployment scripts'],
  },
  {
    key: '6.2',
    stageNumber: 6,
    stepNumber: 2,
    title: 'Staging Deployment & Validation',
    description: 'Deploy to staging environment and validate functionality.',
    evidenceRequirements: [
      { type: 'checklist', label: 'Staging Checklist', description: 'Staging deployment validation checklist', required: true },
    ],
    deliverables: ['Staging environment', 'Validation report'],
  },
  {
    key: '6.3',
    stageNumber: 6,
    stepNumber: 3,
    title: 'Production Release',
    description: 'Execute production deployment with rollback plan.',
    evidenceRequirements: [
      { type: 'text', label: 'Release Notes', description: 'Production release notes and rollback plan', required: true },
    ],
    deliverables: ['Production deployment', 'Release notes'],
  },
]

// ---------------------------------------------------------------------------
// Stage 7: Monitoring
// ---------------------------------------------------------------------------

const stage7Steps: StepConfig[] = [
  {
    key: '7.1',
    stageNumber: 7,
    stepNumber: 1,
    title: 'Monitoring & Alerting Setup',
    description: 'Configure monitoring dashboards, logging, and alerting rules.',
    evidenceRequirements: [
      { type: 'text', label: 'Monitoring Config', description: 'Monitoring and alerting configuration', required: true },
    ],
    deliverables: ['Monitoring dashboard', 'Alert rules'],
  },
  {
    key: '7.2',
    stageNumber: 7,
    stepNumber: 2,
    title: 'Post-Launch Observation',
    description: 'Monitor system health and user behavior for the initial launch period.',
    evidenceRequirements: [
      { type: 'text', label: 'Observation Report', description: 'Post-launch observation findings', required: true },
    ],
    deliverables: ['Health report', 'User behavior analysis'],
  },
]

// ---------------------------------------------------------------------------
// Stage 8: Retrospective
// ---------------------------------------------------------------------------

const stage8Steps: StepConfig[] = [
  {
    key: '8.1',
    stageNumber: 8,
    stepNumber: 1,
    title: 'Team Retrospective',
    description: 'Conduct team retrospective to gather lessons learned.',
    evidenceRequirements: [
      { type: 'checklist', label: 'Retro Checklist', description: 'Retrospective discussion checklist', required: true },
    ],
    deliverables: ['Retrospective notes', 'Action items'],
  },
  {
    key: '8.2',
    stageNumber: 8,
    stepNumber: 2,
    title: 'Process Improvement Plan',
    description: 'Document process improvements and recommendations for future projects.',
    evidenceRequirements: [
      { type: 'text', label: 'Improvement Plan', description: 'Process improvement recommendations', required: true },
    ],
    deliverables: ['Improvement plan', 'Updated process documentation'],
  },
]

// ---------------------------------------------------------------------------
// Full Stage Configurations
// ---------------------------------------------------------------------------

export const HELIX_STAGES: StageConfig[] = [
  {
    number: 1,
    slug: 'discovery',
    title: 'Planning',
    description: 'Define your project idea, brainstorm with AI, and create a formal Project Brief.',
    steps: stage1Steps,
    gateDescription: 'All planning deliverables completed: project idea, brainstorming output, and project brief saved.',
  },
  {
    number: 2,
    slug: 'requirements',
    title: 'Requirements',
    description: 'Define and prioritize functional and non-functional requirements.',
    steps: stage2Steps,
    gateDescription: 'Requirements documented, reviewed, and prioritized.',
  },
  {
    number: 3,
    slug: 'architecture',
    title: 'Architecture',
    description: 'Design the system architecture, tech stack, and data model.',
    steps: stage3Steps,
    gateDescription: 'Architecture reviewed and approved by technical leads.',
  },
  {
    number: 4,
    slug: 'implementation',
    title: 'Implementation',
    description: 'Build core features, integrations, and user interface.',
    steps: stage4Steps,
    gateDescription: 'All features implemented and code reviewed.',
  },
  {
    number: 5,
    slug: 'testing',
    title: 'Testing',
    description: 'Validate through unit, integration, E2E, and performance testing.',
    steps: stage5Steps,
    gateDescription: 'All tests passing with adequate coverage.',
  },
  {
    number: 6,
    slug: 'deployment',
    title: 'Deployment',
    description: 'Set up CI/CD, validate in staging, and deploy to production.',
    steps: stage6Steps,
    gateDescription: 'Production deployment validated and stable.',
  },
  {
    number: 7,
    slug: 'monitoring',
    title: 'Monitoring',
    description: 'Monitor system health and observe post-launch behavior.',
    steps: stage7Steps,
    gateDescription: 'System stable with monitoring in place.',
  },
  {
    number: 8,
    slug: 'retrospective',
    title: 'Retrospective',
    description: 'Reflect on the process and document improvements.',
    steps: stage8Steps,
    gateDescription: 'Retrospective completed with improvement plan.',
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
