import 'server-only';

import type {
  ComparisonScope,
  HistoricalFixtureRecord,
  TeamMarketTrendRecord,
  TeamStatAveragesRecord,
} from '@/app/comparison/types';
import { getSupabaseAdmin } from './supabase-admin';
import { FINISHED_STATUSES } from './fixture-data';

const HISTORICAL_FIXTURE_SELECT = `
  id,
  date,
  league_id,
  season,
  home_goals,
  away_goals,
  home_goals_1h,
  away_goals_1h,
  home_team_id,
  away_team_id,
  home_team:teams!fixtures_home_team_id_fkey(id, name, logo_url),
  away_team:teams!fixtures_away_team_id_fkey(id, name, logo_url),
  fixture_statistics!inner(
    team_id,
    period,
    corners,
    yellow_cards,
    red_cards,
    booking_points,
    total_shots,
    shots_on_target,
    fouls,
    offsides,
    goal_kicks,
    throw_ins,
    tackles
  )
`;

const TEAM_TRENDS_SELECT = `
  team_id,
  league_id,
  season,
  scope,
  category,
  market_key,
  sample,
  hits,
  percentage,
  current_streak,
  longest_streak,
  last_5_sample,
  last_5_hits,
  last_5_percentage,
  last_10_sample,
  last_10_hits,
  last_10_percentage,
  updated_at,
  market_definition:market_definitions(label, display_order, period)
`;

export type ComparisonCoreResponse = {
  awayMatches: HistoricalFixtureRecord[];
  awaySummary: TeamStatAveragesRecord | null;
  awayTrends: TeamMarketTrendRecord[];
  headToHeadMatches: HistoricalFixtureRecord[];
  homeMatches: HistoricalFixtureRecord[];
  homeSummary: TeamStatAveragesRecord | null;
  homeTrends: TeamMarketTrendRecord[];
};

const EMPTY_COMPARISON_RESPONSE: ComparisonCoreResponse = {
  awayMatches: [],
  awaySummary: null,
  awayTrends: [],
  headToHeadMatches: [],
  homeMatches: [],
  homeSummary: null,
  homeTrends: [],
};

function withLeagueName(records: HistoricalFixtureRecord[], leagueName: string | null) {
  return records.map((record) => ({
    ...record,
    league_name: leagueName,
  }));
}

async function loadHistoricalFixturesForTeam(
  teamId: number,
  leagueId: number,
  season: number,
  fixtureDate: string,
  scope: ComparisonScope,
  side: 'home' | 'away',
) {
  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from('fixtures')
    .select(HISTORICAL_FIXTURE_SELECT)
    .eq('league_id', leagueId)
    .eq('season', season)
    .in('status_short', [...FINISHED_STATUSES])
    .lt('date', fixtureDate)
    .order('date', { ascending: false })
    .limit(10);

  if (scope === 'split') {
    query = side === 'home' ? query.eq('home_team_id', teamId) : query.eq('away_team_id', teamId);
  } else {
    query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load historical fixtures: ${error.message}`);
  }

  return (data ?? []) as HistoricalFixtureRecord[];
}

async function loadHeadToHeadFixtures(
  homeTeamId: number,
  awayTeamId: number,
  leagueId: number,
  season: number,
  fixtureDate: string,
  scope: ComparisonScope,
) {
  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from('fixtures')
    .select(HISTORICAL_FIXTURE_SELECT)
    .eq('league_id', leagueId)
    .eq('season', season)
    .in('status_short', [...FINISHED_STATUSES])
    .lt('date', fixtureDate)
    .order('date', { ascending: false })
    .limit(10);

  if (scope === 'split') {
    query = query.eq('home_team_id', homeTeamId).eq('away_team_id', awayTeamId);
  } else {
    query = query.or(
      `and(home_team_id.eq.${homeTeamId},away_team_id.eq.${awayTeamId}),and(home_team_id.eq.${awayTeamId},away_team_id.eq.${homeTeamId})`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load head-to-head fixtures: ${error.message}`);
  }

  return (data ?? []) as HistoricalFixtureRecord[];
}

