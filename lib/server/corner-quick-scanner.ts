import 'server-only';

import { unstable_cache } from 'next/cache';
import { addDays, formatDateKey, getDateRange } from '@/lib/date';
import { getSupabaseAdmin } from './supabase-admin';
import { EMERGING_MIN_SAMPLE, MAIN_RANKING_MIN_SAMPLE, parseMainRankingFloor } from './sample-bands';

export type CornerQuickScope = 'overall' | 'home' | 'away';
export type CornerQuickPeriodGroup = 'full' | 'by_half';
export type CornerQuickMarketGroup =
  | 'total_match_corners_over'
  | 'total_match_corners_under'
  | 'team_corners_for'
  | 'team_corners_against'
  | 'corner_handicap'
  | 'each_team_corners'
  | 'total_1h_corners'
  | 'team_1h_corners_for'
  | 'team_1h_corners_against'
  | 'total_2h_corners'
  | 'total_corners_each_half';
export type CornerQuickFormWindow = 'season' | 'last5' | 'last10';
export type CornerQuickFixtureFilter = 'all' | 'with_fixture' | 'today' | 'tomorrow' | 'in_2_days';

export type CornerQuickFilters = {
  leagueId: number;
  season: number;
  periodGroup: CornerQuickPeriodGroup;
  marketGroup: CornerQuickMarketGroup;
  line: string;
  teamSearch: string;
  minOdds: number | null;
  formWindow: CornerQuickFormWindow;
  fixtureFilter: CornerQuickFixtureFilter;
  minSample: number;
};

export type CornerQuickLeagueSeasonOption = {
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
};

export type CornerQuickMarketGroupOption = {
  value: CornerQuickMarketGroup;
  label: string;
  periodGroup: CornerQuickPeriodGroup;
  lines: string[];
};

export type CornerQuickFilterOptions = {
  defaultLeagueId: number;
  defaultSeason: number;
  leagueSeasons: CornerQuickLeagueSeasonOption[];
  marketGroups: CornerQuickMarketGroupOption[];
};

export type CornerQuickSearchParams = Record<string, string | string[] | undefined>;

export type CornerQuickMetric = {
  hits: number;
  sample: number;
  percentage: number | null;
  currentStreak: number;
};

export type CornerQuickNextFixture = {
  fixtureId: number;
  opponentTeamId: number;
  opponentName: string;
  isHome: boolean;
  date: string;
  dateKey: string;
};

export type CornerQuickRow = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  leagueId: number;
  season: number;
  scope: CornerQuickScope;
  marketKey: string;
  marketLabel: string;
  metric: CornerQuickMetric;
  nextFixture: CornerQuickNextFixture | null;
  opponentSupport: CornerQuickMetric | null;
  opponentSupportScope: CornerQuickScope | null;
  fixtureContextMismatch: boolean;
  detailedHref: string;
  comparisonHref: string | null;
};

export type CornerQuickColumn = {
  scope: CornerQuickScope;
  title: string;
  rows: CornerQuickRow[];
};

export type CornerQuickResult = {
  marketKey: string;
  marketLabel: string;
  marketAvailable: boolean;
  // Main ranking: sample ≥ the (raise-only) floor, ≥ 10.
  columns: CornerQuickColumn[];
  // Emerging / low sample: sample 5–9, split by scope. Never mixed into `columns`.
  emergingColumns: CornerQuickColumn[];
};

export type CornerQuickTiming = {
  dbMs: number;
  transformMs: number;
  totalMs: number;
  rowCount: number;
};

type SupportedLeagueRow = {
  league_id: number | string | null;
  season: number | string | null;
};

type LeagueRow = {
  id: number;
  name: string;
  logo_url: string | null;
};

type TeamRow = {
  id: number;
  name: string;
  logo_url: string | null;
};

type MarketDefinitionRow = {
  key: string;
  label: string;
  is_active: boolean;
};

type TeamSeasonMarketStatRow = {
  team_id: number;
  league_id: number;
  season: number;
  scope: CornerQuickScope;
  market_key: string;
  sample: number;
  hits: number;
  percentage: number | string;
  current_streak: number;
  last_5_sample: number | null;
  last_5_hits: number | null;
  last_5_percentage: number | string | null;
  last_10_sample: number | null;
  last_10_hits: number | null;
  last_10_percentage: number | string | null;
};

type FixtureTeamRow = {
  fixture_id: number;
  team_id: number;
  opponent_team_id: number;
  is_home: boolean;
  played_at: string;
};

type FixtureIdRow = {
  id: number;
};

