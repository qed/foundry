import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * POST /api/hall/bulk/tag
 * Add tags to multiple ideas (union — no duplicates).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { projectId, ideaIds, tagIds } = await request.json()

    if (!projectId || !Array.isArray(ideaIds) || ideaIds.length === 0) {
      return Response.json({ error: 'projectId and ideaIds are required' }, { status: 400 })
    }
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return Response.json({ error: 'tagIds are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Verify all ideas belong to this project
    const { data: ideas } = await supabase
      .from('ideas')
      .select('id')
      .eq('project_id', projectId)
      .in('id', ideaIds)

    if (!ideas || ideas.length !== ideaIds.length) {
      return Response.json({ error: 'Some ideas not found in project' }, { status: 400 })
    }

    // Get existing idea_tags to avoid duplicates
    const { data: existing } = await supabase
      .from('idea_tags')
      .select('idea_id, tag_id')
      .in('idea_id', ideaIds)
      .in('tag_id', tagIds)

    const existingSet = new Set(
      (existing || []).map((r) => `${r.idea_id}:${r.tag_id}`)
    )

    // Build insert rows (union — skip duplicates)
    const rows: { idea_id: string; tag_id: string }[] = []
    for (const ideaId of ideaIds) {
      for (const tagId of tagIds) {
        if (!existingSet.has(`${ideaId}:${tagId}`)) {
          rows.push({ idea_id: ideaId, tag_id: tagId })
        }
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('idea_tags').insert(rows)
      if (error) {
        console.error('Bulk tag error:', error)
        return Response.json({ error: 'Failed to tag ideas' }, { status: 500 })
      }
    }

    return Response.json({
      tagged: ideaIds.length,
      newLinks: rows.length,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
