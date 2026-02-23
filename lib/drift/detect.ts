import { createServiceClient } from '@/lib/supabase/server'

interface DriftCheckParams {
  projectId: string
  featureNodeId: string
  requirementDocId: string
  requirementTitle: string
  changeSummary?: string
}

/**
 * Check for blueprints linked to the same feature as a changed requirement doc
 * and create drift alerts. Fire-and-forget — errors are logged, never thrown.
 */
export async function checkAndCreateDriftAlerts({
  projectId,
  featureNodeId,
  requirementDocId,
  requirementTitle,
  changeSummary,
}: DriftCheckParams): Promise<void> {
  try {
    const supabase = createServiceClient()

    // Find blueprints linked to this feature
    const { data: blueprints, error: bpErr } = await supabase
      .from('blueprints')
      .select('id, title, status, updated_at')
      .eq('project_id', projectId)
      .eq('feature_node_id', featureNodeId)

    if (bpErr || !blueprints || blueprints.length === 0) return

    for (const bp of blueprints) {
      // Skip blueprints already flagged with an active alert for this requirement
      const { data: existing } = await supabase
        .from('drift_alerts')
        .select('id')
        .eq('blueprint_id', bp.id)
        .eq('requirement_doc_id', requirementDocId)
        .in('status', ['new', 'acknowledged'])
        .limit(1)

      if (existing && existing.length > 0) continue

      // Determine severity based on blueprint status
      let severity: 'low' | 'medium' | 'high' = 'medium'
      if (bp.status === 'approved' || bp.status === 'implemented') {
        severity = 'high'
      } else if (bp.status === 'draft') {
        severity = 'low'
      }

      const description = `Requirement "${requirementTitle}" was updated. Blueprint "${bp.title}" may need review.`

      await supabase.from('drift_alerts').insert({
        project_id: projectId,
        blueprint_id: bp.id,
        requirement_doc_id: requirementDocId,
        feature_node_id: featureNodeId,
        alert_type: 'requirement_changed' as const,
        severity,
        description,
        change_summary: changeSummary || null,
      })
    }
  } catch (err) {
    console.error('Drift detection failed (non-blocking):', err)
  }
}
