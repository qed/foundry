import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

interface LogActivityParams {
  projectId: string
  userId: string
  entityType: string
  entityId: string
  action: string
  details?: Json
  request?: Request
}

/**
 * Log a user action to the activity_log table.
 * Call this from API routes after successful mutations.
 * Uses the service client to bypass RLS.
 *
 * Errors are caught and logged — activity logging should never
 * cause the parent operation to fail.
 */
export async function logActivity({
  projectId,
  userId,
  entityType,
  entityId,
  action,
  details,
  request,
}: LogActivityParams): Promise<void> {
  try {
    const supabase = createServiceClient()

    const ipHeader = request?.headers?.get('x-forwarded-for')
    const ip = ipHeader ? ipHeader.split(',')[0].trim() : null
    const userAgent = request?.headers?.get('user-agent') || null

    await supabase.from('activity_log').insert({
      project_id: projectId,
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      details: details ?? {},
      ip_address: ip,
      user_agent: userAgent,
    })
  } catch (err) {
    console.error('[activity-log] Failed to log activity:', err)
  }
}
