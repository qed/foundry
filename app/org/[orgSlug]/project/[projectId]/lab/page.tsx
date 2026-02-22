import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { LabClient } from '@/components/lab/lab-client'

interface LabPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function LabPage({ params }: LabPageProps) {
  const { projectId } = await params
  await requireAuth()
  const supabase = createServiceClient()

  // Fetch feedback stats for initial render
  const { data: feedback } = await supabase
    .from('feedback_submissions')
    .select('status')
    .eq('project_id', projectId)

  const fbList = feedback || []

  const initialStats = {
    total: fbList.length,
    newCount: fbList.filter((f) => f.status === 'new').length,
    triaged: fbList.filter((f) => f.status === 'triaged').length,
    converted: fbList.filter((f) => f.status === 'converted').length,
  }

  return <LabClient projectId={projectId} initialStats={initialStats} />
}
