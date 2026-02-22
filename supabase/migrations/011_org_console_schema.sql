-- Phase 113: Organization Console Schema Updates
-- Add description and avatar_url columns to organizations table

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
