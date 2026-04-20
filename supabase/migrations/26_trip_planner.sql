-- ============================================================================
-- Migration 26: Trip Planner (collaborative pin-based trip planning)
-- ============================================================================
-- Adds three tables for collaborative trip planning:
--   trips         - a shared planning doc owned by one user
--   trip_members  - users who have access, each with an assigned color
--   trip_pins     - places pinned by members, optionally with numbered order
-- ============================================================================

-- 1. trips: the top-level planning doc
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
    description TEXT CHECK (description IS NULL OR length(description) <= 500),
    start_date DATE,
    end_date DATE,
    cover_emoji TEXT DEFAULT '🗺️',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS trips_owner_id_idx ON public.trips(owner_id);
CREATE INDEX IF NOT EXISTS trips_updated_at_idx ON public.trips(updated_at DESC);

-- 2. trip_members: people with access + color assignment
CREATE TABLE IF NOT EXISTS public.trip_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    color TEXT NOT NULL DEFAULT '#2563eb',
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS trip_members_trip_id_idx ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS trip_members_user_id_idx ON public.trip_members(user_id);

-- 3. trip_pins: pinned places
CREATE TABLE IF NOT EXISTS public.trip_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
    note TEXT CHECK (note IS NULL OR length(note) <= 1000),
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    address TEXT,
    source_url TEXT,
    category TEXT,
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trip_pins_trip_id_idx ON public.trip_pins(trip_id);
CREATE INDEX IF NOT EXISTS trip_pins_user_id_idx ON public.trip_pins(user_id);
CREATE INDEX IF NOT EXISTS trip_pins_sort_order_idx ON public.trip_pins(trip_id, sort_order);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.set_trip_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trips_set_updated_at ON public.trips;
CREATE TRIGGER trips_set_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION public.set_trip_updated_at();

DROP TRIGGER IF EXISTS trip_pins_set_updated_at ON public.trip_pins;
CREATE TRIGGER trip_pins_set_updated_at
    BEFORE UPDATE ON public.trip_pins
    FOR EACH ROW EXECUTE FUNCTION public.set_trip_updated_at();

-- Auto-create owner membership on trip creation
CREATE OR REPLACE FUNCTION public.add_trip_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.trip_members (trip_id, user_id, color, role)
    VALUES (NEW.id, NEW.owner_id, '#2563eb', 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trips_add_owner_member ON public.trips;
CREATE TRIGGER trips_add_owner_member
    AFTER INSERT ON public.trips
    FOR EACH ROW EXECUTE FUNCTION public.add_trip_owner_as_member();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_pins ENABLE ROW LEVEL SECURITY;

-- Helper: can the current user view this trip?
CREATE OR REPLACE FUNCTION public.is_trip_member(_trip_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.trip_members
        WHERE trip_id = _trip_id AND user_id = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_trip(_trip_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.trip_members
        WHERE trip_id = _trip_id
          AND user_id = _user_id
          AND role IN ('owner', 'editor')
    );
$$;

-- trips policies
DROP POLICY IF EXISTS "trips_select_members" ON public.trips;
CREATE POLICY "trips_select_members" ON public.trips
    FOR SELECT USING (public.is_trip_member(id, auth.uid()));

DROP POLICY IF EXISTS "trips_insert_own" ON public.trips;
CREATE POLICY "trips_insert_own" ON public.trips
    FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "trips_update_owner" ON public.trips;
CREATE POLICY "trips_update_owner" ON public.trips
    FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "trips_delete_owner" ON public.trips;
CREATE POLICY "trips_delete_owner" ON public.trips
    FOR DELETE USING (owner_id = auth.uid());

-- trip_members policies
DROP POLICY IF EXISTS "trip_members_select" ON public.trip_members;
CREATE POLICY "trip_members_select" ON public.trip_members
    FOR SELECT USING (public.is_trip_member(trip_id, auth.uid()));

DROP POLICY IF EXISTS "trip_members_insert_owner" ON public.trip_members;
CREATE POLICY "trip_members_insert_owner" ON public.trip_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_id AND t.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "trip_members_update_self_or_owner" ON public.trip_members;
CREATE POLICY "trip_members_update_self_or_owner" ON public.trip_members
    FOR UPDATE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_id AND t.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "trip_members_delete_self_or_owner" ON public.trip_members;
CREATE POLICY "trip_members_delete_self_or_owner" ON public.trip_members
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_id AND t.owner_id = auth.uid()
        )
    );

-- trip_pins policies
DROP POLICY IF EXISTS "trip_pins_select_members" ON public.trip_pins;
CREATE POLICY "trip_pins_select_members" ON public.trip_pins
    FOR SELECT USING (public.is_trip_member(trip_id, auth.uid()));

DROP POLICY IF EXISTS "trip_pins_insert_editors" ON public.trip_pins;
CREATE POLICY "trip_pins_insert_editors" ON public.trip_pins
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND public.can_edit_trip(trip_id, auth.uid())
    );

DROP POLICY IF EXISTS "trip_pins_update_own" ON public.trip_pins;
CREATE POLICY "trip_pins_update_own" ON public.trip_pins
    FOR UPDATE USING (
        (user_id = auth.uid() AND public.can_edit_trip(trip_id, auth.uid()))
        OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "trip_pins_delete_own" ON public.trip_pins;
CREATE POLICY "trip_pins_delete_own" ON public.trip_pins
    FOR DELETE USING (
        (user_id = auth.uid() AND public.can_edit_trip(trip_id, auth.uid()))
        OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
    );

-- Grants (anon + authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_pins TO authenticated;
