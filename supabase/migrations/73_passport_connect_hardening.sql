-- 73: Passport-connect hardening — fix the notify_* triggers, allow
-- 'follow_accepted' notifications, and lock down client notification writes.
--
-- Three defects fixed together because they interlock:
--
-- (1) Any follows.status update to 'accepted' (the passport-connect
--     pending→accepted upgrade, accept_follow_request, accept_all_pending_follows)
--     aborts if notify_on_follow_accepted_trigger is attached: the m36 function
--     body inserts type 'follow_accepted', which m66's notifications_type_check
--     does not allow — and its insert shape targets related_* columns that do
--     not exist on the live notifications table (verified 2026-07-03: the live
--     schema is the sender_id/title/message/link/metadata shape; there are no
--     related_user_id/related_album_id/related_comment_id columns). Either
--     failure aborts the caller's UPDATE, so /api/passport/connect 500s for
--     any scanner with a prior pending request.
--
-- (2) All four m09 notify_* trigger functions share that dead insert shape, and
--     none are SECURITY DEFINER — so tightening INSERT RLS (below) would make
--     them abort likes/comments/follows outright wherever they are attached.
--     Rewritten here: live schema shape, SECURITY DEFINER (executes as the
--     table owner, unaffected by RLS), and exception-wrapped so a notification
--     problem can never again abort the user's actual write.
--
-- (3) The notifications INSERT policy has been WITH CHECK (true) since the
--     table was created — any authenticated user could insert arbitrary rows
--     for any user_id. Combined with PassportConnectListener trusting
--     row.link, that's an in-app phishing vector (spoofed "X scanned your
--     passport" modals with attacker-chosen links). Every legitimate writer is
--     either a service-role API client or a SECURITY DEFINER trigger, so
--     client-role inserts are now denied. (The client-side fix — whitelisting
--     row.link — ships in the same commit.)
--
-- Idempotent — safe to run repeatedly.

-- ----------------------------------------------------------------------------
-- 1. Allow 'follow_accepted' in the type CHECK (m66's list + the one type its
--    rebuild missed; the trigger below writes it). Same dynamic drop as m66 —
--    on an environment that never ran m66 the constraint has a different name,
--    and a leftover CHECK would still enforce the old list alongside ours.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.notifications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%type%IN%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'like', 'comment', 'follow', 'follow_accepted', 'message',
    'album_invite', 'collaboration', 'photo',
    'location', 'achievement',
    'album_tag', 'passport_connect'
  ));

-- ----------------------------------------------------------------------------
-- 2. Rewrite the notify_* trigger functions against the REAL schema.
--    CREATE OR REPLACE is correct whether or not the triggers are attached on
--    a given environment: attached → they start working; not attached → the
--    functions sit dormant with a correct body instead of a broken one.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
BEGIN
  BEGIN
    SELECT COALESCE(display_name, username, 'Someone') INTO v_name
    FROM public.users WHERE id = NEW.follower_id;

    INSERT INTO public.notifications (user_id, sender_id, type, title, message, link)
    VALUES (
      NEW.following_id,
      NEW.follower_id,
      'follow',
      'New follower',
      COALESCE(v_name, 'Someone') || ' started following you',
      '/followers'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- notifications are best-effort; never abort the follow itself
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_follow_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_username TEXT;
  v_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    BEGIN
      SELECT username, COALESCE(display_name, username, 'Someone')
        INTO v_username, v_name
      FROM public.users WHERE id = NEW.following_id;

      INSERT INTO public.notifications (user_id, sender_id, type, title, message, link)
      VALUES (
        NEW.follower_id,
        NEW.following_id,
        'follow_accepted',
        'Follow request accepted',
        COALESCE(v_name, 'Someone') || ' accepted your follow request',
        CASE WHEN v_username IS NOT NULL THEN '/u/' || v_username ELSE '/followers' END
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- never abort the accept itself
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner UUID;
  v_title TEXT;
  v_name TEXT;
BEGIN
  BEGIN
    -- Polymorphic likes rows (album_id IS NULL) simply skip — same effective
    -- behaviour as m09's NULL-propagating guard.
    SELECT user_id, title INTO v_owner, v_title
    FROM public.albums WHERE id = NEW.album_id;

    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
      SELECT COALESCE(display_name, username, 'Someone') INTO v_name
      FROM public.users WHERE id = NEW.user_id;

      INSERT INTO public.notifications (user_id, sender_id, type, title, message, link)
      VALUES (
        v_owner,
        NEW.user_id,
        'like',
        'New like',
        COALESCE(v_name, 'Someone') || ' liked your album'
          || COALESCE(' "' || v_title || '"', ''),
        '/albums/' || NEW.album_id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never abort the like itself
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner UUID;
  v_title TEXT;
  v_name TEXT;
BEGIN
  BEGIN
    SELECT user_id, title INTO v_owner, v_title
    FROM public.albums WHERE id = NEW.album_id;

    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
      SELECT COALESCE(display_name, username, 'Someone') INTO v_name
      FROM public.users WHERE id = NEW.user_id;

      INSERT INTO public.notifications (user_id, sender_id, type, title, message, link)
      VALUES (
        v_owner,
        NEW.user_id,
        'comment',
        'New comment',
        COALESCE(v_name, 'Someone') || ' commented on your album'
          || COALESCE(' "' || v_title || '"', ''),
        '/albums/' || NEW.album_id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never abort the comment itself
  END;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Lock down INSERT: service role and SECURITY DEFINER triggers only.
--    (service_role bypasses RLS anyway; the explicit policy documents intent.
--    With no policy for authenticated/anon, their inserts are denied.)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_service_only ON public.notifications;

CREATE POLICY notifications_insert_service_only
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);
