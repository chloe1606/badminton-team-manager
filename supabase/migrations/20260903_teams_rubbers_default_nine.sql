-- Allow and default to 9-rubber match formats
-- The original teams table only allowed 4 or 6 rubbers, which blocked saving the
-- default 9 rubber match format.

ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_rubbers_check;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_rubbers_check CHECK (rubbers IN (4, 6, 9));

ALTER TABLE public.teams
  ALTER COLUMN rubbers SET DEFAULT 9;
