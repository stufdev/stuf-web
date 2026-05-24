import 'server-only';

import { unstable_cache } from 'next/cache';
import { getDateRange } from '@/lib/date';
import { getSupabaseAdmin } from './supabase-admin';

export type CornerViewMode = 'all' | 'homeaway';
export type CornerPeriodGroup = 'full' | 'by_half';
export type CornerScope = 'overall' | 'home' | 'away';
export type CornerStatistic =
  | 'total_match_corners'
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

export type CornerFilters = {
  leagueId: number;
  season: number;
  viewMode: CornerViewMode;
  periodGroup: CornerPeriodGroup;
  statistic: CornerStatistic;
  line: string;
  teamSearch: string;
  teamId: number | null;
};

export type CornerSearchParams = Record<string, string | string[] | undefined>;

export type CornerLeagueSeasonOption = {
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
};

export type CornerStatisticOption = {
  value: CornerStatistic;
  label: string;
  periodGroup: CornerPeriodGroup;
};

export type CornerFilterOptions = {
  defaultLeagueId: number;
  defaultSeason: number;
  leagueSeasons: CornerLeagueSeasonOption[];
  linesByStatistic: Record<CornerStatistic, string[]>;
  statistics: CornerStatisticOption[];
};

export type CornerStatSummary = {
  scope: CornerScope;
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

export type CornerMatchRow = {
  fixtureId: number;
  date: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeCorners: number | null;
  awayCorners: number | null;
  cornerScoreLabel?: string | null;
  numericValue?: number | null;
  result: boolean;
};

export type CornerNextFixture = {
  fixtureId: number;
  opponentTeamId: number;
  opponentName: string;
  isHome: boolean;
  date: string;
};

export type CornerTeamPanel = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
  marketKey: string;
  marketLabel: string;
  stats: {
    overall: CornerStatSummary | null;
    home: CornerStatSummary | null;
    away: CornerStatSummary | null;
  };
  matchRows: {
    overall: CornerMatchRow[];
    home: CornerMatchRow[];
    away: CornerMatchRow[];
  };
  nextFixture: CornerNextFixture | null;
  evidenceLoaded: boolean;
  evidenceHref: string;
  summaryHref: string;
};

export type CornerDetailResult = {
  marketKey: string;
  marketLabel: string;
  marketAvailable: boolean;
  evidenceMode: 'summary' | 'evidence';
  panels: CornerTeamPanel[];
};

export type CornerDetailTiming = {
  dbProfileMs: number;
  dbEvidenceMs: number;
  transformMs: number;
  totalMs: number;
  profileRowCount: number;
  evidenceRowCount: number;
  returnedEvidenceRowCount: number;
};

export type CornerTeamEvidenceGroup = {
  teamId: number;
  scope: CornerScope;
  rows: CornerMatchRow[];
};

