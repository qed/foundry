-- Phase 116: User Profile & Settings
-- Add bio and theme_preference columns to profiles table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) NOT NULL DEFAULT 'dark';

-- Add CHECK constraint for theme_preference
ALTER TABLE profiles ADD CONSTRAINT profiles_theme_check
  CHECK (theme_preference IN ('light', 'dark', 'system'));
