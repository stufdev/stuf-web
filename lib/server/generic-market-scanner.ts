import 'server-only';

import { unstable_cache } from 'next/cache';
import { addDays, formatDateKey } from '@/lib/date';
import { getSupabaseAdmin } from './supabase-admin';
import { EMERGING_MIN_SAMPLE, MAIN_RANKING_MIN_SAMPLE, parseMainRankingFloor } from './sample-bands';

// Serves stat_signal_only categories: btts, booking_points, fouls, half_result, result.
// Market key is passed directly from URL params — no statistic/line translation needed.

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

export type GenericScope = 'overall' | 'home' | 'away';
export type GenericViewMode = 'all' | 'homeaway';
export type GenericFormWindow = 'season' | 'last5' | 'last10';
export type GenericFixtureFilter = 'all' | 'with_fixture' | 'today' | 'tomorrow' | 'in_2_days';
export type GenericSearchParams = Record<string, string | string[] | undefined>;

export type GenericFilters = {
  category: string;
  leagueId: number;
  season: number;
  marketKey: string;
  viewMode: GenericViewMode;
  teamSearch: string;
  teamId: number | null;
};

export type GenericQuickFilters = {
  category: string;
  leagueId: number;
  season: number;
  marketKey: string;
  teamSearch: string;
  formWindow: GenericFormWindow;
  fixtureFilter: GenericFixtureFilter;
  minSample: number;
};

export type GenericLeagueSeasonOption = {
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
};

export type GenericMarketOption = {
  key: string;
  label: string;
};

export type GenericFilterOptions = {
  category: string;
  defaultLeagueId: number;
  defaultSeason: number;
  leagueSeasons: GenericLeagueSeasonOption[];
  markets: GenericMarketOption[];
  availableMarketKeys: string[];
  defaultMarketKey: string;
};

export type GenericStatSummary = {
  scope: GenericScope;
  sample: number;
  hits: number;
  percentage: number;
  currentStreak: number;
  last5Sample: number | null;
  last5Hits: number | null;
  last5Percentage: number | null;
  last10Sample: number | null;
  last10Hits: number | null;
  last10Percentage: number | null;
};

export type GenericMatchRow = {
  fixtureId: number;
  date: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeValue: number | null;
  awayValue: number | null;
  scoreLabel: string | null;
  result: boolean;
};

export type GenericNextFixture = {
  fixtureId: number;
  opponentTeamId: number;
  opponentName: string;
  isHome: boolean;
  date: string;
  dateKey?: string;
};

export type GenericTeamPanel = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
  marketKey: string;
  marketLabel: string;
  stats: Record<GenericScope, GenericStatSummary | null>;
  matchRows: Record<GenericScope, GenericMatchRow[]>;
  nextFixture: GenericNextFixture | null;
  evidenceLoaded: boolean;
  evidenceHref: string;
  summaryHref: string;
};

export type GenericDetailResult = {
  marketKey: string;
  marketLabel: string;
  marketAvailable: boolean;
  evidenceMode: 'summary' | 'evidence';
  panels: GenericTeamPanel[];
};

export type GenericDetailTiming = {
  dbProfileMs: number;
  dbEvidenceMs: number;
  transformMs: number;
  totalMs: number;
  profileRowCount: number;
  evidenceRowCount: number;
  returnedEvidenceRowCount: number;
};

export type GenericTeamEvidenceGroup = {
  teamId: number;
  scope: GenericScope;
  rows: GenericMatchRow[];
};

export type GenericMatchEvidenceResult = {
  marketKey: string;
  marketLabel: string;
  groups: GenericTeamEvidenceGroup[];
};

export type GenericQuickMetric = {
  hits: number;
  sample: number;
  percentage: number | null;
  currentStreak: number;
  // Last 5 results, oldest first (index 0 = oldest, index 4 = most recent). null = not loaded.
  formStrip: boolean[] | null;
};

export type GenericQuickRow = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  scope: GenericScope;
  marketKey: string;
  marketLabel: string;
  metric: GenericQuickMetric;
  nextFixture: GenericNextFixture | null;
  opponentSupport: GenericQuickMetric | null;
  opponentSupportScope: GenericScope | null;
  fixtureContextMismatch: boolean;
  detailedHref: string;
  comparisonHref: string | null;
};

export type GenericQuickColumn = {
  scope: GenericScope;
  title: string;
  rows: GenericQuickRow[];
};

export type GenericQuickResult = {
  marketKey: string;
  marketLabel: string;
  marketAvailable: boolean;
  columns: GenericQuickColumn[];
  emergingColumns: GenericQuickColumn[];
};

export type GenericQuickTiming = {
  dbMs: number;
  transformMs: number;
  totalMs: number;
  rowCount: number;
};

// ──────────────────────────────────────────────────────────────────────────────
// Internal DB row types
// ──────────────────────────────────────────────────────────────────────────────

type SupportedLeagueRow = { league_id: number | string | null; season: number | string | null };
type LeagueRow = { id: number; name: string; logo_url: string | null };
type MarketDefinitionRow = { key: string; label: string; is_active: boolean };

type TeamMarketProfileRow = {
  category: string;
  market_key: string;
  league_id: number;
  season: number;
  team_id: number;
  team_name: string;
  team_logo_url: string | null;
  league_name: string;
  league_logo_url: string | null;
  next_fixture_id: number | null;
  next_fixture_date: string | null;
  next_opponent_team_id: number | null;
  next_opponent_name: string | null;
  next_venue_scope: 'home' | 'away' | null;
  [key: string]: unknown;
};

type TeamMarketMatchEvidenceRow = {
  team_id: number;
  scope: GenericScope;
  fixture_id: number;
  played_at: string;
  home_team_id: number;
  away_team_id: number;
  home_team_name: string;
  away_team_name: string;
  home_value: number | string | null;
  away_value: number | string | null;
  result: boolean;
};

