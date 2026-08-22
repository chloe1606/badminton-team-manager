-- Migration: ensure RLS policies exist for user_teams
-- Admins need INSERT, UPDATE, DELETE access to manage team memberships.
-- Users need SELECT access to see their own memberships.

-- Enable RLS (safe to re-run)
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;

-- Users can view their own team memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_teams'
      AND policyname = 'Users can view own team memberships'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can view own team memberships"
        ON public.user_teams FOR SELECT
        USING (user_id = auth.uid())
    $pol$;
  END IF;
END;
$$;

-- Admins can view all team memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_teams'
      AND policyname = 'Admins can view all team memberships'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admins can view all team memberships"
        ON public.user_teams FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
          )
        )
    $pol$;
  END IF;
END;
$$;

-- Admins can manage (insert, update, delete) team memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_teams'
      AND policyname = 'Admins can manage team memberships'
  ) THEN
    EXECUTE $pol$
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
        )
    $pol$;
  END IF;
END;
$$;
