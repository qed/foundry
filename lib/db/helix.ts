import { supabase } from "@/lib/supabase/client";
import type { HelixStep, HelixStageGate } from "@/types/database";

export type { HelixStep, HelixStageGate };

/**
 * Get all steps for a project, ordered by stage then step number.
 */
export async function getProjectSteps(
  projectId: string
): Promise<HelixStep[]> {
  const { data, error } = await supabase
    .from("helix_steps")
    .select("*")
    .eq("project_id", projectId)
    .order("stage_number", { ascending: true })
    .order("step_number", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific step by its key (e.g., '1.1', '2.3').
 */
export async function getStepByKey(
  projectId: string,
  stepKey: string
): Promise<HelixStep | null> {
  const { data, error } = await supabase
    .from("helix_steps")
    .select("*")
    .eq("project_id", projectId)
    .eq("step_key", stepKey)
    .single();

  if (error && error.code === "PGRST116") return null; // Not found
  if (error) throw error;
  return data;
}

/**
 * Get all stage gates for a project, ordered by stage number.
 */
export async function getProjectStageGates(
  projectId: string
): Promise<HelixStageGate[]> {
  const { data, error } = await supabase
    .from("helix_stage_gates")
    .select("*")
    .eq("project_id", projectId)
    .order("stage_number", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get gate for a specific stage.
 */
export async function getStageGate(
  projectId: string,
  stageNumber: number
): Promise<HelixStageGate | null> {
  const { data, error } = await supabase
    .from("helix_stage_gates")
    .select("*")
    .eq("project_id", projectId)
    .eq("stage_number", stageNumber)
    .single();

  if (error && error.code === "PGRST116") return null; // Not found
  if (error) throw error;
  return data;
}

/**
 * Update step status and/or evidence.
 */
export async function updateStep(
  projectId: string,
  stepKey: string,
  updates: Partial<
    Pick<HelixStep, "status" | "evidence_data" | "completed_at" | "completed_by">
  >
): Promise<HelixStep> {
  const { data, error } = await supabase
    .from("helix_steps")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("step_key", stepKey)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Initialize all helix steps for a new Helix Mode project.
 * Creates rows with locked status.
 */
export async function initializeHelixSteps(
  projectId: string,
  steps: Array<{
    stage_number: number;
    step_number: number;
    step_key: string;
    evidence_type: "text" | "file" | "url" | "checklist";
  }>
): Promise<HelixStep[]> {
  const { data, error } = await supabase
    .from("helix_steps")
    .insert(
      steps.map((step) => ({
        project_id: projectId,
        ...step,
        status: "locked" as const,
        evidence_data: null,
      }))
    )
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Initialize 8 stage gates for a new Helix Mode project.
 * Creates all gates with locked status.
 */
export async function initializeStageGates(
  projectId: string
): Promise<HelixStageGate[]> {
  const { data, error } = await supabase
    .from("helix_stage_gates")
    .insert(
      Array.from({ length: 8 }, (_, i) => ({
        project_id: projectId,
        stage_number: i + 1,
        status: "locked" as const,
      }))
    )
    .select();

  if (error) throw error;
  return data || [];
}
