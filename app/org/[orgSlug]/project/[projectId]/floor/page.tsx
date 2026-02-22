import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { FloorClient } from '@/components/floor/floor-client'

interface FloorPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function FloorPage({ params }: FloorPageProps) {
  const { projectId } = await params
  await requireAuth()
  const supabase = createServiceClient()

  // Fetch work order stats for initial render
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('status')
    .eq('project_id', projectId)

  const woList = workOrders || []

  const initialStats = {
    totalWorkOrders: woList.length,
    doneWorkOrders: woList.filter((wo) => wo.status === 'done').length,
  }

  return <FloorClient projectId={projectId} initialStats={initialStats} />
}
