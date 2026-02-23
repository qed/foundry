import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

/**
 * GET /api/projects/[projectId]/feedback/tags
 * Returns unique tags used across all feedback in this project.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Fetch all non-empty tag arrays
    const { data: rows, error } = await supabase
      .from('feedback_submissions')
      .select('tags')
      .eq('project_id', projectId)
      .not('tags', 'is', null)

    if (error) {
      console.error('Error fetching feedback tags:', error)
      return Response.json({ error: 'Failed to fetch tags' }, { status: 500 })
    }

    // Flatten and deduplicate
    const tagSet = new Set<string>()
    for (const row of rows || []) {
      if (Array.isArray(row.tags)) {
        for (const tag of row.tags) {
          if (typeof tag === 'string' && tag.trim()) {
            tagSet.add(tag.trim())
          }
        }
      }
    }

    return Response.json({ tags: Array.from(tagSet).sort() })
  } catch (err) {
    return handleAuthError(err)
  }
}
