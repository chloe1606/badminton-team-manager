-- Migration: teams and user_teams tables for multi-team support
-- Run this against your Supabase project's SQL editor or via the Supabase CLI.

-- ============================================================
-- 1. teams table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name    text NOT NULL,
  team_number  text,
  match_type   text NOT NULL,
  division     text NOT NULL,
  rubbers      int  NOT NULL CHECK (rubbers IN (4, 6)),
  display_name text NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS teams_unique_idx
  ON public.teams (club_name, COALESCE(team_number, ''), match_type, division);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read teams
CREATE POLICY "Authenticated users can view teams"
  ON public.teams FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admin users can insert/update/delete teams
CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 2. user_teams mapping table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_teams (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id        uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  can_administer boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id)
);

ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;

-- Users can see their own team memberships
CREATE POLICY "Users can view own team memberships"
  ON public.user_teams FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all team memberships
CREATE POLICY "Admins can view all team memberships"
  ON public.user_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admins can manage team memberships
CREATE POLICY "Admins can manage team memberships"
  ON public.user_teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 3. Seed teams data
-- ============================================================
INSERT INTO public.teams (club_name, team_number, match_type, division, rubbers, display_name) VALUES
  ('Parklangley', '1',  'Mens 6',      '1', 6, 'Parklangley 1 in Mens 6 Div 1'),
  ('Parklangley', '2',  'Mens 6',      '2', 6, 'Parklangley 2 in Mens 6 Div 2'),
  ('Parklangley', '1',  'Mixed 6',     '1', 6, 'Parklangley 1 in Mixed 6 Div 1'),
  ('Parklangley', '3',  'Mens 6',      '2', 6, 'Parklangley 3 in Mens 6 Div 2'),
  ('Parklangley', '1',  'Ladies 6',    '1', 6, 'Parklangley 1 in Ladies 6 Div 1'),
  ('Parklangley', '1',  'Ladies 4',    '3', 4, 'Parklangley 1 in Ladies 4 Div 3'),
  ('Parklangley', '4',  'Mens 6',      '3', 6, 'Parklangley 4 in Mens 6 Div 3'),
  ('Parklangley', NULL, 'Mens 4',      '1', 4, 'Parklangley in Mens 4 Div 1'),
  ('Parklangley', NULL, 'Composite',   '1', 6, 'Parklangley in Composite Div 1')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. RLS policy to allow admins to update user roles in profiles
-- ============================================================
-- (Admins need to update the role column on another user's profile row)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'Admins can update user roles'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admins can update user roles"
        ON public.profiles FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles AS me
            WHERE me.id = auth.uid()
              AND me.role = 'admin'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles AS me
            WHERE me.id = auth.uid()
              AND me.role = 'admin'
          )
        )
    $pol$;
  END IF;
END;
$$;

-- Allow admins to delete profiles (hard-delete user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'Admins can delete users'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admins can delete users"
        ON public.profiles FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles AS me
            WHERE me.id = auth.uid()
              AND me.role = 'admin'
          )
        )
    $pol$;
  END IF;
END;
$$;