type MarketTeamRankingRow = {
  category: string;
  market_key: string;
  league_id: number;
  season: number;
  scope: CornerQuickScope;
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
  next_home_team_id: number | null;
  next_away_team_id: number | null;
  next_opponent_team_id: number | null;
  next_opponent_name: string | null;
  next_venue_scope: 'home' | 'away' | null;
  opponent_support_scope: CornerQuickScope | null;
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

const NEXT_FIXTURE_WINDOW_DAYS = 6;
const QUICK_RESULT_LIMIT_PER_SCOPE = 60;
const MARKET_SERVING_CACHE_SECONDS = 60;
const UPCOMING_STATUSES = ['NS', 'TBD'] as const;
const SCOPES: CornerQuickScope[] = ['overall', 'home', 'away'];

export const CORNER_QUICK_MARKET_GROUPS: CornerQuickMarketGroupOption[] = [
  {
    value: 'total_match_corners_over',
    label: 'Total Match Corners Over',
    periodGroup: 'full',
    lines: ['7.5', '8.5', '9.5', '10.5', '11.5', '12.5'],
  },
  {
    value: 'total_match_corners_under',
    label: 'Total Match Corners Under',
    periodGroup: 'full',
    lines: ['7.5', '8.5', '9.5', '10.5', '11.5', '12.5'],
  },
  {
    value: 'team_corners_for',
    label: 'Total Team Corners For',
    periodGroup: 'full',
    lines: ['2.5', '3.5', '4.5', '5.5', '6.5'],
  },
  {
    value: 'team_corners_against',
    label: 'Total Team Corners Against',
    periodGroup: 'full',
    lines: ['2.5', '3.5', '4.5', '5.5', '6.5'],
  },
  {
    value: 'corner_handicap',
    label: 'Corner Handicap',
    periodGroup: 'full',
    lines: ['-2', '-1', '0', '1', '2'],
  },
  {
    value: 'each_team_corners',
    label: 'Each Team Corners',
    periodGroup: 'full',
    lines: ['1.5', '2.5', '3.5', '4.5'],
  },
  {
    value: 'total_1h_corners',
    label: 'Total 1st Half Corners',
    periodGroup: 'by_half',
    lines: ['3.5', '4.5', '5.5', '6.5'],
  },
  {
    value: 'team_1h_corners_for',
    label: 'Team 1st Half Corners For',
    periodGroup: 'by_half',
    lines: ['1.5', '2.5', '3.5'],
  },
  {
    value: 'team_1h_corners_against',
    label: 'Team 1st Half Corners Against',
    periodGroup: 'by_half',
    lines: ['1.5', '2.5', '3.5'],
  },
  {
    value: 'total_2h_corners',
    label: 'Total 2nd Half Corners',
    periodGroup: 'by_half',
    lines: ['3.5', '4.5', '5.5', '6.5'],
  },
  {
    value: 'total_corners_each_half',
    label: 'Total Corners Each Half',
    periodGroup: 'by_half',
    lines: ['3.5', '4.5', '5.5', '6.5'],
  },
];

const DEFAULT_LINE_BY_GROUP: Record<CornerQuickMarketGroup, string> = {
  total_match_corners_over: '9.5',
  total_match_corners_under: '9.5',
  team_corners_for: '4.5',
  team_corners_against: '4.5',
  corner_handicap: '0',
  each_team_corners: '2.5',
  total_1h_corners: '3.5',
  team_1h_corners_for: '2.5',
  team_1h_corners_against: '2.5',
  total_2h_corners: '3.5',
  total_corners_each_half: '3.5',
};

const GROUP_LABEL_BY_VALUE = new Map(CORNER_QUICK_MARKET_GROUPS.map((group) => [group.value, group.label]));

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseInteger(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstParam(value) ?? '', 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseFloatParam(value: string | string[] | undefined) {
  const parsed = Number.parseFloat(firstParam(value) ?? '');
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMarketGroup(value: string | string[] | undefined): CornerQuickMarketGroup {
  const rawValue = firstParam(value);
  const option = CORNER_QUICK_MARKET_GROUPS.find((item) => item.value === rawValue);
  return option?.value ?? 'total_match_corners_over';
}

function parsePeriodGroup(value: string | string[] | undefined): CornerQuickPeriodGroup {
  return firstParam(value) === 'by_half' ? 'by_half' : 'full';
}

function parseFormWindow(value: string | string[] | undefined): CornerQuickFormWindow {
  const rawValue = firstParam(value);
  return rawValue === 'last5' || rawValue === 'last10' ? rawValue : 'season';
}

function parseFixtureFilter(value: string | string[] | undefined): CornerQuickFixtureFilter {
  const rawValue = firstParam(value);
  if (rawValue === 'with_fixture' || rawValue === 'today' || rawValue === 'tomorrow' || rawValue === 'in_2_days') {
    return rawValue;
  }

  return 'all';
}

function hasLeagueSeason(options: CornerQuickFilterOptions, leagueId: number, season: number) {
  return options.leagueSeasons.some((item) => item.leagueId === leagueId && item.season === season);
}

function defaultMarketGroupForPeriod(periodGroup: CornerQuickPeriodGroup): CornerQuickMarketGroup {
  return periodGroup === 'by_half' ? 'total_1h_corners' : 'total_match_corners_over';
}

export function parseCornerQuickFilters(
  searchParams: CornerQuickSearchParams | undefined,
  options: CornerQuickFilterOptions,
): CornerQuickFilters {
  const requestedLeagueId = parseInteger(searchParams?.leagueId) ?? options.defaultLeagueId;
  const requestedSeason = parseInteger(searchParams?.season) ?? options.defaultSeason;
  const leagueId = hasLeagueSeason(options, requestedLeagueId, requestedSeason)
    ? requestedLeagueId
    : options.defaultLeagueId;
  const season = hasLeagueSeason(options, requestedLeagueId, requestedSeason)
    ? requestedSeason
    : options.defaultSeason;
  const periodGroup = parsePeriodGroup(searchParams?.periodGroup);
  const requestedMarketGroup = parseMarketGroup(searchParams?.marketGroup);
  const marketGroupOption = options.marketGroups.find((option) => option.value === requestedMarketGroup);
  const marketGroup = marketGroupOption?.periodGroup === periodGroup
    ? requestedMarketGroup
    : defaultMarketGroupForPeriod(periodGroup);
  const minOdds = parseFloatParam(searchParams?.minOdds);

  return {
    leagueId,
    season,
    periodGroup,
    marketGroup,
    line: normalizeCornerQuickLine(marketGroup, firstParam(searchParams?.line)),
    teamSearch: firstParam(searchParams?.teamSearch)?.trim() ?? '',
    minOdds: minOdds !== null && minOdds > 0 ? minOdds : null,
    formWindow: parseFormWindow(searchParams?.formWindow),
    fixtureFilter: parseFixtureFilter(searchParams?.fixtureFilter),
    // P0 raise-only main-ranking floor: 10 (default) / 15 / 20. Never below 10.
    minSample: parseMainRankingFloor(parseInteger(searchParams?.minSample)),
  };
}

function isCornerQuickScope(value: unknown): value is CornerQuickScope {
  return value === 'overall' || value === 'home' || value === 'away';
}

function toFiniteNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function lineToKeyPart(line: string) {
  return line.replace('-', 'MINUS_').replace('.', '_');
}

function normalizeLineValue(marketGroup: CornerQuickMarketGroup, value: string | undefined) {
  const option = CORNER_QUICK_MARKET_GROUPS.find((group) => group.value === marketGroup);
  const allowedLines = option?.lines ?? [];
  const parsed = Number(value);
  const matchedLine = allowedLines.find((line) => Number(line) === parsed);
  return matchedLine ?? DEFAULT_LINE_BY_GROUP[marketGroup];
}

export function normalizeCornerQuickLine(marketGroup: CornerQuickMarketGroup, value: string | undefined) {
  return normalizeLineValue(marketGroup, value);
}

export function resolveCornerQuickMarketKey(marketGroup: CornerQuickMarketGroup, line: string) {
  const normalizedLine = normalizeLineValue(marketGroup, line);
  const keyLine = lineToKeyPart(normalizedLine);

  if (marketGroup === 'total_match_corners_over') {
    return `MATCH_OVER_${keyLine}_CORNERS`;
  }

  if (marketGroup === 'total_match_corners_under') {
    return `MATCH_UNDER_${keyLine}_CORNERS`;
  }

  if (marketGroup === 'team_corners_for') {
    return `TEAM_OVER_${keyLine}_CORNERS_FOR`;
  }

  if (marketGroup === 'team_corners_against') {
    return `TEAM_OVER_${keyLine}_CORNERS_AGAINST`;
  }

  if (marketGroup === 'corner_handicap') {
    if (normalizedLine === '0') {
      return 'MOST_CORNERS';
    }

    const prefix = normalizedLine.startsWith('-') ? 'MINUS' : 'PLUS';
    return `CORNERS_HANDICAP_${prefix}_${Math.abs(Number(normalizedLine))}`;
  }

  if (marketGroup === 'total_1h_corners') {
    return `MATCH_1H_OVER_${keyLine}_CORNERS`;
  }

  if (marketGroup === 'team_1h_corners_for') {
    return `TEAM_1H_OVER_${keyLine}_CORNERS_FOR`;
  }

  if (marketGroup === 'team_1h_corners_against') {
    return `TEAM_1H_OVER_${keyLine}_CORNERS_AGAINST`;
  }

  if (marketGroup === 'total_2h_corners') {
    return `MATCH_2H_OVER_${keyLine}_CORNERS`;
  }

  if (marketGroup === 'total_corners_each_half') {
    return `MATCH_EACH_HALF_OVER_${keyLine}_CORNERS`;
  }

  return `EACH_TEAM_OVER_${keyLine}_CORNERS`;
}

function fallbackMarketLabel(marketGroup: CornerQuickMarketGroup, line: string) {
  const label = GROUP_LABEL_BY_VALUE.get(marketGroup) ?? 'Corners';

  if (marketGroup === 'corner_handicap') {
    return Number(line) === 0 ? 'Most Corners' : `${line} Corner Handicap`;
  }

  const operator = marketGroup === 'total_match_corners_under' ? 'Under' : 'Over';
  return `${operator} ${normalizeLineValue(marketGroup, line)} ${label.replace(/ (Over|Under)$/u, '')}`;
}

function toSupportedLeagueRows(rows: unknown[]) {
  return rows.flatMap((row) => {
    const record = row as SupportedLeagueRow;
    const leagueId = Number(record.league_id);
    const season = Number(record.season);

    if (!Number.isInteger(leagueId) || leagueId <= 0 || !Number.isInteger(season)) {
      return [];
    }

    return [{ leagueId, season }];
  });
}

function toLeagueRows(rows: unknown[]): LeagueRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<LeagueRow>;
    if (typeof record.id !== 'number' || typeof record.name !== 'string') {
      return [];
    }

    return [{
      id: record.id,
      name: record.name,
      logo_url: typeof record.logo_url === 'string' ? record.logo_url : null,
    }];
  });
}

