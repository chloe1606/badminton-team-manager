-- Consolidate team_match_settings into teams
-- Extends public.teams with league settings fields and backfills from team_match_settings when present.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS team_label text,
  ADD COLUMN IF NOT EXISTS match_context_key text,
  ADD COLUMN IF NOT EXISTS format jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS home_club_id text,
  ADD COLUMN IF NOT EXISTS home_venue_id text,
  ADD COLUMN IF NOT EXISTS league_name text;

UPDATE public.teams
SET
  match_context_key = lower(regexp_replace(trim(match_type), '\s+', '-', 'g')) || '__' || division,
  team_label = trim(club_name || COALESCE(' ' || NULLIF(team_number, ''), ''))
WHERE
  (match_context_key IS NULL OR match_context_key = '')
  OR (team_label IS NULL OR team_label = '');

DO $$
BEGIN
  IF to_regclass('public.team_match_settings') IS NOT NULL THEN
    UPDATE public.teams AS t
    SET
      team_label = COALESCE(NULLIF(s.team_label, ''), t.team_label),
      match_context_key = COALESCE(NULLIF(s.match_context_key, ''), t.match_context_key),
      format = COALESCE(to_jsonb(s.format), t.format),
      home_club_id = COALESCE(s.home_club_id, t.home_club_id),
      home_venue_id = COALESCE(s.home_venue_id, t.home_venue_id),
      league_name = COALESCE(s.league_name, t.league_name),
      updated_at = now()
    FROM public.team_match_settings AS s
    WHERE
      t.club_name = s.team_name
      AND t.match_type = s.match_type
      AND t.division = s.division_number::text
      AND (
        (t.team_number IS NULL AND s.team_number IS NULL)
        OR t.team_number = s.team_number::text
      );

    INSERT INTO public.teams (
      club_name,
      team_number,
      match_type,
      division,
      rubbers,
      display_name,
      team_label,
      match_context_key,
      format,
      home_club_id,
      home_venue_id,
      league_name,
      active
    )
    SELECT
      s.team_name,
      s.team_number::text,
      s.match_type,
      s.division_number::text,
      COALESCE((to_jsonb(s.format)->>'numberOfRubbers')::int, 6),
      COALESCE(
        NULLIF(
          trim(s.team_name || COALESCE(' ' || s.team_number::text, '')) ||
          ' in ' || s.match_type || ' Div ' || s.division_number::text,
          ''
        ),
        s.match_type || ' Div ' || s.division_number::text
      ),
      COALESCE(NULLIF(s.team_label, ''), trim(s.team_name || COALESCE(' ' || s.team_number::text, ''))),
      COALESCE(
        NULLIF(s.match_context_key, ''),
        lower(regexp_replace(trim(s.match_type), '\s+', '-', 'g')) || '__' || s.division_number::text
      ),
      COALESCE(to_jsonb(s.format), '{}'::jsonb),
      s.home_club_id,
      s.home_venue_id,
      s.league_name,
      true
    FROM public.team_match_settings AS s
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.teams AS t
      WHERE
        t.club_name = s.team_name
        AND t.match_type = s.match_type
        AND t.division = s.division_number::text
        AND (
          (t.team_number IS NULL AND s.team_number IS NULL)
          OR t.team_number = s.team_number::text
        )
    );
  END IF;
END;
$$;
