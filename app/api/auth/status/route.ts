import { getUser } from '@/lib/auth/server'

export async function GET() {
  try {
    const user = await getUser()

    return Response.json({
      authenticated: !!user,
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
    })
  } catch {
    return Response.json(
      { authenticated: false, error: 'Failed to check auth status' },
      { status: 500 }
    )
  }
}
