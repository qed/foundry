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
        created_at: user.created_at,
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

    const allowedFields: Record<string, boolean> = {
      display_name: true,
      avatar_url: true,
      bio: true,
      theme_preference: true,
    }

    const updates: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (allowedFields[key]) {
        updates[key] = body[key]
      }
    }

    // Validate display_name
    if (updates.display_name !== undefined) {
      const name = updates.display_name as string
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
      }
      if (name.trim().length > 255) {
        return NextResponse.json({ error: 'Display name too long (max 255)' }, { status: 400 })
      }
      updates.display_name = name.trim()
    }

    // Validate bio
    if (updates.bio !== undefined && updates.bio !== null) {
      const bio = updates.bio as string
      if (typeof bio !== 'string' || bio.length > 500) {
        return NextResponse.json({ error: 'Bio too long (max 500 characters)' }, { status: 400 })
      }
      updates.bio = bio.trim() || null
    }

    // Validate theme_preference
    if (updates.theme_preference !== undefined) {
      if (!['light', 'dark', 'system'].includes(updates.theme_preference as string)) {
        return NextResponse.json({ error: 'Theme must be light, dark, or system' }, { status: 400 })
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
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
