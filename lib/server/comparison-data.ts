import 'server-only';

import type {
  ComparisonCoreResponse,
  ComparisonScope,
  HistoricalMatch,
  TeamMarketTrendRecord,
  TeamStatAveragesRecord,
} from '@/app/comparison/types';
import { getCompetitionLabel } from '@/app/comparison/helpers';
import { getSupabaseAdmin } from './supabase-admin';

const TEAM_FIXTURE_FACTS_SELECT = `
  fixture_id,
  team_id,
  opponent_team_id,
  played_at,
  is_home,
  venue_scope,
  result,
  data_quality,
  goals_for,
  goals_against,
  goals_for_1h,
  goals_against_1h,
  goals_for_2h,
  goals_against_2h,
  corners_for,
  corners_against,
  corners_for_1h,
  corners_against_1h,
  corners_for_2h,
  corners_against_2h,
  cards_for,
  cards_against,
  red_cards_for,
  red_cards_against,
  booking_points_for,
  booking_points_against,
  total_shots_for,
  total_shots_against,
  shots_on_target_for,
  shots_on_target_against,
  fouls_committed,
  fouls_won,
  offsides_for,
  offsides_against
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

const HISTORICAL_LIMIT = 10;

const EMPTY_COMPARISON_RESPONSE: ComparisonCoreResponse = {
  awayMatches: [],
  awaySummary: null,
  awayTrends: [],
  headToHeadMatches: [],
  homeMatches: [],
  homeSummary: null,
  homeTrends: [],
};

type TeamFixtureFactsRow = {
  fixture_id: number;
  team_id: number;
  opponent_team_id: number;
  played_at: string;
  is_home: boolean;
  venue_scope: 'home' | 'away';
  result: 'win' | 'draw' | 'loss' | null;
  data_quality: 'ok' | 'partial' | 'missing_stats';
  goals_for: number | null;
  goals_against: number | null;
  goals_for_1h: number | null;
  goals_against_1h: number | null;
  goals_for_2h: number | null;
  goals_against_2h: number | null;
  corners_for: number | null;
  corners_against: number | null;
  corners_for_1h: number | null;
  corners_against_1h: number | null;
  corners_for_2h: number | null;
  corners_against_2h: number | null;
  cards_for: number | null;
  cards_against: number | null;
  red_cards_for: number | null;
  red_cards_against: number | null;
  booking_points_for: number | null;
  booking_points_against: number | null;
  total_shots_for: number | null;
  total_shots_against: number | null;
  shots_on_target_for: number | null;
  shots_on_target_against: number | null;
  fouls_committed: number | null;
  fouls_won: number | null;
  offsides_for: number | null;
  offsides_against: number | null;
};

type MarketHitMap = Map<string, boolean>;

function marketHitKey(teamId: number, fixtureId: number) {
  return `${teamId}:${fixtureId}`;
}

async function loadRecentFactsForTeam(
  teamId: number,
  leagueId: number,
  season: number,
  fixtureDate: string,
  scope: ComparisonScope,
  side: 'home' | 'away',
): Promise<TeamFixtureFactsRow[]> {
  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from('team_fixture_facts')
    .select(TEAM_FIXTURE_FACTS_SELECT)
    .eq('team_id', teamId)
    .eq('league_id', leagueId)
    .eq('season', season)
    .lt('played_at', fixtureDate)
    .order('played_at', { ascending: false })
    .limit(HISTORICAL_LIMIT);

  if (scope === 'split') {
    query = query.eq('venue_scope', side);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load team_fixture_facts for team=${teamId}: ${error.message}`);
  }

  return (data ?? []) as TeamFixtureFactsRow[];
}

async function loadHeadToHeadFacts(
  homeTeamId: number,
  awayTeamId: number,
  leagueId: number,
  season: number,
  fixtureDate: string,
): Promise<TeamFixtureFactsRow[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('team_fixture_facts')
    .select(TEAM_FIXTURE_FACTS_SELECT)
    .eq('team_id', homeTeamId)
    .eq('opponent_team_id', awayTeamId)
    .eq('league_id', leagueId)
    .eq('season', season)
    .lt('played_at', fixtureDate)
    .order('played_at', { ascending: false })
    .limit(HISTORICAL_LIMIT);

  if (error) {
    throw new Error(`Failed to load head-to-head facts: ${error.message}`);
  }

  return (data ?? []) as TeamFixtureFactsRow[];
}

