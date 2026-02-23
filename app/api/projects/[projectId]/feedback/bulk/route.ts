import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'

const VALID_CATEGORIES = ['bug', 'feature_request', 'ux_issue', 'performance', 'other', 'uncategorized']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireAuth()
  const { projectId } = await params
  const supabase = await createServiceClient()

  // Verify membership
  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Not a project member' }, { status: 403 })
  }

  const body = await req.json()
  const { ids, operation, data } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 items per bulk operation' }, { status: 400 })
  }

  // Verify all feedback belong to this project
  const { data: items, error: fetchError } = await supabase
    .from('feedback_submissions')
    .select('id, tags')
    .eq('project_id', projectId)
    .in('id', ids)

  if (fetchError || !items || items.length !== ids.length) {
    return NextResponse.json({ error: 'Some feedback items not found in this project' }, { status: 400 })
  }

  switch (operation) {
    case 'categorize': {
      const category = data?.category
      if (!category || !VALID_CATEGORIES.includes(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      const { error } = await supabase
        .from('feedback_submissions')
        .update({ category, ai_suggested: false })
        .in('id', ids)
        .eq('project_id', projectId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      break
    }

    case 'add_tags': {
      const newTags = data?.tags
      if (!Array.isArray(newTags) || newTags.length === 0) {
        return NextResponse.json({ error: 'tags must be a non-empty array' }, { status: 400 })
      }
      // Update each item individually to merge + deduplicate tags
      for (const item of items) {
        const existing = (item.tags as string[]) || []
        const merged = [...new Set([...existing, ...newTags])]
        await supabase
          .from('feedback_submissions')
          .update({ tags: merged })
          .eq('id', item.id)
      }
      break
    }

    case 'archive': {
      const { error } = await supabase
        .from('feedback_submissions')
        .update({ status: 'archived' })
        .in('id', ids)
        .eq('project_id', projectId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      break
    }

    case 'delete': {
      const { error } = await supabase
        .from('feedback_submissions')
        .delete()
        .in('id', ids)
        .eq('project_id', projectId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      break
    }

    default:
      return NextResponse.json(
        { error: 'Invalid operation. Must be categorize, add_tags, archive, or delete' },
        { status: 400 }
      )
  }

  return NextResponse.json({ success: true, count: ids.length })
}
