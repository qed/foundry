import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return Response.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Find invitation by token
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (!invitation) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.status === 'accepted') {
      return Response.json({ error: 'This invitation has already been accepted' }, { status: 409 })
    }

    if (invitation.status === 'revoked') {
      return Response.json({ error: 'This invitation has been revoked' }, { status: 400 })
    }

    if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
      if (invitation.status !== 'expired') {
        await supabase
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)
      }
      return Response.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    // Fetch organization separately
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', invitation.organization_id)
      .single()

    // Verify email matches
    const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
    if (!authUser?.user?.email) {
      return Response.json({ error: 'Could not verify your email address' }, { status: 400 })
    }

    if (authUser.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return Response.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      )
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', invitation.organization_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_by: user.id, accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      return Response.json({
        success: true,
        organization_id: invitation.organization_id,
        org_slug: org?.slug,
        message: 'You are already a member of this organization',
      })
    }

    // Add as org member
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role as 'admin' | 'member',
      })

    if (memberError) {
      console.error('[Invitations] Failed to add member:', memberError)
      return Response.json({ error: 'Failed to join organization' }, { status: 500 })
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    return Response.json({
      success: true,
      organization_id: invitation.organization_id,
      org_slug: org?.slug,
      message: `Welcome to ${org?.name || 'the organization'}!`,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
