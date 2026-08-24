-- Ensure authenticated users have table-level privileges required by RLS-managed profile updates.
-- RLS policies still control which rows/columns can be read/updated.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
