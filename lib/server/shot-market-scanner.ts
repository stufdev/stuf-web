import 'server-only';

import { unstable_cache } from 'next/cache';
import { addDays, formatDateKey } from '@/lib/date';
import { getSupabaseAdmin } from './supabase-admin';
import { EMERGING_MIN_SAMPLE, MAIN_RANKING_MIN_SAMPLE, parseMainRankingFloor } from './sample-bands';

export type ShotScope = 'overall' | 'home' | 'away';
export type ShotViewMode = 'all' | 'homeaway';
export type ShotStatistic =
  | 'total_match_shots'
  | 'total_match_shots_under'
  | 'team_shots_for'
  | 'team_shots_against'
  | 'match_shots_on_target'
  | 'team_shots_on_target_for'
  | 'team_shots_on_target_against'
  | 'each_team_shots_on_target';
export type ShotFixtureFilter = 'all' | 'with_fixture' | 'today' | 'tomorrow' | 'in_2_days';
export type ShotFormWindow = 'season' | 'last5' | 'last10';
export type ShotSearchParams = Record<string, string | string[] | undefined>;

export type ShotFilters = {
  leagueId: number;
  season: number;
  statistic: ShotStatistic;
  line: string;
  viewMode: ShotViewMode;
  teamSearch: string;
  teamId: number | null;
};

export type ShotQuickFilters = {
  leagueId: number;
  season: number;
  statistic: ShotStatistic;
  line: string;
  teamSearch: string;
  formWindow: ShotFormWindow;
  fixtureFilter: ShotFixtureFilter;
  minSample: number;
};

export type ShotLeagueSeasonOption = {
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
};

export type ShotStatisticOption = {
  value: ShotStatistic;
  label: string;
};

export type ShotFilterOptions = {
  defaultLeagueId: number;
  defaultSeason: number;
  leagueSeasons: ShotLeagueSeasonOption[];
  linesByStatistic: Record<ShotStatistic, string[]>;
  statistics: ShotStatisticOption[];
};

export type ShotStatSummary = {
  scope: ShotScope;
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

export type ShotMatchRow = {
  fixtureId: number;
  date: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeShots: number | null;
  awayShots: number | null;
  shotScoreLabel: string | null;
  numericValue: number | null;
  result: boolean;
};

export type ShotNextFixture = {
  fixtureId: number;
  opponentTeamId: number;
  opponentName: string;
  isHome: boolean;
  date: string;
  dateKey?: string;
};

export type ShotTeamPanel = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
  marketKey: string;
  marketLabel: string;
  stats: Record<ShotScope, ShotStatSummary | null>;
  matchRows: Record<ShotScope, ShotMatchRow[]>;
  nextFixture: ShotNextFixture | null;
  evidenceLoaded: boolean;
  evidenceHref: string;
  summaryHref: string;
};

export type ShotDetailResult = {
  marketKey: string;
  marketLabel: string;
  marketAvailable: boolean;
  evidenceMode: 'summary' | 'evidence';
  panels: ShotTeamPanel[];
};

export type ShotDetailTiming = {
  dbProfileMs: number;
  dbEvidenceMs: number;
  transformMs: number;
  totalMs: number;
  profileRowCount: number;
  evidenceRowCount: number;
  returnedEvidenceRowCount: number;
};

export type ShotTeamEvidenceGroup = {
  teamId: number;
  scope: ShotScope;
  rows: ShotMatchRow[];
};

export type ShotMatchEvidenceResult = {
  marketKey: string;
  marketLabel: string;
  groups: ShotTeamEvidenceGroup[];
};

export type ShotQuickMetric = {
  hits: number;
  sample: number;
  percentage: number | null;
  currentStreak: number;
};

export type ShotQuickRow = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  scope: ShotScope;
  marketKey: string;
  marketLabel: string;
  metric: ShotQuickMetric;
  nextFixture: ShotNextFixture | null;
  opponentSupport: ShotQuickMetric | null;
  opponentSupportScope: ShotScope | null;
  fixtureContextMismatch: boolean;
  detailedHref: string;
  comparisonHref: string | null;
};

export type ShotQuickColumn = {
  scope: ShotScope;
  title: string;
  rows: ShotQuickRow[];
};

