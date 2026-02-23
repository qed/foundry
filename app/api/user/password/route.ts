import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const { new_password, confirm_password } = await request.json()

    if (!new_password || typeof new_password !== 'string') {
      return Response.json({ error: 'New password is required' }, { status: 400 })
    }

    if (new_password !== confirm_password) {
      return Response.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    if (new_password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
      password: new_password,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    return handleAuthError(error)
  }
}
