-- Fix RLS policies for league_context_details and team_match_settings
-- These tables should be readable by all authenticated users

-- Enable RLS on both tables (if not already enabled)
ALTER TABLE public.league_context_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_match_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view league_context_details" ON public.league_context_details;
DROP POLICY IF EXISTS "Authenticated users can view team_match_settings" ON public.team_match_settings;
DROP POLICY IF EXISTS "Admins can insert/update league_context_details" ON public.league_context_details;
DROP POLICY IF EXISTS "Admins can insert/update team_match_settings" ON public.team_match_settings;

-- Create policies for league_context_details
CREATE POLICY "Authenticated users can view league_context_details"
  ON public.league_context_details
  FOR SELECT
  USING (auth.role() = 'authenticated_user');

CREATE POLICY "Authenticated users can insert/update league_context_details"
  ON public.league_context_details
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated_user');

CREATE POLICY "Authenticated users can update league_context_details"
  ON public.league_context_details
  FOR UPDATE
  USING (auth.role() = 'authenticated_user')
  WITH CHECK (auth.role() = 'authenticated_user');

-- Create policies for team_match_settings
CREATE POLICY "Authenticated users can view team_match_settings"
  ON public.team_match_settings
  FOR SELECT
  USING (auth.role() = 'authenticated_user');

CREATE POLICY "Authenticated users can insert/update team_match_settings"
  ON public.team_match_settings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated_user');

CREATE POLICY "Authenticated users can update team_match_settings"
  ON public.team_match_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated_user')
  WITH CHECK (auth.role() = 'authenticated_user');