export type ShotQuickResult = {
  marketKey: string;
  marketLabel: string;
  marketAvailable: boolean;
  columns: ShotQuickColumn[];
  emergingColumns: ShotQuickColumn[];
};

export type ShotQuickTiming = {
  dbMs: number;
  transformMs: number;
  totalMs: number;
  rowCount: number;
};

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
  scope: ShotScope;
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
  scope: ShotScope;
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
  opponent_support_scope: ShotScope | null;
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

const MAX_SHOT_TEAM_PANELS = 40;
const QUICK_RESULT_LIMIT_PER_SCOPE = 60;
const MARKET_SERVING_CACHE_SECONDS = 60;
const SCOPES: ShotScope[] = ['overall', 'home', 'away'];

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

const MARKET_TEAM_RANKING_SELECT = [
  'category',
  'market_key',
  'league_id',
  'season',
  'scope',
  'team_id',
  'team_name',
  'team_logo_url',
  'hits',
  'sample',
  'percentage',
  'current_streak',
  'longest_streak',
  'last_5_sample',
  'last_5_hits',
  'last_5_percentage',
  'last_10_sample',
  'last_10_hits',
  'last_10_percentage',
  'next_fixture_id',
  'next_fixture_date',
  'next_opponent_team_id',
  'next_opponent_name',
  'next_venue_scope',
  'opponent_support_scope',
  'opponent_support_hits',
  'opponent_support_sample',
  'opponent_support_percentage',
  'opponent_support_last_5_hits',
  'opponent_support_last_5_sample',
  'opponent_support_last_5_percentage',
  'opponent_support_last_10_hits',
  'opponent_support_last_10_sample',
  'opponent_support_last_10_percentage',
].join(', ');

export const SHOT_STATISTIC_OPTIONS: ShotStatisticOption[] = [
  { value: 'total_match_shots', label: 'Total Match Shots Over' },
  { value: 'total_match_shots_under', label: 'Total Match Shots Under' },
  { value: 'team_shots_for', label: 'Team Shots For' },
  { value: 'team_shots_against', label: 'Team Shots Against' },
  { value: 'match_shots_on_target', label: 'Match Shots On Target' },
  { value: 'team_shots_on_target_for', label: 'Team Shots On Target For' },
  { value: 'team_shots_on_target_against', label: 'Team Shots On Target Against' },
  { value: 'each_team_shots_on_target', label: 'Each Team Shots On Target' },
];

export const SHOT_LINES_BY_STATISTIC: Record<ShotStatistic, string[]> = {
  total_match_shots: ['19.5', '21.5', '23.5', '25.5', '27.5'],
  total_match_shots_under: ['19.5', '21.5', '23.5', '25.5', '27.5'],
  team_shots_for: ['7.5', '9.5', '11.5', '13.5', '15.5'],
  team_shots_against: ['7.5', '9.5', '11.5', '13.5', '15.5'],
  match_shots_on_target: ['5.5', '6.5', '7.5', '8.5', '9.5'],
  team_shots_on_target_for: ['2.5', '3.5', '4.5', '5.5'],
  team_shots_on_target_against: ['2.5', '3.5', '4.5', '5.5'],
  each_team_shots_on_target: ['1.5', '2.5', '3.5'],
};

