-- Phase 045: Add category column to requirements_documents for technical requirements
-- Categories: auth_security, api_integrations, performance_scalability, data_storage

ALTER TABLE public.requirements_documents
ADD COLUMN category TEXT CHECK (
  category IS NULL OR category IN ('auth_security', 'api_integrations', 'performance_scalability', 'data_storage')
);

CREATE INDEX idx_requirements_documents_category ON public.requirements_documents(category);
