import 'server-only';

import { unstable_cache } from 'next/cache';
import { addDays, formatDateKey } from '@/lib/date';
import { getSupabaseAdmin } from './supabase-admin';

export type GoalScope = 'overall' | 'home' | 'away';
export type GoalViewMode = 'all' | 'homeaway';
export type GoalFamily = 'match_totals' | 'team_goals' | 'goals_by_half';
export type GoalStatistic =
  | 'match_goals_over'
  | 'match_goals_under'
  | 'match_goal_range'
  | 'match_goal_both_halves'
  | 'team_goals_for'
  | 'team_goals_against'
  | 'team_scored_both_halves'
  | 'team_conceded_both_halves'
  | 'team_1h_goals_for'
  | 'team_1h_goals_against'
  | 'team_2h_goals_for'
  | 'team_2h_goals_against'
  | 'match_1h_goals'
  | 'match_2h_goals';
export type GoalFixtureFilter = 'all' | 'with_fixture' | 'today' | 'tomorrow' | 'in_2_days';
export type GoalFormWindow = 'season' | 'last5' | 'last10';
export type GoalSearchParams = Record<string, string | string[] | undefined>;

export type GoalFilters = {
  family: GoalFamily;
  leagueId: number;
  season: number;
  statistic: GoalStatistic;
  line: string;
  viewMode: GoalViewMode;
  teamSearch: string;
  teamId: number | null;
};

export type GoalQuickFilters = {
  family: GoalFamily;
  leagueId: number;
  season: number;
  statistic: GoalStatistic;
  line: string;
  teamSearch: string;
  formWindow: GoalFormWindow;
  fixtureFilter: GoalFixtureFilter;
  minSample: number;
};

export type GoalLeagueSeasonOption = {
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
};

export type GoalStatisticOption = {
  value: GoalStatistic;
  label: string;
};

export type GoalFilterOptions = {
  family: GoalFamily;
  defaultLeagueId: number;
  defaultSeason: number;
  leagueSeasons: GoalLeagueSeasonOption[];
  linesByStatistic: Record<GoalStatistic, string[]>;
  statistics: GoalStatisticOption[];
};

export type GoalFamilyConfig = {
  family: GoalFamily;
  title: string;
  route: string;
  quickRoute: string;
  defaultStatistic: GoalStatistic;
  statistics: GoalStatistic[];
};

export type GoalStatSummary = {
  scope: GoalScope;
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

export type GoalMatchRow = {
  fixtureId: number;
  date: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  goalScoreLabel: string | null;
  numericValue: number | null;
  result: boolean;
};

export type GoalNextFixture = {
  fixtureId: number;
  opponentTeamId: number;
  opponentName: string;
  isHome: boolean;
  date: string;
  dateKey?: string;
};

export type GoalTeamPanel = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
  marketKey: string;
  marketLabel: string;
  stats: Record<GoalScope, GoalStatSummary | null>;
  matchRows: Record<GoalScope, GoalMatchRow[]>;
  nextFixture: GoalNextFixture | null;
  evidenceLoaded: boolean;
  evidenceHref: string;
  summaryHref: string;
};

export type GoalDetailResult = {
  marketKey: string;
  marketLabel: string;
  marketAvailable: boolean;
  evidenceMode: 'summary' | 'evidence';
  panels: GoalTeamPanel[];
};

export type GoalDetailTiming = {
  dbProfileMs: number;
  dbEvidenceMs: number;
  transformMs: number;
  totalMs: number;
  profileRowCount: number;
  evidenceRowCount: number;
  returnedEvidenceRowCount: number;
};

export type GoalTeamEvidenceGroup = {
  teamId: number;
  scope: GoalScope;
  rows: GoalMatchRow[];
};

export type GoalMatchEvidenceResult = {
  marketKey: string;
  marketLabel: string;
  groups: GoalTeamEvidenceGroup[];
};

export type GoalQuickMetric = {
  hits: number;
  sample: number;
  percentage: number | null;
  currentStreak: number;
};

export type GoalQuickRow = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  scope: GoalScope;
  marketKey: string;
  marketLabel: string;
  metric: GoalQuickMetric;
  nextFixture: GoalNextFixture | null;
  opponentSupport: GoalQuickMetric | null;
  opponentSupportScope: GoalScope | null;
  fixtureContextMismatch: boolean;
  detailedHref: string;
  comparisonHref: string | null;
};

export type GoalQuickColumn = {
  scope: GoalScope;
  title: string;
  rows: GoalQuickRow[];
};

export type GoalQuickResult = {
  marketKey: string;
  marketLabel: string;
  marketAvailable: boolean;
  columns: GoalQuickColumn[];
};

