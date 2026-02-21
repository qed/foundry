import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { inviteCode } = await request.json()

    if (!inviteCode || typeof inviteCode !== 'string' || !inviteCode.trim()) {
      return Response.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS — joining user has no access to the org yet
    const supabase = createServiceClient()

    // MVP invite code format: base64(orgId)
    let orgId: string
    try {
      orgId = Buffer.from(inviteCode.trim(), 'base64').toString('utf-8')
    } catch {
      return Response.json(
        { error: 'Invalid invite code format' },
        { status: 400 }
      )
    }

    // Validate the decoded value looks like a UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(orgId)) {
      return Response.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      )
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return Response.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const { data: existing } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', org.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return Response.json(
        { error: 'You are already a member of this organization' },
        { status: 409 }
      )
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'member',
      })

    if (memberError) {
      return Response.json(
        { error: 'Failed to join organization' },
        { status: 500 }
      )
    }

    return Response.json({ org })
  } catch (error) {
    return handleAuthError(error)
  }
}
