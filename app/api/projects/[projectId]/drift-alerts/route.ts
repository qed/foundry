import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'new' | 'acknowledged' | 'resolved' | null
    const alertType = searchParams.get('alertType') as 'requirement_changed' | 'code_changed' | null
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | null
    const blueprintId = searchParams.get('blueprintId')

    let query = supabase
      .from('drift_alerts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (alertType) query = query.eq('alert_type', alertType)
    if (severity) query = query.eq('severity', severity)
    if (blueprintId) query = query.eq('blueprint_id', blueprintId)

    const { data: alerts, error } = await query

    if (error) {
      console.error('Error fetching drift alerts:', error)
      return Response.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    // Enrich with blueprint and requirement doc titles
    const blueprintIds = [...new Set((alerts || []).map((a) => a.blueprint_id))]
    const reqDocIds = [...new Set((alerts || []).filter((a) => a.requirement_doc_id).map((a) => a.requirement_doc_id!))]

    const [bpResult, reqResult] = await Promise.all([
      blueprintIds.length > 0
        ? supabase.from('blueprints').select('id, title, status').in('id', blueprintIds)
        : Promise.resolve({ data: [] }),
      reqDocIds.length > 0
        ? supabase.from('requirements_documents').select('id, title, doc_type').in('id', reqDocIds)
        : Promise.resolve({ data: [] }),
    ])

    const bpMap = new Map((bpResult.data || []).map((bp) => [bp.id, bp]))
    const reqMap = new Map((reqResult.data || []).map((r) => [r.id, r]))

    const enriched = (alerts || []).map((alert) => ({
      ...alert,
      blueprint: bpMap.get(alert.blueprint_id) || null,
      requirement_doc: alert.requirement_doc_id ? reqMap.get(alert.requirement_doc_id) || null : null,
    }))

    // Also return counts by status
    const counts = {
      new: (alerts || []).filter((a) => a.status === 'new').length,
      acknowledged: (alerts || []).filter((a) => a.status === 'acknowledged').length,
      resolved: (alerts || []).filter((a) => a.status === 'resolved').length,
      total: (alerts || []).length,
    }

    return Response.json({ alerts: enriched, counts })
  } catch (err) {
    return handleAuthError(err)
  }
}
