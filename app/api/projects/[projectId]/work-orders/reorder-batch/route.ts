import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const body = await request.json()
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Validate payload
    const items = body.items
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: 'items array is required' },
        { status: 400 }
      )
    }

    for (const item of items) {
      if (!item.id || typeof item.position !== 'number') {
        return Response.json(
          { error: 'Each item must have id and position' },
          { status: 400 }
        )
      }
    }

    // Update positions — each update verifies project ownership
    const results = await Promise.all(
      items.map((item: { id: string; position: number }) =>
        supabase
          .from('work_orders')
          .update({ position: item.position })
          .eq('id', item.id)
          .eq('project_id', projectId)
      )
    )

    const failed = results.filter((r) => r.error)
    if (failed.length > 0) {
      console.error('Reorder batch errors:', failed.map((f) => f.error))
      return Response.json(
        { error: 'Some position updates failed' },
        { status: 500 }
      )
    }

    return Response.json({ success: true, updated: items.length })
  } catch (err) {
    return handleAuthError(err)
  }
}