type MarketTeamRankingRow = {
  category: string;
  market_key: string;
  league_id: number;
  season: number;
  scope: GenericScope;
  team_id: number;
  team_name: string;
  team_logo_url: string | null;
  hits: number;
  sample: number;
  percentage: number | string;
  current_streak: number;
  longest_streak: number;
  last_5_sample: number | null;
  last_5_hits: number | null;
  last_5_percentage: number | string | null;
  last_10_sample: number | null;
  last_10_hits: number | null;
  last_10_percentage: number | string | null;
  next_fixture_id: number | null;
  next_fixture_date: string | null;
  next_opponent_team_id: number | null;
  next_opponent_name: string | null;
  next_venue_scope: 'home' | 'away' | null;
  opponent_support_scope: GenericScope | null;
  opponent_support_hits: number | null;
  opponent_support_sample: number | null;
  opponent_support_percentage: number | string | null;
  opponent_support_last_5_hits: number | null;
  opponent_support_last_5_sample: number | null;
  opponent_support_last_5_percentage: number | string | null;
  opponent_support_last_10_hits: number | null;
  opponent_support_last_10_sample: number | null;
  opponent_support_last_10_percentage: number | string | null;
};

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const MAX_GENERIC_TEAM_PANELS = 40;
const QUICK_RESULT_LIMIT_PER_SCOPE = 60;
const MARKET_SERVING_CACHE_SECONDS = 60;
const SCOPES: GenericScope[] = ['overall', 'home', 'away'];

const TEAM_MARKET_PROFILE_SELECT = [
  'category', 'market_key', 'league_id', 'season', 'team_id', 'team_name', 'team_logo_url',
  'league_name', 'league_logo_url',
  'overall_sample', 'overall_hits', 'overall_percentage', 'current_streak_overall',
  'last_5_sample_overall', 'last_5_hits_overall', 'last_5_percentage_overall',
  'last_10_sample_overall', 'last_10_hits_overall', 'last_10_percentage_overall',
  'home_sample', 'home_hits', 'home_percentage', 'current_streak_home',
  'last_5_sample_home', 'last_5_hits_home', 'last_5_percentage_home',
  'last_10_sample_home', 'last_10_hits_home', 'last_10_percentage_home',
  'away_sample', 'away_hits', 'away_percentage', 'current_streak_away',
  'last_5_sample_away', 'last_5_hits_away', 'last_5_percentage_away',
  'last_10_sample_away', 'last_10_hits_away', 'last_10_percentage_away',
  'next_fixture_id', 'next_fixture_date', 'next_opponent_team_id', 'next_opponent_name', 'next_venue_scope',
].join(', ');

const TEAM_MARKET_EVIDENCE_SELECT = [
  'team_id', 'scope', 'fixture_id', 'played_at',
  'home_team_id', 'away_team_id', 'home_team_name', 'away_team_name',
  'home_value', 'away_value', 'result',
].join(', ');

const MARKET_TEAM_RANKING_SELECT = [
  'category', 'market_key', 'league_id', 'season', 'scope',
  'team_id', 'team_name', 'team_logo_url',
  'hits', 'sample', 'percentage', 'current_streak', 'longest_streak',
  'last_5_sample', 'last_5_hits', 'last_5_percentage',
  'last_10_sample', 'last_10_hits', 'last_10_percentage',
  'next_fixture_id', 'next_fixture_date', 'next_opponent_team_id', 'next_opponent_name', 'next_venue_scope',
  'opponent_support_scope', 'opponent_support_hits', 'opponent_support_sample', 'opponent_support_percentage',
  'opponent_support_last_5_hits', 'opponent_support_last_5_sample', 'opponent_support_last_5_percentage',
  'opponent_support_last_10_hits', 'opponent_support_last_10_sample', 'opponent_support_last_10_percentage',
].join(', ');

// ──────────────────────────────────────────────────────────────────────────────
// Parse helpers
// ──────────────────────────────────────────────────────────────────────────────

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseInteger(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstParam(value) ?? '', 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function toFiniteNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isGenericScope(value: unknown): value is GenericScope {
  return value === 'overall' || value === 'home' || value === 'away';
}

function parseViewMode(value: string | string[] | undefined): GenericViewMode {
  return firstParam(value) === 'homeaway' ? 'homeaway' : 'all';
}

function parseFormWindow(value: string | string[] | undefined): GenericFormWindow {
  const raw = firstParam(value);
  return raw === 'last5' || raw === 'last10' ? raw : 'season';
}

function parseFixtureFilter(value: string | string[] | undefined): GenericFixtureFilter {
  const raw = firstParam(value);
  if (raw === 'with_fixture' || raw === 'today' || raw === 'tomorrow' || raw === 'in_2_days') return raw;
  return 'all';
}

function hasLeagueSeason(options: GenericFilterOptions, leagueId: number, season: number) {
  return options.leagueSeasons.some((item) => item.leagueId === leagueId && item.season === season);
}

function categoryHrefPrefix(category: string) {
  return `/markets/${category}/detailed`;
}

function scopeTitle(scope: GenericScope) {
  if (scope === 'home') return 'Home Matches';
  if (scope === 'away') return 'Away Matches';
  return 'All Matches';
}

function matchScopesForViewMode(viewMode: GenericViewMode): GenericScope[] {
  return viewMode === 'homeaway' ? ['home', 'away'] : ['overall'];
}

// ──────────────────────────────────────────────────────────────────────────────
// Row validators
// ──────────────────────────────────────────────────────────────────────────────

function toLeagueRows(rows: unknown[]): LeagueRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<LeagueRow>;
    if (typeof record.id !== 'number' || typeof record.name !== 'string') return [];
    return [{ id: record.id, name: record.name, logo_url: typeof record.logo_url === 'string' ? record.logo_url : null }];
  });
}