function toTeamRows(rows: unknown[]): TeamRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamRow>;
    if (typeof record.id !== 'number' || typeof record.name !== 'string') {
      return [];
    }

    return [{
      id: record.id,
      name: record.name,
      logo_url: typeof record.logo_url === 'string' ? record.logo_url : null,
    }];
  });
}

function toMarketDefinitionRows(rows: unknown[]): MarketDefinitionRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<MarketDefinitionRow>;
    if (typeof record.key !== 'string' || typeof record.label !== 'string' || typeof record.is_active !== 'boolean') {
      return [];
    }

    return [{ key: record.key, label: record.label, is_active: record.is_active }];
  });
}

// Kept temporarily as a migration reference for the old live Supabase loader.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toStatRows(rows: unknown[]): TeamSeasonMarketStatRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamSeasonMarketStatRow>;
    if (
      typeof record.team_id !== 'number' ||
      typeof record.league_id !== 'number' ||
      typeof record.season !== 'number' ||
      !isCornerQuickScope(record.scope) ||
      typeof record.market_key !== 'string' ||
      typeof record.sample !== 'number' ||
      typeof record.hits !== 'number' ||
      (typeof record.percentage !== 'number' && typeof record.percentage !== 'string') ||
      typeof record.current_streak !== 'number'
    ) {
      return [];
    }

    return [{
      team_id: record.team_id,
      league_id: record.league_id,
      season: record.season,
      scope: record.scope,
      market_key: record.market_key,
      sample: record.sample,
      hits: record.hits,
      percentage: record.percentage,
      current_streak: record.current_streak,
      last_5_sample: typeof record.last_5_sample === 'number' ? record.last_5_sample : null,
      last_5_hits: typeof record.last_5_hits === 'number' ? record.last_5_hits : null,
      last_5_percentage: typeof record.last_5_percentage === 'number' || typeof record.last_5_percentage === 'string'
        ? record.last_5_percentage
        : null,
      last_10_sample: typeof record.last_10_sample === 'number' ? record.last_10_sample : null,
      last_10_hits: typeof record.last_10_hits === 'number' ? record.last_10_hits : null,
      last_10_percentage: typeof record.last_10_percentage === 'number' || typeof record.last_10_percentage === 'string'
        ? record.last_10_percentage
        : null,
    }];
  });
}

