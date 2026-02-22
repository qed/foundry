import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { buildTechReqTemplate, TECH_REQ_CATEGORIES, type TechReqCategory } from '@/lib/shop/tech-req-templates'

const VALID_CATEGORIES = TECH_REQ_CATEGORIES.map((c) => c.key)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const categoryFilter = searchParams.get('category')
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

    let query = supabase
      .from('requirements_documents')
      .select('id, title, category, created_at, updated_at')
      .eq('project_id', projectId)
      .eq('doc_type', 'technical_requirement')
      .order('updated_at', { ascending: false })

    if (categoryFilter && VALID_CATEGORIES.includes(categoryFilter as TechReqCategory)) {
      query = query.eq('category', categoryFilter as TechReqCategory)
    }

    const { data: docs, error } = await query

    if (error) {
      console.error('Error fetching technical requirements:', error)
      return Response.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    // Group by category
    const categories: Record<string, typeof docs> = {}
    for (const cat of TECH_REQ_CATEGORIES) {
      categories[cat.key] = []
    }
    for (const doc of docs || []) {
      const cat = doc.category || 'auth_security'
      if (!categories[cat]) categories[cat] = []
      categories[cat].push(doc)
    }

    return Response.json({ categories })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { title, category } = await request.json()
    const supabase = createServiceClient()

    if (!title || typeof title !== 'string' || !title.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!category || !VALID_CATEGORIES.includes(category as TechReqCategory)) {
      return Response.json({ error: 'Valid category is required' }, { status: 400 })
    }

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

    const content = buildTechReqTemplate(title.trim(), category as TechReqCategory)

    const { data: doc, error } = await supabase
      .from('requirements_documents')
      .insert({
        project_id: projectId,
        feature_node_id: null,
        doc_type: 'technical_requirement' as const,
        title: title.trim(),
        content,
        category: category as TechReqCategory,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating technical requirement:', error)
      return Response.json({ error: 'Failed to create' }, { status: 500 })
    }

    return Response.json(doc, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
