import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

/**
 * GET /api/projects/[projectId]/feedback/analytics/export
 * Export feedback data as CSV or JSON.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'csv'
    const dateFrom = url.searchParams.get('dateFrom') || ''
    const dateTo = url.searchParams.get('dateTo') || ''

    let query = supabase
      .from('feedback_submissions')
      .select('id, content, category, status, score, tags, submitter_name, submitter_email, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data: items, error } = await query

    if (error) {
      return Response.json({ error: 'Failed to export' }, { status: 500 })
    }

    const rows = items || []

    const fromLabel = dateFrom ? dateFrom.split('T')[0] : 'all'
    const toLabel = dateTo ? dateTo.split('T')[0] : 'now'

    if (format === 'json') {
      const body = JSON.stringify(rows, null, 2)
      return new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="feedback-${fromLabel}-to-${toLabel}.json"`,
        },
      })
    }

    // CSV
    const headers = ['id', 'content', 'category', 'status', 'score', 'tags', 'submitter_name', 'submitter_email', 'created_at', 'updated_at']
    const csvRows = [headers.join(',')]
    for (const row of rows) {
      const values = headers.map((h) => {
        const val = (row as Record<string, unknown>)[h]
        if (val == null) return ''
        if (Array.isArray(val)) return `"${val.join('; ')}"`
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      csvRows.push(values.join(','))
    }

    return new Response(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="feedback-${fromLabel}-to-${toLabel}.csv"`,
      },
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
