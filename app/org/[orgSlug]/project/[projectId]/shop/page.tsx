import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ShopClient } from '@/components/shop/shop-client'

interface ShopPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { orgSlug, projectId } = await params
  await requireAuth()
  const supabase = createServiceClient()

  // Fetch feature node stats
  const { data: nodes } = await supabase
    .from('feature_nodes')
    .select('level, status')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  const nodeList = nodes || []

  const statusBreakdown = {
    not_started: nodeList.filter((n) => n.status === 'not_started').length,
    in_progress: nodeList.filter((n) => n.status === 'in_progress').length,
    complete: nodeList.filter((n) => n.status === 'complete').length,
    blocked: nodeList.filter((n) => n.status === 'blocked').length,
  }

  const total = nodeList.length

  const stats = {
    epics: nodeList.filter((n) => n.level === 'epic').length,
    features: nodeList.filter((n) => n.level === 'feature').length,
    subFeatures: nodeList.filter((n) => n.level === 'sub_feature').length,
    tasks: nodeList.filter((n) => n.level === 'task').length,
    completionPercent: total > 0 ? Math.round((statusBreakdown.complete / total) * 100) : 0,
    inProgressPercent: total > 0 ? Math.round((statusBreakdown.in_progress / total) * 100) : 0,
    blockedNodeCount: statusBreakdown.blocked,
    statusBreakdown,
  }

  return (
    <ShopClient
      projectId={projectId}
      orgSlug={orgSlug}
      initialStats={stats}
      hasFeatureNodes={nodeList.length > 0}
    />
  )
}