function toSupportedRows(rows: unknown[]) {
  return rows.flatMap((row) => {
    const record = row as SupportedLeagueRow;
    const leagueId = Number(record.league_id);
    const season = Number(record.season);
    return Number.isInteger(leagueId) && Number.isInteger(season) ? [{ leagueId, season }] : [];
  });
}

function toMarketDefinitionRows(rows: unknown[]): MarketDefinitionRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<MarketDefinitionRow>;
    if (typeof record.key !== 'string' || typeof record.label !== 'string' || typeof record.is_active !== 'boolean') return [];
    return [{ key: record.key, label: record.label, is_active: record.is_active }];
  });
}

function toProfileRows(rows: unknown[]): TeamMarketProfileRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamMarketProfileRow>;
    if (
      typeof record.category !== 'string' ||
      typeof record.market_key !== 'string' ||
      typeof record.league_id !== 'number' ||
      typeof record.season !== 'number' ||
      typeof record.team_id !== 'number' ||
      typeof record.team_name !== 'string' ||
      typeof record.league_name !== 'string'
    ) return [];
    return [{
      ...record,
      category: record.category,
      market_key: record.market_key,
      league_id: record.league_id,
      season: record.season,
      team_id: record.team_id,
      team_name: record.team_name,
      team_logo_url: typeof record.team_logo_url === 'string' ? record.team_logo_url : null,
      league_name: record.league_name,
      league_logo_url: typeof record.league_logo_url === 'string' ? record.league_logo_url : null,
      next_fixture_id: typeof record.next_fixture_id === 'number' ? record.next_fixture_id : null,
      next_fixture_date: typeof record.next_fixture_date === 'string' ? record.next_fixture_date : null,
      next_opponent_team_id: typeof record.next_opponent_team_id === 'number' ? record.next_opponent_team_id : null,
      next_opponent_name: typeof record.next_opponent_name === 'string' ? record.next_opponent_name : null,
      next_venue_scope: record.next_venue_scope === 'home' || record.next_venue_scope === 'away' ? record.next_venue_scope : null,
    }];
  });
}

function toEvidenceRows(rows: unknown[]): TeamMarketMatchEvidenceRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamMarketMatchEvidenceRow>;
    if (
      typeof record.team_id !== 'number' ||
      !isGenericScope(record.scope) ||
      typeof record.fixture_id !== 'number' ||
      typeof record.played_at !== 'string' ||
      typeof record.home_team_id !== 'number' ||
      typeof record.away_team_id !== 'number' ||
      typeof record.home_team_name !== 'string' ||
      typeof record.away_team_name !== 'string' ||
      typeof record.result !== 'boolean'
    ) return [];
    return [{
      team_id: record.team_id,
      scope: record.scope,
      fixture_id: record.fixture_id,
      played_at: record.played_at,
      home_team_id: record.home_team_id,
      away_team_id: record.away_team_id,
      home_team_name: record.home_team_name,
      away_team_name: record.away_team_name,
      home_value: typeof record.home_value === 'number' || typeof record.home_value === 'string' ? record.home_value : null,
      away_value: typeof record.away_value === 'number' || typeof record.away_value === 'string' ? record.away_value : null,
      result: record.result,
    }];
  });
}

function toRankingRows(rows: unknown[]): MarketTeamRankingRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<MarketTeamRankingRow>;
    if (
      typeof record.category !== 'string' ||
      typeof record.market_key !== 'string' ||
      typeof record.league_id !== 'number' ||
      typeof record.season !== 'number' ||
      !isGenericScope(record.scope) ||
      typeof record.team_id !== 'number' ||
      typeof record.team_name !== 'string' ||
      typeof record.hits !== 'number' ||
      typeof record.sample !== 'number' ||
      (typeof record.percentage !== 'number' && typeof record.percentage !== 'string') ||
      typeof record.current_streak !== 'number'
    ) return [];
    return [{
      category: record.category,
      market_key: record.market_key,
      league_id: record.league_id,
      season: record.season,
      scope: record.scope,
      team_id: record.team_id,
      team_name: record.team_name,
      team_logo_url: typeof record.team_logo_url === 'string' ? record.team_logo_url : null,
      hits: record.hits,
      sample: record.sample,
      percentage: record.percentage,
      current_streak: record.current_streak,
      longest_streak: typeof record.longest_streak === 'number' ? record.longest_streak : 0,
      last_5_sample: typeof record.last_5_sample === 'number' ? record.last_5_sample : null,
      last_5_hits: typeof record.last_5_hits === 'number' ? record.last_5_hits : null,
      last_5_percentage: typeof record.last_5_percentage === 'number' || typeof record.last_5_percentage === 'string' ? record.last_5_percentage : null,
      last_10_sample: typeof record.last_10_sample === 'number' ? record.last_10_sample : null,
      last_10_hits: typeof record.last_10_hits === 'number' ? record.last_10_hits : null,
      last_10_percentage: typeof record.last_10_percentage === 'number' || typeof record.last_10_percentage === 'string' ? record.last_10_percentage : null,
      next_fixture_id: typeof record.next_fixture_id === 'number' ? record.next_fixture_id : null,
      next_fixture_date: typeof record.next_fixture_date === 'string' ? record.next_fixture_date : null,
      next_opponent_team_id: typeof record.next_opponent_team_id === 'number' ? record.next_opponent_team_id : null,
      next_opponent_name: typeof record.next_opponent_name === 'string' ? record.next_opponent_name : null,
      next_venue_scope: record.next_venue_scope === 'home' || record.next_venue_scope === 'away' ? record.next_venue_scope : null,
      opponent_support_scope: isGenericScope(record.opponent_support_scope) ? record.opponent_support_scope : null,
      opponent_support_hits: typeof record.opponent_support_hits === 'number' ? record.opponent_support_hits : null,
      opponent_support_sample: typeof record.opponent_support_sample === 'number' ? record.opponent_support_sample : null,
      opponent_support_percentage: typeof record.opponent_support_percentage === 'number' || typeof record.opponent_support_percentage === 'string' ? record.opponent_support_percentage : null,
      opponent_support_last_5_hits: typeof record.opponent_support_last_5_hits === 'number' ? record.opponent_support_last_5_hits : null,
      opponent_support_last_5_sample: typeof record.opponent_support_last_5_sample === 'number' ? record.opponent_support_last_5_sample : null,
      opponent_support_last_5_percentage: typeof record.opponent_support_last_5_percentage === 'number' || typeof record.opponent_support_last_5_percentage === 'string' ? record.opponent_support_last_5_percentage : null,
      opponent_support_last_10_hits: typeof record.opponent_support_last_10_hits === 'number' ? record.opponent_support_last_10_hits : null,
      opponent_support_last_10_sample: typeof record.opponent_support_last_10_sample === 'number' ? record.opponent_support_last_10_sample : null,
      opponent_support_last_10_percentage: typeof record.opponent_support_last_10_percentage === 'number' || typeof record.opponent_support_last_10_percentage === 'string' ? record.opponent_support_last_10_percentage : null,
    }];
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Data transforms
// ──────────────────────────────────────────────────────────────────────────────