function toMarketTeamRankingRows(rows: unknown[]): MarketTeamRankingRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<MarketTeamRankingRow>;
    if (
      typeof record.category !== 'string' ||
      typeof record.market_key !== 'string' ||
      typeof record.league_id !== 'number' ||
      typeof record.season !== 'number' ||
      !isCornerQuickScope(record.scope) ||
      typeof record.team_id !== 'number' ||
      typeof record.team_name !== 'string' ||
      typeof record.hits !== 'number' ||
      typeof record.sample !== 'number' ||
      (typeof record.percentage !== 'number' && typeof record.percentage !== 'string') ||
      typeof record.current_streak !== 'number'
    ) {
      return [];
    }

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
      next_home_team_id: typeof record.next_home_team_id === 'number' ? record.next_home_team_id : null,
      next_away_team_id: typeof record.next_away_team_id === 'number' ? record.next_away_team_id : null,
      next_opponent_team_id: typeof record.next_opponent_team_id === 'number' ? record.next_opponent_team_id : null,
      next_opponent_name: typeof record.next_opponent_name === 'string' ? record.next_opponent_name : null,
      next_venue_scope: record.next_venue_scope === 'home' || record.next_venue_scope === 'away' ? record.next_venue_scope : null,
      opponent_support_scope: isCornerQuickScope(record.opponent_support_scope) ? record.opponent_support_scope : null,
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

