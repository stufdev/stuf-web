import 'server-only';

import type { UpcomingFixtureView } from '@/lib/upcoming-fixtures';
import { loadUpcomingFixtures } from './fixture-data';
import { getSupabaseAdmin } from './supabase-admin';

type WindowOption = 'all' | number;

type SeasonMarketRow = {
  hits: number;
  league_id: number;
  market_key: string;
  percentage: number | null;
  sample: number;
  scope: string;
  season: number;
  team_id: number;
};

type MatchMarketRow = {
  league_id: number;
  market_key: string;
  played_at: string;
  result: boolean | string | null;
  scope: string;
  season: number;
  team_id: number;
};

export type FixtureBoardStatValue = {
  hits: number;
  percentage: number | null;
  sample: number;
};

export type FixtureBoardRowStats = {
  awayAll: FixtureBoardStatValue | null;
  awayAway: FixtureBoardStatValue | null;
  homeAll: FixtureBoardStatValue | null;
  homeHome: FixtureBoardStatValue | null;
};

export type FixtureBoardSignalRating = {
  label: 'Strong' | 'Watch' | 'Thin';
  matchedCells: number;
  sample: number;
  score: number;
};

export type FixtureBoardEntry = {
  fixture: UpcomingFixtureView;
  signal: FixtureBoardSignalRating;
  stats: FixtureBoardRowStats;
};

function statKey(teamId: number, leagueId: number, season: number, scope: string, marketKey: string) {
  return `${teamId}:${leagueId}:${season}:${scope}:${marketKey}`;
}

function isHit(value: boolean | string | null) {
  return value === true || value === 'true';
}

