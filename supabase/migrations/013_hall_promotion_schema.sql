-- Phase 025: Hall to Pattern Shop Promotion
-- Add bidirectional link from feature_nodes back to Hall ideas

ALTER TABLE public.feature_nodes
ADD COLUMN hall_idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL;

-- Index for lookup by hall idea
CREATE INDEX idx_feature_nodes_hall_idea_id ON public.feature_nodes(hall_idea_id)
WHERE hall_idea_id IS NOT NULL;