function readSnapshotNumber(row: TeamMarketProfileRow, key: string) {
  return toFiniteNumber(row[key] as number | string | null | undefined);
}

function toSnapshotSummary(row: TeamMarketProfileRow, scope: GenericScope): GenericStatSummary | null {
  const sample = readSnapshotNumber(row, `${scope}_sample`);
  const hits = readSnapshotNumber(row, `${scope}_hits`);
  const percentage = readSnapshotNumber(row, `${scope}_percentage`);
  if (sample === null || hits === null || percentage === null) return null;
  return {
    scope,
    sample,
    hits,
    percentage,
    currentStreak: readSnapshotNumber(row, `current_streak_${scope}`) ?? 0,
    last5Sample: readSnapshotNumber(row, `last_5_sample_${scope}`),
    last5Hits: readSnapshotNumber(row, `last_5_hits_${scope}`),
    last5Percentage: readSnapshotNumber(row, `last_5_percentage_${scope}`),
    last10Sample: readSnapshotNumber(row, `last_10_sample_${scope}`),
    last10Hits: readSnapshotNumber(row, `last_10_hits_${scope}`),
    last10Percentage: readSnapshotNumber(row, `last_10_percentage_${scope}`),
  };
}

function emptyMatchRows(): Record<GenericScope, GenericMatchRow[]> {
  return { overall: [], home: [], away: [] };
}

function toGenericMatchRow(row: TeamMarketMatchEvidenceRow): GenericMatchRow {
  const homeValue = toFiniteNumber(row.home_value);
  const awayValue = toFiniteNumber(row.away_value);
  return {
    fixtureId: row.fixture_id,
    date: row.played_at,
    homeTeamId: row.home_team_id,
    homeTeamName: row.home_team_name,
    awayTeamId: row.away_team_id,
    awayTeamName: row.away_team_name,
    homeValue,
    awayValue,
    scoreLabel: homeValue === null || awayValue === null ? null : `${homeValue} - ${awayValue}`,
    result: row.result,
  };
}

function groupEvidenceRows(evidenceRows: TeamMarketMatchEvidenceRow[], viewMode: GenericViewMode): GenericTeamEvidenceGroup[] {
  const allowedScopes = new Set(matchScopesForViewMode(viewMode));
  const rowsByTeamScope = new Map<string, GenericMatchRow[]>();
  for (const row of evidenceRows) {
    if (!allowedScopes.has(row.scope)) continue;
    const key = `${row.team_id}:${row.scope}`;
    const currentRows = rowsByTeamScope.get(key) ?? [];
    currentRows.push(toGenericMatchRow(row));
    rowsByTeamScope.set(key, currentRows);
  }
  return [...rowsByTeamScope.entries()].map(([key, rows]) => {
    const [teamId, scope] = key.split(':');
    return { teamId: Number(teamId), scope: scope as GenericScope, rows };
  });
}

function evidenceGroupsToMap(groups: GenericTeamEvidenceGroup[]) {
  return new Map(groups.map((group) => [`${group.teamId}:${group.scope}`, group.rows]));
}

function countReturnedEvidenceRows(groups: GenericTeamEvidenceGroup[]) {
  return groups.reduce((total, group) => total + group.rows.length, 0);
}

function buildHref(
  category: string,
  params: { leagueId: number; season: number; marketKey: string; viewMode?: GenericViewMode; teamSearch?: string },
  teamId: number | null,
) {
  const sp = new URLSearchParams();
  sp.set('leagueId', String(params.leagueId));
  sp.set('season', String(params.season));
  if (params.marketKey) sp.set('marketKey', params.marketKey);
  if (params.viewMode && params.viewMode !== 'all') sp.set('viewMode', params.viewMode);
  if (teamId !== null) sp.set('teamId', String(teamId));
  else if (params.teamSearch?.trim()) sp.set('teamSearch', params.teamSearch.trim());
  return `${categoryHrefPrefix(category)}?${sp.toString()}`;
}

