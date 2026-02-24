'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Step {
  title: string
  description: string
}

const MODULE_STEPS: Record<string, Step[]> = {
  hall: [
    { title: 'Welcome to The Hall', description: 'The Hall is where your product ideas live. Create, discuss, and develop ideas here before they become features.' },
    { title: 'Create Ideas', description: 'Click the + button to create a new idea. Add a title, description, and tags to organize your thoughts.' },
    { title: 'Engage & Mature', description: 'Ideas grow through engagement — add comments, connect related ideas, and tag them. Watch the maturity score rise.' },
    { title: 'Promote to Features', description: 'When an idea is mature enough, promote it to the Pattern Shop where it becomes a real feature with requirements.' },
  ],
  shop: [
    { title: 'Welcome to Pattern Shop', description: 'Pattern Shop transforms ideas into detailed, actionable features with requirements and documentation.' },
    { title: 'Build Your Feature Tree', description: 'Organize features into a hierarchical tree. Drag and drop to restructure your product architecture.' },
    { title: 'Write Requirements', description: 'Each feature gets detailed requirements with acceptance criteria. Use the AI agent to generate them automatically.' },
    { title: 'Export & Share', description: 'Export your feature tree and requirements as Markdown, CSV, or HTML for stakeholders.' },
  ],
  room: [
    { title: 'Welcome to Control Room', description: 'Control Room holds the technical blueprints that guide your implementation.' },
    { title: 'Create Blueprints', description: 'Create foundation, feature, or system diagram blueprints linked to your requirements.' },
    { title: 'Collaborate', description: 'Review blueprints with your team. Add comments, track versions, and detect drift from requirements.' },
    { title: 'Extract Work Orders', description: 'When blueprints are approved, extract work orders to the Assembly Floor to start building.' },
  ],
  floor: [
    { title: 'Welcome to Assembly Floor', description: 'The Assembly Floor is your work tracking dashboard. Manage work orders through phases until completion.' },
    { title: 'Kanban Board', description: 'View and drag work orders across status columns: backlog, ready, in progress, review, and done.' },
    { title: 'Track Phases', description: 'Organize work into phases with burndown charts. Monitor velocity and progress toward milestones.' },
    { title: 'Assign & Prioritize', description: 'Assign work orders to team members and set priorities to keep the team focused.' },
  ],
  lab: [
    { title: 'Welcome to Insights Lab', description: 'Insights Lab collects and analyzes user feedback to inform your product decisions.' },
    { title: 'Collect Feedback', description: 'Feedback arrives via API, Slack integration, or manual entry. It lands in your inbox automatically.' },
    { title: 'Triage & Prioritize', description: 'Review, categorize, and prioritize feedback. The AI agent can auto-categorize and score priority.' },
    { title: 'Convert to Action', description: 'Convert high-value feedback directly into work orders or features with one click.' },
  ],
}

interface GettingStartedModalProps {
  module: string
  onClose: () => void
}

export function GettingStartedModal({ module, onClose }: GettingStartedModalProps) {
  const [step, setStep] = useState(0)
  const steps = MODULE_STEPS[module] || MODULE_STEPS.hall

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-xl p-6 sm:p-8 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-tertiary hover:text-text-primary"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-primary mb-2">{steps[step].title}</h2>
          <p className="text-text-secondary text-sm leading-relaxed">{steps[step].description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent-cyan' : 'bg-bg-tertiary'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button variant="primary" size="sm" onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onClose}>
              Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
