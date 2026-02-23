-- Phase 094: App Key Management
-- Add environment and description columns to app_keys

ALTER TABLE public.app_keys
  ADD COLUMN environment TEXT NOT NULL DEFAULT 'production'
    CHECK (environment IN ('production', 'staging', 'development', 'custom')),
  ADD COLUMN description TEXT,
  ADD COLUMN revoked_at TIMESTAMPTZ,
  ADD COLUMN revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for listing keys by environment
CREATE INDEX idx_app_keys_project_env ON public.app_keys(project_id, environment);