export type CornerMatchEvidenceResult = {
  marketKey: string;
  marketLabel: string;
  groups: CornerTeamEvidenceGroup[];
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
  scope: CornerScope;
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

type TeamMatchMarketResultRow = {
  fixture_id: number;
  team_id: number;
  scope: CornerScope;
  result: boolean;
  numeric_value: number | string | null;
};

type FixtureTeamSummaryRow = {
  fixture_id: number;
  date: string;
  home_team_id: number;
  home_team_name: string;
  away_team_id: number;
  away_team_name: string;
  home_corners: number | null;
  away_corners: number | null;
};

type TeamFixtureFactCornerRow = {
  fixture_id: number;
  team_id: number;
  venue_scope: 'home' | 'away';
  corners_for_1h: number | null;
  corners_against_1h: number | null;
  total_corners_1h: number | null;
  corners_for_2h: number | null;
  corners_against_2h: number | null;
  total_corners_2h: number | null;
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
  category: string;
  market_key: string;
  league_id: number;
  season: number;
  team_id: number;
  scope: CornerScope;
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

const NEXT_FIXTURE_WINDOW_DAYS = 6;
const MAX_CORNER_TEAM_PANELS = 40;
const MAX_EVIDENCE_TEAM_PANELS = 3;
const MARKET_SERVING_CACHE_SECONDS = 60;
const UPCOMING_STATUSES = ['NS', 'TBD'] as const;
const TEAM_MARKET_PROFILE_SELECT = [
  'category',
  'market_key',
  'league_id',
  'season',
  'team_id',
  'team_name',
  'team_logo_url',
  'league_name',
  'league_logo_url',
  'overall_sample',
  'overall_hits',
  'overall_percentage',
  'current_streak_overall',
  'last_5_sample_overall',
  'last_5_hits_overall',
  'last_5_percentage_overall',
  'last_10_sample_overall',
  'last_10_hits_overall',
  'last_10_percentage_overall',
  'home_sample',
  'home_hits',
  'home_percentage',
  'current_streak_home',
  'last_5_sample_home',
  'last_5_hits_home',
  'last_5_percentage_home',
  'last_10_sample_home',
  'last_10_hits_home',
  'last_10_percentage_home',
  'away_sample',
  'away_hits',
  'away_percentage',
  'current_streak_away',
  'last_5_sample_away',
  'last_5_hits_away',
  'last_5_percentage_away',
  'last_10_sample_away',
  'last_10_hits_away',
  'last_10_percentage_away',
  'next_fixture_id',
  'next_fixture_date',
  'next_opponent_team_id',
  'next_opponent_name',
  'next_venue_scope',
].join(', ');
const TEAM_MARKET_EVIDENCE_SELECT = [
  'team_id',
  'scope',
  'fixture_id',
  'played_at',
  'home_team_id',
  'away_team_id',
  'home_team_name',
  'away_team_name',
  'home_value',
  'away_value',
  'result',
].join(', ');

export const CORNER_STATISTIC_OPTIONS: CornerStatisticOption[] = [
  { value: 'total_match_corners', label: 'Total Match Corners', periodGroup: 'full' },
  { value: 'total_match_corners_under', label: 'Total Match Corners Under', periodGroup: 'full' },
  { value: 'team_corners_for', label: 'Team Corners For', periodGroup: 'full' },
  { value: 'team_corners_against', label: 'Team Corners Against', periodGroup: 'full' },
  { value: 'corner_handicap', label: 'Corner Handicap', periodGroup: 'full' },
  { value: 'each_team_corners', label: 'Each Team Corners', periodGroup: 'full' },
  { value: 'total_1h_corners', label: 'Total 1st Half Corners', periodGroup: 'by_half' },
  { value: 'team_1h_corners_for', label: 'Team 1st Half Corners For', periodGroup: 'by_half' },
  { value: 'team_1h_corners_against', label: 'Team 1st Half Corners Against', periodGroup: 'by_half' },
  { value: 'total_2h_corners', label: 'Total 2nd Half Corners', periodGroup: 'by_half' },
  { value: 'total_corners_each_half', label: 'Total Corners Each Half', periodGroup: 'by_half' },
];

export const CORNER_LINES_BY_STATISTIC: Record<CornerStatistic, string[]> = {
  total_match_corners: ['7.5', '8.5', '9.5', '10.5', '11.5', '12.5'],
  total_match_corners_under: ['7.5', '8.5', '9.5', '10.5', '11.5', '12.5'],
  team_corners_for: ['2.5', '3.5', '4.5', '5.5', '6.5'],
  team_corners_against: ['2.5', '3.5', '4.5', '5.5', '6.5'],
  corner_handicap: ['-2', '-1', '0', '1', '2'],
  each_team_corners: ['1.5', '2.5', '3.5', '4.5'],
  total_1h_corners: ['3.5', '4.5', '5.5', '6.5'],
  team_1h_corners_for: ['1.5', '2.5', '3.5'],
  team_1h_corners_against: ['1.5', '2.5', '3.5'],
  total_2h_corners: ['3.5', '4.5', '5.5', '6.5'],
  total_corners_each_half: ['3.5', '4.5', '5.5', '6.5'],
};

const DEFAULT_LINE_BY_STATISTIC: Record<CornerStatistic, string> = {
  total_match_corners: '9.5',
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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseInteger(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstParam(value) ?? '', 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseViewMode(value: string | string[] | undefined): CornerViewMode {
  return firstParam(value) === 'homeaway' ? 'homeaway' : 'all';
}

function parsePeriodGroup(value: string | string[] | undefined): CornerPeriodGroup {
  return firstParam(value) === 'by_half' ? 'by_half' : 'full';
}

function parseStatistic(value: string | string[] | undefined): CornerStatistic {
  const rawValue = firstParam(value);
  const option = CORNER_STATISTIC_OPTIONS.find((item) => item.value === rawValue);
  return option?.value ?? 'total_match_corners';
}

function parseMarketKey(value: string | string[] | undefined): { statistic: CornerStatistic; line: string } | null {
  const rawValue = firstParam(value);
  const match = rawValue?.match(/^MATCH_(OVER|UNDER)_([0-9]+)_([0-9]+)_CORNERS$/);
  if (match) {
    return {
      statistic: match[1] === 'UNDER' ? 'total_match_corners_under' : 'total_match_corners',
      line: `${match[2]}.${match[3]}`,
    };
  }

  const teamForMatch = rawValue?.match(/^TEAM_OVER_([0-9]+)_([0-9]+)_CORNERS_FOR$/);
  if (teamForMatch) {
    return { statistic: 'team_corners_for', line: `${teamForMatch[1]}.${teamForMatch[2]}` };
  }

  const teamAgainstMatch = rawValue?.match(/^TEAM_OVER_([0-9]+)_([0-9]+)_CORNERS_AGAINST$/);
  if (teamAgainstMatch) {
    return { statistic: 'team_corners_against', line: `${teamAgainstMatch[1]}.${teamAgainstMatch[2]}` };
  }

  if (rawValue === 'MOST_CORNERS') {
    return { statistic: 'corner_handicap', line: '0' };
  }

  const cornerHandicapMatch = rawValue?.match(/^CORNERS_HANDICAP_(MINUS|PLUS)_([0-9]+)$/);
  if (cornerHandicapMatch) {
    const sign = cornerHandicapMatch[1] === 'MINUS' ? '-' : '';
    return { statistic: 'corner_handicap', line: `${sign}${cornerHandicapMatch[2]}` };
  }

  const totalFirstHalfMatch = rawValue?.match(/^MATCH_1H_OVER_([0-9]+)_([0-9]+)_CORNERS$/);
  if (totalFirstHalfMatch) {
    return { statistic: 'total_1h_corners', line: `${totalFirstHalfMatch[1]}.${totalFirstHalfMatch[2]}` };
  }

  const teamFirstHalfForMatch = rawValue?.match(/^TEAM_1H_OVER_([0-9]+)_([0-9]+)_CORNERS_FOR$/);
  if (teamFirstHalfForMatch) {
    return { statistic: 'team_1h_corners_for', line: `${teamFirstHalfForMatch[1]}.${teamFirstHalfForMatch[2]}` };
  }

  const teamFirstHalfAgainstMatch = rawValue?.match(/^TEAM_1H_OVER_([0-9]+)_([0-9]+)_CORNERS_AGAINST$/);
  if (teamFirstHalfAgainstMatch) {
    return { statistic: 'team_1h_corners_against', line: `${teamFirstHalfAgainstMatch[1]}.${teamFirstHalfAgainstMatch[2]}` };
  }

  const totalSecondHalfMatch = rawValue?.match(/^MATCH_2H_OVER_([0-9]+)_([0-9]+)_CORNERS$/);
  if (totalSecondHalfMatch) {
    return { statistic: 'total_2h_corners', line: `${totalSecondHalfMatch[1]}.${totalSecondHalfMatch[2]}` };
  }

  const totalEachHalfMatch = rawValue?.match(/^MATCH_EACH_HALF_OVER_([0-9]+)_([0-9]+)_CORNERS$/);
  if (totalEachHalfMatch) {
    return { statistic: 'total_corners_each_half', line: `${totalEachHalfMatch[1]}.${totalEachHalfMatch[2]}` };
  }

  const eachTeamMatch = rawValue?.match(/^EACH_TEAM_OVER_([0-9]+)_([0-9]+)_CORNERS$/);
  if (eachTeamMatch) {
    return { statistic: 'each_team_corners', line: `${eachTeamMatch[1]}.${eachTeamMatch[2]}` };
  }

  return null;
}

function hasLeagueSeason(options: CornerFilterOptions, leagueId: number, season: number) {
  return options.leagueSeasons.some((item) => item.leagueId === leagueId && item.season === season);
}

function defaultStatisticForPeriod(periodGroup: CornerPeriodGroup): CornerStatistic {
  return periodGroup === 'by_half' ? 'total_1h_corners' : 'total_match_corners';
}

export function parseCornerFilters(searchParams: CornerSearchParams | undefined, options: CornerFilterOptions): CornerFilters {
  const marketKeySelection = parseMarketKey(searchParams?.marketKey);
  const requestedPeriodGroup = parsePeriodGroup(searchParams?.periodGroup);
  const requestedStatistic = marketKeySelection?.statistic ?? parseStatistic(searchParams?.statistic);
  const requestedStatisticOption = CORNER_STATISTIC_OPTIONS.find((item) => item.value === requestedStatistic);
  const periodGroup = marketKeySelection
    ? requestedStatisticOption?.periodGroup ?? 'full'
    : requestedStatisticOption?.periodGroup === requestedPeriodGroup
      ? requestedPeriodGroup
      : requestedPeriodGroup;
  const statistic = marketKeySelection || requestedStatisticOption?.periodGroup === periodGroup
    ? requestedStatistic
    : defaultStatisticForPeriod(periodGroup);
  const requestedLeagueId = parseInteger(searchParams?.leagueId) ?? options.defaultLeagueId;
  const requestedSeason = parseInteger(searchParams?.season) ?? options.defaultSeason;
  const leagueId = hasLeagueSeason(options, requestedLeagueId, requestedSeason)
    ? requestedLeagueId
    : options.defaultLeagueId;
  const season = hasLeagueSeason(options, requestedLeagueId, requestedSeason)
    ? requestedSeason
    : options.defaultSeason;

  return {
    leagueId,
    season,
    viewMode: parseViewMode(searchParams?.viewMode),
    periodGroup,
    statistic,
    line: normalizeCornerLine(statistic, marketKeySelection?.line ?? firstParam(searchParams?.line)),
    teamSearch: firstParam(searchParams?.teamSearch)?.trim() ?? '',
    teamId: parseInteger(searchParams?.teamId),
  };
}

function isCornerScope(value: unknown): value is CornerScope {
  return value === 'overall' || value === 'home' || value === 'away';
}

function toFiniteNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRequiredNumber(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLineValue(statistic: CornerStatistic, value: string | undefined) {
  const allowedLines = CORNER_LINES_BY_STATISTIC[statistic];
  const parsed = Number(value);
  const matchedLine = allowedLines.find((line) => Number(line) === parsed);
  return matchedLine ?? DEFAULT_LINE_BY_STATISTIC[statistic];
}

function lineToKeyPart(line: string) {
  return line.replace('-', 'MINUS_').replace('.', '_');
}

export function resolveCornerMarketKey(statistic: CornerStatistic, line: string) {
  const keyLine = lineToKeyPart(normalizeLineValue(statistic, line));

  if (statistic === 'total_match_corners') {
    return `MATCH_OVER_${keyLine}_CORNERS`;
  }

  if (statistic === 'total_match_corners_under') {
    return `MATCH_UNDER_${keyLine}_CORNERS`;
  }

  if (statistic === 'team_corners_for') {
    return `TEAM_OVER_${keyLine}_CORNERS_FOR`;
  }

  if (statistic === 'team_corners_against') {
    return `TEAM_OVER_${keyLine}_CORNERS_AGAINST`;
  }

  if (statistic === 'corner_handicap') {
    const normalizedLine = normalizeLineValue(statistic, line);
    if (normalizedLine === '0') {
      return 'MOST_CORNERS';
    }

    const prefix = normalizedLine.startsWith('-') ? 'MINUS' : 'PLUS';
    return `CORNERS_HANDICAP_${prefix}_${Math.abs(Number(normalizedLine))}`;
  }

  if (statistic === 'total_1h_corners') {
    return `MATCH_1H_OVER_${keyLine}_CORNERS`;
  }

  if (statistic === 'team_1h_corners_for') {
    return `TEAM_1H_OVER_${keyLine}_CORNERS_FOR`;
  }

  if (statistic === 'team_1h_corners_against') {
    return `TEAM_1H_OVER_${keyLine}_CORNERS_AGAINST`;
  }

  if (statistic === 'total_2h_corners') {
    return `MATCH_2H_OVER_${keyLine}_CORNERS`;
  }

  if (statistic === 'total_corners_each_half') {
    return `MATCH_EACH_HALF_OVER_${keyLine}_CORNERS`;
  }

  return `EACH_TEAM_OVER_${keyLine}_CORNERS`;
}

export function normalizeCornerLine(statistic: CornerStatistic, value: string | undefined) {
  return normalizeLineValue(statistic, value);
}

function fallbackMarketLabel(statistic: CornerStatistic, line: string) {
  const option = CORNER_STATISTIC_OPTIONS.find((item) => item.value === statistic);
  if (statistic === 'corner_handicap') {
    return normalizeLineValue(statistic, line) === '0' ? 'Most Corners' : `${line} ${option?.label ?? 'Corner Handicap'}`;
  }

  const operator = statistic === 'total_match_corners_under' ? 'Under' : 'Over';
  return `${operator} ${normalizeLineValue(statistic, line)} ${option?.label ?? 'Corners'}`;
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

function toStatRows(rows: unknown[]): TeamSeasonMarketStatRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamSeasonMarketStatRow>;
    if (
      typeof record.team_id !== 'number' ||
      typeof record.league_id !== 'number' ||
      typeof record.season !== 'number' ||
      !isCornerScope(record.scope) ||
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

function toMatchResultRows(rows: unknown[]): TeamMatchMarketResultRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamMatchMarketResultRow>;
    if (
      typeof record.fixture_id !== 'number' ||
      typeof record.team_id !== 'number' ||
      !isCornerScope(record.scope) ||
      typeof record.result !== 'boolean'
    ) {
      return [];
    }

    return [{
      fixture_id: record.fixture_id,
      team_id: record.team_id,
      scope: record.scope,
      result: record.result,
      numeric_value: typeof record.numeric_value === 'number' || typeof record.numeric_value === 'string'
        ? record.numeric_value
        : null,
    }];
  });
}

function toFixtureSummaryRows(rows: unknown[]): FixtureTeamSummaryRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<FixtureTeamSummaryRow>;
    if (
      typeof record.fixture_id !== 'number' ||
      typeof record.date !== 'string' ||
      typeof record.home_team_id !== 'number' ||
      typeof record.home_team_name !== 'string' ||
      typeof record.away_team_id !== 'number' ||
      typeof record.away_team_name !== 'string'
    ) {
      return [];
    }

    return [{
      fixture_id: record.fixture_id,
      date: record.date,
      home_team_id: record.home_team_id,
      home_team_name: record.home_team_name,
      away_team_id: record.away_team_id,
      away_team_name: record.away_team_name,
      home_corners: typeof record.home_corners === 'number' ? record.home_corners : null,
      away_corners: typeof record.away_corners === 'number' ? record.away_corners : null,
    }];
  });
}

function toTeamFixtureFactCornerRows(rows: unknown[]): TeamFixtureFactCornerRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamFixtureFactCornerRow>;
    if (
      typeof record.fixture_id !== 'number' ||
      typeof record.team_id !== 'number' ||
      (record.venue_scope !== 'home' && record.venue_scope !== 'away')
    ) {
      return [];
    }

    return [{
      fixture_id: record.fixture_id,
      team_id: record.team_id,
      venue_scope: record.venue_scope,
      corners_for_1h: typeof record.corners_for_1h === 'number' ? record.corners_for_1h : null,
      corners_against_1h: typeof record.corners_against_1h === 'number' ? record.corners_against_1h : null,
      total_corners_1h: typeof record.total_corners_1h === 'number' ? record.total_corners_1h : null,
      corners_for_2h: typeof record.corners_for_2h === 'number' ? record.corners_for_2h : null,
      corners_against_2h: typeof record.corners_against_2h === 'number' ? record.corners_against_2h : null,
      total_corners_2h: typeof record.total_corners_2h === 'number' ? record.total_corners_2h : null,
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

function toTeamMarketProfileRows(rows: unknown[]): TeamMarketProfileRow[] {
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
    ) {
      return [];
    }

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

function toTeamMarketMatchEvidenceRows(rows: unknown[]): TeamMarketMatchEvidenceRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamMarketMatchEvidenceRow>;
    if (
      typeof record.team_id !== 'number' ||
      !isCornerScope(record.scope) ||
      typeof record.fixture_id !== 'number' ||
      typeof record.played_at !== 'string' ||
      typeof record.home_team_id !== 'number' ||
      typeof record.away_team_id !== 'number' ||
      typeof record.home_team_name !== 'string' ||
      typeof record.away_team_name !== 'string' ||
      typeof record.result !== 'boolean'
    ) {
      return [];
    }

    return [{
      category: 'corners',
      market_key: '',
      league_id: 0,
      season: 0,
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

function toStatSummary(row: TeamSeasonMarketStatRow): CornerStatSummary {
  return {
    scope: row.scope,
    sample: row.sample,
    hits: row.hits,
    percentage: toRequiredNumber(row.percentage),
    currentStreak: row.current_streak,
    last5Sample: row.last_5_sample,
    last5Hits: row.last_5_hits,
    last5Percentage: toFiniteNumber(row.last_5_percentage),
    last10Sample: row.last_10_sample,
    last10Hits: row.last_10_hits,
    last10Percentage: toFiniteNumber(row.last_10_percentage),
  };
}

function toSnapshotSummary(row: TeamMarketProfileRow, scope: CornerScope): CornerStatSummary | null {
  const sample = toFiniteNumber(row[`${scope}_sample`] as number | string | null);
  const hits = toFiniteNumber(row[`${scope}_hits`] as number | string | null);
  const percentage = toFiniteNumber(row[`${scope}_percentage`] as number | string | null);
  if (sample === null || hits === null || percentage === null) {
    return null;
  }

  return {
    scope,
    sample,
    hits,
    percentage,
    currentStreak: toFiniteNumber(row[`current_streak_${scope}`] as number | string | null) ?? 0,
    last5Sample: toFiniteNumber(row[`last_5_sample_${scope}`] as number | string | null),
    last5Hits: toFiniteNumber(row[`last_5_hits_${scope}`] as number | string | null),
    last5Percentage: toFiniteNumber(row[`last_5_percentage_${scope}`] as number | string | null),
    last10Sample: toFiniteNumber(row[`last_10_sample_${scope}`] as number | string | null),
    last10Hits: toFiniteNumber(row[`last_10_hits_${scope}`] as number | string | null),
    last10Percentage: toFiniteNumber(row[`last_10_percentage_${scope}`] as number | string | null),
  };
}

function formatCornerScore(homeCorners: number | null, awayCorners: number | null) {
  if (homeCorners === null || awayCorners === null) {
    return null;
  }

  return `${homeCorners} - ${awayCorners}`;
}

function statisticUsesFirstHalf(statistic: CornerStatistic) {
  return (
    statistic === 'total_1h_corners' ||
    statistic === 'team_1h_corners_for' ||
    statistic === 'team_1h_corners_against'
  );
}

function statisticUsesSecondHalf(statistic: CornerStatistic) {
  return statistic === 'total_2h_corners';
}

function buildHalfScoreByFixture(rows: TeamFixtureFactCornerRow[]) {
  const scoreByFixture = new Map<number, {
    home1h: number | null;
    away1h: number | null;
    home2h: number | null;
    away2h: number | null;
  }>();

  for (const row of rows) {
    const current = scoreByFixture.get(row.fixture_id) ?? {
      home1h: null,
      away1h: null,
      home2h: null,
      away2h: null,
    };

    if (row.venue_scope === 'home') {
      current.home1h = row.corners_for_1h;
      current.away1h = row.corners_against_1h;
      current.home2h = row.corners_for_2h;
      current.away2h = row.corners_against_2h;
    } else {
      current.away1h = row.corners_for_1h;
      current.home1h = row.corners_against_1h;
      current.away2h = row.corners_for_2h;
      current.home2h = row.corners_against_2h;
    }

    scoreByFixture.set(row.fixture_id, current);
  }

  return scoreByFixture;
}

function cornerScoreForStatistic(
  statistic: CornerStatistic,
  fixture: FixtureTeamSummaryRow,
  halfScore: ReturnType<typeof buildHalfScoreByFixture> extends Map<number, infer Value> ? Value | undefined : never,
) {
  if (statisticUsesFirstHalf(statistic)) {
    return {
      homeCorners: halfScore?.home1h ?? null,
      awayCorners: halfScore?.away1h ?? null,
      cornerScoreLabel: formatCornerScore(halfScore?.home1h ?? null, halfScore?.away1h ?? null),
    };
  }

  if (statisticUsesSecondHalf(statistic)) {
    return {
      homeCorners: halfScore?.home2h ?? null,
      awayCorners: halfScore?.away2h ?? null,
      cornerScoreLabel: formatCornerScore(halfScore?.home2h ?? null, halfScore?.away2h ?? null),
    };
  }

  if (statistic === 'total_corners_each_half') {
    const firstHalf = formatCornerScore(halfScore?.home1h ?? null, halfScore?.away1h ?? null);
    const secondHalf = formatCornerScore(halfScore?.home2h ?? null, halfScore?.away2h ?? null);
    return {
      homeCorners: null,
      awayCorners: null,
      cornerScoreLabel: firstHalf && secondHalf ? `1H ${firstHalf} · 2H ${secondHalf}` : null,
    };
  }

  return {
    homeCorners: fixture.home_corners,
    awayCorners: fixture.away_corners,
    cornerScoreLabel: formatCornerScore(fixture.home_corners, fixture.away_corners),
  };
}

function supportedLeagueRows(rows: unknown[]) {
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

function marketKeysForAllCornerOptions() {
  return CORNER_STATISTIC_OPTIONS.flatMap((option) => (
    CORNER_LINES_BY_STATISTIC[option.value].map((line) => resolveCornerMarketKey(option.value, line))
  ));
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
    throw new Error(`Failed to load corner market definition: ${error.message}`);
  }

  return toMarketDefinitionRows(data ? [data] : [])[0] ?? null;
}, ['corner-detail-market-definition'], { revalidate: 300 });

const loadCornerProfileSnapshotRows = unstable_cache(
  async (
    marketKey: string,
    leagueId: number,
    season: number,
    teamId: number | null,
    teamSearch: string,
  ) => {
    const supabaseAdmin = getSupabaseAdmin();
    let profileQuery = supabaseAdmin
      .from('team_market_profiles')
      .select(TEAM_MARKET_PROFILE_SELECT)
      .eq('category', 'corners')
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season);

    if (teamId !== null) {
      profileQuery = profileQuery.eq('team_id', teamId);
    } else {
      if (teamSearch) {
        profileQuery = profileQuery.ilike('team_name', `%${teamSearch}%`);
      }
      profileQuery = profileQuery
        .order('overall_percentage', { ascending: false, nullsFirst: false })
        .order('overall_sample', { ascending: false, nullsFirst: false })
        .order('team_name', { ascending: true })
        .limit(MAX_CORNER_TEAM_PANELS);
    }

    const { data, error } = await profileQuery;
    if (error) {
      throw new Error(`Failed to load corner detail Market Serving Layer. Apply schema/004_market_serving_layer.sql and run rebuild_market_serving_layer.py. Supabase: ${error.message}`);
    }

    return toTeamMarketProfileRows((data ?? []) as unknown[]);
  },
  ['corner-detail-profile-snapshot-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

const loadCornerEvidenceSnapshotRows = unstable_cache(
  async (
    marketKey: string,
    leagueId: number,
    season: number,
    viewMode: CornerViewMode,
    teamIdsKey: string,
  ) => {
    const teamIds = teamIdsKey
      .split(',')
      .map((teamId) => Number.parseInt(teamId, 10))
      .filter((teamId) => Number.isInteger(teamId) && teamId > 0);

    if (teamIds.length === 0) {
      return [];
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('team_market_match_evidence')
      .select(TEAM_MARKET_EVIDENCE_SELECT)
      .eq('category', 'corners')
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .in('team_id', teamIds)
      .in('scope', matchScopesForViewMode(viewMode))
      .order('team_id', { ascending: true })
      .order('scope', { ascending: true })
      .order('played_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load corner evidence snapshot. Rebuild Market Serving Layer for corners. Supabase: ${error.message}`);
    }

    return toTeamMarketMatchEvidenceRows((data ?? []) as unknown[]);
  },
  ['corner-detail-evidence-snapshot-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

async function loadNextFixtures(teamIds: number[], leagueId: number, season: number) {
  if (teamIds.length === 0) {
    return new Map<number, CornerNextFixture>();
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
    throw new Error(`Failed to load next corner fixtures: ${fixtureTeamError.message}`);
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
      throw new Error(`Failed to verify next corner fixtures: ${fixtureError.message}`);
    }

    eligibleFixtureIds = new Set(toFixtureIdRows((fixtureData ?? []) as unknown[]).map((row) => row.id));
  }

  const eligibleRows = fixtureTeamRows.filter((row) => eligibleFixtureIds.has(row.fixture_id));
  const opponentIds = [...new Set(eligibleRows.map((row) => row.opponent_team_id))];
  const { data: opponentData, error: opponentError } = opponentIds.length > 0
    ? await supabaseAdmin.from('teams').select('id, name, logo_url').in('id', opponentIds)
    : { data: [], error: null };

  if (opponentError) {
    throw new Error(`Failed to load next fixture opponents: ${opponentError.message}`);
  }

  const teamsById = new Map(toTeamRows((opponentData ?? []) as unknown[]).map((team) => [team.id, team]));
  const nextFixtureByTeamId = new Map<number, CornerNextFixture>();

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
    });
  }

  return nextFixtureByTeamId;
}

async function loadCornerFilterOptionsUncached(): Promise<CornerFilterOptions> {
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
      .in('key', marketKeysForAllCornerOptions())
      .eq('category', 'corners'),
  ]);

  if (supportedError) {
    throw new Error(`Failed to load corner league options: ${supportedError.message}`);
  }

  if (marketError) {
    throw new Error(`Failed to load corner market options: ${marketError.message}`);
  }

  const supportedRows = supportedLeagueRows((supportedData ?? []) as unknown[]);
  if (supportedRows.length === 0) {
    throw new Error('No supported leagues configured.');
  }

  const leagueIds = [...new Set(supportedRows.map((row) => row.leagueId))];
  const { data: leagueData, error: leagueError } = await supabaseAdmin
    .from('leagues')
    .select('id, name, logo_url')
    .in('id', leagueIds);

  if (leagueError) {
    throw new Error(`Failed to load corner leagues: ${leagueError.message}`);
  }

  const leaguesById = new Map(toLeagueRows((leagueData ?? []) as unknown[]).map((league) => [league.id, league]));
  const marketDefinitions = toMarketDefinitionRows((marketData ?? []) as unknown[]);
  const activeMarketKeys = new Set(marketDefinitions.filter((row) => row.is_active).map((row) => row.key));

  const linesByStatistic = Object.fromEntries(
    CORNER_STATISTIC_OPTIONS.map((option) => [
      option.value,
      CORNER_LINES_BY_STATISTIC[option.value].filter((line) => activeMarketKeys.has(resolveCornerMarketKey(option.value, line))),
    ]),
  ) as Record<CornerStatistic, string[]>;

  for (const option of CORNER_STATISTIC_OPTIONS) {
    if (linesByStatistic[option.value].length === 0) {
      linesByStatistic[option.value] = [DEFAULT_LINE_BY_STATISTIC[option.value]];
    }
  }

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
    linesByStatistic,
    statistics: CORNER_STATISTIC_OPTIONS,
  };
}

export const loadCornerFilterOptions = unstable_cache(
  loadCornerFilterOptionsUncached,
  ['corner-detail-filter-options'],
  { revalidate: 300 },
);

function buildCornersHref(filters: CornerFilters, teamId: number | null) {
  const params = new URLSearchParams();
  params.set('leagueId', String(filters.leagueId));
  params.set('season', String(filters.season));
  params.set('periodGroup', filters.periodGroup);
  params.set('statistic', filters.statistic);
  params.set('line', filters.line);

  if (filters.viewMode !== 'all') {
    params.set('viewMode', filters.viewMode);
  }

  if (teamId !== null) {
    params.set('teamId', String(teamId));
  } else if (filters.teamSearch.trim()) {
    params.set('teamSearch', filters.teamSearch.trim());
  }

  return `/corners?${params.toString()}`;
}

type CornerLeagueTeamPanelLoadOptions = {
  includeEvidence?: boolean;
};

function matchScopesForViewMode(viewMode: CornerViewMode): CornerScope[] {
  return viewMode === 'homeaway' ? ['home', 'away'] : ['overall'];
}

function emptyMatchRows() {
  return {
    overall: [],
    home: [],
    away: [],
  };
}

function toCornerMatchRow(row: TeamMarketMatchEvidenceRow): CornerMatchRow {
  const homeCorners = toFiniteNumber(row.home_value);
  const awayCorners = toFiniteNumber(row.away_value);

  return {
    fixtureId: row.fixture_id,
    date: row.played_at,
    homeTeamId: row.home_team_id,
    homeTeamName: row.home_team_name,
    awayTeamId: row.away_team_id,
    awayTeamName: row.away_team_name,
    homeCorners,
    awayCorners,
    result: row.result,
  };
}

function groupEvidenceRows(evidenceRows: TeamMarketMatchEvidenceRow[], viewMode: CornerViewMode): CornerTeamEvidenceGroup[] {
  const matchRowsByTeamScope = new Map<string, CornerMatchRow[]>();
  const allowedScopes = new Set(matchScopesForViewMode(viewMode));

  for (const row of evidenceRows) {
    if (!allowedScopes.has(row.scope)) {
      continue;
    }

    const key = `${row.team_id}:${row.scope}`;
    const currentRows = matchRowsByTeamScope.get(key) ?? [];
    currentRows.push(toCornerMatchRow(row));
    matchRowsByTeamScope.set(key, currentRows);
  }

  return [...matchRowsByTeamScope.entries()].map(([key, rows]) => {
    const [teamId, scope] = key.split(':');
    return {
      teamId: Number(teamId),
      scope: scope as CornerScope,
      rows,
    };
  });
}

function evidenceGroupsToMap(groups: CornerTeamEvidenceGroup[]) {
  return new Map(groups.map((group) => [`${group.teamId}:${group.scope}`, group.rows]));
}

function countReturnedEvidenceRows(groups: CornerTeamEvidenceGroup[]) {
  return groups.reduce((total, group) => total + group.rows.length, 0);
}

function toCornerTeamPanel({
  evidenceLoaded,
  filters,
  marketKey,
  marketLabel,
  matchRowsByTeamScope,
  row,
}: {
  evidenceLoaded: boolean;
  filters: CornerFilters;
  marketKey: string;
  marketLabel: string;
  matchRowsByTeamScope: Map<string, CornerMatchRow[]>;
  row: TeamMarketProfileRow;
}): CornerTeamPanel {
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
    nextFixture: row.next_fixture_id !== null && row.next_fixture_date !== null && row.next_opponent_team_id !== null && row.next_opponent_name !== null && row.next_venue_scope !== null
      ? {
        fixtureId: row.next_fixture_id,
        opponentTeamId: row.next_opponent_team_id,
        opponentName: row.next_opponent_name,
        isHome: row.next_venue_scope === 'home',
        date: row.next_fixture_date,
      }
      : null,
    evidenceLoaded,
    evidenceHref: buildCornersHref(filters, row.team_id),
    summaryHref: buildCornersHref({ ...filters, teamSearch: '', teamId: null }, null),
  };
}

