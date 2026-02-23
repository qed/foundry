import { requireAuth } from '@/lib/auth/server'
import { AgentInstructionsConfig } from '@/components/settings/agent-instructions-config'

interface AgentSettingsPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function AgentSettingsPage({ params }: AgentSettingsPageProps) {
  const { projectId } = await params
  await requireAuth()

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Agent Configuration</h1>
        <p className="text-sm text-text-tertiary mt-1">
          Customize how AI agents generate content for this project.
        </p>
      </div>

      <AgentInstructionsConfig projectId={projectId} />
    </div>
  )
}