function toFixtureTeamRows(rows: unknown[]): FixtureTeamRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<FixtureTeamRow>;
    if (
      typeof record.fixture_id !== 'number' ||
      typeof record.team_id !== 'number' ||
      typeof record.opponent_team_id !== 'number' ||
      typeof record.is_home !== 'boolean' ||
      typeof record.played_at !== 'string'
    ) {
      return [];
    }

    return [{
      fixture_id: record.fixture_id,
      team_id: record.team_id,
      opponent_team_id: record.opponent_team_id,
      is_home: record.is_home,
      played_at: record.played_at,
    }];
  });
}

function toFixtureIdRows(rows: unknown[]): FixtureIdRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<FixtureIdRow>;
    if (typeof record.id !== 'number') {
      return [];
    }

    return [{ id: record.id }];
  });
}

// Kept temporarily as a migration reference for the old live Supabase loader.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function metricFromStat(row: TeamSeasonMarketStatRow, formWindow: CornerQuickFormWindow): CornerQuickMetric {
  if (formWindow === 'last5') {
    const sample = row.last_5_sample ?? Math.min(row.sample, 5);
    const hits = row.last_5_hits ?? 0;
    return {
      hits,
      sample,
      percentage: row.last_5_hits === null || sample === 0 ? null : (hits / sample) * 100,
      currentStreak: row.current_streak,
    };
  }

  if (formWindow === 'last10') {
    const sample = row.last_10_sample ?? Math.min(row.sample, 10);
    const hits = row.last_10_hits ?? 0;
    return {
      hits,
      sample,
      percentage: row.last_10_hits === null || sample === 0 ? null : (hits / sample) * 100,
      currentStreak: row.current_streak,
    };
  }

  return {
    hits: row.hits,
    sample: row.sample,
    percentage: toFiniteNumber(row.percentage) ?? (row.sample > 0 ? (row.hits / row.sample) * 100 : null),
    currentStreak: row.current_streak,
  };
}

function metricFromQuickSnapshot(row: MarketTeamRankingRow, formWindow: CornerQuickFormWindow): CornerQuickMetric {
  if (formWindow === 'last5') {
    const sample = row.last_5_sample ?? Math.min(row.sample, 5);
    const hits = row.last_5_hits ?? 0;
    return {
      hits,
      sample,
      percentage: sample > 0 ? toFiniteNumber(row.last_5_percentage) ?? (hits / sample) * 100 : null,
      currentStreak: row.current_streak,
    };
  }

  if (formWindow === 'last10') {
    const sample = row.last_10_sample ?? Math.min(row.sample, 10);
    const hits = row.last_10_hits ?? 0;
    return {
      hits,
      sample,
      percentage: sample > 0 ? toFiniteNumber(row.last_10_percentage) ?? (hits / sample) * 100 : null,
      currentStreak: row.current_streak,
    };
  }

  return {
    hits: row.hits,
    sample: row.sample,
    percentage: row.sample > 0 ? toFiniteNumber(row.percentage) ?? (row.hits / row.sample) * 100 : null,
    currentStreak: row.current_streak,
  };
}

function opponentMetricFromQuickSnapshot(row: MarketTeamRankingRow, formWindow: CornerQuickFormWindow): CornerQuickMetric | null {
  if (row.opponent_support_sample === null || row.opponent_support_hits === null) {
    return null;
  }

  if (formWindow === 'last5') {
    const sample = row.opponent_support_last_5_sample ?? Math.min(row.opponent_support_sample, 5);
    const hits = row.opponent_support_last_5_hits ?? 0;
    return {
      hits,
      sample,
      percentage: sample > 0 ? toFiniteNumber(row.opponent_support_last_5_percentage) ?? (hits / sample) * 100 : null,
      currentStreak: 0,
    };
  }

  if (formWindow === 'last10') {
    const sample = row.opponent_support_last_10_sample ?? Math.min(row.opponent_support_sample, 10);
    const hits = row.opponent_support_last_10_hits ?? 0;
    return {
      hits,
      sample,
      percentage: sample > 0 ? toFiniteNumber(row.opponent_support_last_10_percentage) ?? (hits / sample) * 100 : null,
      currentStreak: 0,
    };
  }

  return {
    hits: row.opponent_support_hits,
    sample: row.opponent_support_sample,
    percentage: row.opponent_support_sample > 0
      ? toFiniteNumber(row.opponent_support_percentage) ?? (row.opponent_support_hits / row.opponent_support_sample) * 100
      : null,
    currentStreak: 0,
  };
}

// Kept temporarily as a migration reference for the old live Supabase loader.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildStatKey(teamId: number, scope: CornerQuickScope) {
  return `${teamId}:${scope}`;
}

