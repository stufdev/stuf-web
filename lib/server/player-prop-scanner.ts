import 'server-only';

import { unstable_cache } from 'next/cache';
import { getSupportedLeagueIds } from './league-config';
import { getSupabaseAdmin } from './supabase-admin';
import {
  EMERGING_MIN_SAMPLE,
  MAIN_RANKING_MIN_SAMPLE,
  HIGH_CONFIDENCE_MIN_SAMPLE,
  parseMainRankingFloor,
} from './sample-bands';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type PropScope = 'overall' | 'home' | 'away';
export type PropCategory = 'attacking' | 'shots' | 'cards' | 'fouls' | 'tackles' | 'fouled';

export type PlayerPropSearchParams = Record<string, string | string[] | undefined>;

export type PlayerPropFilters = {
  leagueId: number;
  season: number;
  propKey: string;
  scope: PropScope;
  minPercentage: number;
  minMatches: number;
  playerSearch: string;
  upcomingOnly: boolean;
};

export type PlayerPropDefinition = {
  key: string;
  category: PropCategory;
  family: string | null;
  label: string;
  metric: string;
  operator: string;
  line: number | null;
  displayOrder: number;
  isActive: boolean;
};

export type PlayerPropLeagueSeasonOption = {
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
};

export type PlayerPropFilterOptions = {
  defaultLeagueId: number;
  defaultSeason: number;
  leagueSeasons: PlayerPropLeagueSeasonOption[];
  propsByCategory: Record<PropCategory, PlayerPropDefinition[]>;
  defaultPropKey: string;
};

export type PlayerPropRankingRow = {
  propKey: string;
  leagueId: number;
  season: number;
  scope: PropScope;
  playerId: number;
  playerName: string | null;
  playerPhotoUrl: string | null;
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  leagueName: string;
  leagueLogoUrl: string | null;
  sample: number;
  hits: number;
  percentage: number | null;
  currentStreak: number;
  longestStreak: number;
  last5Sample: number | null;
  last5Hits: number | null;
  last5Percentage: number | null;
  last10Sample: number | null;
  last10Hits: number | null;
  last10Percentage: number | null;
  rank: number;
  // P0 band markers. `highConfidence` = sample ≥ 15 (eligible for stronger marker).
  // The main-vs-emerging split is conveyed by which result array a row lands in.
  highConfidence: boolean;
  nextFixtureId: number | null;
  nextFixtureDate: string | null;
  nextOpponentTeamId: number | null;
  nextOpponentName: string | null;
  nextVenueScope: 'home' | 'away' | null;
};

export type PlayerPropEvidenceRow = {
  propKey: string;
  leagueId: number;
  season: number;
  playerId: number;
  playerName: string | null;
  teamId: number;
  teamName: string;
  fixtureId: number;
  playedAt: string;
  opponentTeamId: number | null;
  opponentName: string | null;
  venueScope: PropScope;
  starter: boolean | null;
  minutes: number | null;
  numericValue: number | null;
  result: boolean;
  // Full per-match stat line, enriched from canonical player_fixture_stats.
  // null = no canonical stat row matched this fixture (do not treat as 0).
  goals: number | null;
  assists: number | null;
  totalShots: number | null;
  shotsOnTarget: number | null;
  offsides: number | null;
  tackles: number | null;
  foulsCommitted: number | null;
  foulsDrawn: number | null;
};

export type PlayerPropRankingResult = {
  propKey: string;
  propLabel: string;
  propAvailable: boolean;
  scope: PropScope;
  // Main ranking: sample ≥ 10 only (P0 main-ranking floor).
  rows: PlayerPropRankingRow[];
  // Emerging / low-sample: sample 5–9, shown separately with a warning. Never mixed into `rows`.
  emergingRows: PlayerPropRankingRow[];
};

export type PlayerPropEvidenceResult = {
  propKey: string;
  propLabel: string;
  playerId: number;
  playerName: string | null;
  rows: PlayerPropEvidenceRow[];
};

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const PROP_CACHE_SECONDS = 60;
// The DB query is already tightly scoped by (prop_key, league_id, season, scope),
// so the natural population is one row per eligible player-team in a single league
// (~700 max). A cap above that population means the in-memory filters
// (minPercentage, minMatches, player/team search) see the COMPLETE candidate set
// rather than only the pre-computed top 200 by rank. Previously the hard 200 cap
// ran BEFORE those filters, hiding any valid player ranked >200 from search and
// percentage filters. Keep this above the natural single-scope population.
const MAX_RANKING_ROWS = 1000;

