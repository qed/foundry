import { requireAuth } from '@/lib/auth/server'
import { SlackIntegrationConfig } from '@/components/settings/slack-integration-config'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function IntegrationsSettingsPage({ params }: PageProps) {
  await requireAuth()
  const { projectId } = await params

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Integrations</h2>
        <p className="text-sm text-text-tertiary mt-1">
          Connect external services to receive notifications and updates from your project.
        </p>
      </div>

      <SlackIntegrationConfig projectId={projectId} />
    </div>
  )
}