function venueMatchesScope(scope: CornerQuickScope, fixture: CornerQuickNextFixture | null) {
  if (!fixture || scope === 'overall') {
    return true;
  }

  return scope === 'home' ? fixture.isHome : !fixture.isHome;
}

function opponentScopeForFixture(scope: CornerQuickScope, fixture: CornerQuickNextFixture | null): CornerQuickScope | null {
  if (!fixture) {
    return null;
  }

  if (scope === 'overall') {
    return 'overall';
  }

  return fixture.isHome ? 'away' : 'home';
}

function fixtureMatchesFilter(
  scope: CornerQuickScope,
  fixture: CornerQuickNextFixture | null,
  fixtureFilter: CornerQuickFixtureFilter,
) {
  if (fixtureFilter === 'all') {
    return true;
  }

  if (!fixture || !venueMatchesScope(scope, fixture)) {
    return false;
  }

  if (fixtureFilter === 'with_fixture') {
    return true;
  }

  const { start } = getDateRange(1);
  const targetDateKeyByFilter: Record<Exclude<CornerQuickFixtureFilter, 'all' | 'with_fixture'>, string> = {
    today: formatDateKey(start),
    tomorrow: formatDateKey(addDays(start, 1)),
    in_2_days: formatDateKey(addDays(start, 2)),
  };

  return fixture.dateKey === targetDateKeyByFilter[fixtureFilter];
}

function buildDetailedHref(row: {
  leagueId: number;
  season: number;
  teamId: number;
  periodGroup: CornerQuickPeriodGroup;
  marketKey: string;
}) {
  const params = new URLSearchParams({
    teamId: String(row.teamId),
    periodGroup: row.periodGroup,
    marketKey: row.marketKey,
    source: 'corners-quick',
    leagueId: String(row.leagueId),
    season: String(row.season),
  });

  return `/corners?${params.toString()}`;
}

function buildComparisonHref(fixtureId: number, marketKey: string) {
  const params = new URLSearchParams({
    fixtureId: String(fixtureId),
    marketKey,
    source: 'corners-quick',
  });

  return `/comparison?${params.toString()}`;
}

