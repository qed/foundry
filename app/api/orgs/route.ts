import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()
    const slug = generateSlug(name.trim())

    if (!slug) {
      return Response.json(
        { error: 'Invalid organization name' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return Response.json(
        { error: 'An organization with this name already exists' },
        { status: 409 }
      )
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: name.trim(), slug })
      .select()
      .single()

    if (orgError) {
      return Response.json({ error: orgError.message }, { status: 500 })
    }

    // Add creator as admin
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'admin',
      })

    if (memberError) {
      // Clean up the org if member insert fails
      await supabase.from('organizations').delete().eq('id', org.id)
      return Response.json({ error: memberError.message }, { status: 500 })
    }

    return Response.json(org, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