export async function loadCornerMatchEvidence(
  filters: CornerFilters,
  teamIds: number[],
): Promise<{ result: CornerMatchEvidenceResult; timing: CornerDetailTiming }> {
  const startedAt = Date.now();
  const marketKey = resolveCornerMarketKey(filters.statistic, filters.line);
  const marketDefinitionPromise = loadMarketDefinition(marketKey);
  const selectedTeamIds = [...new Set(teamIds.filter((teamId) => Number.isInteger(teamId) && teamId > 0))]
    .sort((left, right) => left - right);

  if (selectedTeamIds.length === 0) {
    const marketDefinition = await marketDefinitionPromise;
    return {
      result: {
        marketKey,
        marketLabel: marketDefinition?.label ?? fallbackMarketLabel(filters.statistic, filters.line),
        groups: [],
      },
      timing: {
        dbProfileMs: 0,
        dbEvidenceMs: 0,
        transformMs: 0,
        totalMs: Date.now() - startedAt,
        profileRowCount: 0,
        evidenceRowCount: 0,
        returnedEvidenceRowCount: 0,
      },
    };
  }

  const evidenceStartedAt = Date.now();
  const evidenceRows = await loadCornerEvidenceSnapshotRows(
    marketKey,
    filters.leagueId,
    filters.season,
    filters.viewMode,
    selectedTeamIds.join(','),
  );
  const dbEvidenceMs = Date.now() - evidenceStartedAt;
  const marketDefinition = await marketDefinitionPromise;
  const marketLabel = marketDefinition?.label ?? fallbackMarketLabel(filters.statistic, filters.line);

  const transformStartedAt = Date.now();
  const groups = groupEvidenceRows(evidenceRows, filters.viewMode);
  const transformMs = Date.now() - transformStartedAt;

  return {
    result: { marketKey, marketLabel, groups },
    timing: {
      dbProfileMs: 0,
      dbEvidenceMs,
      transformMs,
      totalMs: Date.now() - startedAt,
      profileRowCount: 0,
      evidenceRowCount: evidenceRows.length,
      returnedEvidenceRowCount: countReturnedEvidenceRows(groups),
    },
  };
}

