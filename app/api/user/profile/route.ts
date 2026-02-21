import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { handleAuthError } from '@/lib/auth/errors'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { user, profile } = await requireAuthWithProfile()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireAuthWithProfile()
    const body = await request.json()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .update({
        display_name: body.display_name,
        avatar_url: body.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data)
  } catch (error) {
    return handleAuthError(error)
  }
}
