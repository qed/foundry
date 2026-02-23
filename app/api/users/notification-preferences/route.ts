import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = createServiceClient()

    const { data } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!data) {
      // Return defaults if no preferences stored
      return Response.json({
        email_on_mention: true,
        email_on_comment: true,
        email_on_assignment: true,
        email_on_feedback: true,
        email_digest: false,
        email_digest_frequency: 'daily',
      })
    }

    return Response.json({
      email_on_mention: data.email_on_mention,
      email_on_comment: data.email_on_comment,
      email_on_assignment: data.email_on_assignment,
      email_on_feedback: data.email_on_feedback,
      email_digest: data.email_digest,
      email_digest_frequency: data.email_digest_frequency,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = createServiceClient()

    const allowed = [
      'email_on_mention',
      'email_on_comment',
      'email_on_assignment',
      'email_on_feedback',
      'email_digest',
      'email_digest_frequency',
    ]

    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) {
        if (key === 'email_digest_frequency') {
          if (body[key] === 'daily' || body[key] === 'weekly') {
            updates[key] = body[key]
          }
        } else if (typeof body[key] === 'boolean') {
          updates[key] = body[key]
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Upsert — create if not exists, update if exists
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert(
        { user_id: user.id, ...updates },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('Error updating preferences:', error)
      return Response.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return Response.json({ success: true, updated_at: new Date().toISOString() })
  } catch (err) {
    return handleAuthError(err)
  }
}