export async function loadCornerLeagueTeamPanelsWithTiming(
  filters: CornerFilters,
  options: CornerLeagueTeamPanelLoadOptions = {},
): Promise<{ result: CornerDetailResult; timing: CornerDetailTiming }> {
  const startedAt = Date.now();
  const marketKey = resolveCornerMarketKey(filters.statistic, filters.line);
  const includeEvidence = options.includeEvidence === true;
  const normalizedSearch = filters.teamSearch.trim();

  const profileStartedAt = Date.now();
  const [marketDefinition, summaryRows] = await Promise.all([
    loadMarketDefinition(marketKey),
    loadCornerProfileSnapshotRows(
      marketKey,
      filters.leagueId,
      filters.season,
      filters.teamId,
      normalizedSearch,
    ),
  ]);
  const dbProfileMs = Date.now() - profileStartedAt;
  const marketLabel = marketDefinition?.label ?? fallbackMarketLabel(filters.statistic, filters.line);

  const transformStartedAt = Date.now();
  const selectedRows = summaryRows.slice(0, MAX_CORNER_TEAM_PANELS);

  if (selectedRows.length === 0) {
    const transformMs = Date.now() - transformStartedAt;
    return {
      result: {
        marketKey,
        marketLabel,
        marketAvailable: marketDefinition?.is_active === true,
        evidenceMode: 'summary',
        panels: [],
      },
      timing: {
        dbProfileMs,
        dbEvidenceMs: 0,
        transformMs,
        totalMs: Date.now() - startedAt,
        profileRowCount: summaryRows.length,
        evidenceRowCount: 0,
        returnedEvidenceRowCount: 0,
      },
    };
  }

  let evidenceGroups: CornerTeamEvidenceGroup[] = [];
  let dbEvidenceMs = 0;
  let evidenceRowCount = 0;
  let returnedEvidenceRowCount = 0;

  if (includeEvidence) {
    const selectedTeamIds = selectedRows.map((row) => row.team_id);
    const evidence = await loadCornerMatchEvidence(filters, selectedTeamIds);
    evidenceGroups = evidence.result.groups;
    dbEvidenceMs = evidence.timing.dbEvidenceMs;
    evidenceRowCount = evidence.timing.evidenceRowCount;
    returnedEvidenceRowCount = evidence.timing.returnedEvidenceRowCount;
  }

  const matchRowsByTeamScope = evidenceGroupsToMap(evidenceGroups);
  const panels = selectedRows.map((row) => toCornerTeamPanel({
    evidenceLoaded: includeEvidence,
    filters,
    marketKey,
    marketLabel,
    matchRowsByTeamScope,
    row,
  }));
  const transformMs = Date.now() - transformStartedAt;

  return {
    result: {
      marketKey,
      marketLabel,
      marketAvailable: marketDefinition?.is_active === true,
      evidenceMode: includeEvidence ? 'evidence' : 'summary',
      panels,
    },
    timing: {
      dbProfileMs,
      dbEvidenceMs,
      transformMs,
      totalMs: Date.now() - startedAt,
      profileRowCount: summaryRows.length,
      evidenceRowCount,
      returnedEvidenceRowCount,
    },
  };
}

