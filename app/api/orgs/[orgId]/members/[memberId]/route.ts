import { NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { ForbiddenError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ orgId: string; memberId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, memberId } = await params
    const { isAdmin, user } = await getOrgAndValidateAccess(orgId)

    if (!isAdmin) {
      throw new ForbiddenError('Only admins can change member roles')
    }

    const { role } = await request.json()

    if (!role || !['admin', 'member'].includes(role)) {
      return Response.json(
        { error: 'Role must be "admin" or "member"' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Get the target member
    const { data: target } = await supabase
      .from('org_members')
      .select('id, user_id, role')
      .eq('id', memberId)
      .eq('org_id', orgId)
      .single()

    if (!target) {
      return Response.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot change own role
    if (target.user_id === user.id) {
      return Response.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    // If demoting from admin, ensure at least one admin remains
    if (target.role === 'admin' && role !== 'admin') {
      const { count } = await supabase
        .from('org_members')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('role', 'admin')

      if ((count || 0) <= 1) {
        return Response.json(
          { error: 'Cannot remove the last admin' },
          { status: 400 }
        )
      }
    }

    const { data: updated, error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ member: updated })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, memberId } = await params
    const { isAdmin, user } = await getOrgAndValidateAccess(orgId)

    if (!isAdmin) {
      throw new ForbiddenError('Only admins can remove members')
    }

    const supabase = await createServiceClient()

    // Get the target member
    const { data: target } = await supabase
      .from('org_members')
      .select('id, user_id, role')
      .eq('id', memberId)
      .eq('org_id', orgId)
      .single()

    if (!target) {
      return Response.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot remove yourself
    if (target.user_id === user.id) {
      return Response.json(
        { error: 'Cannot remove yourself from the organization' },
        { status: 400 }
      )
    }

    // Cannot remove last admin
    if (target.role === 'admin') {
      const { count } = await supabase
        .from('org_members')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('role', 'admin')

      if ((count || 0) <= 1) {
        return Response.json(
          { error: 'Cannot remove the last admin' },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
