import 'server-only';

import { getDateRange, getRecentDateRange } from '@/lib/date';
import type {
  FixtureLeagueContext,
  FixtureTeamRelation,
  UpcomingFixtureRecord,
  UpcomingFixtureView,
} from '@/lib/upcoming-fixtures';
import { getSupportedLeagueIds, type SupportedLeagueFeature } from './league-config';
import { getSupabaseAdmin } from './supabase-admin';

export const UPCOMING_STATUSES = ['NS', 'TBD'] as const;
export const FINISHED_STATUSES = ['FT', 'AET', 'PEN'] as const;

const UPCOMING_FIXTURE_SELECT = `
  id,
  date,
  status_short,
  home_team_id,
  away_team_id,
  league_id,
  season,
  referee_id,
  referee_name_raw,
  home_team:teams!fixtures_home_team_id_fkey(id, name, logo_url),
  away_team:teams!fixtures_away_team_id_fkey(id, name, logo_url)
`;

function toSingle<T>(value: T | T[] | null | undefined) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function loadLeagueContextMap(leagueIds: number[]) {
  if (leagueIds.length === 0) {
    return new Map<number, FixtureLeagueContext>();
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('leagues')
    .select('id, name, country_code, country_name')
    .in('id', leagueIds);

  if (error) {
    throw new Error(`Failed to load league context: ${error.message}`);
  }

  return new Map<number, FixtureLeagueContext>(
    ((data ?? []) as FixtureLeagueContext[]).map((league) => [league.id, league]),
  );
}

function mapUpcomingFixtureView(
  fixture: UpcomingFixtureRecord,
  leagueMap: Map<number, FixtureLeagueContext>,
): UpcomingFixtureView {
  const league = leagueMap.get(fixture.league_id) ?? null;
  const homeTeam = toSingle<FixtureTeamRelation>(fixture.home_team);
  const awayTeam = toSingle<FixtureTeamRelation>(fixture.away_team);

  return {
    ...fixture,
    away_team_view: awayTeam,
    country_code: league?.country_code ?? null,
    country_name: league?.country_name ?? null,
    home_team_view: homeTeam,
    league_name: league?.name ?? null,
  };
}

/**
 * Load recently-completed fixtures (FT / AET / PEN) from the past `windowDays` days.
 * Used for off-season Season Review on the Fixtures board and Comparison date picker.
 */
export async function loadRecentFixtures(
  windowDays: number,
  feature: SupportedLeagueFeature = 'fixtures',
) {
  const targetLeagueIds = await getSupportedLeagueIds(feature);

  const supabaseAdmin = getSupabaseAdmin();
  const { start, end } = getRecentDateRange(windowDays);
  const { data, error } = await supabaseAdmin
    .from('fixtures')
    .select(UPCOMING_FIXTURE_SELECT)
    .in('league_id', targetLeagueIds)
    .in('status_short', [...FINISHED_STATUSES])
    .gte('date', start.toISOString())
    .lte('date', end.toISOString())
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Failed to load recent fixtures: ${error.message}`);
  }

  const fixtures = (data ?? []) as UpcomingFixtureRecord[];
  const leagueMap = await loadLeagueContextMap([...new Set(fixtures.map((fixture) => fixture.league_id))]);
  return fixtures.map((fixture) => mapUpcomingFixtureView(fixture, leagueMap));
}

export async function loadUpcomingFixtures(
  windowDays: number,
  feature: SupportedLeagueFeature = 'fixtures',
) {
  const targetLeagueIds = await getSupportedLeagueIds(feature);

  const supabaseAdmin = getSupabaseAdmin();
  const { start, end } = getDateRange(windowDays);
  const { data, error } = await supabaseAdmin
    .from('fixtures')
    .select(UPCOMING_FIXTURE_SELECT)
    .in('league_id', targetLeagueIds)
    .in('status_short', [...UPCOMING_STATUSES])
    .gte('date', start.toISOString())
    .lt('date', end.toISOString())
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to load upcoming fixtures: ${error.message}`);
  }

  const fixtures = (data ?? []) as UpcomingFixtureRecord[];
  const leagueMap = await loadLeagueContextMap([...new Set(fixtures.map((fixture) => fixture.league_id))]);
  return fixtures.map((fixture) => mapUpcomingFixtureView(fixture, leagueMap));
}
