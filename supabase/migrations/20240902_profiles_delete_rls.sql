-- Migration: ensure admins can delete profiles
-- This policy allows admin users to hard-delete a profile row.
-- When auth.users is deleted via the Edge Function, the profile is also removed
-- via the ON DELETE CASCADE on profiles.id → auth.users.id.
-- This policy is a safety-net for the fallback path.

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