const loadMarketDefinition = unstable_cache(async (marketKey: string) => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('market_definitions')
    .select('key, label, is_active')
    .eq('key', marketKey)
    .eq('category', 'corners')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load corner quick market definition: ${error.message}`);
  }

  return toMarketDefinitionRows(data ? [data] : [])[0] ?? null;
}, ['corner-quick-market-definition'], { revalidate: 300 });

const loadCornerQuickRankingSnapshotRows = unstable_cache(
  async (marketKey: string, leagueId: number, season: number) => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('market_team_rankings')
      .select('category, market_key, league_id, season, scope, team_id, team_name, team_logo_url, hits, sample, percentage, current_streak, longest_streak, last_5_sample, last_5_hits, last_5_percentage, last_10_sample, last_10_hits, last_10_percentage, next_fixture_id, next_fixture_date, next_home_team_id, next_away_team_id, next_opponent_team_id, next_opponent_name, next_venue_scope, opponent_support_scope, opponent_support_hits, opponent_support_sample, opponent_support_percentage, opponent_support_last_5_hits, opponent_support_last_5_sample, opponent_support_last_5_percentage, opponent_support_last_10_hits, opponent_support_last_10_sample, opponent_support_last_10_percentage')
      .eq('category', 'corners')
      .eq('league_id', leagueId)
      .eq('season', season)
      .eq('market_key', marketKey)
      .in('scope', SCOPES)
      .order('rank', { ascending: true });

    if (error) {
      throw new Error(`Failed to load corner quick Market Serving Layer. Apply schema/004_market_serving_layer.sql and run rebuild_market_serving_layer.py. Supabase: ${error.message}`);
    }

    return toMarketTeamRankingRows((data ?? []) as unknown[]);
  },
  ['corner-quick-ranking-snapshot-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

// Kept temporarily as a migration reference for the old live Supabase loader.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadNextFixtures(teamIds: number[], leagueId: number, season: number) {
  if (teamIds.length === 0) {
    return new Map<number, CornerQuickNextFixture>();
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { start, end } = getDateRange(NEXT_FIXTURE_WINDOW_DAYS);
  const { data: fixtureTeamData, error: fixtureTeamError } = await supabaseAdmin
    .from('fixture_teams')
    .select('fixture_id, team_id, opponent_team_id, is_home, played_at')
    .in('team_id', teamIds)
    .eq('league_id', leagueId)
    .eq('season', season)
    .gte('played_at', start.toISOString())
    .lt('played_at', end.toISOString())
    .order('played_at', { ascending: true });

  if (fixtureTeamError) {
    throw new Error(`Failed to load corner quick fixtures: ${fixtureTeamError.message}`);
  }

  const fixtureTeamRows = toFixtureTeamRows((fixtureTeamData ?? []) as unknown[]);
  const fixtureIds = [...new Set(fixtureTeamRows.map((row) => row.fixture_id))];
  let eligibleFixtureIds = new Set<number>();

  if (fixtureIds.length > 0) {
    const { data: fixtureData, error: fixtureError } = await supabaseAdmin
      .from('fixtures')
      .select('id')
      .in('id', fixtureIds)
      .in('status_short', [...UPCOMING_STATUSES])
      .gte('date', start.toISOString())
      .lt('date', end.toISOString());

    if (fixtureError) {
      throw new Error(`Failed to verify corner quick fixtures: ${fixtureError.message}`);
    }

    eligibleFixtureIds = new Set(toFixtureIdRows((fixtureData ?? []) as unknown[]).map((row) => row.id));
  }

  const eligibleRows = fixtureTeamRows.filter((row) => eligibleFixtureIds.has(row.fixture_id));
  const opponentTeamIds = [...new Set(eligibleRows.map((row) => row.opponent_team_id))];
  const { data: opponentData, error: opponentError } = opponentTeamIds.length > 0
    ? await supabaseAdmin.from('teams').select('id, name, logo_url').in('id', opponentTeamIds)
    : { data: [], error: null };

  if (opponentError) {
    throw new Error(`Failed to load corner quick fixture opponents: ${opponentError.message}`);
  }

  const teamsById = new Map(toTeamRows((opponentData ?? []) as unknown[]).map((team) => [team.id, team]));
  const nextFixtureByTeamId = new Map<number, CornerQuickNextFixture>();

  for (const row of eligibleRows) {
    if (nextFixtureByTeamId.has(row.team_id)) {
      continue;
    }

    const opponent = teamsById.get(row.opponent_team_id);
    nextFixtureByTeamId.set(row.team_id, {
      fixtureId: row.fixture_id,
      opponentTeamId: row.opponent_team_id,
      opponentName: opponent?.name ?? `Team ${row.opponent_team_id}`,
      isHome: row.is_home,
      date: row.played_at,
      dateKey: formatDateKey(new Date(row.played_at)),
    });
  }

  return nextFixtureByTeamId;
}

async function loadCornerQuickFilterOptionsUncached(): Promise<CornerQuickFilterOptions> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: supportedData, error: supportedError } = await supabaseAdmin
    .from('supported_leagues')
    .select('league_id, season')
    .eq('is_active', true)
    .eq('enabled_for_comparison', true)
    .order('display_order', { ascending: true })
    .order('league_id', { ascending: true })
    .order('season', { ascending: false });

  if (supportedError) {
    throw new Error(`Failed to load corner quick league options: ${supportedError.message}`);
  }

  const supportedRows = toSupportedLeagueRows((supportedData ?? []) as unknown[]);
  if (supportedRows.length === 0) {
    throw new Error('No supported leagues configured.');
  }

  const leagueIds = [...new Set(supportedRows.map((row) => row.leagueId))];
  const { data: leagueData, error: leagueError } = await supabaseAdmin
    .from('leagues')
    .select('id, name, logo_url')
    .in('id', leagueIds);

  if (leagueError) {
    throw new Error(`Failed to load corner quick leagues: ${leagueError.message}`);
  }

  const leaguesById = new Map(toLeagueRows((leagueData ?? []) as unknown[]).map((league) => [league.id, league]));
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
    defaultLeagueId: leagueSeasons[0].leagueId,
    defaultSeason: leagueSeasons[0].season,
    leagueSeasons,
    marketGroups: CORNER_QUICK_MARKET_GROUPS,
  };
}

export const loadCornerQuickFilterOptions = unstable_cache(
  loadCornerQuickFilterOptionsUncached,
  ['corner-quick-filter-options'],
  { revalidate: 300 },
);

export async function loadCornerQuickScanner(filters: CornerQuickFilters): Promise<CornerQuickResult> {
  const { result } = await loadCornerQuickScannerWithTiming(filters);
  return result;
}

export async function loadCornerQuickScannerWithTiming(
  filters: CornerQuickFilters,
): Promise<{ result: CornerQuickResult; timing: CornerQuickTiming }> {
  const totalStartedAt = Date.now();
  const dbStartedAt = Date.now();
  const marketKey = resolveCornerQuickMarketKey(filters.marketGroup, filters.line);
  const [marketDefinition, snapshotRows] = await Promise.all([
    loadMarketDefinition(marketKey),
    loadCornerQuickRankingSnapshotRows(marketKey, filters.leagueId, filters.season),
  ]);
  const dbMs = Date.now() - dbStartedAt;
  const transformStartedAt = Date.now();
  const marketLabel = marketDefinition?.label ?? fallbackMarketLabel(filters.marketGroup, filters.line);
  if (snapshotRows.length === 0) {
    return {
      result: {
        marketKey,
        marketLabel,
        marketAvailable: marketDefinition?.is_active === true,
        columns: SCOPES.map((scope) => ({ scope, title: scopeToTitle(scope), rows: [] })),
        emergingColumns: SCOPES.map((scope) => ({ scope, title: scopeToTitle(scope), rows: [] })),
      },
      timing: {
        dbMs,
        transformMs: Date.now() - transformStartedAt,
        totalMs: Date.now() - totalStartedAt,
        rowCount: 0,
      },
    };
  }

  const normalizedSearch = filters.teamSearch.trim().toLowerCase();
  // Candidate rows per scope, banded: keep only sample ≥ 5 (drop the noise band),
  // then partition into main (≥ floor) and emerging (5–9) below.
  const candidatesByScope = new Map<CornerQuickScope, CornerQuickRow[]>();
  for (const scope of SCOPES) {
    const rows = snapshotRows
      .filter((row) => row.scope === scope)
      .flatMap((row) => {
        if (normalizedSearch && !row.team_name.toLowerCase().includes(normalizedSearch)) {
          return [];
        }

        const metric = metricFromQuickSnapshot(row, filters.formWindow);
        if (metric.sample < EMERGING_MIN_SAMPLE) {
          return [];
        }

        const nextFixture = row.next_fixture_id !== null && row.next_fixture_date !== null && row.next_opponent_team_id !== null && row.next_opponent_name !== null && row.next_venue_scope !== null
          ? {
            fixtureId: row.next_fixture_id,
            opponentTeamId: row.next_opponent_team_id,
            opponentName: row.next_opponent_name,
            isHome: row.next_venue_scope === 'home',
            date: row.next_fixture_date,
            dateKey: formatDateKey(new Date(row.next_fixture_date)),
          } satisfies CornerQuickNextFixture
          : null;
        if (!fixtureMatchesFilter(scope, nextFixture, filters.fixtureFilter)) {
          return [];
        }

        const fixtureContextMismatch = nextFixture !== null && !venueMatchesScope(scope, nextFixture);
        const opponentSupportScope = row.opponent_support_scope ?? opponentScopeForFixture(scope, nextFixture);
        const opponentSupport = opponentMetricFromQuickSnapshot(row, filters.formWindow);
        const baseHref = {
          leagueId: row.league_id,
          season: row.season,
          teamId: row.team_id,
          periodGroup: filters.periodGroup,
          marketKey,
        };

        return [{
          teamId: row.team_id,
          teamName: row.team_name,
          teamLogoUrl: row.team_logo_url,
          leagueId: row.league_id,
          season: row.season,
          scope,
          marketKey,
          marketLabel,
          metric,
          nextFixture,
          opponentSupport,
          opponentSupportScope,
          fixtureContextMismatch,
          detailedHref: buildDetailedHref(baseHref),
          comparisonHref: nextFixture ? buildComparisonHref(nextFixture.fixtureId, marketKey) : null,
        } satisfies CornerQuickRow];
      })
      .sort((left, right) => (
        (right.metric.percentage ?? -1) - (left.metric.percentage ?? -1) ||
        right.metric.hits - left.metric.hits ||
        right.metric.sample - left.metric.sample ||
        left.teamName.localeCompare(right.teamName)
      ));

    candidatesByScope.set(scope, rows);
  }

  // Main ranking columns: sample ≥ the raise-only floor (≥ 10).
  const columns: CornerQuickColumn[] = SCOPES.map((scope) => {
    const rows = (candidatesByScope.get(scope) ?? [])
      .filter((row) => row.metric.sample >= filters.minSample)
      .slice(0, QUICK_RESULT_LIMIT_PER_SCOPE);
    return { scope, title: scopeToTitle(scope), rows };
  });
  // Emerging columns: fixed 5–9 band, independent of the user-raised floor.
  const emergingColumns: CornerQuickColumn[] = SCOPES.map((scope) => {
    const rows = (candidatesByScope.get(scope) ?? [])
      .filter((row) => row.metric.sample >= EMERGING_MIN_SAMPLE && row.metric.sample < MAIN_RANKING_MIN_SAMPLE)
      .slice(0, QUICK_RESULT_LIMIT_PER_SCOPE);
    return { scope, title: scopeToTitle(scope), rows };
  });

  return {
    result: {
      marketKey,
      marketLabel,
      marketAvailable: marketDefinition?.is_active === true,
      columns,
      emergingColumns,
    },
    timing: {
      dbMs,
      transformMs: Date.now() - transformStartedAt,
      totalMs: Date.now() - totalStartedAt,
      rowCount: snapshotRows.length,
    },
  };
}

function scopeToTitle(scope: CornerQuickScope) {
  if (scope === 'home') {
    return 'Home Matches';
  }

  if (scope === 'away') {
    return 'Away Matches';
  }

  return 'All Matches';
}
