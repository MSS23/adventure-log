-- Migration: Add Simple Reactions System
-- Description: Adds a simple emoji reaction system for albums and photos
-- Date: 2025-01-29

-- =====================================================
-- TABLE: reactions
-- Purpose: Store simple emoji reactions for albums and photos
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  target_type character varying NOT NULL CHECK (target_type IN ('album', 'photo')),
  target_id uuid NOT NULL,
  reaction_type character varying NOT NULL CHECK (reaction_type IN ('joy', 'fire', 'thumbsup', 'heart', 'star', 'clap')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT reactions_pkey PRIMARY KEY (id),
  CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT reactions_unique UNIQUE (user_id, target_type, target_id, reaction_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reactions_target ON public.reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_reaction_type ON public.reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_reactions_created_at ON public.reactions(created_at DESC);

-- =====================================================
-- RLS POLICIES: Row Level Security
-- =====================================================

-- Enable RLS on reactions table
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions on public content
CREATE POLICY "Anyone can view reactions on public content"
  ON public.reactions FOR SELECT
  USING (
    CASE
      WHEN target_type = 'album' THEN
        EXISTS (
          SELECT 1 FROM public.albums
          WHERE id = target_id
          AND (visibility = 'public' OR user_id = auth.uid())
        )
      WHEN target_type = 'photo' THEN
        EXISTS (
          SELECT 1 FROM public.photos p
          JOIN public.albums a ON p.album_id = a.id
          WHERE p.id = target_id
          AND (a.visibility = 'public' OR a.user_id = auth.uid())
        )
      ELSE false
    END
  );

-- Users can add reactions
CREATE POLICY "Authenticated users can add reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    CASE
      WHEN target_type = 'album' THEN
        EXISTS (
          SELECT 1 FROM public.albums
          WHERE id = target_id
          AND (visibility = 'public' OR user_id = auth.uid())
        )
      WHEN target_type = 'photo' THEN
        EXISTS (
          SELECT 1 FROM public.photos p
          JOIN public.albums a ON p.album_id = a.id
          WHERE p.id = target_id
          AND (a.visibility = 'public' OR a.user_id = auth.uid())
        )
      ELSE false
    END
  );

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- VIEW: Reactions with user details
-- =====================================================

CREATE OR REPLACE VIEW public.reactions_with_users AS
SELECT
  r.*,
  u.username,
  u.display_name,
  u.avatar_url
FROM public.reactions r
LEFT JOIN public.users u ON r.user_id = u.id;

-- =====================================================
-- FUNCTION: Toggle reaction
-- =====================================================

CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_target_type text,
  p_target_id uuid,
  p_reaction_type text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_existing_id uuid;
  v_result jsonb;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if reaction already exists
  SELECT id INTO v_existing_id
  FROM public.reactions
  WHERE user_id = v_user_id
    AND target_type = p_target_type
    AND target_id = p_target_id
    AND reaction_type = p_reaction_type;

  IF v_existing_id IS NOT NULL THEN
    -- Remove existing reaction
    DELETE FROM public.reactions WHERE id = v_existing_id;
    v_result := jsonb_build_object(
      'action', 'removed',
      'reaction_type', p_reaction_type,
      'target_type', p_target_type,
      'target_id', p_target_id
    );
  ELSE
    -- Add new reaction
    INSERT INTO public.reactions (user_id, target_type, target_id, reaction_type)
    VALUES (v_user_id, p_target_type, p_target_id, p_reaction_type);

    v_result := jsonb_build_object(
      'action', 'added',
      'reaction_type', p_reaction_type,
      'target_type', p_target_type,
      'target_id', p_target_id
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get reaction counts
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_reaction_counts(
  p_target_type text,
  p_target_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_counts jsonb;
BEGIN
  SELECT jsonb_object_agg(
    reaction_type,
    count
  ) INTO v_counts
  FROM (
    SELECT
      reaction_type,
      COUNT(*) as count
    FROM public.reactions
    WHERE target_type = p_target_type
      AND target_id = p_target_id
    GROUP BY reaction_type
  ) t;

  RETURN COALESCE(v_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get user reactions
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_reactions(
  p_target_type text,
  p_target_id uuid
)
RETURNS text[] AS $$
DECLARE
  v_user_id uuid;
  v_reactions text[];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  SELECT ARRAY_AGG(reaction_type) INTO v_reactions
  FROM public.reactions
  WHERE user_id = v_user_id
    AND target_type = p_target_type
    AND target_id = p_target_id;

  RETURN COALESCE(v_reactions, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS: Ensure proper permissions
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;
GRANT SELECT ON public.reactions_with_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_reaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reaction_counts TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_reactions TO authenticated;

-- =====================================================
-- COMMENTS: Documentation
-- =====================================================

COMMENT ON TABLE public.reactions IS 'Simple emoji reactions for albums and photos';
COMMENT ON COLUMN public.reactions.target_type IS 'Type of content being reacted to (album or photo)';
COMMENT ON COLUMN public.reactions.target_id IS 'ID of the album or photo being reacted to';
COMMENT ON COLUMN public.reactions.reaction_type IS 'Type of emoji reaction (joy, fire, thumbsup, heart, star, clap)';
COMMENT ON FUNCTION public.toggle_reaction IS 'Toggle a reaction on/off for a target';
COMMENT ON FUNCTION public.get_reaction_counts IS 'Get aggregated reaction counts for a target';
COMMENT ON FUNCTION public.get_user_reactions IS 'Get current user''s reactions for a target';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: Simple reactions system added';
  RAISE NOTICE 'New table: reactions';
  RAISE NOTICE 'New functions: toggle_reaction, get_reaction_counts, get_user_reactions';
  RAISE NOTICE 'Reaction types: joy, fire, thumbsup, heart, star, clap';
END $$;