export async function loadCornerLeagueTeamPanels(filters: CornerFilters): Promise<CornerDetailResult> {
  const { result } = await loadCornerLeagueTeamPanelsWithTiming(filters);
  return result;
}

// Kept temporarily as a migration reference while Corners moves to the serving layer.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadCornerLeagueTeamPanelsLive(filters: CornerFilters): Promise<CornerDetailResult> {
  const supabaseAdmin = getSupabaseAdmin();
  const marketKey = resolveCornerMarketKey(filters.statistic, filters.line);
  const statScopes: CornerScope[] = ['overall', 'home', 'away'];
  const matchScopes: CornerScope[] = filters.viewMode === 'homeaway' ? ['home', 'away'] : ['overall'];

  const [marketDefinition, { data: statData, error: statError }] = await Promise.all([
    loadMarketDefinition(marketKey),
    supabaseAdmin
      .from('team_season_market_stats')
      .select('team_id, league_id, season, scope, market_key, sample, hits, percentage, current_streak, last_5_sample, last_5_hits, last_5_percentage, last_10_sample, last_10_hits, last_10_percentage')
      .eq('league_id', filters.leagueId)
      .eq('season', filters.season)
      .eq('category', 'corners')
      .eq('market_key', marketKey)
      .in('scope', statScopes),
  ]);
  const marketLabel = marketDefinition?.label ?? fallbackMarketLabel(filters.statistic, filters.line);

  if (statError) {
    throw new Error(`Failed to load corner season stats: ${statError.message}`);
  }

  const statRows = toStatRows((statData ?? []) as unknown[]);
  if (statRows.length === 0) {
    return {
      marketKey,
      marketLabel,
      marketAvailable: marketDefinition?.is_active === true,
      evidenceMode: 'summary',
      panels: [],
    };
  }

  const rawTeamIds = [...new Set(statRows.map((row) => row.team_id))];
  const [{ data: teamData, error: teamError }, { data: leagueData, error: leagueError }] = await Promise.all([
    supabaseAdmin.from('teams').select('id, name, logo_url').in('id', rawTeamIds),
    supabaseAdmin.from('leagues').select('id, name, logo_url').eq('id', filters.leagueId),
  ]);

  if (teamError) {
    throw new Error(`Failed to load corner teams: ${teamError.message}`);
  }

  if (leagueError) {
    throw new Error(`Failed to load corner league: ${leagueError.message}`);
  }

  const teamsById = new Map(toTeamRows((teamData ?? []) as unknown[]).map((team) => [team.id, team]));
  const league = toLeagueRows((leagueData ?? []) as unknown[])[0] ?? null;
  const normalizedSearch = filters.teamSearch.trim().toLowerCase();
  const selectedTeamIds = rawTeamIds
    .filter((teamId) => {
      if (filters.teamId !== null) {
        return teamId === filters.teamId;
      }

      if (!normalizedSearch) {
        return true;
      }

      const teamName = teamsById.get(teamId)?.name ?? `Team ${teamId}`;
      return teamName.toLowerCase().includes(normalizedSearch);
    })
    .slice(0, MAX_CORNER_TEAM_PANELS);

  if (selectedTeamIds.length === 0) {
    return {
      marketKey,
      marketLabel,
      marketAvailable: marketDefinition?.is_active === true,
      evidenceMode: 'summary',
      panels: [],
    };
  }

  const shouldLoadMatchEvidence = filters.teamId !== null || selectedTeamIds.length <= MAX_EVIDENCE_TEAM_PANELS;
  const nextFixturePromise = loadNextFixtures(selectedTeamIds, filters.leagueId, filters.season);
  const { data: matchData, error: matchError } = shouldLoadMatchEvidence
    ? await supabaseAdmin
      .from('team_match_market_results')
      .select('fixture_id, team_id, scope, result, numeric_value')
      .eq('league_id', filters.leagueId)
      .eq('season', filters.season)
      .eq('market_key', marketKey)
      .in('team_id', selectedTeamIds)
      .in('scope', matchScopes)
      .order('played_at', { ascending: false })
    : { data: [], error: null };

  if (matchError) {
    throw new Error(`Failed to load corner match results: ${matchError.message}`);
  }

  const matchRows = toMatchResultRows((matchData ?? []) as unknown[]);
  const fixtureIds = [...new Set(matchRows.map((row) => row.fixture_id))];
  const [
    { data: fixtureData, error: fixtureError },
    { data: factData, error: factError },
    nextFixtureByTeamId,
  ] = await Promise.all([
    fixtureIds.length > 0
      ? supabaseAdmin
        .from('fixture_team_summary')
        .select('fixture_id, date, home_team_id, home_team_name, away_team_id, away_team_name, home_corners, away_corners')
        .in('fixture_id', fixtureIds)
      : Promise.resolve({ data: [], error: null }),
    filters.periodGroup === 'by_half' && fixtureIds.length > 0
      ? supabaseAdmin
        .from('team_fixture_facts')
        .select('fixture_id, team_id, venue_scope, corners_for_1h, corners_against_1h, total_corners_1h, corners_for_2h, corners_against_2h, total_corners_2h')
        .in('fixture_id', fixtureIds)
      : Promise.resolve({ data: [], error: null }),
    nextFixturePromise,
  ]);

  if (fixtureError) {
    throw new Error(`Failed to load corner fixture summaries: ${fixtureError.message}`);
  }

  const fixtureSummaryById = new Map(
    toFixtureSummaryRows((fixtureData ?? []) as unknown[]).map((row) => [row.fixture_id, row]),
  );

  if (factError) {
    throw new Error(`Failed to load corner half-time facts: ${factError.message}`);
  }

  const halfScoreByFixture = buildHalfScoreByFixture(toTeamFixtureFactCornerRows((factData ?? []) as unknown[]));

  const statsByTeamScope = new Map<string, CornerStatSummary>();
  for (const row of statRows) {
    statsByTeamScope.set(`${row.team_id}:${row.scope}`, toStatSummary(row));
  }

  const matchRowsByTeamScope = new Map<string, CornerMatchRow[]>();
  for (const row of matchRows) {
    const fixture = fixtureSummaryById.get(row.fixture_id);
    if (!fixture) {
      continue;
    }

    const cornerScore = cornerScoreForStatistic(filters.statistic, fixture, halfScoreByFixture.get(row.fixture_id));
    const mappedRow: CornerMatchRow = {
      fixtureId: row.fixture_id,
      date: fixture.date,
      homeTeamId: fixture.home_team_id,
      homeTeamName: fixture.home_team_name,
      awayTeamId: fixture.away_team_id,
      awayTeamName: fixture.away_team_name,
      homeCorners: cornerScore.homeCorners,
      awayCorners: cornerScore.awayCorners,
      cornerScoreLabel: cornerScore.cornerScoreLabel,
      numericValue: toFiniteNumber(row.numeric_value),
      result: row.result,
    };
    const key = `${row.team_id}:${row.scope}`;
    const currentRows = matchRowsByTeamScope.get(key) ?? [];
    currentRows.push(mappedRow);
    matchRowsByTeamScope.set(key, currentRows);
  }

  return {
    marketKey,
    marketLabel,
    marketAvailable: marketDefinition?.is_active === true,
    evidenceMode: shouldLoadMatchEvidence ? 'evidence' : 'summary',
    panels: selectedTeamIds.map((teamId) => {
      const team = teamsById.get(teamId);
      return {
        teamId,
        teamName: team?.name ?? `Team ${teamId}`,
        teamLogoUrl: team?.logo_url ?? null,
        leagueId: filters.leagueId,
        leagueName: league?.name ?? `League ${filters.leagueId}`,
        leagueLogoUrl: league?.logo_url ?? null,
        season: filters.season,
        marketKey,
        marketLabel,
        stats: {
          overall: statsByTeamScope.get(`${teamId}:overall`) ?? null,
          home: statsByTeamScope.get(`${teamId}:home`) ?? null,
          away: statsByTeamScope.get(`${teamId}:away`) ?? null,
        },
        matchRows: {
          overall: matchRowsByTeamScope.get(`${teamId}:overall`) ?? [],
          home: matchRowsByTeamScope.get(`${teamId}:home`) ?? [],
          away: matchRowsByTeamScope.get(`${teamId}:away`) ?? [],
        },
        nextFixture: nextFixtureByTeamId.get(teamId) ?? null,
        evidenceLoaded: shouldLoadMatchEvidence,
        evidenceHref: buildCornersHref(filters, teamId),
        summaryHref: buildCornersHref({ ...filters, teamSearch: '', teamId: null }, null),
      } satisfies CornerTeamPanel;
    }).sort((left, right) => {
      const leftOverall = left.stats.overall;
      const rightOverall = right.stats.overall;
      return (
        (rightOverall?.percentage ?? -1) - (leftOverall?.percentage ?? -1) ||
        (rightOverall?.sample ?? 0) - (leftOverall?.sample ?? 0) ||
        left.teamName.localeCompare(right.teamName)
      );
    }),
  };
}
