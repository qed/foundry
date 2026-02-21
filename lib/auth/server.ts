import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

// Cache the user during a single request to avoid multiple DB calls
export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return user
})

// Cache the session during a single request
export const getSession = cache(async () => {
  const supabase = await createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    return null
  }

  return session
})

// Get authenticated user with profile information
export const getUserWithProfile = cache(async () => {
  const supabase = await createClient()
  const user = await getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return null
  }

  return {
    user,
    profile: profile ?? null,
  }
})

// Require authentication — throws if user is not authenticated
export const requireAuth = cache(async () => {
  const user = await getUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
})

// Require authentication with profile — throws if not authenticated
export const requireAuthWithProfile = cache(async () => {
  const result = await getUserWithProfile()

  if (!result) {
    throw new Error('Authentication required')
  }

  return result
})
