-- Ensure admin profile updates and team access are granted in the active project.
-- This migration is intentionally idempotent so it can be rerun safely.

DO $$
DECLARE
  policy_name text;
BEGIN
  -- Drop any previously-created conflicting profile update policies.
  FOREACH policy_name IN ARRAY ARRAY[
    'Admins can update user roles',
    'Admins can update notify_by_email',
    'Admins can update profiles'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = policy_name
    ) THEN
      EXECUTE format('DROP POLICY %I ON public.profiles', policy_name);
    END IF;
  END LOOP;

  EXECUTE '
    CREATE POLICY "Admins can update profiles"
      ON public.profiles FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles AS me
          WHERE me.id = auth.uid()
            AND me.role = ''admin''
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles AS me
          WHERE me.id = auth.uid()
            AND me.role = ''admin''
        )
      )
  ';

  -- Ensure authenticated users can read teams in the app.
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teams'
      AND policyname = 'Authenticated users can view teams'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can view teams" ON public.teams';
  END IF;

  FOREACH policy_name IN ARRAY ARRAY[
    'Admins can insert teams',
    'Admins can update teams',
    'Admins can delete teams'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'teams'
        AND policyname = policy_name
    ) THEN
      EXECUTE format('DROP POLICY %I ON public.teams', policy_name);
    END IF;
  END LOOP;

  EXECUTE '
    CREATE POLICY "Authenticated users can view teams"
      ON public.teams FOR SELECT
      USING (auth.role() = ''authenticated'')
  ';

  EXECUTE '
    CREATE POLICY "Admins can insert teams"
      ON public.teams FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles AS me
          WHERE me.id = auth.uid()
            AND me.role = ''admin''
        )
      )
  ';

  EXECUTE '
    CREATE POLICY "Admins can update teams"
      ON public.teams FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles AS me
          WHERE me.id = auth.uid()
            AND me.role = ''admin''
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles AS me
          WHERE me.id = auth.uid()
            AND me.role = ''admin''
        )
      )
  ';

  EXECUTE '
    CREATE POLICY "Admins can delete teams"
      ON public.teams FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles AS me
          WHERE me.id = auth.uid()
            AND me.role = ''admin''
        )
      )
  ';
END $$;
