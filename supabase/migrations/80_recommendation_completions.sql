-- Friend recommendation check-offs.
-- Lists are derived automatically from recommendation author + country, so a
-- creator's Japan recommendations become "<name>'s Japan list" without the
-- creator having to maintain a second collection by hand.

ALTER TABLE public.place_recommendations
  ADD COLUMN IF NOT EXISTS completion_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.place_recommendation_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.place_recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recommendation_id, user_id)
);

CREATE INDEX IF NOT EXISTS place_rec_completions_rec_idx
  ON public.place_recommendation_completions(recommendation_id);
CREATE INDEX IF NOT EXISTS place_rec_completions_user_idx
  ON public.place_recommendation_completions(user_id, completed_at DESC);

CREATE OR REPLACE FUNCTION public.sync_place_recommendation_completion_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.place_recommendations
      SET completion_count = completion_count + 1
      WHERE id = NEW.recommendation_id;
    RETURN NEW;
  END IF;

  UPDATE public.place_recommendations
    SET completion_count = GREATEST(completion_count - 1, 0)
    WHERE id = OLD.recommendation_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS place_recommendation_completions_sync_count
  ON public.place_recommendation_completions;
CREATE TRIGGER place_recommendation_completions_sync_count
  AFTER INSERT OR DELETE ON public.place_recommendation_completions
  FOR EACH ROW EXECUTE FUNCTION public.sync_place_recommendation_completion_count();

ALTER TABLE public.place_recommendation_completions ENABLE ROW LEVEL SECURITY;

-- A traveler sees their own check-offs. A recommender can see who completed
-- their places, which enables the requested creator feedback without making
-- everyone's travel checklist globally visible.
DROP POLICY IF EXISTS "place_rec_completions_select_relevant"
  ON public.place_recommendation_completions;
CREATE POLICY "place_rec_completions_select_relevant"
  ON public.place_recommendation_completions FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.place_recommendations recommendation
      WHERE recommendation.id = recommendation_id
        AND recommendation.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "place_rec_completions_insert_own"
  ON public.place_recommendation_completions;
CREATE POLICY "place_rec_completions_insert_own"
  ON public.place_recommendation_completions FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "place_rec_completions_delete_own"
  ON public.place_recommendation_completions;
CREATE POLICY "place_rec_completions_delete_own"
  ON public.place_recommendation_completions FOR DELETE
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.place_recommendation_completions TO authenticated;