function toGenericTeamPanel({
  evidenceLoaded,
  filters,
  marketKey,
  marketLabel,
  matchRowsByTeamScope,
  row,
}: {
  evidenceLoaded: boolean;
  filters: GenericFilters;
  marketKey: string;
  marketLabel: string;
  matchRowsByTeamScope: Map<string, GenericMatchRow[]>;
  row: TeamMarketProfileRow;
}): GenericTeamPanel {
  const nextFixture = row.next_fixture_id !== null && row.next_fixture_date !== null && row.next_opponent_team_id !== null && row.next_opponent_name !== null && row.next_venue_scope !== null
    ? {
      fixtureId: row.next_fixture_id,
      opponentTeamId: row.next_opponent_team_id,
      opponentName: row.next_opponent_name,
      isHome: row.next_venue_scope === 'home',
      date: row.next_fixture_date,
      dateKey: formatDateKey(new Date(row.next_fixture_date)),
    } satisfies GenericNextFixture
    : null;

  return {
    teamId: row.team_id,
    teamName: row.team_name,
    teamLogoUrl: row.team_logo_url,
    leagueId: row.league_id,
    leagueName: row.league_name,
    leagueLogoUrl: row.league_logo_url,
    season: row.season,
    marketKey,
    marketLabel,
    stats: {
      overall: toSnapshotSummary(row, 'overall'),
      home: toSnapshotSummary(row, 'home'),
      away: toSnapshotSummary(row, 'away'),
    },
    matchRows: evidenceLoaded
      ? {
        overall: matchRowsByTeamScope.get(`${row.team_id}:overall`) ?? [],
        home: matchRowsByTeamScope.get(`${row.team_id}:home`) ?? [],
        away: matchRowsByTeamScope.get(`${row.team_id}:away`) ?? [],
      }
      : emptyMatchRows(),
    nextFixture,
    evidenceLoaded,
    evidenceHref: buildHref(filters.category, filters, row.team_id),
    summaryHref: buildHref(filters.category, { ...filters, teamSearch: '' }, null),
  };
}

function metricFromQuickSnapshot(row: MarketTeamRankingRow, formWindow: GenericFormWindow, formStrip: boolean[] | null): GenericQuickMetric {
  if (formWindow === 'last5') {
    const sample = row.last_5_sample ?? Math.min(row.sample, 5);
    const hits = row.last_5_hits ?? 0;
    return { hits, sample, percentage: sample > 0 ? toFiniteNumber(row.last_5_percentage) ?? (hits / sample) * 100 : null, currentStreak: row.current_streak, formStrip };
  }
  if (formWindow === 'last10') {
    const sample = row.last_10_sample ?? Math.min(row.sample, 10);
    const hits = row.last_10_hits ?? 0;
    return { hits, sample, percentage: sample > 0 ? toFiniteNumber(row.last_10_percentage) ?? (hits / sample) * 100 : null, currentStreak: row.current_streak, formStrip };
  }
  return {
    hits: row.hits,
    sample: row.sample,
    percentage: row.sample > 0 ? toFiniteNumber(row.percentage) ?? (row.hits / row.sample) * 100 : null,
    currentStreak: row.current_streak,
    formStrip,
  };
}

function opponentMetricFromQuickSnapshot(row: MarketTeamRankingRow, formWindow: GenericFormWindow): GenericQuickMetric | null {
  if (row.opponent_support_sample === null || row.opponent_support_hits === null) return null;
  if (formWindow === 'last5') {
    const sample = row.opponent_support_last_5_sample ?? Math.min(row.opponent_support_sample, 5);
    const hits = row.opponent_support_last_5_hits ?? 0;
    return { hits, sample, percentage: sample > 0 ? toFiniteNumber(row.opponent_support_last_5_percentage) ?? (hits / sample) * 100 : null, currentStreak: 0, formStrip: null };
  }
  if (formWindow === 'last10') {
    const sample = row.opponent_support_last_10_sample ?? Math.min(row.opponent_support_sample, 10);
    const hits = row.opponent_support_last_10_hits ?? 0;
    return { hits, sample, percentage: sample > 0 ? toFiniteNumber(row.opponent_support_last_10_percentage) ?? (hits / sample) * 100 : null, currentStreak: 0, formStrip: null };
  }
  return {
    hits: row.opponent_support_hits,
    sample: row.opponent_support_sample,
    percentage: row.opponent_support_sample > 0
      ? toFiniteNumber(row.opponent_support_percentage) ?? (row.opponent_support_hits / row.opponent_support_sample) * 100
      : null,
    currentStreak: 0,
    formStrip: null,
  };
}

function venueMatchesScope(scope: GenericScope, fixture: GenericNextFixture | null) {
  if (!fixture || scope === 'overall') return true;
  return scope === 'home' ? fixture.isHome : !fixture.isHome;
}

function fixtureMatchesFilter(scope: GenericScope, fixture: GenericNextFixture | null, fixtureFilter: GenericFixtureFilter) {
  if (fixtureFilter === 'all') return true;
  if (!fixture || !venueMatchesScope(scope, fixture)) return false;
  if (fixtureFilter === 'with_fixture') return true;
  const today = formatDateKey(new Date());
  const targets: Record<Exclude<GenericFixtureFilter, 'all' | 'with_fixture'>, string> = {
    today,
    tomorrow: formatDateKey(addDays(new Date(), 1)),
    in_2_days: formatDateKey(addDays(new Date(), 2)),
  };
  return fixture.dateKey === targets[fixtureFilter];
}

// ──────────────────────────────────────────────────────────────────────────────
// Cached DB loaders
// ──────────────────────────────────────────────────────────────────────────────

const loadGenericMarketDefinition = unstable_cache(
  async (category: string, marketKey: string) => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('market_definitions')
      .select('key, label, is_active')
      .eq('key', marketKey)
      .eq('category', category)
      .maybeSingle();
    if (error) throw new Error(`Failed to load ${category} market definition: ${error.message}`);
    return toMarketDefinitionRows(data ? [data] : [])[0] ?? null;
  },
  ['generic-market-definition'],
  { revalidate: 300 },
);

