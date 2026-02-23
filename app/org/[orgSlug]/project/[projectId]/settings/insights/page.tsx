import { requireAuth } from '@/lib/auth/server'
import { AppKeySettings } from '@/components/lab/app-key-settings'

interface InsightsSettingsPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function InsightsSettingsPage({ params }: InsightsSettingsPageProps) {
  const { projectId } = await params
  await requireAuth()

  return <AppKeySettings projectId={projectId} />
}
