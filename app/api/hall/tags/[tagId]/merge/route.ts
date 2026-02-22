import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const user = await requireAuth()
    const { tagId } = await params
    const { targetTagId } = await request.json()

    if (!targetTagId) {
      return Response.json(
        { error: 'Target tag ID is required' },
        { status: 400 }
      )
    }

    if (tagId === targetTagId) {
      return Response.json(
        { error: 'Cannot merge a tag into itself' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Fetch both tags
    const { data: sourceTag } = await supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single()

    if (!sourceTag) {
      return Response.json(
        { error: 'Source tag not found' },
        { status: 404 }
      )
    }

    const { data: targetTag } = await supabase
      .from('tags')
      .select('*')
      .eq('id', targetTagId)
      .single()

    if (!targetTag) {
      return Response.json(
        { error: 'Target tag not found' },
        { status: 404 }
      )
    }

    // Both tags must be in the same project
    if (sourceTag.project_id !== targetTag.project_id) {
      return Response.json(
        { error: 'Tags must be in the same project' },
        { status: 400 }
      )
    }

    // Verify user belongs to project
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', sourceTag.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    // Get all idea_tags for the source tag
    const { data: sourceLinks } = await supabase
      .from('idea_tags')
      .select('idea_id')
      .eq('tag_id', tagId)

    // Get existing idea_tags for the target tag (to avoid duplicates)
    const { data: targetLinks } = await supabase
      .from('idea_tags')
      .select('idea_id')
      .eq('tag_id', targetTagId)

    const targetIdeaIds = new Set((targetLinks || []).map((l) => l.idea_id))

    // Insert new links for ideas that don't already have the target tag
    const newLinks = (sourceLinks || [])
      .filter((l) => !targetIdeaIds.has(l.idea_id))
      .map((l) => ({
        idea_id: l.idea_id,
        tag_id: targetTagId,
      }))

    if (newLinks.length > 0) {
      const { error: insertError } = await supabase
        .from('idea_tags')
        .insert(newLinks)

      if (insertError) {
        console.error('Error inserting merged links:', insertError)
        return Response.json(
          { error: 'Failed to merge tag links' },
          { status: 500 }
        )
      }
    }

    // Delete old idea_tags
    const { error: unlinkError } = await supabase
      .from('idea_tags')
      .delete()
      .eq('tag_id', tagId)

    if (unlinkError) {
      console.error('Error removing source links:', unlinkError)
      return Response.json(
        { error: 'Failed to remove old tag links' },
        { status: 500 }
      )
    }

    // Delete the source tag
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)

    if (deleteError) {
      console.error('Error deleting source tag:', deleteError)
      return Response.json(
        { error: 'Failed to delete source tag' },
        { status: 500 }
      )
    }

    return Response.json({
      merged: true,
      sourceTag,
      targetTag,
      ideasMoved: newLinks.length,
      ideasAlreadyTagged: (sourceLinks || []).length - newLinks.length,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