async function loadGenericFilterOptionsUncached(category: string): Promise<GenericFilterOptions> {
  const supabaseAdmin = getSupabaseAdmin();
  const [{ data: supportedData, error: supportedError }, { data: marketData, error: marketError }] = await Promise.all([
    supabaseAdmin
      .from('supported_leagues')
      .select('league_id, season')
      .eq('is_active', true)
      .eq('enabled_for_comparison', true)
      .order('display_order', { ascending: true })
      .order('league_id', { ascending: true })
      .order('season', { ascending: false }),
    supabaseAdmin
      .from('market_definitions')
      .select('key, label, is_active')
      .eq('category', category)
      .eq('is_active', true)
      .order('key', { ascending: true }),
  ]);
  if (supportedError) throw new Error(`Failed to load ${category} league options: ${supportedError.message}`);
  if (marketError) throw new Error(`Failed to load ${category} market definitions: ${marketError.message}`);

  const supportedRows = toSupportedRows((supportedData ?? []) as unknown[]);
  if (supportedRows.length === 0) throw new Error('No supported leagues configured.');

  const leagueIds = [...new Set(supportedRows.map((row) => row.leagueId))];
  const { data: leagueData, error: leagueError } = await supabaseAdmin
    .from('leagues')
    .select('id, name, logo_url')
    .in('id', leagueIds);
  if (leagueError) throw new Error(`Failed to load ${category} leagues: ${leagueError.message}`);

  const leaguesById = new Map(toLeagueRows((leagueData ?? []) as unknown[]).map((league) => [league.id, league]));
  const markets = toMarketDefinitionRows((marketData ?? []) as unknown[]).map((row) => ({ key: row.key, label: row.label }));

  const leagueSeasons = supportedRows.map((row) => {
    const league = leaguesById.get(row.leagueId);
    return {
      leagueId: row.leagueId,
      leagueName: league?.name ?? `League ${row.leagueId}`,
      leagueLogoUrl: league?.logo_url ?? null,
      season: row.season,
    };
  });

  return {
    category,
    defaultLeagueId: leagueSeasons[0].leagueId,
    defaultSeason: leagueSeasons[0].season,
    leagueSeasons,
    markets,
    availableMarketKeys: markets.map((market) => market.key),
    defaultMarketKey: markets[0]?.key ?? '',
  };
}

export const loadGenericFilterOptions = unstable_cache(
  loadGenericFilterOptionsUncached,
  ['generic-filter-options'],
  { revalidate: 300 },
);