function buildWindowStats(rows: MatchMarketRow[], windowSize: number) {
  const grouped = new Map<string, MatchMarketRow[]>();

  for (const row of rows) {
    const key = statKey(row.team_id, row.league_id, row.season, row.scope, row.market_key);
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  const stats = new Map<string, FixtureBoardStatValue>();
  grouped.forEach((items, key) => {
    const sampleRows = items
      .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
      .slice(0, windowSize);
    const sample = sampleRows.length;
    const hits = sampleRows.filter((item) => isHit(item.result)).length;
    stats.set(key, { sample, hits, percentage: sample ? (hits / sample) * 100 : null });
  });

  return stats;
}

function getRowStats(
  fixture: UpcomingFixtureView,
  statsByKey: Map<string, FixtureBoardStatValue>,
  marketKey: string,
): FixtureBoardRowStats {
  return {
    awayAll: statsByKey.get(statKey(fixture.away_team_id, fixture.league_id, fixture.season, 'overall', marketKey)) ?? null,
    awayAway: statsByKey.get(statKey(fixture.away_team_id, fixture.league_id, fixture.season, 'away', marketKey)) ?? null,
    homeAll: statsByKey.get(statKey(fixture.home_team_id, fixture.league_id, fixture.season, 'overall', marketKey)) ?? null,
    homeHome: statsByKey.get(statKey(fixture.home_team_id, fixture.league_id, fixture.season, 'home', marketKey)) ?? null,
  };
}

function bestSignal(stats: FixtureBoardRowStats, threshold: number): FixtureBoardSignalRating {
  const candidates = [
    { value: stats.homeHome, weight: 1.25 },
    { value: stats.homeAll, weight: 0.9 },
    { value: stats.awayAll, weight: 0.9 },
    { value: stats.awayAway, weight: 1.25 },
  ].filter((item): item is { value: FixtureBoardStatValue; weight: number } => {
    return !!item.value && item.value.percentage !== null && item.value.sample > 0;
  });

  if (candidates.length === 0) {
    return { label: 'Thin', matchedCells: 0, sample: 0, score: 0 };
  }

  const weightedTotal = candidates.reduce((total, item) => {
    const confidence = Math.min(item.value.sample / 12, 1);
    return total + item.weight * confidence;
  }, 0);
  const weightedPercentage =
    candidates.reduce((total, item) => {
      const confidence = Math.min(item.value.sample / 12, 1);
      return total + (item.value.percentage ?? 0) * item.weight * confidence;
    }, 0) / weightedTotal;
  const sample = Math.round(candidates.reduce((total, item) => total + item.value.sample, 0) / candidates.length);
  const matchedCells = candidates.filter((item) => (item.value.percentage ?? 0) >= threshold).length;
  const alignmentBonus = matchedCells >= 4 ? 10 : matchedCells === 3 ? 7 : matchedCells === 2 ? 4 : matchedCells === 1 ? 1 : 0;
  const samplePenalty = sample < 4 ? 18 : sample < 8 ? 9 : 0;
  const score = Math.max(0, Math.min(100, Math.round(weightedPercentage + alignmentBonus - samplePenalty)));

  if (score >= threshold && matchedCells >= 2 && sample >= 8) {
    return { label: 'Strong', matchedCells, sample, score };
  }

  if (score >= Math.max(45, threshold - 10) && sample >= 5) {
    return { label: 'Watch', matchedCells, sample, score };
  }

  return { label: 'Thin', matchedCells, sample, score };
}

async function loadSeasonStats(fixtures: UpcomingFixtureView[], marketKey: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const teamIds = [...new Set(fixtures.flatMap((fixture) => [fixture.home_team_id, fixture.away_team_id]))];
  const leagueIds = [...new Set(fixtures.map((fixture) => fixture.league_id))];
  const seasons = [...new Set(fixtures.map((fixture) => fixture.season))];

  const { data, error } = await supabaseAdmin
    .from('team_season_market_stats')
    .select('team_id, league_id, season, scope, market_key, sample, hits, percentage')
    .in('team_id', teamIds)
    .in('league_id', leagueIds)
    .in('season', seasons)
    .in('scope', ['overall', 'home', 'away'])
    .eq('market_key', marketKey);

  if (error) {
    throw new Error(`Failed to load fixture market stats: ${error.message}`);
  }

  const nextStats = new Map<string, FixtureBoardStatValue>();
  for (const row of (data ?? []) as SeasonMarketRow[]) {
    nextStats.set(statKey(row.team_id, row.league_id, row.season, row.scope, row.market_key), {
      sample: Number(row.sample ?? 0),
      hits: Number(row.hits ?? 0),
      percentage: row.percentage == null ? null : Number(row.percentage),
    });
  }

  return nextStats;
}

async function loadWindowStats(fixtures: UpcomingFixtureView[], marketKey: string, windowSize: number) {
  const supabaseAdmin = getSupabaseAdmin();
  const teamIds = [...new Set(fixtures.flatMap((fixture) => [fixture.home_team_id, fixture.away_team_id]))];
  const leagueIds = [...new Set(fixtures.map((fixture) => fixture.league_id))];
  const seasons = [...new Set(fixtures.map((fixture) => fixture.season))];

  const { data, error } = await supabaseAdmin
    .from('team_match_market_results')
    .select('team_id, league_id, season, scope, market_key, result, played_at')
    .in('team_id', teamIds)
    .in('league_id', leagueIds)
    .in('season', seasons)
    .in('scope', ['overall', 'home', 'away'])
    .eq('market_key', marketKey)
    .order('played_at', { ascending: false })
    .range(0, 9999);

  if (error) {
    throw new Error(`Failed to load fixture window stats: ${error.message}`);
  }

  return buildWindowStats((data ?? []) as MatchMarketRow[], windowSize);
}

export async function loadFixturesBoard(
  days: number,
  marketKey: string,
  windowOption: WindowOption,
  threshold: number,
) {
  if (!marketKey) {
    return [] as FixtureBoardEntry[];
  }

  const fixtures = await loadUpcomingFixtures(days);
  if (fixtures.length === 0) {
    return [];
  }

  const statsByKey =
    windowOption === 'all'
      ? await loadSeasonStats(fixtures, marketKey)
      : await loadWindowStats(fixtures, marketKey, windowOption);

  return fixtures.map((fixture) => {
    const stats = getRowStats(fixture, statsByKey, marketKey);
    const signal = bestSignal(stats, threshold);
    return {
      fixture,
      signal,
      stats,
    } satisfies FixtureBoardEntry;
  });
}