export type GoalQuickTiming = {
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
  scope: GoalScope;
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
  scope: GoalScope;
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
  opponent_support_scope: GoalScope | null;
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

const MAX_GOAL_TEAM_PANELS = 40;
const QUICK_RESULT_LIMIT_PER_SCOPE = 60;
const MARKET_SERVING_CACHE_SECONDS = 60;
const SCOPES: GoalScope[] = ['overall', 'home', 'away'];

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

export const GOAL_STATISTIC_OPTIONS: GoalStatisticOption[] = [
  { value: 'match_goals_over', label: 'Total Match Goals Over' },
  { value: 'match_goals_under', label: 'Total Match Goals Under' },
  { value: 'match_goal_range', label: 'Goal Range' },
  { value: 'match_goal_both_halves', label: 'Goal In Both Halves' },
  { value: 'team_goals_for', label: 'Team Goals For' },
  { value: 'team_goals_against', label: 'Team Goals Against' },
  { value: 'team_scored_both_halves', label: 'Score In Both Halves' },
  { value: 'team_conceded_both_halves', label: 'Concede In Both Halves' },
  { value: 'team_1h_goals_for', label: 'Team 1st Half Goals For' },
  { value: 'team_1h_goals_against', label: 'Team 1st Half Goals Against' },
  { value: 'team_2h_goals_for', label: 'Team 2nd Half Goals For' },
  { value: 'team_2h_goals_against', label: 'Team 2nd Half Goals Against' },
  { value: 'match_1h_goals', label: 'Total 1st Half Goals' },
  { value: 'match_2h_goals', label: 'Total 2nd Half Goals' },
];

export const GOAL_LINES_BY_STATISTIC: Record<GoalStatistic, string[]> = {
  match_goals_over: ['1.5', '2.5', '3.5'],
  match_goals_under: ['1.5', '2.5', '3.5'],
  match_goal_range: ['0-1', '2-3', '4+'],
  match_goal_both_halves: ['yes'],
  team_goals_for: ['0.5', '1.5', '2.5'],
  team_goals_against: ['0.5', '1.5', '2.5'],
  team_scored_both_halves: ['yes'],
  team_conceded_both_halves: ['yes'],
  team_1h_goals_for: ['0.5', '1.5'],
  team_1h_goals_against: ['0.5', '1.5'],
  team_2h_goals_for: ['0.5', '1.5'],
  team_2h_goals_against: ['0.5', '1.5'],
  match_1h_goals: ['0.5', '1.5'],
  match_2h_goals: ['0.5', '1.5'],
};

const DEFAULT_LINE_BY_STATISTIC: Record<GoalStatistic, string> = {
  match_goals_over: '2.5',
  match_goals_under: '2.5',
  match_goal_range: '2-3',
  match_goal_both_halves: 'yes',
  team_goals_for: '1.5',
  team_goals_against: '1.5',
  team_scored_both_halves: 'yes',
  team_conceded_both_halves: 'yes',
  team_1h_goals_for: '0.5',
  team_1h_goals_against: '0.5',
  team_2h_goals_for: '0.5',
  team_2h_goals_against: '0.5',
  match_1h_goals: '0.5',
  match_2h_goals: '0.5',
};

export const GOAL_FAMILY_CONFIG: Record<GoalFamily, GoalFamilyConfig> = {
  match_totals: {
    family: 'match_totals',
    title: 'Overs',
    route: '/goals/overs',
    quickRoute: '/goals/overs/quick',
    defaultStatistic: 'match_goals_over',
    statistics: ['match_goals_over', 'match_goals_under', 'match_goal_range', 'match_goal_both_halves'],
  },
  team_goals: {
    family: 'team_goals',
    title: 'Team Goals',
    route: '/goals/team-goals',
    quickRoute: '/goals/team-goals/quick',
    defaultStatistic: 'team_goals_for',
    statistics: ['team_goals_for', 'team_goals_against', 'team_scored_both_halves', 'team_conceded_both_halves'],
  },
  goals_by_half: {
    family: 'goals_by_half',
    title: 'Goals By Half',
    route: '/goals/by-half',
    quickRoute: '/goals/by-half/quick',
    defaultStatistic: 'team_1h_goals_for',
    statistics: [
      'team_1h_goals_for',
      'team_1h_goals_against',
      'team_2h_goals_for',
      'team_2h_goals_against',
      'match_1h_goals',
      'match_2h_goals',
    ],
  },
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseInteger(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstParam(value) ?? '', 10);
  return Number.isInteger(parsed) ? parsed : null;
}

export function normalizeGoalFamily(value: string | string[] | undefined): GoalFamily {
  const raw = firstParam(value);
  return raw === 'team_goals' || raw === 'goals_by_half' ? raw : 'match_totals';
}

function parseStatistic(value: string | string[] | undefined, family: GoalFamily): GoalStatistic {
  const raw = firstParam(value);
  const config = GOAL_FAMILY_CONFIG[family];
  return config.statistics.includes(raw as GoalStatistic) ? raw as GoalStatistic : config.defaultStatistic;
}

function parseViewMode(value: string | string[] | undefined): GoalViewMode {
  return firstParam(value) === 'homeaway' ? 'homeaway' : 'all';
}

function parseFormWindow(value: string | string[] | undefined): GoalFormWindow {
  const raw = firstParam(value);
  return raw === 'last5' || raw === 'last10' ? raw : 'season';
}

function parseFixtureFilter(value: string | string[] | undefined): GoalFixtureFilter {
  const raw = firstParam(value);
  if (raw === 'with_fixture' || raw === 'today' || raw === 'tomorrow' || raw === 'in_2_days') {
    return raw;
  }
  return 'all';
}

function hasLeagueSeason(options: GoalFilterOptions, leagueId: number, season: number) {
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

export function normalizeGoalLine(statistic: GoalStatistic, value: string | undefined) {
  const lines = GOAL_LINES_BY_STATISTIC[statistic];
  if (value && lines.includes(value)) return value;
  const parsed = Number(value);
  return lines.find((line) => Number(line) === parsed) ?? DEFAULT_LINE_BY_STATISTIC[statistic];
}

export function resolveGoalMarketKey(statistic: GoalStatistic, line: string) {
  const normalizedLine = normalizeGoalLine(statistic, line);
  const keyLine = lineKey(normalizedLine);
  if (statistic === 'match_goals_over') return `MATCH_OVER_${keyLine}_GOALS`;
  if (statistic === 'match_goals_under') return `MATCH_UNDER_${keyLine}_GOALS`;
  if (statistic === 'match_goal_range') {
    if (normalizedLine === '0-1') return 'MATCH_GOAL_RANGE_0_1';
    if (normalizedLine === '4+') return 'MATCH_GOAL_RANGE_4_PLUS';
    return 'MATCH_GOAL_RANGE_2_3';
  }
  if (statistic === 'match_goal_both_halves') return 'MATCH_GOAL_IN_BOTH_HALVES';
  if (statistic === 'team_goals_for') return `TEAM_OVER_${keyLine}_GOALS_FOR`;
  if (statistic === 'team_goals_against') return `TEAM_OVER_${keyLine}_GOALS_AGAINST`;
  if (statistic === 'team_scored_both_halves') return 'TEAM_SCORED_BOTH_HALVES';
  if (statistic === 'team_conceded_both_halves') return 'TEAM_CONCEDED_BOTH_HALVES';
  if (statistic === 'team_1h_goals_for') return `TEAM_1H_OVER_${keyLine}_GOALS_FOR`;
  if (statistic === 'team_1h_goals_against') return `TEAM_1H_OVER_${keyLine}_GOALS_AGAINST`;
  if (statistic === 'team_2h_goals_for') return `TEAM_2H_OVER_${keyLine}_GOALS_FOR`;
  if (statistic === 'team_2h_goals_against') return `TEAM_2H_OVER_${keyLine}_GOALS_AGAINST`;
  if (statistic === 'match_1h_goals') return `MATCH_1H_OVER_${keyLine}_GOALS`;
  return `MATCH_2H_OVER_${keyLine}_GOALS`;
}

export function statisticFromGoalMarketKey(marketKey: string): { family: GoalFamily; statistic: GoalStatistic; line: string } | null {
  const total = marketKey.match(/^MATCH_(OVER|UNDER)_([0-9]+)_([0-9]+)_GOALS$/);
  if (total) return { family: 'match_totals', statistic: total[1] === 'UNDER' ? 'match_goals_under' : 'match_goals_over', line: `${total[2]}.${total[3]}` };
  if (marketKey === 'MATCH_GOAL_RANGE_0_1') return { family: 'match_totals', statistic: 'match_goal_range', line: '0-1' };
  if (marketKey === 'MATCH_GOAL_RANGE_2_3') return { family: 'match_totals', statistic: 'match_goal_range', line: '2-3' };
  if (marketKey === 'MATCH_GOAL_RANGE_4_PLUS') return { family: 'match_totals', statistic: 'match_goal_range', line: '4+' };
  if (marketKey === 'MATCH_GOAL_IN_BOTH_HALVES') return { family: 'match_totals', statistic: 'match_goal_both_halves', line: 'yes' };
  const teamFor = marketKey.match(/^TEAM_OVER_([0-9]+)_([0-9]+)_GOALS_FOR$/);
  if (teamFor) return { family: 'team_goals', statistic: 'team_goals_for', line: `${teamFor[1]}.${teamFor[2]}` };
  const teamAgainst = marketKey.match(/^TEAM_OVER_([0-9]+)_([0-9]+)_GOALS_AGAINST$/);
  if (teamAgainst) return { family: 'team_goals', statistic: 'team_goals_against', line: `${teamAgainst[1]}.${teamAgainst[2]}` };
  if (marketKey === 'TEAM_SCORED_BOTH_HALVES') return { family: 'team_goals', statistic: 'team_scored_both_halves', line: 'yes' };
  if (marketKey === 'TEAM_CONCEDED_BOTH_HALVES') return { family: 'team_goals', statistic: 'team_conceded_both_halves', line: 'yes' };
  const teamHalf = marketKey.match(/^TEAM_(1H|2H)_OVER_([0-9]+)_([0-9]+)_GOALS_(FOR|AGAINST)$/);
  if (teamHalf) {
    const period = teamHalf[1] === '1H' ? '1h' : '2h';
    const direction = teamHalf[4] === 'FOR' ? 'for' : 'against';
    return { family: 'goals_by_half', statistic: `team_${period}_goals_${direction}` as GoalStatistic, line: `${teamHalf[2]}.${teamHalf[3]}` };
  }
  const matchHalf = marketKey.match(/^MATCH_(1H|2H)_OVER_([0-9]+)_([0-9]+)_GOALS$/);
  if (matchHalf) return { family: 'goals_by_half', statistic: matchHalf[1] === '1H' ? 'match_1h_goals' : 'match_2h_goals', line: `${matchHalf[2]}.${matchHalf[3]}` };
  return null;
}

function fallbackMarketLabel(statistic: GoalStatistic, line: string) {
  const option = GOAL_STATISTIC_OPTIONS.find((item) => item.value === statistic);
  if (line === 'yes') return option?.label ?? 'Goals';
  if (statistic === 'match_goal_range') return `${line} Goals`;
  const operator = statistic === 'match_goals_under' ? 'Under' : 'Over';
  return `${operator} ${normalizeGoalLine(statistic, line)} ${option?.label.replace(/ Over| Under/u, '') ?? 'Goals'}`;
}

function goalStatisticOptionsForFamily(family: GoalFamily) {
  const allowed = new Set(GOAL_FAMILY_CONFIG[family].statistics);
  return GOAL_STATISTIC_OPTIONS.filter((option) => allowed.has(option.value));
}

function allGoalMarketKeys(family: GoalFamily) {
  return goalStatisticOptionsForFamily(family).flatMap((option) => (
    GOAL_LINES_BY_STATISTIC[option.value].map((line) => resolveGoalMarketKey(option.value, line))
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

function isGoalScope(value: unknown): value is GoalScope {
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
      !isGoalScope(record.scope) ||
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
      !isGoalScope(record.scope) ||
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
      opponent_support_scope: isGoalScope(record.opponent_support_scope) ? record.opponent_support_scope : null,
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

function readSnapgoalNumber(row: TeamMarketProfileRow, key: string) {
  return toFiniteNumber(row[key] as number | string | null | undefined);
}

function toSnapgoalSummary(row: TeamMarketProfileRow, scope: GoalScope): GoalStatSummary | null {
  const sample = readSnapgoalNumber(row, `${scope}_sample`);
  const hits = readSnapgoalNumber(row, `${scope}_hits`);
  const percentage = readSnapgoalNumber(row, `${scope}_percentage`);
  if (sample === null || hits === null || percentage === null) return null;
  return {
    scope,
    sample,
    hits,
    percentage,
    currentStreak: readSnapgoalNumber(row, `current_streak_${scope}`) ?? 0,
    last5Sample: readSnapgoalNumber(row, `last_5_sample_${scope}`),
    last5Hits: readSnapgoalNumber(row, `last_5_hits_${scope}`),
    last5Percentage: readSnapgoalNumber(row, `last_5_percentage_${scope}`),
    last10Sample: readSnapgoalNumber(row, `last_10_sample_${scope}`),
    last10Hits: readSnapgoalNumber(row, `last_10_hits_${scope}`),
    last10Percentage: readSnapgoalNumber(row, `last_10_percentage_${scope}`),
  };
}

function emptyMatchRows(): Record<GoalScope, GoalMatchRow[]> {
  return { overall: [], home: [], away: [] };
}

function matchScopesForViewMode(viewMode: GoalViewMode): GoalScope[] {
  return viewMode === 'homeaway' ? ['home', 'away'] : ['overall'];
}

function toGoalMatchRow(row: TeamMarketMatchEvidenceRow): GoalMatchRow {
  const homeGoals = toFiniteNumber(row.home_value);
  const awayGoals = toFiniteNumber(row.away_value);
  return {
    fixtureId: row.fixture_id,
    date: row.played_at,
    homeTeamId: row.home_team_id,
    homeTeamName: row.home_team_name,
    awayTeamId: row.away_team_id,
    awayTeamName: row.away_team_name,
    homeGoals,
    awayGoals,
    goalScoreLabel: homeGoals === null || awayGoals === null ? null : `${homeGoals} - ${awayGoals}`,
    numericValue: null,
    result: row.result,
  };
}

function groupEvidenceRows(evidenceRows: TeamMarketMatchEvidenceRow[], viewMode: GoalViewMode): GoalTeamEvidenceGroup[] {
  const allowedScopes = new Set(matchScopesForViewMode(viewMode));
  const rowsByTeamScope = new Map<string, GoalMatchRow[]>();
  for (const row of evidenceRows) {
    if (!allowedScopes.has(row.scope)) continue;
    const key = `${row.team_id}:${row.scope}`;
    const currentRows = rowsByTeamScope.get(key) ?? [];
    currentRows.push(toGoalMatchRow(row));
    rowsByTeamScope.set(key, currentRows);
  }
  return [...rowsByTeamScope.entries()].map(([key, rows]) => {
    const [teamId, scope] = key.split(':');
    return { teamId: Number(teamId), scope: scope as GoalScope, rows };
  });
}

function evidenceGroupsToMap(groups: GoalTeamEvidenceGroup[]) {
  return new Map(groups.map((group) => [`${group.teamId}:${group.scope}`, group.rows]));
}

function countReturnedEvidenceRows(groups: GoalTeamEvidenceGroup[]) {
  return groups.reduce((total, group) => total + group.rows.length, 0);
}

function buildGoalsHref(filters: GoalFilters, teamId: number | null) {
  const params = new URLSearchParams();
  params.set('family', filters.family);
  params.set('leagueId', String(filters.leagueId));
  params.set('season', String(filters.season));
  params.set('statistic', filters.statistic);
  params.set('line', filters.line);
  if (filters.viewMode !== 'all') params.set('viewMode', filters.viewMode);
  if (teamId !== null) params.set('teamId', String(teamId));
  else if (filters.teamSearch.trim()) params.set('teamSearch', filters.teamSearch.trim());
  return `${GOAL_FAMILY_CONFIG[filters.family].route}?${params.toString()}`;
}

function toGoalTeamPanel({
  evidenceLoaded,
  filters,
  marketKey,
  marketLabel,
  matchRowsByTeamScope,
  row,
}: {
  evidenceLoaded: boolean;
  filters: GoalFilters;
  marketKey: string;
  marketLabel: string;
  matchRowsByTeamScope: Map<string, GoalMatchRow[]>;
  row: TeamMarketProfileRow;
}): GoalTeamPanel {
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
      overall: toSnapgoalSummary(row, 'overall'),
      home: toSnapgoalSummary(row, 'home'),
      away: toSnapgoalSummary(row, 'away'),
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
    evidenceHref: buildGoalsHref(filters, row.team_id),
    summaryHref: buildGoalsHref({ ...filters, teamSearch: '', teamId: null }, null),
  };
}

function metricFromQuickSnapgoal(row: MarketTeamRankingRow, formWindow: GoalFormWindow): GoalQuickMetric {
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

function opponentMetricFromQuickSnapgoal(row: MarketTeamRankingRow, formWindow: GoalFormWindow): GoalQuickMetric | null {
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

function venueMatchesScope(scope: GoalScope, fixture: GoalNextFixture | null) {
  if (!fixture || scope === 'overall') return true;
  return scope === 'home' ? fixture.isHome : !fixture.isHome;
}

function fixtureMatchesFilter(scope: GoalScope, fixture: GoalNextFixture | null, fixtureFilter: GoalFixtureFilter) {
  if (fixtureFilter === 'all') return true;
  if (!fixture || !venueMatchesScope(scope, fixture)) return false;
  if (fixtureFilter === 'with_fixture') return true;
  const today = formatDateKey(new Date());
  const targets: Record<Exclude<GoalFixtureFilter, 'all' | 'with_fixture'>, string> = {
    today,
    tomorrow: formatDateKey(addDays(new Date(), 1)),
    in_2_days: formatDateKey(addDays(new Date(), 2)),
  };
  return fixture.dateKey === targets[fixtureFilter];
}

function buildDetailedHref(row: { family: GoalFamily; leagueId: number; season: number; teamId: number; marketKey: string }) {
  const params = new URLSearchParams({
    family: row.family,
    teamId: String(row.teamId),
    marketKey: row.marketKey,
    source: 'goals-quick',
    leagueId: String(row.leagueId),
    season: String(row.season),
  });
  return `${GOAL_FAMILY_CONFIG[row.family].route}?${params.toString()}`;
}

function buildComparisonHref(fixtureId: number, marketKey: string) {
  return `/comparison?fixtureId=${fixtureId}&marketKey=${marketKey}&source=goals-quick`;
}

function scopeTitle(scope: GoalScope) {
  if (scope === 'home') return 'Home Matches';
  if (scope === 'away') return 'Away Matches';
  return 'All Matches';
}

export function parseGoalFilters(searchParams: GoalSearchParams | undefined, options: GoalFilterOptions): GoalFilters {
  const marketKeySelection = statisticFromGoalMarketKey(firstParam(searchParams?.marketKey) ?? '');
  const family = marketKeySelection?.family ?? normalizeGoalFamily(firstParam(searchParams?.family) ?? options.family);
  const statistic = marketKeySelection?.statistic ?? parseStatistic(searchParams?.statistic, family);
  const requestedLeagueId = parseInteger(searchParams?.leagueId) ?? options.defaultLeagueId;
  const requestedSeason = parseInteger(searchParams?.season) ?? options.defaultSeason;
  const leagueId = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedLeagueId : options.defaultLeagueId;
  const season = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedSeason : options.defaultSeason;
  return {
    family,
    leagueId,
    season,
    statistic,
    line: normalizeGoalLine(statistic, marketKeySelection?.line ?? firstParam(searchParams?.line)),
    viewMode: parseViewMode(searchParams?.viewMode),
    teamSearch: firstParam(searchParams?.teamSearch)?.trim() ?? '',
    teamId: parseInteger(searchParams?.teamId),
  };
}

export function parseGoalQuickFilters(searchParams: GoalSearchParams | undefined, options: GoalFilterOptions): GoalQuickFilters {
  const marketKeySelection = statisticFromGoalMarketKey(firstParam(searchParams?.marketKey) ?? '');
  const family = marketKeySelection?.family ?? normalizeGoalFamily(firstParam(searchParams?.family) ?? options.family);
  const statistic = marketKeySelection?.statistic ?? parseStatistic(searchParams?.statistic, family);
  const requestedLeagueId = parseInteger(searchParams?.leagueId) ?? options.defaultLeagueId;
  const requestedSeason = parseInteger(searchParams?.season) ?? options.defaultSeason;
  const leagueId = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedLeagueId : options.defaultLeagueId;
  const season = hasLeagueSeason(options, requestedLeagueId, requestedSeason) ? requestedSeason : options.defaultSeason;
  return {
    family,
    leagueId,
    season,
    statistic,
    line: normalizeGoalLine(statistic, marketKeySelection?.line ?? firstParam(searchParams?.line)),
    teamSearch: firstParam(searchParams?.teamSearch)?.trim() ?? '',
    formWindow: parseFormWindow(searchParams?.formWindow),
    fixtureFilter: parseFixtureFilter(searchParams?.fixtureFilter),
    minSample: (parseInteger(searchParams?.minSample) ?? 0) >= 4 ? 4 : 0,
  };
}

const loadMarketDefinition = unstable_cache(async (marketKey: string) => {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('market_definitions')
    .select('key, label, is_active')
    .eq('key', marketKey)
    .eq('category', 'goals')
    .maybeSingle();
  if (error) throw new Error(`Failed to load goal market definition: ${error.message}`);
  return toMarketDefinitionRows(data ? [data] : [])[0] ?? null;
}, ['goal-market-definition'], { revalidate: 300 });

async function loadGoalFilterOptionsUncached(family: GoalFamily): Promise<GoalFilterOptions> {
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
      .in('key', allGoalMarketKeys(family))
      .eq('category', 'goals')
      .eq('family', family),
  ]);
  if (supportedError) throw new Error(`Failed to load goal league options: ${supportedError.message}`);
  if (marketError) throw new Error(`Failed to load goal market options: ${marketError.message}`);

  const supportedRows = toSupportedRows((supportedData ?? []) as unknown[]);
  if (supportedRows.length === 0) throw new Error('No supported leagues configured.');

  const leagueIds = [...new Set(supportedRows.map((row) => row.leagueId))];
  const { data: leagueData, error: leagueError } = await supabaseAdmin
    .from('leagues')
    .select('id, name, logo_url')
    .in('id', leagueIds);
  if (leagueError) throw new Error(`Failed to load goal leagues: ${leagueError.message}`);

  const leaguesById = new Map(toLeagueRows((leagueData ?? []) as unknown[]).map((league) => [league.id, league]));
  const activeKeys = new Set(toMarketDefinitionRows((marketData ?? []) as unknown[]).filter((row) => row.is_active).map((row) => row.key));
  const familyStatisticOptions = goalStatisticOptionsForFamily(family);
  const linesByStatistic = Object.fromEntries(
    familyStatisticOptions.map((option) => [
      option.value,
      GOAL_LINES_BY_STATISTIC[option.value].filter((line) => activeKeys.has(resolveGoalMarketKey(option.value, line))),
    ]),
  ) as Record<GoalStatistic, string[]>;

  for (const option of familyStatisticOptions) {
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
    family,
    defaultLeagueId: leagueSeasons[0].leagueId,
    defaultSeason: leagueSeasons[0].season,
    leagueSeasons,
    linesByStatistic,
    statistics: familyStatisticOptions,
  };
}

export const loadGoalFilterOptions = unstable_cache(
  async (family: GoalFamily = 'match_totals') => loadGoalFilterOptionsUncached(family),
  ['goal-filter-options'],
  { revalidate: 300 },
);

const loadGoalProfileSnapgoalRows = unstable_cache(
  async (marketKey: string, leagueId: number, season: number, teamId: number | null, teamSearch: string) => {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('team_market_profiles')
      .select(TEAM_MARKET_PROFILE_SELECT)
      .eq('category', 'goals')
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
      .limit(MAX_GOAL_TEAM_PANELS);

    if (error) {
      throw new Error(`Failed to load goal Market Serving Layer profiles. Run rebuild_market_serving_layer.py --category goals. Supabase: ${error.message}`);
    }

    return toProfileRows((data ?? []) as unknown[]);
  },
  ['goal-profile-snapgoal-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

const loadGoalEvidenceSnapgoalRows = unstable_cache(
  async (marketKey: string, leagueId: number, season: number, viewMode: GoalViewMode, teamIdsKey: string) => {
    const teamIds = teamIdsKey
      .split(',')
      .map((item) => Number(item))
      .filter((teamId) => Number.isInteger(teamId) && teamId > 0);
    if (teamIds.length === 0) return [];

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('team_market_match_evidence')
      .select(TEAM_MARKET_EVIDENCE_SELECT)
      .eq('category', 'goals')
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .in('team_id', teamIds)
      .in('scope', matchScopesForViewMode(viewMode))
      .order('team_id', { ascending: true })
      .order('scope', { ascending: true })
      .order('played_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load goal Market Serving Layer evidence. Run rebuild_market_serving_layer.py --category goals. Supabase: ${error.message}`);
    }

    return toEvidenceRows((data ?? []) as unknown[]);
  },
  ['goal-evidence-snapgoal-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

const loadGoalQuickRankingSnapgoalRows = unstable_cache(
  async (marketKey: string, leagueId: number, season: number) => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('market_team_rankings')
      .select(MARKET_TEAM_RANKING_SELECT)
      .eq('category', 'goals')
      .eq('market_key', marketKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .in('scope', SCOPES)
      .order('rank', { ascending: true });

    if (error) {
      throw new Error(`Failed to load goal quick Market Serving Layer. Run rebuild_market_serving_layer.py --category goals. Supabase: ${error.message}`);
    }

    return toRankingRows((data ?? []) as unknown[]);
  },
  ['goal-quick-ranking-snapgoal-rows'],
  { revalidate: MARKET_SERVING_CACHE_SECONDS },
);

export async function loadGoalMatchEvidence(
  filters: GoalFilters,
  teamIds: number[],
): Promise<{ result: GoalMatchEvidenceResult; timing: GoalDetailTiming }> {
  const startedAt = Date.now();
  const marketKey = resolveGoalMarketKey(filters.statistic, filters.line);
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
  const evidenceRows = await loadGoalEvidenceSnapgoalRows(
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

export async function loadGoalTeamPanelsWithTiming(
  filters: GoalFilters,
  options: { includeEvidence?: boolean } = {},
): Promise<{ result: GoalDetailResult; timing: GoalDetailTiming }> {
  const startedAt = Date.now();
  const marketKey = resolveGoalMarketKey(filters.statistic, filters.line);
  const includeEvidence = options.includeEvidence === true;
  const profileStartedAt = Date.now();
  const [marketDefinition, profileRows] = await Promise.all([
    loadMarketDefinition(marketKey),
    loadGoalProfileSnapgoalRows(marketKey, filters.leagueId, filters.season, filters.teamId, filters.teamSearch.trim()),
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

  let evidenceGroups: GoalTeamEvidenceGroup[] = [];
  let dbEvidenceMs = 0;
  let evidenceRowCount = 0;
  let returnedEvidenceRowCount = 0;

  if (includeEvidence) {
    const evidence = await loadGoalMatchEvidence(filters, profileRows.map((row) => row.team_id));
    evidenceGroups = evidence.result.groups;
    dbEvidenceMs = evidence.timing.dbEvidenceMs;
    evidenceRowCount = evidence.timing.evidenceRowCount;
    returnedEvidenceRowCount = evidence.timing.returnedEvidenceRowCount;
  }

  const matchRowsByTeamScope = evidenceGroupsToMap(evidenceGroups);
  const panels = profileRows.map((row) => toGoalTeamPanel({
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

export async function loadGoalTeamPanels(filters: GoalFilters): Promise<GoalDetailResult> {
  const { result } = await loadGoalTeamPanelsWithTiming(filters);
  return result;
}

export async function loadGoalQuickScanner(filters: GoalQuickFilters): Promise<GoalQuickResult> {
  const { result } = await loadGoalQuickScannerWithTiming(filters);
  return result;
}

export async function loadGoalQuickScannerWithTiming(
  filters: GoalQuickFilters,
): Promise<{ result: GoalQuickResult; timing: GoalQuickTiming }> {
  const startedAt = Date.now();
  const marketKey = resolveGoalMarketKey(filters.statistic, filters.line);
  const dbStartedAt = Date.now();
  const [marketDefinition, snapgoalRows] = await Promise.all([
    loadMarketDefinition(marketKey),
    loadGoalQuickRankingSnapgoalRows(marketKey, filters.leagueId, filters.season),
  ]);
  const dbMs = Date.now() - dbStartedAt;
  const transformStartedAt = Date.now();
  const marketLabel = marketDefinition?.label ?? fallbackMarketLabel(filters.statistic, filters.line);
  const normalizedSearch = filters.teamSearch.trim().toLowerCase();
  const columns: GoalQuickColumn[] = SCOPES.map((scope) => {
    const rows = snapgoalRows
      .filter((row) => row.scope === scope)
      .flatMap((row) => {
        if (normalizedSearch && !row.team_name.toLowerCase().includes(normalizedSearch)) return [];
        const metric = metricFromQuickSnapgoal(row, filters.formWindow);
        if (metric.sample < filters.minSample) return [];

        const nextFixture = row.next_fixture_id !== null && row.next_fixture_date !== null && row.next_opponent_team_id !== null && row.next_opponent_name !== null && row.next_venue_scope !== null
          ? {
            fixtureId: row.next_fixture_id,
            opponentTeamId: row.next_opponent_team_id,
            opponentName: row.next_opponent_name,
            isHome: row.next_venue_scope === 'home',
            date: row.next_fixture_date,
            dateKey: formatDateKey(new Date(row.next_fixture_date)),
          } satisfies GoalNextFixture
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
          opponentSupport: opponentMetricFromQuickSnapgoal(row, filters.formWindow),
          opponentSupportScope: row.opponent_support_scope,
          fixtureContextMismatch: nextFixture !== null && !venueMatchesScope(scope, nextFixture),
          detailedHref: buildDetailedHref({ family: filters.family, leagueId: row.league_id, season: row.season, teamId: row.team_id, marketKey }),
          comparisonHref: nextFixture ? buildComparisonHref(nextFixture.fixtureId, marketKey) : null,
        } satisfies GoalQuickRow];
      })
      .sort((left, right) => (
        (right.metric.percentage ?? -1) - (left.metric.percentage ?? -1) ||
        right.metric.hits - left.metric.hits ||
        right.metric.sample - left.metric.sample ||
        left.teamName.localeCompare(right.teamName)
      ))
      .slice(0, QUICK_RESULT_LIMIT_PER_SCOPE);

    return { scope, title: scopeTitle(scope), rows };
  });

  return {
    result: {
      marketKey,
      marketLabel,
      marketAvailable: marketDefinition?.is_active === true,
      columns,
    },
    timing: {
      dbMs,
      transformMs: Date.now() - transformStartedAt,
      totalMs: Date.now() - startedAt,
      rowCount: snapgoalRows.length,
    },
  };
}