// Removed: V1_LEAGUE_IDS hardcoded array. Use getSupportedLeagueIds() dynamically.

export const PROP_CATEGORIES: PropCategory[] = ['attacking', 'shots', 'cards', 'fouls', 'tackles', 'fouled'];

const PROP_RANKING_SELECT = [
  'prop_key',
  'league_id',
  'season',
  'scope',
  'player_id',
  'player_name',
  'player_photo_url',
  'team_id',
  'team_name',
  'team_logo_url',
  'league_name',
  'league_logo_url',
  'sample',
  'hits',
  'percentage',
  'current_streak',
  'longest_streak',
  'last_5_sample',
  'last_5_hits',
  'last_5_percentage',
  'last_10_sample',
  'last_10_hits',
  'last_10_percentage',
  'rank',
  'next_fixture_id',
  'next_fixture_date',
  'next_opponent_team_id',
  'next_opponent_name',
  'next_venue_scope',
].join(', ');

const PROP_EVIDENCE_SELECT = [
  'prop_key',
  'league_id',
  'season',
  'player_id',
  'player_name',
  'team_id',
  'team_name',
  'fixture_id',
  'played_at',
  'opponent_team_id',
  'opponent_name',
  'venue_scope',
  'starter',
  'minutes',
  'numeric_value',
  'result',
].join(', ');