const loadGenericProfileSnapshotRows = unstable_cache(
  async (category: string, marketKey: string, leagueId: number, season: number, teamId: number | null, teamSearch: string) => {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('team_market_profiles')
      .select(TEAM_MARKET_PROFILE_SELECT)
      .eq('category', category)
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season);

    if (teamId !== null) {
      query = query.eq('team_id', teamId);
    } else if (teamSearch.trim()) {
      query = query.ilike('team_name', `%${teamSearch.trim()}%`);
    }

    const { data, error } = await query
      .order('overall_percentage', { ascending: false })
      .order('overall_sample', { ascending: false })
      .order('team_name', { ascending: true })
      .limit(MAX_GENERIC_TEAM_PANELS);

    if (error) {
      throw new Error(`Failed to load ${category} Market Serving Layer profiles. Run rebuild_market_serving_layer.py --category ${category}. Supabase: ${error.message}`);
    }

    return toProfileRows((data ?? []) as unknown[]);
  },
  ['generic-profile-snapshot-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

const loadGenericEvidenceSnapshotRows = unstable_cache(
  async (category: string, marketKey: string, leagueId: number, season: number, viewMode: GenericViewMode, teamIdsKey: string) => {
    const teamIds = teamIdsKey
      .split(',')
      .map((item) => Number(item))
      .filter((teamId) => Number.isInteger(teamId) && teamId > 0);
    if (teamIds.length === 0) return [];

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('team_market_match_evidence')
      .select(TEAM_MARKET_EVIDENCE_SELECT)
      .eq('category', category)
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .in('team_id', teamIds)
      .in('scope', matchScopesForViewMode(viewMode))
      .order('team_id', { ascending: true })
      .order('scope', { ascending: true })
      .order('played_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load ${category} Market Serving Layer evidence. Run rebuild_market_serving_layer.py --category ${category}. Supabase: ${error.message}`);
    }

    return toEvidenceRows((data ?? []) as unknown[]);
  },
  ['generic-evidence-snapshot-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

const loadGenericFormStripRows = unstable_cache(
  async (category: string, marketKey: string, leagueId: number, season: number) => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('team_market_match_evidence')
      .select('team_id, scope, result, played_at')
      .eq('category', category)
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .order('team_id', { ascending: true })
      .order('scope', { ascending: true })
      .order('played_at', { ascending: false });
    if (error) return [];
    return (data ?? []) as { team_id: number; scope: string; result: boolean; played_at: string }[];
  },
  ['generic-form-strip-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

const loadGenericQuickRankingSnapshotRows = unstable_cache(
  async (category: string, marketKey: string, leagueId: number, season: number) => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('market_team_rankings')
      .select(MARKET_TEAM_RANKING_SELECT)
      .eq('category', category)
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .in('scope', SCOPES)
      .order('rank', { ascending: true });

    if (error) {
      throw new Error(`Failed to load ${category} quick Market Serving Layer. Run rebuild_market_serving_layer.py --category ${category}. Supabase: ${error.message}`);
    }

    return toRankingRows((data ?? []) as unknown[]);
  },
  ['generic-quick-ranking-snapshot-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

export function parseGenericFilters(searchParams: GenericSearchParams | undefined, options: GenericFilterOptions): GenericFilters {
  const requestedLeagueId = parseInteger(searchParams?.leagueId) ?? options.defaultLeagueId;
  const requestedSeason = parseInteger(searchParams?.season) ?? options.defaultSeason;
  const leagueId = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedLeagueId : options.defaultLeagueId;
  const season = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedSeason : options.defaultSeason;
  const requestedKey = firstParam(searchParams?.marketKey) ?? '';
  const marketKey = options.availableMarketKeys.includes(requestedKey) ? requestedKey : options.defaultMarketKey;
  return {
    category: options.category,
    leagueId,
    season,
    marketKey,
    viewMode: parseViewMode(searchParams?.viewMode),
    teamSearch: firstParam(searchParams?.teamSearch)?.trim() ?? '',
    teamId: parseInteger(searchParams?.teamId),
  };
}

export function parseGenericQuickFilters(searchParams: GenericSearchParams | undefined, options: GenericFilterOptions): GenericQuickFilters {
  const requestedLeagueId = parseInteger(searchParams?.leagueId) ?? options.defaultLeagueId;
  const requestedSeason = parseInteger(searchParams?.season) ?? options.defaultSeason;
  const leagueId = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedLeagueId : options.defaultLeagueId;
  const season = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedSeason : options.defaultSeason;
  const requestedKey = firstParam(searchParams?.marketKey) ?? '';
  const marketKey = options.availableMarketKeys.includes(requestedKey) ? requestedKey : options.defaultMarketKey;
  return {
    category: options.category,
    leagueId,
    season,
    marketKey,
    teamSearch: firstParam(searchParams?.teamSearch)?.trim() ?? '',
    formWindow: parseFormWindow(searchParams?.formWindow),
    fixtureFilter: parseFixtureFilter(searchParams?.fixtureFilter),
    minSample: parseMainRankingFloor(parseInteger(searchParams?.minSample)),
  };
}

export async function loadGenericMatchEvidence(
  filters: GenericFilters,
  teamIds: number[],
): Promise<{ result: GenericMatchEvidenceResult; timing: GenericDetailTiming }> {
  const startedAt = Date.now();
  const { category, marketKey } = filters;
  const marketDefinitionPromise = loadGenericMarketDefinition(category, marketKey);
  const selectedTeamIds = [...new Set(teamIds.filter((teamId) => Number.isInteger(teamId) && teamId > 0))]
    .sort((left, right) => left - right);

  if (selectedTeamIds.length === 0) {
    const marketDefinition = await marketDefinitionPromise;
    return {
      result: { marketKey, marketLabel: marketDefinition?.label ?? marketKey, groups: [] },
      timing: { dbProfileMs: 0, dbEvidenceMs: 0, transformMs: 0, totalMs: Date.now() - startedAt, profileRowCount: 0, evidenceRowCount: 0, returnedEvidenceRowCount: 0 },
    };
  }

  const evidenceStartedAt = Date.now();
  const evidenceRows = await loadGenericEvidenceSnapshotRows(
    category, marketKey, filters.leagueId, filters.season, filters.viewMode, selectedTeamIds.join(','),
  );
  const dbEvidenceMs = Date.now() - evidenceStartedAt;
  const marketDefinition = await marketDefinitionPromise;
  const transformStartedAt = Date.now();
  const groups = groupEvidenceRows(evidenceRows, filters.viewMode);
  const transformMs = Date.now() - transformStartedAt;

  return {
    result: { marketKey, marketLabel: marketDefinition?.label ?? marketKey, groups },
    timing: {
      dbProfileMs: 0, dbEvidenceMs, transformMs, totalMs: Date.now() - startedAt,
      profileRowCount: 0, evidenceRowCount: evidenceRows.length, returnedEvidenceRowCount: countReturnedEvidenceRows(groups),
    },
  };
}

export async function loadGenericTeamPanelsWithTiming(
  filters: GenericFilters,
  options: { includeEvidence?: boolean } = {},
): Promise<{ result: GenericDetailResult; timing: GenericDetailTiming }> {
  const startedAt = Date.now();
  const { category, marketKey } = filters;
  const includeEvidence = options.includeEvidence === true;
  const profileStartedAt = Date.now();
  const [marketDefinition, profileRows] = await Promise.all([
    loadGenericMarketDefinition(category, marketKey),
    loadGenericProfileSnapshotRows(category, marketKey, filters.leagueId, filters.season, filters.teamId, filters.teamSearch.trim()),
  ]);
  const dbProfileMs = Date.now() - profileStartedAt;
  const marketLabel = marketDefinition?.label ?? marketKey;

  if (profileRows.length === 0) {
    return {
      result: { marketKey, marketLabel, marketAvailable: marketDefinition?.is_active === true, evidenceMode: 'summary', panels: [] },
      timing: { dbProfileMs, dbEvidenceMs: 0, transformMs: 0, totalMs: Date.now() - startedAt, profileRowCount: 0, evidenceRowCount: 0, returnedEvidenceRowCount: 0 },
    };
  }

  let evidenceGroups: GenericTeamEvidenceGroup[] = [];
  let dbEvidenceMs = 0;
  let evidenceRowCount = 0;
  let returnedEvidenceRowCount = 0;

  if (includeEvidence) {
    const evidence = await loadGenericMatchEvidence(filters, profileRows.map((row) => row.team_id));
    evidenceGroups = evidence.result.groups;
    dbEvidenceMs = evidence.timing.dbEvidenceMs;
    evidenceRowCount = evidence.timing.evidenceRowCount;
    returnedEvidenceRowCount = evidence.timing.returnedEvidenceRowCount;
  }

  const matchRowsByTeamScope = evidenceGroupsToMap(evidenceGroups);
  const transformStartedAt = Date.now();
  const panels = profileRows.map((row) => toGenericTeamPanel({ evidenceLoaded: includeEvidence, filters, marketKey, marketLabel, matchRowsByTeamScope, row }));
  const transformMs = Date.now() - transformStartedAt;

  return {
    result: { marketKey, marketLabel, marketAvailable: marketDefinition?.is_active === true, evidenceMode: includeEvidence ? 'evidence' : 'summary', panels },
    timing: { dbProfileMs, dbEvidenceMs, transformMs, totalMs: Date.now() - startedAt, profileRowCount: profileRows.length, evidenceRowCount, returnedEvidenceRowCount },
  };
}

export async function loadGenericQuickScannerWithTiming(
  filters: GenericQuickFilters,
): Promise<{ result: GenericQuickResult; timing: GenericQuickTiming }> {
  const startedAt = Date.now();
  const { category, marketKey } = filters;
  const dbStartedAt = Date.now();
  const [marketDefinition, snapshotRows, formStripRawRows] = await Promise.all([
    loadGenericMarketDefinition(category, marketKey),
    loadGenericQuickRankingSnapshotRows(category, marketKey, filters.leagueId, filters.season),
    loadGenericFormStripRows(category, marketKey, filters.leagueId, filters.season),
  ]);
  const dbMs = Date.now() - dbStartedAt;

  // Build form strip map: key = "teamId:scope" → last 5 results oldest-first
  const formStripMap = new Map<string, boolean[]>();
  for (const row of formStripRawRows) {
    const key = `${row.team_id}:${row.scope}`;
    const existing = formStripMap.get(key) ?? [];
    if (existing.length < 5) existing.push(row.result);
    formStripMap.set(key, existing);
  }
  // Rows arrived DESC (newest first); reverse each strip so index 0 = oldest
  for (const [key, strip] of formStripMap) formStripMap.set(key, strip.reverse());

  const transformStartedAt = Date.now();
  const marketLabel = marketDefinition?.label ?? marketKey;
  const normalizedSearch = filters.teamSearch.trim().toLowerCase();
  const candidatesByScope = new Map<GenericScope, GenericQuickRow[]>();

  for (const scope of SCOPES) {
    const rows = snapshotRows
      .filter((row) => row.scope === scope)
      .flatMap((row) => {
        if (normalizedSearch && !row.team_name.toLowerCase().includes(normalizedSearch)) return [];
        const formStrip = formStripMap.get(`${row.team_id}:${scope}`) ?? null;
        const metric = metricFromQuickSnapshot(row, filters.formWindow, formStrip);
        if (metric.sample < EMERGING_MIN_SAMPLE) return [];

        const nextFixture = row.next_fixture_id !== null && row.next_fixture_date !== null && row.next_opponent_team_id !== null && row.next_opponent_name !== null && row.next_venue_scope !== null
          ? {
            fixtureId: row.next_fixture_id,
            opponentTeamId: row.next_opponent_team_id,
            opponentName: row.next_opponent_name,
            isHome: row.next_venue_scope === 'home',
            date: row.next_fixture_date,
            dateKey: formatDateKey(new Date(row.next_fixture_date)),
          } satisfies GenericNextFixture
          : null;
        if (!fixtureMatchesFilter(scope, nextFixture, filters.fixtureFilter)) return [];

        const sp = new URLSearchParams({
          teamId: String(row.team_id),
          marketKey: row.market_key,
          source: `${category}-quick`,
          leagueId: String(row.league_id),
          season: String(row.season),
        });

        return [{
          teamId: row.team_id,
          teamName: row.team_name,
          teamLogoUrl: row.team_logo_url,
          scope,
          marketKey,
          marketLabel,
          metric,
          nextFixture,
          opponentSupport: opponentMetricFromQuickSnapshot(row, filters.formWindow),
          opponentSupportScope: row.opponent_support_scope,
          fixtureContextMismatch: nextFixture !== null && !venueMatchesScope(scope, nextFixture),
          detailedHref: `${categoryHrefPrefix(category)}?${sp.toString()}`,
          comparisonHref: nextFixture ? `/comparison?fixtureId=${nextFixture.fixtureId}&marketKey=${marketKey}&source=${category}-quick` : null,
        } satisfies GenericQuickRow];
      })
      .sort((left, right) => (
        (right.metric.percentage ?? -1) - (left.metric.percentage ?? -1) ||
        right.metric.hits - left.metric.hits ||
        right.metric.sample - left.metric.sample ||
        left.teamName.localeCompare(right.teamName)
      ));
    candidatesByScope.set(scope, rows);
  }

  const columns: GenericQuickColumn[] = SCOPES.map((scope) => {
    const rows = (candidatesByScope.get(scope) ?? [])
      .filter((row) => row.metric.sample >= filters.minSample)
      .slice(0, QUICK_RESULT_LIMIT_PER_SCOPE);
    return { scope, title: scopeTitle(scope), rows };
  });
  const emergingColumns: GenericQuickColumn[] = SCOPES.map((scope) => {
    const rows = (candidatesByScope.get(scope) ?? [])
      .filter((row) => row.metric.sample >= EMERGING_MIN_SAMPLE && row.metric.sample < MAIN_RANKING_MIN_SAMPLE)
      .slice(0, QUICK_RESULT_LIMIT_PER_SCOPE);
    return { scope, title: scopeTitle(scope), rows };
  });

  return {
    result: { marketKey, marketLabel, marketAvailable: marketDefinition?.is_active === true, columns, emergingColumns },
    timing: { dbMs, transformMs: Date.now() - transformStartedAt, totalMs: Date.now() - startedAt, rowCount: snapshotRows.length },
  };
}
