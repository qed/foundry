import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET(
  _request: NextRequest,
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

    const { data: keys, error } = await supabase
      .from('app_keys')
      .select('id, name, key_value, environment, description, status, created_by, created_at, revoked_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: 'Failed to fetch app keys' }, { status: 500 })
    }

    // Mask key values — only show first 8 and last 4 chars
    const maskedKeys = (keys || []).map((k) => ({
      ...k,
      key_preview: maskKey(k.key_value),
      key_value: undefined,
    }))

    return Response.json({ keys: maskedKeys })
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
    const body = await request.json()
    const { name, environment, description } = body
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return Response.json({ error: 'Name is required (min 2 chars)' }, { status: 400 })
    }

    if (name.trim().length > 100) {
      return Response.json({ error: 'Name must be 100 chars or less' }, { status: 400 })
    }

    const validEnvs = ['production', 'staging', 'development', 'custom']
    const env = environment && validEnvs.includes(environment) ? environment : 'production'

    if (description && typeof description === 'string' && description.length > 500) {
      return Response.json({ error: 'Description must be 500 chars or less' }, { status: 400 })
    }

    // Generate key: hf_ + 28 random hex chars = 31 chars
    const keyValue = `hf_${randomBytes(14).toString('hex')}`

    const { data: appKey, error } = await supabase
      .from('app_keys')
      .insert({
        project_id: projectId,
        key_value: keyValue,
        name: name.trim(),
        environment: env,
        description: description?.trim() || null,
        created_by: user.id,
      })
      .select('id, name, environment, description, status, created_at')
      .single()

    if (error) {
      console.error('Error creating app key:', error)
      return Response.json({ error: 'Failed to create app key' }, { status: 500 })
    }

    // Return the raw key ONCE — it cannot be retrieved again from the API
    return Response.json({
      ...appKey,
      key_value: keyValue,
    }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}

function maskKey(key: string): string {
  if (key.length < 12) return '****'
  return `${key.slice(0, 8)}****${key.slice(-4)}`
}
