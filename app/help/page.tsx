import { KeyboardShortcuts } from '@/components/onboarding/keyboard-shortcuts'

const MODULES = [
  {
    name: 'The Hall',
    description: 'Capture and develop product ideas',
    topics: [
      { title: 'Creating Ideas', content: 'Use the + button to create a new idea. Give it a clear title, optional description, and tags for organization.' },
      { title: 'Idea Maturity', content: 'Ideas are scored on completeness (body, tags, connections, artifacts), engagement (comments, views), and freshness. Mature ideas are ready for promotion.' },
      { title: 'Promoting Ideas', content: 'When an idea is ready, promote it to the Pattern Shop where it becomes a feature node in your product tree.' },
      { title: 'Tags & Filtering', content: 'Create tags to organize ideas by theme. Use the filter bar to find ideas by status, tag, or sort order.' },
    ],
  },
  {
    name: 'Pattern Shop',
    description: 'Define features and write requirements',
    topics: [
      { title: 'Feature Tree', content: 'Build a hierarchical feature tree. Drag and drop to reorganize. Each node represents a feature of your product.' },
      { title: 'Requirements', content: 'Each feature can have a requirements document with rich text. Use the AI agent to generate initial requirements from your feature description.' },
      { title: 'Status Tracking', content: 'Track each feature through draft, in-progress, done, and blocked statuses. View statistics to understand coverage.' },
      { title: 'Import & Export', content: 'Import feature trees from CSV or Markdown. Export your entire product structure for stakeholder review.' },
    ],
  },
  {
    name: 'Control Room',
    description: 'Create technical blueprints',
    topics: [
      { title: 'Blueprint Types', content: 'Foundation blueprints cover architecture. Feature blueprints detail specific implementations. System diagrams use Mermaid syntax.' },
      { title: 'Version History', content: 'Every edit creates a version. Compare any two versions with word-level diff highlighting.' },
      { title: 'Drift Detection', content: 'When requirements change, drift alerts notify you that blueprints may need updating.' },
      { title: 'Templates', content: 'Create and share blueprint templates across your organization for consistent documentation.' },
    ],
  },
  {
    name: 'Assembly Floor',
    description: 'Track work orders and progress',
    topics: [
      { title: 'Work Orders', content: 'Work orders are extracted from blueprints or created manually. Each represents a concrete task to implement.' },
      { title: 'Kanban Board', content: 'Drag work orders across status columns. The board supports backlog, ready, in progress, review, and done.' },
      { title: 'Phases & Burndown', content: 'Group work orders into phases (sprints). View burndown charts to track velocity and predict completion.' },
      { title: 'Assignment', content: 'Assign work orders to team members. Set priorities and track who is working on what.' },
    ],
  },
  {
    name: 'Insights Lab',
    description: 'Collect and analyze feedback',
    topics: [
      { title: 'Feedback Collection', content: 'Collect feedback via the API, Slack integration, or manual entry. Each submission includes content, category, and priority.' },
      { title: 'Triage & Categories', content: 'Review incoming feedback in the inbox. Categorize as bug, feature request, improvement, or question.' },
      { title: 'Priority Scoring', content: 'AI-powered priority scoring considers frequency, severity, and feature importance to rank feedback.' },
      { title: 'Conversions', content: 'Convert valuable feedback directly into work orders or features with context preserved.' },
    ],
  },
]

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Help & Documentation</h1>
        <p className="text-text-secondary mb-10">
          Learn how to use Helix Foundry to build better products.
        </p>

        {/* Module guides */}
        <div className="space-y-12">
          {MODULES.map((mod) => (
            <section key={mod.name}>
              <h2 className="text-xl font-semibold mb-1">{mod.name}</h2>
              <p className="text-text-tertiary text-sm mb-4">{mod.description}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {mod.topics.map((topic) => (
                  <div key={topic.title} className="glass-panel rounded-lg p-4">
                    <h3 className="font-medium text-text-primary mb-1">{topic.title}</h3>
                    <p className="text-text-secondary text-sm leading-relaxed">{topic.content}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Keyboard shortcuts */}
        <div className="mt-12 pt-8 border-t border-border-default max-w-sm">
          <KeyboardShortcuts />
        </div>

        {/* Support */}
        <div className="mt-12 pt-8 border-t border-border-default">
          <h2 className="text-xl font-semibold mb-3">Need More Help?</h2>
          <div className="text-text-secondary text-sm space-y-2">
            <p>
              API Documentation:{' '}
              <a href="/docs/api" className="text-accent-cyan hover:underline">/docs/api</a>
            </p>
            <p>
              For support, contact your organization administrator.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