async function loadTeamNameMap(teamIds: number[]): Promise<Map<number, string>> {
  if (teamIds.length === 0) {
    return new Map();
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('id, name')
    .in('id', teamIds);

  if (error) {
    throw new Error(`Failed to load team names: ${error.message}`);
  }

  return new Map(((data ?? []) as Array<{ id: number; name: string | null }>).map((row) => [row.id, row.name ?? '']));
}

async function loadMarketHits(
  rows: Array<{ teamId: number; fixtureIds: number[] }>,
  marketKey: string,
): Promise<MarketHitMap> {
  const hits: MarketHitMap = new Map();
  const collected = rows.filter((entry) => entry.fixtureIds.length > 0);
  if (collected.length === 0) {
    return hits;
  }

  const supabaseAdmin = getSupabaseAdmin();
  for (const entry of collected) {
    const { data, error } = await supabaseAdmin
      .from('team_match_market_results')
      .select('fixture_id, team_id, result')
      .eq('market_key', marketKey)
      .eq('scope', 'overall')
      .eq('team_id', entry.teamId)
      .in('fixture_id', entry.fixtureIds);

    if (error) {
      throw new Error(`Failed to load team_match_market_results for team=${entry.teamId}: ${error.message}`);
    }

    for (const row of (data ?? []) as Array<{ fixture_id: number; team_id: number; result: boolean | null }>) {
      if (row.result === null) continue;
      hits.set(marketHitKey(row.team_id, row.fixture_id), Boolean(row.result));
    }
  }

  return hits;
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

function pickHome<T>(row: TeamFixtureFactsRow, forValue: T, againstValue: T): T {
  return row.is_home ? forValue : againstValue;
}

function pickAway<T>(row: TeamFixtureFactsRow, forValue: T, againstValue: T): T {
  return row.is_home ? againstValue : forValue;
}

function formatShortDate(isoDate: string) {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(parsed)
    .replace(',', '');
}

function toHistoricalMatch(
  row: TeamFixtureFactsRow,
  focusTeamId: number,
  focusTeamName: string,
  opponentName: string,
  competitionLabel: string,
  marketHits: MarketHitMap | null,
): HistoricalMatch {
  const homeTeamName = row.is_home ? focusTeamName : opponentName;
  const awayTeamName = row.is_home ? opponentName : focusTeamName;

  const hitValue = marketHits ? marketHits.get(marketHitKey(focusTeamId, row.fixture_id)) : undefined;

  return {
    id: row.fixture_id,
    date: formatShortDate(row.played_at),
    playedAt: row.played_at,
    competitionLabel,
    homeTeamName,
    awayTeamName,
    isHome: row.is_home,
    result: row.result,
    dataQuality: row.data_quality,

    homeGoals: pickHome(row, row.goals_for, row.goals_against),
    awayGoals: pickAway(row, row.goals_for, row.goals_against),
    homeGoals1H: pickHome(row, row.goals_for_1h, row.goals_against_1h),
    awayGoals1H: pickAway(row, row.goals_for_1h, row.goals_against_1h),
    homeGoals2H: pickHome(row, row.goals_for_2h, row.goals_against_2h),
    awayGoals2H: pickAway(row, row.goals_for_2h, row.goals_against_2h),

    homeCorners: pickHome(row, row.corners_for, row.corners_against),
    awayCorners: pickAway(row, row.corners_for, row.corners_against),
    homeCorners1H: pickHome(row, row.corners_for_1h, row.corners_against_1h),
    awayCorners1H: pickAway(row, row.corners_for_1h, row.corners_against_1h),
    homeCorners2H: pickHome(row, row.corners_for_2h, row.corners_against_2h),
    awayCorners2H: pickAway(row, row.corners_for_2h, row.corners_against_2h),

    homeCards: pickHome(row, row.cards_for, row.cards_against),
    awayCards: pickAway(row, row.cards_for, row.cards_against),
    homeRedCards: pickHome(row, row.red_cards_for, row.red_cards_against),
    awayRedCards: pickAway(row, row.red_cards_for, row.red_cards_against),

    homeBookingPoints: pickHome(row, row.booking_points_for, row.booking_points_against),
    awayBookingPoints: pickAway(row, row.booking_points_for, row.booking_points_against),

    homeShots: pickHome(row, row.total_shots_for, row.total_shots_against),
    awayShots: pickAway(row, row.total_shots_for, row.total_shots_against),
    homeShotsOnTarget: pickHome(row, row.shots_on_target_for, row.shots_on_target_against),
    awayShotsOnTarget: pickAway(row, row.shots_on_target_for, row.shots_on_target_against),

    homeFouls: pickHome(row, row.fouls_committed, row.fouls_won),
    awayFouls: pickAway(row, row.fouls_committed, row.fouls_won),

    homeOffsides: pickHome(row, row.offsides_for, row.offsides_against),
    awayOffsides: pickAway(row, row.offsides_for, row.offsides_against),

    hit: hitValue === undefined ? null : hitValue,
  };
}

export async function loadComparisonCore(
  fixtureId: number,
  scope: ComparisonScope,
  marketKey: string | null,
): Promise<ComparisonCoreResponse> {
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

  const leagueName =
    ((leagueRows ?? [])[0] as { id: number; name: string | null } | undefined)?.name ?? null;
  const competitionLabel = getCompetitionLabel(leagueName);

  const homeScopeKey = scope === 'all' ? 'overall' : 'home';
  const awayScopeKey = scope === 'all' ? 'overall' : 'away';

  const [
    homeFacts,
    awayFacts,
    h2hFacts,
    homeSummary,
    awaySummary,
    homeTrends,
    awayTrends,
  ] = await Promise.all([
    loadRecentFactsForTeam(fixture.home_team_id, fixture.league_id, fixture.season, fixture.date, scope, 'home'),
    loadRecentFactsForTeam(fixture.away_team_id, fixture.league_id, fixture.season, fixture.date, scope, 'away'),
    loadHeadToHeadFacts(fixture.home_team_id, fixture.away_team_id, fixture.league_id, fixture.season, fixture.date),
    loadTeamStatSummary(fixture.home_team_id, fixture.league_id, fixture.season, homeScopeKey),
    loadTeamStatSummary(fixture.away_team_id, fixture.league_id, fixture.season, awayScopeKey),
    loadTeamMarketTrends(fixture.home_team_id, fixture.league_id, fixture.season, homeScopeKey),
    loadTeamMarketTrends(fixture.away_team_id, fixture.league_id, fixture.season, awayScopeKey),
  ]);

  const opponentTeamIds = new Set<number>();
  for (const row of homeFacts) opponentTeamIds.add(row.opponent_team_id);
  for (const row of awayFacts) opponentTeamIds.add(row.opponent_team_id);

  const knownTeamIds = new Set<number>([fixture.home_team_id, fixture.away_team_id, ...opponentTeamIds]);
  const teamNameMap = await loadTeamNameMap([...knownTeamIds]);
  const homeTeamName = teamNameMap.get(fixture.home_team_id) ?? '';
  const awayTeamName = teamNameMap.get(fixture.away_team_id) ?? '';

  const marketHits = marketKey
    ? await loadMarketHits(
        [
          { teamId: fixture.home_team_id, fixtureIds: [...homeFacts.map((row) => row.fixture_id), ...h2hFacts.map((row) => row.fixture_id)] },
          { teamId: fixture.away_team_id, fixtureIds: awayFacts.map((row) => row.fixture_id) },
        ],
        marketKey,
      )
    : null;

  const homeMatches = homeFacts.map((row) =>
    toHistoricalMatch(
      row,
      fixture.home_team_id!,
      homeTeamName,
      teamNameMap.get(row.opponent_team_id) ?? '',
      competitionLabel,
      marketHits,
    ),
  );

  const awayMatches = awayFacts.map((row) =>
    toHistoricalMatch(
      row,
      fixture.away_team_id!,
      awayTeamName,
      teamNameMap.get(row.opponent_team_id) ?? '',
      competitionLabel,
      marketHits,
    ),
  );

  const headToHeadMatches = h2hFacts.map((row) =>
    toHistoricalMatch(
      row,
      fixture.home_team_id!,
      homeTeamName,
      awayTeamName,
      competitionLabel,
      marketHits,
    ),
  );

  return {
    awayMatches,
    awaySummary,
    awayTrends,
    headToHeadMatches,
    homeMatches,
    homeSummary,
    homeTrends,
  };
}