// ──────────────────────────────────────────────────────────────────────────────
// Parse helpers
// ──────────────────────────────────────────────────────────────────────────────

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseInteger(value: string | string[] | undefined): number | null {
  const parsed = Number.parseInt(firstParam(value) ?? '', 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseScope(value: string | string[] | undefined): PropScope {
  const raw = firstParam(value);
  if (raw === 'home' || raw === 'away') return raw;
  return 'overall';
}

function isScope(value: unknown): value is PropScope {
  return value === 'overall' || value === 'home' || value === 'away';
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasLeagueSeason(options: PlayerPropFilterOptions, leagueId: number, season: number): boolean {
  return options.leagueSeasons.some((item) => item.leagueId === leagueId && item.season === season);
}

// ──────────────────────────────────────────────────────────────────────────────
// Filter parsing (exposed for server pages)
// ──────────────────────────────────────────────────────────────────────────────

export function parsePlayerPropFilters(
  searchParams: PlayerPropSearchParams | undefined,
  options: PlayerPropFilterOptions,
): PlayerPropFilters {
  const requestedLeagueId = parseInteger(searchParams?.leagueId) ?? options.defaultLeagueId;
  const requestedSeason = parseInteger(searchParams?.season) ?? options.defaultSeason;
  const leagueId = hasLeagueSeason(options, requestedLeagueId, requestedSeason)
    ? requestedLeagueId
    : options.defaultLeagueId;
  const season = hasLeagueSeason(options, requestedLeagueId, requestedSeason)
    ? requestedSeason
    : options.defaultSeason;

  const allPropKeys = new Set(
    Object.values(options.propsByCategory).flatMap((props) => props.map((p) => p.key)),
  );
  const requestedPropKey = firstParam(searchParams?.propKey) ?? options.defaultPropKey;
  const propKey = allPropKeys.has(requestedPropKey) ? requestedPropKey : options.defaultPropKey;

  const upcomingOnlyRaw = firstParam(searchParams?.upcomingOnly);
  return {
    leagueId,
    season,
    propKey,
    scope: parseScope(searchParams?.scope),
    minPercentage: Math.max(0, Math.min(100, parseInteger(searchParams?.minPercentage) ?? 0)),
    // Raise-only main-ranking floor (10 / 15 / 20). Never drops below the P0 floor of 10.
    minMatches: parseMainRankingFloor(parseInteger(searchParams?.minMatches)),
    playerSearch: firstParam(searchParams?.playerSearch)?.trim() ?? '',
    // Season Review default: show all historical rankings; user opts INTO upcoming-only view.
    upcomingOnly: upcomingOnlyRaw === 'true' ? true : false,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Row converters
// ──────────────────────────────────────────────────────────────────────────────

type RawPropDef = {
  key: string;
  category: PropCategory;
  family: string | null;
  label: string;
  metric: string;
  operator: string;
  line: number | null;
  display_order: number;
  is_active: boolean;
};

type RawRankingRow = {
  prop_key: string;
  league_id: number;
  season: number;
  scope: PropScope;
  player_id: number;
  player_name: string | null;
  player_photo_url: string | null;
  team_id: number;
  team_name: string;
  team_logo_url: string | null;
  league_name: string;
  league_logo_url: string | null;
  sample: number;
  hits: number;
  percentage: number | string | null;
  current_streak: number;
  longest_streak: number;
  last_5_sample: number | null;
  last_5_hits: number | null;
  last_5_percentage: number | string | null;
  last_10_sample: number | null;
  last_10_hits: number | null;
  last_10_percentage: number | string | null;
  rank: number;
  next_fixture_id: number | null;
  next_fixture_date: string | null;
  next_opponent_team_id: number | null;
  next_opponent_name: string | null;
  next_venue_scope: 'home' | 'away' | null;
};

type RawEvidenceRow = {
  prop_key: string;
  league_id: number;
  season: number;
  player_id: number;
  player_name: string | null;
  team_id: number;
  team_name: string;
  fixture_id: number;
  played_at: string;
  opponent_team_id: number | null;
  opponent_name: string | null;
  venue_scope: PropScope;
  starter: boolean | null;
  minutes: number | null;
  numeric_value: number | null;
  result: boolean;
};

function toPropDefs(rows: unknown[]): RawPropDef[] {
  return rows.flatMap((row) => {
    const r = row as Partial<RawPropDef>;
    if (
      typeof r.key !== 'string' ||
      typeof r.category !== 'string' ||
      typeof r.label !== 'string' ||
      typeof r.metric !== 'string' ||
      typeof r.operator !== 'string' ||
      typeof r.is_active !== 'boolean'
    ) return [];
    return [{
      key: r.key,
      category: r.category as PropCategory,
      family: typeof r.family === 'string' ? r.family : null,
      label: r.label,
      metric: r.metric,
      operator: r.operator,
      line: toFiniteNumber(r.line),
      display_order: typeof r.display_order === 'number' ? r.display_order : 0,
      is_active: r.is_active,
    }];
  });
}

function toRankingRows(rows: unknown[]): RawRankingRow[] {
  return rows.flatMap((row) => {
    const r = row as Partial<RawRankingRow>;
    if (
      typeof r.prop_key !== 'string' ||
      typeof r.league_id !== 'number' ||
      typeof r.season !== 'number' ||
      !isScope(r.scope) ||
      typeof r.player_id !== 'number' ||
      typeof r.team_id !== 'number' ||
      typeof r.team_name !== 'string' ||
      typeof r.sample !== 'number' ||
      typeof r.hits !== 'number' ||
      typeof r.rank !== 'number'
    ) return [];
    return [{
      prop_key: r.prop_key,
      league_id: r.league_id,
      season: r.season,
      scope: r.scope,
      player_id: r.player_id,
      player_name: typeof r.player_name === 'string' ? r.player_name : null,
      player_photo_url: typeof r.player_photo_url === 'string' ? r.player_photo_url : null,
      team_id: r.team_id,
      team_name: r.team_name,
      team_logo_url: typeof r.team_logo_url === 'string' ? r.team_logo_url : null,
      league_name: typeof r.league_name === 'string' ? r.league_name : `League ${r.league_id}`,
      league_logo_url: typeof r.league_logo_url === 'string' ? r.league_logo_url : null,
      sample: r.sample,
      hits: r.hits,
      percentage: r.percentage ?? null,
      current_streak: typeof r.current_streak === 'number' ? r.current_streak : 0,
      longest_streak: typeof r.longest_streak === 'number' ? r.longest_streak : 0,
      last_5_sample: typeof r.last_5_sample === 'number' ? r.last_5_sample : null,
      last_5_hits: typeof r.last_5_hits === 'number' ? r.last_5_hits : null,
      last_5_percentage: r.last_5_percentage ?? null,
      last_10_sample: typeof r.last_10_sample === 'number' ? r.last_10_sample : null,
      last_10_hits: typeof r.last_10_hits === 'number' ? r.last_10_hits : null,
      last_10_percentage: r.last_10_percentage ?? null,
      rank: r.rank,
      next_fixture_id: typeof r.next_fixture_id === 'number' ? r.next_fixture_id : null,
      next_fixture_date: typeof r.next_fixture_date === 'string' ? r.next_fixture_date : null,
      next_opponent_team_id: typeof r.next_opponent_team_id === 'number' ? r.next_opponent_team_id : null,
      next_opponent_name: typeof r.next_opponent_name === 'string' ? r.next_opponent_name : null,
      next_venue_scope: r.next_venue_scope === 'home' || r.next_venue_scope === 'away' ? r.next_venue_scope : null,
    }];
  });
}

function toEvidenceRows(rows: unknown[]): RawEvidenceRow[] {
  return rows.flatMap((row) => {
    const r = row as Partial<RawEvidenceRow>;
    if (
      typeof r.prop_key !== 'string' ||
      typeof r.player_id !== 'number' ||
      typeof r.team_id !== 'number' ||
      typeof r.team_name !== 'string' ||
      typeof r.fixture_id !== 'number' ||
      typeof r.played_at !== 'string' ||
      !isScope(r.venue_scope) ||
      typeof r.result !== 'boolean'
    ) return [];
    return [{
      prop_key: r.prop_key,
      league_id: typeof r.league_id === 'number' ? r.league_id : 0,
      season: typeof r.season === 'number' ? r.season : 0,
      player_id: r.player_id,
      player_name: typeof r.player_name === 'string' ? r.player_name : null,
      team_id: r.team_id,
      team_name: r.team_name,
      fixture_id: r.fixture_id,
      played_at: r.played_at,
      opponent_team_id: typeof r.opponent_team_id === 'number' ? r.opponent_team_id : null,
      opponent_name: typeof r.opponent_name === 'string' ? r.opponent_name : null,
      venue_scope: r.venue_scope,
      starter: typeof r.starter === 'boolean' ? r.starter : null,
      minutes: typeof r.minutes === 'number' ? r.minutes : null,
      numeric_value: toFiniteNumber(r.numeric_value),
      result: r.result,
    }];
  });
}

function rawToRankingRow(r: RawRankingRow): PlayerPropRankingRow {
  return {
    propKey: r.prop_key,
    leagueId: r.league_id,
    season: r.season,
    scope: r.scope,
    playerId: r.player_id,
    playerName: r.player_name,
    playerPhotoUrl: r.player_photo_url,
    teamId: r.team_id,
    teamName: r.team_name,
    teamLogoUrl: r.team_logo_url,
    leagueName: r.league_name,
    leagueLogoUrl: r.league_logo_url,
    sample: r.sample,
    hits: r.hits,
    percentage: toFiniteNumber(r.percentage),
    currentStreak: r.current_streak,
    longestStreak: r.longest_streak,
    last5Sample: r.last_5_sample,
    last5Hits: r.last_5_hits,
    last5Percentage: toFiniteNumber(r.last_5_percentage),
    last10Sample: r.last_10_sample,
    last10Hits: r.last_10_hits,
    last10Percentage: toFiniteNumber(r.last_10_percentage),
    rank: r.rank,
    highConfidence: r.sample >= HIGH_CONFIDENCE_MIN_SAMPLE,
    nextFixtureId: r.next_fixture_id,
    nextFixtureDate: r.next_fixture_date,
    nextOpponentTeamId: r.next_opponent_team_id,
    nextOpponentName: r.next_opponent_name,
    nextVenueScope: r.next_venue_scope,
  };
}

function rawToEvidenceRow(r: RawEvidenceRow): PlayerPropEvidenceRow {
  return {
    propKey: r.prop_key,
    leagueId: r.league_id,
    season: r.season,
    playerId: r.player_id,
    playerName: r.player_name,
    teamId: r.team_id,
    teamName: r.team_name,
    fixtureId: r.fixture_id,
    playedAt: r.played_at,
    opponentTeamId: r.opponent_team_id,
    opponentName: r.opponent_name,
    venueScope: r.venue_scope,
    starter: r.starter,
    minutes: r.minutes,
    numericValue: r.numeric_value,
    result: r.result,
    // Stat-line fields default to null here; enriched from canonical below.
    goals: null,
    assists: null,
    totalShots: null,
    shotsOnTarget: null,
    offsides: null,
    tackles: null,
    foulsCommitted: null,
    foulsDrawn: null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Filter options loader
// ──────────────────────────────────────────────────────────────────────────────

async function loadPlayerPropFilterOptionsUncached(): Promise<PlayerPropFilterOptions> {
  const supabaseAdmin = getSupabaseAdmin();

  const [{ data: supportedData, error: supportedError }, { data: propData, error: propError }] =
    await Promise.all([
      getSupportedLeagueIds('comparison').then(async (comparisonLeagueIds) => {
        return supabaseAdmin
          .from('supported_leagues')
          .select('league_id, season')
          .eq('is_active', true)
          .eq('enabled_for_comparison', true)
          .in('league_id', comparisonLeagueIds)
          .order('display_order', { ascending: true })
          .order('league_id', { ascending: true })
          .order('season', { ascending: false });
      }),
      supabaseAdmin
        .from('player_prop_definitions')
        .select('key, category, family, label, metric, operator, line, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]);

  if (supportedError) throw new Error(`Failed to load player prop league options: ${supportedError.message}`);
  if (propError) throw new Error(`Failed to load player prop definitions: ${propError.message}`);

  const supportedRows = (supportedData ?? []) as Array<{ league_id: number; season: number }>;
  if (supportedRows.length === 0) throw new Error('No supported leagues configured for player props.');

  const leagueIds = [...new Set(supportedRows.map((r) => r.league_id))];
  const { data: leagueData, error: leagueError } = await supabaseAdmin
    .from('leagues')
    .select('id, name, logo_url')
    .in('id', leagueIds);
  if (leagueError) throw new Error(`Failed to load leagues: ${leagueError.message}`);

  const leaguesById = new Map(
    ((leagueData ?? []) as Array<{ id: number; name: string; logo_url: string | null }>).map(
      (l) => [l.id, l],
    ),
  );

  const leagueSeasons: PlayerPropLeagueSeasonOption[] = supportedRows.map((r) => {
    const league = leaguesById.get(r.league_id);
    return {
      leagueId: r.league_id,
      leagueName: league?.name ?? `League ${r.league_id}`,
      leagueLogoUrl: league?.logo_url ?? null,
      season: r.season,
    };
  });

  const propDefs = toPropDefs((propData ?? []) as unknown[]);
  const propsByCategory: Record<PropCategory, PlayerPropDefinition[]> = {
    attacking: [],
    shots: [],
    cards: [],
    fouls: [],
    tackles: [],
    fouled: [],
  };

  for (const def of propDefs) {
    const cat = def.category;
    if (cat in propsByCategory) {
      propsByCategory[cat].push({
        key: def.key,
        category: def.category,
        family: def.family,
        label: def.label,
        metric: def.metric,
        operator: def.operator,
        line: def.line,
        displayOrder: def.display_order,
        isActive: def.is_active,
      });
    }
  }

  const defaultPropKey = propDefs[0]?.key ?? 'PLAYER_SCORED';

  return {
    defaultLeagueId: leagueSeasons[0].leagueId,
    defaultSeason: leagueSeasons[0].season,
    leagueSeasons,
    propsByCategory,
    defaultPropKey,
  };
}

export const loadPlayerPropFilterOptions = unstable_cache(
  loadPlayerPropFilterOptionsUncached,
  ['player-prop-filter-options'],
  { revalidate: 300 },
);

// ──────────────────────────────────────────────────────────────────────────────
// Rankings loader
// ──────────────────────────────────────────────────────────────────────────────

const loadPlayerPropRankingSnapshotRows = unstable_cache(
  async (propKey: string, leagueId: number, season: number, scope: PropScope, upcomingOnly: boolean) => {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('player_prop_rankings')
      .select(PROP_RANKING_SELECT)
      .eq('prop_key', propKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .eq('scope', scope)
      // P0 noise floor pushed to the DB: drop sub-5-appearance rows before the
      // limit so the cap is never spent on noise the UI would discard anyway.
      .gte('sample', EMERGING_MIN_SAMPLE);

    if (upcomingOnly) {
      query = query.not('next_fixture_id', 'is', null);
    }

    const { data, error } = await query
      .order('rank', { ascending: true })
      .limit(MAX_RANKING_ROWS);

    if (error) {
      throw new Error(
        `Failed to load player prop rankings. Run rebuild_player_prop_engine.py. Supabase: ${error.message}`,
      );
    }

    return toRankingRows((data ?? []) as unknown[]);
  },
  ['player-prop-ranking-rows'],
  { revalidate: PROP_CACHE_SECONDS },
);

// ──────────────────────────────────────────────────────────────────────────────
// Evidence loader
// ──────────────────────────────────────────────────────────────────────────────

const loadPlayerPropEvidenceSnapshotRows = unstable_cache(
  async (propKey: string, leagueId: number, season: number, playerId: number, teamId: number) => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('player_prop_match_evidence')
      .select(PROP_EVIDENCE_SELECT)
      .eq('prop_key', propKey)
      .eq('league_id', leagueId)
      .eq('season', season)
      .eq('player_id', playerId)
      .eq('team_id', teamId)
      .order('played_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(
        `Failed to load player prop evidence. Run rebuild_player_prop_engine.py. Supabase: ${error.message}`,
      );
    }

    return toEvidenceRows((data ?? []) as unknown[]);
  },
  ['player-prop-evidence-rows'],
  { revalidate: PROP_CACHE_SECONDS },
);

// ──────────────────────────────────────────────────────────────────────────────
// Canonical stat-line loader (for evidence enrichment)
// ──────────────────────────────────────────────────────────────────────────────

type FixtureStatLine = {
  fixtureId: number;
  goals: number | null;
  assists: number | null;
  totalShots: number | null;
  shotsOnTarget: number | null;
  offsides: number | null;
  tackles: number | null;
  foulsCommitted: number | null;
  foulsDrawn: number | null;
};

const STAT_LINE_SELECT = [
  'fixture_id',
  'goals',
  'assists',
  'total_shots',
  'shots_on_target',
  'offsides',
  'tackles',
  'fouls_committed',
  'fouls_drawn',
].join(', ');

// Reads the full per-match stat line from canonical player_fixture_stats for one
// player+team+season. Bounded to a single player's season (~38 rows). Applies the
// canonical sample rule (minutes > 0). Returns a plain array (unstable_cache uses
// JSON serialization, so a Map cannot be cached) keyed by fixture_id at the call
// site so the evidence rows (whose prop-truth comes from the engine) can be
// enriched without recomputing any hit/miss logic in the request path.
const loadPlayerFixtureStatLines = unstable_cache(
  async (leagueId: number, season: number, playerId: number, teamId: number): Promise<FixtureStatLine[]> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('player_fixture_stats')
      .select(STAT_LINE_SELECT)
      .eq('league_id', leagueId)
      .eq('season', season)
      .eq('player_id', playerId)
      .eq('team_id', teamId)
      .gt('minutes', 0);

    if (error) {
      throw new Error(`Failed to load player fixture stat lines. Supabase: ${error.message}`);
    }

    const lines: FixtureStatLine[] = [];
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const fixtureId = typeof row.fixture_id === 'number' ? row.fixture_id : null;
      if (fixtureId === null) continue;
      lines.push({
        fixtureId,
        goals: toFiniteNumber(row.goals as number | null),
        assists: toFiniteNumber(row.assists as number | null),
        totalShots: toFiniteNumber(row.total_shots as number | null),
        shotsOnTarget: toFiniteNumber(row.shots_on_target as number | null),
        offsides: toFiniteNumber(row.offsides as number | null),
        tackles: toFiniteNumber(row.tackles as number | null),
        foulsCommitted: toFiniteNumber(row.fouls_committed as number | null),
        foulsDrawn: toFiniteNumber(row.fouls_drawn as number | null),
      });
    }
    return lines;
  },
  ['player-fixture-stat-lines'],
  { revalidate: PROP_CACHE_SECONDS },
);

// ──────────────────────────────────────────────────────────────────────────────
// Public data-loading functions
// ──────────────────────────────────────────────────────────────────────────────

export type PlayerPropRankingTiming = {
  dbMs: number;
  transformMs: number;
  totalMs: number;
  rowCount: number;
};

export async function loadPlayerPropRankingsWithTiming(
  filters: PlayerPropFilters,
): Promise<{ result: PlayerPropRankingResult; timing: PlayerPropRankingTiming }> {
  const startedAt = Date.now();
  const dbStartedAt = Date.now();

  const [options, rawRows] = await Promise.all([
    loadPlayerPropFilterOptions(),
    loadPlayerPropRankingSnapshotRows(
      filters.propKey,
      filters.leagueId,
      filters.season,
      filters.scope,
      filters.upcomingOnly,
    ),
  ]);
  const dbMs = Date.now() - dbStartedAt;

  const allPropDefs = Object.values(options.propsByCategory).flat();
  const propDef = allPropDefs.find((p) => p.key === filters.propKey);

  const transformStartedAt = Date.now();
  const normalizedSearch = filters.playerSearch.trim().toLowerCase();
  const filtered = rawRows.filter((row) => {
    // P0 hard floor: sample < 5 is never promoted as a signal (noise band).
    // This is a product standard; user filters can only raise it, never lower it.
    // The raise-only main floor (filters.minMatches) is applied at the band split
    // below so it raises the main ranking without removing the 5–9 emerging band.
    if (row.sample < EMERGING_MIN_SAMPLE) return false;
    if (filters.minPercentage > 0) {
      const pct = toFiniteNumber(row.percentage) ?? 0;
      if (pct < filters.minPercentage) return false;
    }
    if (normalizedSearch) {
      const name = (row.player_name ?? '').toLowerCase();
      const team = row.team_name.toLowerCase();
      if (!name.includes(normalizedSearch) && !team.includes(normalizedSearch)) return false;
    }
    return true;
  });

  // Split into bands and re-rank within each (DB rank is over the full unbanded set).
  const mapped = filtered.map(rawToRankingRow);
  // Main ranking honours the raise-only floor (>= 10, optionally 15 / 20).
  const mainFloor = Math.max(MAIN_RANKING_MIN_SAMPLE, filters.minMatches);
  const rows = mapped
    .filter((row) => row.sample >= mainFloor)
    .map((row, i) => ({ ...row, rank: i + 1 }));
  // Emerging band is fixed at 5–9 and stays visible regardless of the raised floor.
  const emergingRows = mapped
    .filter((row) => row.sample >= EMERGING_MIN_SAMPLE && row.sample < MAIN_RANKING_MIN_SAMPLE)
    .map((row, i) => ({ ...row, rank: i + 1 }));
  const transformMs = Date.now() - transformStartedAt;

  return {
    result: {
      propKey: filters.propKey,
      propLabel: propDef?.label ?? filters.propKey,
      propAvailable: propDef?.isActive === true,
      scope: filters.scope,
      rows,
      emergingRows,
    },
    timing: {
      dbMs,
      transformMs,
      totalMs: Date.now() - startedAt,
      rowCount: rawRows.length,
    },
  };
}

export async function loadPlayerPropRankings(
  filters: PlayerPropFilters,
): Promise<PlayerPropRankingResult> {
  const { result } = await loadPlayerPropRankingsWithTiming(filters);
  return result;
}

export async function loadPlayerPropEvidence(
  propKey: string,
  leagueId: number,
  season: number,
  playerId: number,
  teamId: number,
  scope: PropScope,
): Promise<PlayerPropEvidenceResult> {
  const supabaseAdmin = getSupabaseAdmin();

  const [rawRows, statLines, { data: propData }] = await Promise.all([
    loadPlayerPropEvidenceSnapshotRows(propKey, leagueId, season, playerId, teamId),
    loadPlayerFixtureStatLines(leagueId, season, playerId, teamId),
    supabaseAdmin
      .from('player_prop_definitions')
      .select('key, label')
      .eq('key', propKey)
      .maybeSingle(),
  ]);

  const scopeFilteredRows = scope === 'overall'
    ? rawRows
    : rawRows.filter((r) => r.venue_scope === scope);

  // Index canonical stat lines by fixture for O(1) enrichment.
  const statLineByFixture = new Map<number, FixtureStatLine>(
    statLines.map((line) => [line.fixtureId, line]),
  );

  const evidenceRows = scopeFilteredRows.map((raw) => {
    const row = rawToEvidenceRow(raw);
    const line = statLineByFixture.get(raw.fixture_id);
    if (line) {
      row.goals = line.goals;
      row.assists = line.assists;
      row.totalShots = line.totalShots;
      row.shotsOnTarget = line.shotsOnTarget;
      row.offsides = line.offsides;
      row.tackles = line.tackles;
      row.foulsCommitted = line.foulsCommitted;
      row.foulsDrawn = line.foulsDrawn;
    }
    return row;
  });

  // Player name from first row
  const playerName = rawRows[0]?.player_name ?? null;

  return {
    propKey,
    propLabel: (propData as { label?: string } | null)?.label ?? propKey,
    playerId,
    playerName,
    rows: evidenceRows,
  };
}
