-- Useful manual checks for debugging admin/profile RLS issues.

-- 1) Current auth user in the active session
SELECT auth.uid() AS current_user_id;

-- 2) Current auth role in the active session
SELECT auth.role() AS current_role;

-- 3) Any profiles row for the current user
SELECT *
FROM public.profiles
WHERE id = auth.uid();

-- 4) Whether the current user is actually an admin profile
SELECT id, email, role, notify_by_email
FROM public.profiles
WHERE id = auth.uid()
  AND role = 'admin';

-- 5) List all policies on profiles
SELECT *
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles';
