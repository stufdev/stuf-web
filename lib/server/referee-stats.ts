import 'server-only';

import type { MarketDefinitionRelation } from '@/app/comparison/types';
import { getSupabaseAdmin } from './supabase-admin';

export type RefereeRecord = {
  id: number;
  name: string;
};

export type RefereeFixtureFactRecord = {
  away_booking_points: number | null;
  away_cards: number | null;
  away_team_id: number | null;
  fixture_id: number;
  home_booking_points: number | null;
  home_cards: number | null;
  home_team_id: number | null;
  league_id: number;
  penalties: number | null;
  played_at: string;
  referee_id: number;
  season: number;
  total_booking_points: number | null;
  total_cards: number | null;
  total_fouls: number | null;
  total_red_cards: number | null;
  total_yellow_cards: number | null;
};

export type RefereeMarketStatsRecord = {
  category: 'booking_points' | 'cards';
  current_streak: number;
  hits: number;
  league_id: number;
  longest_streak: number;
  market_definition?: MarketDefinitionRelation | MarketDefinitionRelation[] | null;
  market_key: string;
  percentage: number;
  referee_id: number;
  sample: number;
  season: number;
  updated_at: string;
};

export type RefereeFixtureRecord = {
  away_goals: number | null;
  away_team: { id: number; logo_url?: string | null; name: string | null } | { id: number; logo_url?: string | null; name: string | null }[] | null;
  away_team_id: number;
  date: string;
  home_goals: number | null;
  home_team: { id: number; logo_url?: string | null; name: string | null } | { id: number; logo_url?: string | null; name: string | null }[] | null;
  home_team_id: number;
  id: number;
  league_id: number;
  season: number;
  status_short: string | null;
};

export type RecentRefereeFixture = RefereeFixtureRecord & {
  fact: RefereeFixtureFactRecord | null;
  leagueName: string;
};

export type ComparisonRefereeStatsResponse = {
  currentFacts: RefereeFixtureFactRecord[];
  marketStats: RefereeMarketStatsRecord[];
  recentFixtures: RecentRefereeFixture[];
  referee: RefereeRecord | null;
};

const REFEREE_MARKETS_SELECT = `
  referee_id,
  league_id,
  season,
  category,
  market_key,
  sample,
  hits,
  percentage,
  current_streak,
  longest_streak,
  updated_at,
  market_definition:market_definitions(label, display_order)
`;

const REFEREE_FIXTURES_SELECT = `
  id,
  date,
  league_id,
  season,
  status_short,
  home_team_id,
  away_team_id,
  home_goals,
  away_goals,
  home_team:teams!fixtures_home_team_id_fkey(id, name, logo_url),
  away_team:teams!fixtures_away_team_id_fkey(id, name, logo_url)
`;

export async function loadComparisonRefereeStats(
  refereeId: number,
  leagueId: number,
  season: number,
) {
  const supabaseAdmin = getSupabaseAdmin();
  const [refereeResult, factsResult, marketsResult, fixturesResult] = await Promise.all([
    supabaseAdmin.from('referees').select('id, name').eq('id', refereeId).limit(1),
    supabaseAdmin
      .from('referee_fixture_facts')
      .select('*')
      .eq('referee_id', refereeId)
      .eq('league_id', leagueId)
      .eq('season', season)
      .order('played_at', { ascending: false }),
    supabaseAdmin
      .from('referee_market_stats')
      .select(REFEREE_MARKETS_SELECT)
      .eq('referee_id', refereeId)
      .eq('league_id', leagueId)
      .eq('season', season)
      .in('category', ['booking_points', 'cards']),
    supabaseAdmin
      .from('fixtures')
      .select(REFEREE_FIXTURES_SELECT)
      .eq('referee_id', refereeId)
      .order('date', { ascending: false })
      .limit(50),
  ]);

  if (refereeResult.error) {
    throw new Error(`Failed to load referee: ${refereeResult.error.message}`);
  }

  if (factsResult.error) {
    throw new Error(`Failed to load referee fixture facts: ${factsResult.error.message}`);
  }

  if (marketsResult.error) {
    throw new Error(`Failed to load referee market stats: ${marketsResult.error.message}`);
  }

  if (fixturesResult.error) {
    throw new Error(`Failed to load referee fixtures: ${fixturesResult.error.message}`);
  }

  const fixtureRows = (fixturesResult.data ?? []) as RefereeFixtureRecord[];
  const fixtureIds = fixtureRows.map((fixture) => fixture.id);
  const leagueIds = [...new Set(fixtureRows.map((fixture) => fixture.league_id))];
  const [recentFactsResult, leaguesResult] = await Promise.all([
    fixtureIds.length
      ? supabaseAdmin.from('referee_fixture_facts').select('*').in('fixture_id', fixtureIds)
      : Promise.resolve({ data: [], error: null }),
    leagueIds.length
      ? supabaseAdmin.from('leagues').select('id, name').in('id', leagueIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (recentFactsResult.error) {
    throw new Error(`Failed to load referee fixture detail facts: ${recentFactsResult.error.message}`);
  }

  if (leaguesResult.error) {
    throw new Error(`Failed to load referee fixture leagues: ${leaguesResult.error.message}`);
  }

  const factByFixtureId = Object.fromEntries(
    ((recentFactsResult.data ?? []) as RefereeFixtureFactRecord[]).map((fact) => [fact.fixture_id, fact]),
  ) as Record<number, RefereeFixtureFactRecord>;

  const leagueNameById = Object.fromEntries(
    ((leaguesResult.data ?? []) as Array<{ id: number; name: string | null }>).map((league) => [
      league.id,
      league.name ?? `League ${league.id}`,
    ]),
  ) as Record<number, string>;

  return {
    currentFacts: (factsResult.data ?? []) as RefereeFixtureFactRecord[],
    marketStats: (marketsResult.data ?? []) as RefereeMarketStatsRecord[],
    recentFixtures: fixtureRows.map((fixture) => ({
      ...fixture,
      fact: factByFixtureId[fixture.id] ?? null,
      leagueName: leagueNameById[fixture.league_id] ?? `League ${fixture.league_id}`,
    })),
    referee: (((refereeResult.data ?? []) as RefereeRecord[])[0] ?? null),
  } satisfies ComparisonRefereeStatsResponse;
}
