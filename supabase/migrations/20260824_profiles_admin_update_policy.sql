-- Allow admins to update profile rows, including notify_by_email.
-- This policy is intentionally idempotent so it can be rerun safely.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update user roles'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can update user roles" ON public.profiles';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update notify_by_email'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can update notify_by_email" ON public.profiles';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update profiles'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can update profiles" ON public.profiles';
  END IF;

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
END $$;