const DEFAULT_LINE_BY_STATISTIC: Record<ShotStatistic, string> = {
  total_match_shots: '23.5',
  total_match_shots_under: '23.5',
  team_shots_for: '11.5',
  team_shots_against: '11.5',
  match_shots_on_target: '7.5',
  team_shots_on_target_for: '3.5',
  team_shots_on_target_against: '3.5',
  each_team_shots_on_target: '2.5',
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseInteger(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstParam(value) ?? '', 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseStatistic(value: string | string[] | undefined): ShotStatistic {
  const raw = firstParam(value);
  return SHOT_STATISTIC_OPTIONS.find((item) => item.value === raw)?.value ?? 'total_match_shots';
}

function parseViewMode(value: string | string[] | undefined): ShotViewMode {
  return firstParam(value) === 'homeaway' ? 'homeaway' : 'all';
}

function parseFormWindow(value: string | string[] | undefined): ShotFormWindow {
  const raw = firstParam(value);
  return raw === 'last5' || raw === 'last10' ? raw : 'season';
}

function parseFixtureFilter(value: string | string[] | undefined): ShotFixtureFilter {
  const raw = firstParam(value);
  if (raw === 'with_fixture' || raw === 'today' || raw === 'tomorrow' || raw === 'in_2_days') {
    return raw;
  }
  return 'all';
}

function hasLeagueSeason(options: ShotFilterOptions, leagueId: number, season: number) {
  return options.leagueSeasons.some((item) => item.leagueId === leagueId && item.season === season);
}

function toFiniteNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function lineKey(line: string) {
  return line.replace('.', '_');
}

export function normalizeShotLine(statistic: ShotStatistic, value: string | undefined) {
  const lines = SHOT_LINES_BY_STATISTIC[statistic];
  const parsed = Number(value);
  return lines.find((line) => Number(line) === parsed) ?? DEFAULT_LINE_BY_STATISTIC[statistic];
}

export function resolveShotMarketKey(statistic: ShotStatistic, line: string) {
  const keyLine = lineKey(normalizeShotLine(statistic, line));
  if (statistic === 'total_match_shots') return `MATCH_OVER_${keyLine}_SHOTS`;
  if (statistic === 'total_match_shots_under') return `MATCH_UNDER_${keyLine}_SHOTS`;
  if (statistic === 'team_shots_for') return `TEAM_OVER_${keyLine}_SHOTS_FOR`;
  if (statistic === 'team_shots_against') return `TEAM_OVER_${keyLine}_SHOTS_AGAINST`;
  if (statistic === 'match_shots_on_target') return `MATCH_OVER_${keyLine}_SHOTS_ON_TARGET`;
  if (statistic === 'team_shots_on_target_for') return `TEAM_OVER_${keyLine}_SHOTS_ON_TARGET_FOR`;
  if (statistic === 'team_shots_on_target_against') return `TEAM_OVER_${keyLine}_SHOTS_ON_TARGET_AGAINST`;
  return `EACH_TEAM_OVER_${keyLine}_SHOTS_ON_TARGET`;
}

export function statisticFromShotMarketKey(marketKey: string): { statistic: ShotStatistic; line: string } | null {
  const total = marketKey.match(/^MATCH_(OVER|UNDER)_([0-9]+)_([0-9]+)_SHOTS$/);
  if (total) return { statistic: total[1] === 'UNDER' ? 'total_match_shots_under' : 'total_match_shots', line: `${total[2]}.${total[3]}` };
  const teamFor = marketKey.match(/^TEAM_OVER_([0-9]+)_([0-9]+)_SHOTS_FOR$/);
  if (teamFor) return { statistic: 'team_shots_for', line: `${teamFor[1]}.${teamFor[2]}` };
  const teamAgainst = marketKey.match(/^TEAM_OVER_([0-9]+)_([0-9]+)_SHOTS_AGAINST$/);
  if (teamAgainst) return { statistic: 'team_shots_against', line: `${teamAgainst[1]}.${teamAgainst[2]}` };
  const matchSot = marketKey.match(/^MATCH_OVER_([0-9]+)_([0-9]+)_SHOTS_ON_TARGET$/);
  if (matchSot) return { statistic: 'match_shots_on_target', line: `${matchSot[1]}.${matchSot[2]}` };
  const teamSotFor = marketKey.match(/^TEAM_OVER_([0-9]+)_([0-9]+)_SHOTS_ON_TARGET_FOR$/);
  if (teamSotFor) return { statistic: 'team_shots_on_target_for', line: `${teamSotFor[1]}.${teamSotFor[2]}` };
  const teamSotAgainst = marketKey.match(/^TEAM_OVER_([0-9]+)_([0-9]+)_SHOTS_ON_TARGET_AGAINST$/);
  if (teamSotAgainst) return { statistic: 'team_shots_on_target_against', line: `${teamSotAgainst[1]}.${teamSotAgainst[2]}` };
  const eachSot = marketKey.match(/^EACH_TEAM_OVER_([0-9]+)_([0-9]+)_SHOTS_ON_TARGET$/);
  if (eachSot) return { statistic: 'each_team_shots_on_target', line: `${eachSot[1]}.${eachSot[2]}` };
  return null;
}

function fallbackMarketLabel(statistic: ShotStatistic, line: string) {
  const option = SHOT_STATISTIC_OPTIONS.find((item) => item.value === statistic);
  const operator = statistic === 'total_match_shots_under' ? 'Under' : 'Over';
  return `${operator} ${normalizeShotLine(statistic, line)} ${option?.label.replace(/ Over| Under/u, '') ?? 'Shots'}`;
}

function allShotMarketKeys() {
  return SHOT_STATISTIC_OPTIONS.flatMap((option) => (
    SHOT_LINES_BY_STATISTIC[option.value].map((line) => resolveShotMarketKey(option.value, line))
  ));
}

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

function isShotScope(value: unknown): value is ShotScope {
  return value === 'overall' || value === 'home' || value === 'away';
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

function toEvidenceRows(rows: unknown[]): TeamMarketMatchEvidenceRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamMarketMatchEvidenceRow>;
    if (
      typeof record.team_id !== 'number' ||
      !isShotScope(record.scope) ||
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
      !isShotScope(record.scope) ||
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
      next_opponent_team_id: typeof record.next_opponent_team_id === 'number' ? record.next_opponent_team_id : null,
      next_opponent_name: typeof record.next_opponent_name === 'string' ? record.next_opponent_name : null,
      next_venue_scope: record.next_venue_scope === 'home' || record.next_venue_scope === 'away' ? record.next_venue_scope : null,
      opponent_support_scope: isShotScope(record.opponent_support_scope) ? record.opponent_support_scope : null,
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

function readSnapshotNumber(row: TeamMarketProfileRow, key: string) {
  return toFiniteNumber(row[key] as number | string | null | undefined);
}

function toSnapshotSummary(row: TeamMarketProfileRow, scope: ShotScope): ShotStatSummary | null {
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

function emptyMatchRows(): Record<ShotScope, ShotMatchRow[]> {
  return { overall: [], home: [], away: [] };
}

function matchScopesForViewMode(viewMode: ShotViewMode): ShotScope[] {
  return viewMode === 'homeaway' ? ['home', 'away'] : ['overall'];
}

function toShotMatchRow(row: TeamMarketMatchEvidenceRow): ShotMatchRow {
  const homeShots = toFiniteNumber(row.home_value);
  const awayShots = toFiniteNumber(row.away_value);
  return {
    fixtureId: row.fixture_id,
    date: row.played_at,
    homeTeamId: row.home_team_id,
    homeTeamName: row.home_team_name,
    awayTeamId: row.away_team_id,
    awayTeamName: row.away_team_name,
    homeShots,
    awayShots,
    shotScoreLabel: homeShots === null || awayShots === null ? null : `${homeShots} - ${awayShots}`,
    numericValue: null,
    result: row.result,
  };
}

function groupEvidenceRows(evidenceRows: TeamMarketMatchEvidenceRow[], viewMode: ShotViewMode): ShotTeamEvidenceGroup[] {
  const allowedScopes = new Set(matchScopesForViewMode(viewMode));
  const rowsByTeamScope = new Map<string, ShotMatchRow[]>();
  for (const row of evidenceRows) {
    if (!allowedScopes.has(row.scope)) continue;
    const key = `${row.team_id}:${row.scope}`;
    const currentRows = rowsByTeamScope.get(key) ?? [];
    currentRows.push(toShotMatchRow(row));
    rowsByTeamScope.set(key, currentRows);
  }
  return [...rowsByTeamScope.entries()].map(([key, rows]) => {
    const [teamId, scope] = key.split(':');
    return { teamId: Number(teamId), scope: scope as ShotScope, rows };
  });
}

function evidenceGroupsToMap(groups: ShotTeamEvidenceGroup[]) {
  return new Map(groups.map((group) => [`${group.teamId}:${group.scope}`, group.rows]));
}

function countReturnedEvidenceRows(groups: ShotTeamEvidenceGroup[]) {
  return groups.reduce((total, group) => total + group.rows.length, 0);
}

function buildShotsHref(filters: ShotFilters, teamId: number | null) {
  const params = new URLSearchParams();
  params.set('leagueId', String(filters.leagueId));
  params.set('season', String(filters.season));
  params.set('statistic', filters.statistic);
  params.set('line', filters.line);
  if (filters.viewMode !== 'all') params.set('viewMode', filters.viewMode);
  if (teamId !== null) params.set('teamId', String(teamId));
  else if (filters.teamSearch.trim()) params.set('teamSearch', filters.teamSearch.trim());
  return `/shots/detailed?${params.toString()}`;
}

function toShotTeamPanel({
  evidenceLoaded,
  filters,
  marketKey,
  marketLabel,
  matchRowsByTeamScope,
  row,
}: {
  evidenceLoaded: boolean;
  filters: ShotFilters;
  marketKey: string;
  marketLabel: string;
  matchRowsByTeamScope: Map<string, ShotMatchRow[]>;
  row: TeamMarketProfileRow;
}): ShotTeamPanel {
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
        dateKey: formatDateKey(new Date(row.next_fixture_date)),
      }
      : null,
    evidenceLoaded,
    evidenceHref: buildShotsHref(filters, row.team_id),
    summaryHref: buildShotsHref({ ...filters, teamSearch: '', teamId: null }, null),
  };
}

function metricFromQuickSnapshot(row: MarketTeamRankingRow, formWindow: ShotFormWindow): ShotQuickMetric {
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

function opponentMetricFromQuickSnapshot(row: MarketTeamRankingRow, formWindow: ShotFormWindow): ShotQuickMetric | null {
  if (row.opponent_support_sample === null || row.opponent_support_hits === null) return null;
  if (formWindow === 'last5') {
    const sample = row.opponent_support_last_5_sample ?? Math.min(row.opponent_support_sample, 5);
    const hits = row.opponent_support_last_5_hits ?? 0;
    return { hits, sample, percentage: sample > 0 ? toFiniteNumber(row.opponent_support_last_5_percentage) ?? (hits / sample) * 100 : null, currentStreak: 0 };
  }
  if (formWindow === 'last10') {
    const sample = row.opponent_support_last_10_sample ?? Math.min(row.opponent_support_sample, 10);
    const hits = row.opponent_support_last_10_hits ?? 0;
    return { hits, sample, percentage: sample > 0 ? toFiniteNumber(row.opponent_support_last_10_percentage) ?? (hits / sample) * 100 : null, currentStreak: 0 };
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

function venueMatchesScope(scope: ShotScope, fixture: ShotNextFixture | null) {
  if (!fixture || scope === 'overall') return true;
  return scope === 'home' ? fixture.isHome : !fixture.isHome;
}

function fixtureMatchesFilter(scope: ShotScope, fixture: ShotNextFixture | null, fixtureFilter: ShotFixtureFilter) {
  if (fixtureFilter === 'all') return true;
  if (!fixture || !venueMatchesScope(scope, fixture)) return false;
  if (fixtureFilter === 'with_fixture') return true;
  const today = formatDateKey(new Date());
  const targets: Record<Exclude<ShotFixtureFilter, 'all' | 'with_fixture'>, string> = {
    today,
    tomorrow: formatDateKey(addDays(new Date(), 1)),
    in_2_days: formatDateKey(addDays(new Date(), 2)),
  };
  return fixture.dateKey === targets[fixtureFilter];
}

function buildDetailedHref(row: { leagueId: number; season: number; teamId: number; marketKey: string }) {
  const params = new URLSearchParams({
    teamId: String(row.teamId),
    marketKey: row.marketKey,
    source: 'shots-quick',
    leagueId: String(row.leagueId),
    season: String(row.season),
  });
  return `/shots/detailed?${params.toString()}`;
}

function buildComparisonHref(fixtureId: number, marketKey: string) {
  return `/comparison?fixtureId=${fixtureId}&marketKey=${marketKey}&source=shots-quick`;
}

function scopeTitle(scope: ShotScope) {
  if (scope === 'home') return 'Home Matches';
  if (scope === 'away') return 'Away Matches';
  return 'All Matches';
}

export function parseShotFilters(searchParams: ShotSearchParams | undefined, options: ShotFilterOptions): ShotFilters {
  const marketKeySelection = statisticFromShotMarketKey(firstParam(searchParams?.marketKey) ?? '');
  const statistic = marketKeySelection?.statistic ?? parseStatistic(searchParams?.statistic);
  const requestedLeagueId = parseInteger(searchParams?.leagueId) ?? options.defaultLeagueId;
  const requestedSeason = parseInteger(searchParams?.season) ?? options.defaultSeason;
  const leagueId = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedLeagueId : options.defaultLeagueId;
  const season = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedSeason : options.defaultSeason;
  return {
    leagueId,
    season,
    statistic,
    line: normalizeShotLine(statistic, marketKeySelection?.line ?? firstParam(searchParams?.line)),
    viewMode: parseViewMode(searchParams?.viewMode),
    teamSearch: firstParam(searchParams?.teamSearch)?.trim() ?? '',
    teamId: parseInteger(searchParams?.teamId),
  };
}

export function parseShotQuickFilters(searchParams: ShotSearchParams | undefined, options: ShotFilterOptions): ShotQuickFilters {
  const marketKeySelection = statisticFromShotMarketKey(firstParam(searchParams?.marketKey) ?? '');
  const statistic = marketKeySelection?.statistic ?? parseStatistic(searchParams?.statistic);
  const requestedLeagueId = parseInteger(searchParams?.leagueId) ?? options.defaultLeagueId;
  const requestedSeason = parseInteger(searchParams?.season) ?? options.defaultSeason;
  const leagueId = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedLeagueId : options.defaultLeagueId;
  const season = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedSeason : options.defaultSeason;
  return {
    leagueId,
    season,
    statistic,
    line: normalizeShotLine(statistic, marketKeySelection?.line ?? firstParam(searchParams?.line)),
    teamSearch: firstParam(searchParams?.teamSearch)?.trim() ?? '',
    formWindow: parseFormWindow(searchParams?.formWindow),
    fixtureFilter: parseFixtureFilter(searchParams?.fixtureFilter),
    minSample: parseMainRankingFloor(parseInteger(searchParams?.minSample)),
  };
}

const loadMarketDefinition = unstable_cache(async (marketKey: string) => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('market_definitions')
    .select('key, label, is_active')
    .eq('key', marketKey)
    .eq('category', 'shots')
    .maybeSingle();
  if (error) throw new Error(`Failed to load shot market definition: ${error.message}`);
  return toMarketDefinitionRows(data ? [data] : [])[0] ?? null;
}, ['shot-market-definition'], { revalidate: 300 });

async function loadShotFilterOptionsUncached(): Promise<ShotFilterOptions> {
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
      .in('key', allShotMarketKeys())
      .eq('category', 'shots'),
  ]);
  if (supportedError) throw new Error(`Failed to load shot league options: ${supportedError.message}`);
  if (marketError) throw new Error(`Failed to load shot market options: ${marketError.message}`);

  const supportedRows = toSupportedRows((supportedData ?? []) as unknown[]);
  if (supportedRows.length === 0) throw new Error('No supported leagues configured.');

  const leagueIds = [...new Set(supportedRows.map((row) => row.leagueId))];
  const { data: leagueData, error: leagueError } = await supabaseAdmin
    .from('leagues')
    .select('id, name, logo_url')
    .in('id', leagueIds);
  if (leagueError) throw new Error(`Failed to load shot leagues: ${leagueError.message}`);

  const leaguesById = new Map(toLeagueRows((leagueData ?? []) as unknown[]).map((league) => [league.id, league]));
  const activeKeys = new Set(toMarketDefinitionRows((marketData ?? []) as unknown[]).filter((row) => row.is_active).map((row) => row.key));
  const linesByStatistic = Object.fromEntries(
    SHOT_STATISTIC_OPTIONS.map((option) => [
      option.value,
      SHOT_LINES_BY_STATISTIC[option.value].filter((line) => activeKeys.has(resolveShotMarketKey(option.value, line))),
    ]),
  ) as Record<ShotStatistic, string[]>;

  for (const option of SHOT_STATISTIC_OPTIONS) {
    if (linesByStatistic[option.value].length === 0) linesByStatistic[option.value] = [DEFAULT_LINE_BY_STATISTIC[option.value]];
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
    statistics: SHOT_STATISTIC_OPTIONS,
  };
}

export const loadShotFilterOptions = unstable_cache(loadShotFilterOptionsUncached, ['shot-filter-options'], { revalidate: 300 });

const loadShotProfileSnapshotRows = unstable_cache(
  async (marketKey: string, leagueId: number, season: number, teamId: number | null, teamSearch: string) => {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('team_market_profiles')
      .select(TEAM_MARKET_PROFILE_SELECT)
      .eq('category', 'shots')
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
      .limit(MAX_SHOT_TEAM_PANELS);

    if (error) {
      throw new Error(`Failed to load shot Market Serving Layer profiles. Run rebuild_market_serving_layer.py --category shots. Supabase: ${error.message}`);
    }

    return toProfileRows((data ?? []) as unknown[]);
  },
  ['shot-profile-snapshot-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

const loadShotEvidenceSnapshotRows = unstable_cache(
  async (marketKey: string, leagueId: number, season: number, viewMode: ShotViewMode, teamIdsKey: string) => {
    const teamIds = teamIdsKey
      .split(',')
      .map((item) => Number(item))
      .filter((teamId) => Number.isInteger(teamId) && teamId > 0);
    if (teamIds.length === 0) return [];

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('team_market_match_evidence')
      .select(TEAM_MARKET_EVIDENCE_SELECT)
      .eq('category', 'shots')
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .in('team_id', teamIds)
      .in('scope', matchScopesForViewMode(viewMode))
      .order('team_id', { ascending: true })
      .order('scope', { ascending: true })
      .order('played_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load shot Market Serving Layer evidence. Run rebuild_market_serving_layer.py --category shots. Supabase: ${error.message}`);
    }

    return toEvidenceRows((data ?? []) as unknown[]);
  },
  ['shot-evidence-snapshot-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

const loadShotQuickRankingSnapshotRows = unstable_cache(
  async (marketKey: string, leagueId: number, season: number) => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('market_team_rankings')
      .select(MARKET_TEAM_RANKING_SELECT)
      .eq('category', 'shots')
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .in('scope', SCOPES)
      .order('rank', { ascending: true });

    if (error) {
      throw new Error(`Failed to load shot quick Market Serving Layer. Run rebuild_market_serving_layer.py --category shots. Supabase: ${error.message}`);
    }

    return toRankingRows((data ?? []) as unknown[]);
  },
  ['shot-quick-ranking-snapshot-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

export async function loadShotMatchEvidence(
  filters: ShotFilters,
  teamIds: number[],
): Promise<{ result: ShotMatchEvidenceResult; timing: ShotDetailTiming }> {
  const startedAt = Date.now();
  const marketKey = resolveShotMarketKey(filters.statistic, filters.line);
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
  const evidenceRows = await loadShotEvidenceSnapshotRows(
    marketKey,
    filters.leagueId,
    filters.season,
    filters.viewMode,
    selectedTeamIds.join(','),
  );
  const dbEvidenceMs = Date.now() - evidenceStartedAt;
  const marketDefinition = await marketDefinitionPromise;
  const transformStartedAt = Date.now();
  const groups = groupEvidenceRows(evidenceRows, filters.viewMode);
  const transformMs = Date.now() - transformStartedAt;

  return {
    result: {
      marketKey,
      marketLabel: marketDefinition?.label ?? fallbackMarketLabel(filters.statistic, filters.line),
      groups,
    },
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

export async function loadShotTeamPanelsWithTiming(
  filters: ShotFilters,
  options: { includeEvidence?: boolean } = {},
): Promise<{ result: ShotDetailResult; timing: ShotDetailTiming }> {
  const startedAt = Date.now();
  const marketKey = resolveShotMarketKey(filters.statistic, filters.line);
  const includeEvidence = options.includeEvidence === true;
  const profileStartedAt = Date.now();
  const [marketDefinition, profileRows] = await Promise.all([
    loadMarketDefinition(marketKey),
    loadShotProfileSnapshotRows(marketKey, filters.leagueId, filters.season, filters.teamId, filters.teamSearch.trim()),
  ]);
  const dbProfileMs = Date.now() - profileStartedAt;
  const marketLabel = marketDefinition?.label ?? fallbackMarketLabel(filters.statistic, filters.line);

  const transformStartedAt = Date.now();
  if (profileRows.length === 0) {
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
        profileRowCount: 0,
        evidenceRowCount: 0,
        returnedEvidenceRowCount: 0,
      },
    };
  }

  let evidenceGroups: ShotTeamEvidenceGroup[] = [];
  let dbEvidenceMs = 0;
  let evidenceRowCount = 0;
  let returnedEvidenceRowCount = 0;

  if (includeEvidence) {
    const evidence = await loadShotMatchEvidence(filters, profileRows.map((row) => row.team_id));
    evidenceGroups = evidence.result.groups;
    dbEvidenceMs = evidence.timing.dbEvidenceMs;
    evidenceRowCount = evidence.timing.evidenceRowCount;
    returnedEvidenceRowCount = evidence.timing.returnedEvidenceRowCount;
  }

  const matchRowsByTeamScope = evidenceGroupsToMap(evidenceGroups);
  const panels = profileRows.map((row) => toShotTeamPanel({
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
      profileRowCount: profileRows.length,
      evidenceRowCount,
      returnedEvidenceRowCount,
    },
  };
}

export async function loadShotTeamPanels(filters: ShotFilters): Promise<ShotDetailResult> {
  const { result } = await loadShotTeamPanelsWithTiming(filters);
  return result;
}

export async function loadShotQuickScanner(filters: ShotQuickFilters): Promise<ShotQuickResult> {
  const { result } = await loadShotQuickScannerWithTiming(filters);
  return result;
}

export async function loadShotQuickScannerWithTiming(
  filters: ShotQuickFilters,
): Promise<{ result: ShotQuickResult; timing: ShotQuickTiming }> {
  const startedAt = Date.now();
  const marketKey = resolveShotMarketKey(filters.statistic, filters.line);
  const dbStartedAt = Date.now();
  const [marketDefinition, snapshotRows] = await Promise.all([
    loadMarketDefinition(marketKey),
    loadShotQuickRankingSnapshotRows(marketKey, filters.leagueId, filters.season),
  ]);
  const dbMs = Date.now() - dbStartedAt;
  const transformStartedAt = Date.now();
  const marketLabel = marketDefinition?.label ?? fallbackMarketLabel(filters.statistic, filters.line);
  const normalizedSearch = filters.teamSearch.trim().toLowerCase();
  const candidatesByScope = new Map<ShotScope, ShotQuickRow[]>();
  for (const scope of SCOPES) {
    const rows = snapshotRows
      .filter((row) => row.scope === scope)
      .flatMap((row) => {
        if (normalizedSearch && !row.team_name.toLowerCase().includes(normalizedSearch)) return [];
        const metric = metricFromQuickSnapshot(row, filters.formWindow);
        if (metric.sample < EMERGING_MIN_SAMPLE) return [];

        const nextFixture = row.next_fixture_id !== null && row.next_fixture_date !== null && row.next_opponent_team_id !== null && row.next_opponent_name !== null && row.next_venue_scope !== null
          ? {
            fixtureId: row.next_fixture_id,
            opponentTeamId: row.next_opponent_team_id,
            opponentName: row.next_opponent_name,
            isHome: row.next_venue_scope === 'home',
            date: row.next_fixture_date,
            dateKey: formatDateKey(new Date(row.next_fixture_date)),
          } satisfies ShotNextFixture
          : null;
        if (!fixtureMatchesFilter(scope, nextFixture, filters.fixtureFilter)) return [];

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
          detailedHref: buildDetailedHref({ leagueId: row.league_id, season: row.season, teamId: row.team_id, marketKey }),
          comparisonHref: nextFixture ? buildComparisonHref(nextFixture.fixtureId, marketKey) : null,
        } satisfies ShotQuickRow];
      })
      .sort((left, right) => (
        (right.metric.percentage ?? -1) - (left.metric.percentage ?? -1) ||
        right.metric.hits - left.metric.hits ||
        right.metric.sample - left.metric.sample ||
        left.teamName.localeCompare(right.teamName)
      ));
    candidatesByScope.set(scope, rows);
  }

  const columns: ShotQuickColumn[] = SCOPES.map((scope) => {
    const rows = (candidatesByScope.get(scope) ?? [])
      .filter((row) => row.metric.sample >= filters.minSample)
      .slice(0, QUICK_RESULT_LIMIT_PER_SCOPE);
    return { scope, title: scopeTitle(scope), rows };
  });
  const emergingColumns: ShotQuickColumn[] = SCOPES.map((scope) => {
    const rows = (candidatesByScope.get(scope) ?? [])
      .filter((row) => row.metric.sample >= EMERGING_MIN_SAMPLE && row.metric.sample < MAIN_RANKING_MIN_SAMPLE)
      .slice(0, QUICK_RESULT_LIMIT_PER_SCOPE);
    return { scope, title: scopeTitle(scope), rows };
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
      totalMs: Date.now() - startedAt,
      rowCount: snapshotRows.length,
    },
  };
}
