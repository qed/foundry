import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { RoomClient } from '@/components/room/room-client'

interface RoomPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { projectId } = await params
  await requireAuth()
  const supabase = createServiceClient()

  // Fetch blueprint stats for initial render
  const { data: blueprints } = await supabase
    .from('blueprints')
    .select('blueprint_type, status')
    .eq('project_id', projectId)

  const bpList = blueprints || []

  const stats = {
    foundations: bpList.filter((bp) => bp.blueprint_type === 'foundation').length,
    systemDiagrams: bpList.filter((bp) => bp.blueprint_type === 'system_diagram').length,
    featureBlueprints: bpList.filter((bp) => bp.blueprint_type === 'feature').length,
    completionPercent:
      bpList.length > 0
        ? Math.round(
            (bpList.filter((bp) => bp.status === 'approved' || bp.status === 'implemented').length /
              bpList.length) *
              100
          )
        : 0,
  }

  return <RoomClient projectId={projectId} initialStats={stats} />
}
