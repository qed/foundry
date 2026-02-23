import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { MentionMatch, MentionType } from '@/lib/mentions/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    const typesParam = searchParams.get('types')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)
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

    const allowedTypes: MentionType[] = typesParam
      ? (typesParam.split(',') as MentionType[])
      : ['user', 'requirement_doc', 'blueprint', 'work_order', 'artifact']

    const matches: MentionMatch[] = []

    // Search users (project members)
    if (allowedTypes.includes('user')) {
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)

      if (members && members.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', members.map(m => m.user_id))

        for (const p of profiles || []) {
          if (!query || p.display_name.toLowerCase().includes(query)) {
            matches.push({
              type: 'user',
              id: p.id,
              name: p.display_name,
              display: p.display_name,
              avatar: p.avatar_url,
            })
          }
        }
      }
    }

    // Search requirement documents
    if (allowedTypes.includes('requirement_doc')) {
      let reqQuery = supabase
        .from('requirements_documents')
        .select('id, title')
        .eq('project_id', projectId)
        .limit(limit)

      if (query) {
        reqQuery = reqQuery.ilike('title', `%${query}%`)
      }

      const { data: docs } = await reqQuery

      for (const d of docs || []) {
        matches.push({
          type: 'requirement_doc',
          id: d.id,
          name: d.title,
          display: d.title,
        })
      }
    }

    // Search blueprints
    if (allowedTypes.includes('blueprint')) {
      let bpQuery = supabase
        .from('blueprints')
        .select('id, title')
        .eq('project_id', projectId)
        .limit(limit)

      if (query) {
        bpQuery = bpQuery.ilike('title', `%${query}%`)
      }

      const { data: bps } = await bpQuery

      for (const b of bps || []) {
        matches.push({
          type: 'blueprint',
          id: b.id,
          name: b.title,
          display: b.title,
        })
      }
    }

    // Search work orders
    if (allowedTypes.includes('work_order')) {
      let woQuery = supabase
        .from('work_orders')
        .select('id, title')
        .eq('project_id', projectId)
        .limit(limit)

      if (query) {
        woQuery = woQuery.ilike('title', `%${query}%`)
      }

      const { data: wos } = await woQuery

      for (const w of wos || []) {
        matches.push({
          type: 'work_order',
          id: w.id,
          name: w.title,
          display: w.title,
        })
      }
    }

    // Search artifacts
    if (allowedTypes.includes('artifact')) {
      let artQuery = supabase
        .from('artifacts')
        .select('id, name')
        .eq('project_id', projectId)
        .limit(limit)

      if (query) {
        artQuery = artQuery.ilike('name', `%${query}%`)
      }

      const { data: arts } = await artQuery

      for (const a of arts || []) {
        matches.push({
          type: 'artifact',
          id: a.id,
          name: a.name,
          display: a.name,
        })
      }
    }

    // Sort: users first, then by name
    matches.sort((a, b) => {
      if (a.type === 'user' && b.type !== 'user') return -1
      if (a.type !== 'user' && b.type === 'user') return 1
      return a.name.localeCompare(b.name)
    })

    return Response.json({
      matches: matches.slice(0, limit),
      total: matches.length,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}
