import { NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { ForbiddenError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params
    const { isAdmin } = await getOrgAndValidateAccess(orgId)

    if (!isAdmin) {
      throw new ForbiddenError('Only admins can update organization settings')
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (name.length === 0 || name.length > 255) {
        return Response.json(
          { error: 'Name must be between 1 and 255 characters' },
          { status: 400 }
        )
      }
      updates.name = name
    }

    if (body.description !== undefined) {
      updates.description = body.description ? String(body.description).trim() : null
    }

    if (body.avatar_url !== undefined) {
      updates.avatar_url = body.avatar_url ? String(body.avatar_url).trim() : null
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { data: org, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ organization: org })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params
    const { user, isAdmin } = await getOrgAndValidateAccess(orgId)

    if (!isAdmin) {
      throw new ForbiddenError('Only admins can delete an organization')
    }

    const supabase = await createServiceClient()

    // Verify user is the founding admin (earliest joined_at)
    const { data: admins } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .order('joined_at', { ascending: true })
      .limit(1)

    if (!admins?.length || admins[0].user_id !== user.id) {
      throw new ForbiddenError('Only the organization owner can delete it')
    }

    // Delete the organization (cascading deletes handle members, projects, etc.)
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