async function loadTeamStatSummary(
  teamId: number,
  leagueId: number,
  season: number,
  scopeKey: 'overall' | 'home' | 'away',
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('team_stat_averages')
    .select('*')
    .eq('team_id', teamId)
    .eq('league_id', leagueId)
    .eq('season', season)
    .eq('scope', scopeKey)
    .limit(1);

  if (error) {
    throw new Error(`Failed to load team stat summary: ${error.message}`);
  }

  const rows = (data ?? []) as TeamStatAveragesRecord[];
  return rows[0] ?? null;
}

async function loadTeamMarketTrends(
  teamId: number,
  leagueId: number,
  season: number,
  scopeKey: 'overall' | 'home' | 'away',
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('team_season_market_stats')
    .select(TEAM_TRENDS_SELECT)
    .eq('team_id', teamId)
    .eq('league_id', leagueId)
    .eq('season', season)
    .eq('scope', scopeKey)
    .order('category', { ascending: true });

  if (error) {
    throw new Error(`Failed to load team market trends: ${error.message}`);
  }

  return (data ?? []) as TeamMarketTrendRecord[];
}

export async function loadComparisonCore(fixtureId: number, scope: ComparisonScope) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: fixtureRow, error: fixtureError } = await supabaseAdmin
    .from('fixtures')
    .select('id, date, league_id, season, home_team_id, away_team_id')
    .eq('id', fixtureId)
    .limit(1);

  if (fixtureError) {
    throw new Error(`Failed to load comparison fixture: ${fixtureError.message}`);
  }

  const fixture = (fixtureRow ?? [])[0] as
    | {
        away_team_id: number | null;
        date: string;
        home_team_id: number | null;
        id: number;
        league_id: number | null;
        season: number | null;
      }
    | undefined;

  if (!fixture?.home_team_id || !fixture.away_team_id || !fixture.league_id || !fixture.season) {
    return EMPTY_COMPARISON_RESPONSE;
  }

  const { data: leagueRows, error: leagueError } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('id', fixture.league_id)
    .limit(1);

  if (leagueError) {
    throw new Error(`Failed to load comparison league: ${leagueError.message}`);
  }

  const leagueName = ((leagueRows ?? [])[0] as { id: number; name: string | null } | undefined)?.name ?? null;
  const homeScopeKey = scope === 'all' ? 'overall' : 'home';
  const awayScopeKey = scope === 'all' ? 'overall' : 'away';

  const [
    homeMatches,
    awayMatches,
    headToHeadMatches,
    homeSummary,
    awaySummary,
    homeTrends,
    awayTrends,
  ] = await Promise.all([
    loadHistoricalFixturesForTeam(
      fixture.home_team_id,
      fixture.league_id,
      fixture.season,
      fixture.date,
      scope,
      'home',
    ),
    loadHistoricalFixturesForTeam(
      fixture.away_team_id,
      fixture.league_id,
      fixture.season,
      fixture.date,
      scope,
      'away',
    ),
    loadHeadToHeadFixtures(
      fixture.home_team_id,
      fixture.away_team_id,
      fixture.league_id,
      fixture.season,
      fixture.date,
      scope,
    ),
    loadTeamStatSummary(fixture.home_team_id, fixture.league_id, fixture.season, homeScopeKey),
    loadTeamStatSummary(fixture.away_team_id, fixture.league_id, fixture.season, awayScopeKey),
    loadTeamMarketTrends(fixture.home_team_id, fixture.league_id, fixture.season, homeScopeKey),
    loadTeamMarketTrends(fixture.away_team_id, fixture.league_id, fixture.season, awayScopeKey),
  ]);

  return {
    awayMatches: withLeagueName(awayMatches, leagueName),
    awaySummary,
    awayTrends,
    headToHeadMatches: withLeagueName(headToHeadMatches, leagueName),
    homeMatches: withLeagueName(homeMatches, leagueName),
    homeSummary,
    homeTrends,
  } satisfies ComparisonCoreResponse;
}
