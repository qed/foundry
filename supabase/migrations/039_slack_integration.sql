-- Phase 131: Slack Integration for Insights Lab
-- Webhook-based Slack notifications for feedback alerts

CREATE TABLE IF NOT EXISTS public.slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  channel_name TEXT,
  notify_critical BOOLEAN NOT NULL DEFAULT true,
  notify_high_score BOOLEAN NOT NULL DEFAULT false,
  high_score_threshold INTEGER NOT NULL DEFAULT 75,
  notify_categories TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS public.slack_notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  feedback_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'feedback',
  response_status TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_integrations_project ON public.slack_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_sent_project ON public.slack_notifications_sent(project_id, sent_at DESC);

ALTER TABLE public.slack_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_notifications_sent ENABLE ROW LEVEL SECURITY;

-- RLS: project members can read their project's Slack config
CREATE POLICY "slack_integrations_select" ON public.slack_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = slack_integrations.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "slack_notifications_sent_select" ON public.slack_notifications_sent
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = slack_notifications_sent.project_id
        AND pm.user_id = auth.uid()
    )
  );
