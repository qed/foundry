-- Phase 108: Email Notifications
-- User notification preferences and email send logging

CREATE TABLE public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_on_mention BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_comment BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_assignment BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_feedback BOOLEAN NOT NULL DEFAULT TRUE,
  email_digest BOOLEAN NOT NULL DEFAULT FALSE,
  email_digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_digest_frequency IN ('daily', 'weekly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notification_prefs_user ON public.user_notification_preferences (user_id);

-- Auto-update trigger for updated_at
CREATE TRIGGER set_user_notification_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: users can only manage their own preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Email send log for debugging and compliance
CREATE TABLE public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_address VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  template_name VARCHAR(100),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  resend_message_id TEXT
);

CREATE INDEX idx_email_log_user ON public.email_log (user_id);
CREATE INDEX idx_email_log_sent_at ON public.email_log (sent_at DESC);

-- RLS: service role only (no user access to email logs)
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
