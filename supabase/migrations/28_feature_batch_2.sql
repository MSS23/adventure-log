-- ============================================================================
-- Migration 28: Feature batch — streaks, album nudges, offline queue
-- ============================================================================

-- 1. Daily logging streak on users
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS current_streak_days INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS longest_streak_days INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- RPC: record activity for today; bumps streak if yesterday, resets if gap > 1 day
CREATE OR REPLACE FUNCTION public.record_user_activity(_user_id UUID)
RETURNS TABLE (
    current_streak_days INTEGER,
    longest_streak_days INTEGER,
    last_activity_date DATE
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    prev_date DATE;
    prev_streak INTEGER;
    prev_best INTEGER;
    today DATE := CURRENT_DATE;
    new_streak INTEGER;
BEGIN
    SELECT u.last_activity_date, u.current_streak_days, u.longest_streak_days
    INTO prev_date, prev_streak, prev_best
    FROM public.users u
    WHERE u.id = _user_id;

    IF prev_date IS NULL THEN
        new_streak := 1;
    ELSIF prev_date = today THEN
        new_streak := COALESCE(prev_streak, 1);
    ELSIF prev_date = today - INTERVAL '1 day' THEN
        new_streak := COALESCE(prev_streak, 0) + 1;
    ELSE
        new_streak := 1;
    END IF;

    UPDATE public.users u
    SET
        current_streak_days = new_streak,
        longest_streak_days = GREATEST(COALESCE(prev_best, 0), new_streak),
        last_activity_date = today
    WHERE u.id = _user_id
    RETURNING u.current_streak_days, u.longest_streak_days, u.last_activity_date
    INTO current_streak_days, longest_streak_days, last_activity_date;

    RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_activity(UUID) TO authenticated;

-- 2. "You were here" lookup — given a location (name or coords) and current user,
--    return the earliest album the current user logged at that place.
CREATE OR REPLACE FUNCTION public.find_overlap_album(
    _user_id UUID,
    _location_name TEXT,
    _latitude DOUBLE PRECISION,
    _longitude DOUBLE PRECISION
)
RETURNS TABLE (
    album_id UUID,
    title TEXT,
    date_start DATE,
    distance_km DOUBLE PRECISION
)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
    SELECT
        a.id AS album_id,
        a.title,
        a.date_start,
        CASE
            WHEN _latitude IS NOT NULL AND _longitude IS NOT NULL AND a.latitude IS NOT NULL
            THEN 6371.0 * 2 * ASIN(SQRT(
                POWER(SIN(RADIANS((_latitude - a.latitude) / 2)), 2) +
                COS(RADIANS(a.latitude)) * COS(RADIANS(_latitude)) *
                POWER(SIN(RADIANS((_longitude - a.longitude) / 2)), 2)
            ))
            ELSE NULL
        END AS distance_km
    FROM public.albums a
    WHERE a.user_id = _user_id
      AND (
          -- Loose name match
          (_location_name IS NOT NULL AND a.location_name IS NOT NULL
              AND (LOWER(a.location_name) LIKE '%' || LOWER(split_part(_location_name, ',', 1)) || '%'
                   OR LOWER(split_part(_location_name, ',', 1)) LIKE '%' || LOWER(split_part(a.location_name, ',', 1)) || '%'))
          -- Or within 25 km on coords
          OR (_latitude IS NOT NULL AND _longitude IS NOT NULL AND a.latitude IS NOT NULL
              AND 6371.0 * 2 * ASIN(SQRT(
                  POWER(SIN(RADIANS((_latitude - a.latitude) / 2)), 2) +
                  COS(RADIANS(a.latitude)) * COS(RADIANS(_latitude)) *
                  POWER(SIN(RADIANS((_longitude - a.longitude) / 2)), 2)
              )) < 25)
      )
    ORDER BY a.date_start ASC NULLS LAST
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_overlap_album(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- 3. Auto-complete trips whose end_date has passed (called on read by the API)
CREATE OR REPLACE FUNCTION public.auto_complete_expired_trips(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.trips
    SET status = 'completed'
    WHERE owner_id = _user_id
      AND status IN ('planning', 'live')
      AND end_date IS NOT NULL
      AND end_date < CURRENT_DATE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_complete_expired_trips(UUID) TO authenticated;

-- Mark trip as live when start_date arrives (not-yet-ended)
CREATE OR REPLACE FUNCTION public.auto_activate_current_trips(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.trips
    SET status = 'live'
    WHERE owner_id = _user_id
      AND status = 'planning'
      AND start_date IS NOT NULL
      AND start_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_activate_current_trips(UUID) TO authenticated;
