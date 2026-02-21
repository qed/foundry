import { requireAuth } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: memberships, error } = await supabase
      .from('org_members')
      .select(`
        role,
        organizations!inner(id, name, slug)
      `)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return Response.json({
      orgs:
        memberships?.map((item) => ({
          org: item.organizations,
          role: item.role,
        })) ?? [],
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
