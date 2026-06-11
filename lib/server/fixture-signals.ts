import 'server-only';

import { unstable_cache } from 'next/cache';
import { getSupportedLeagueIds } from './league-config';
import { getSupabaseAdmin } from './supabase-admin';

// ──────────────────────────────────────────────────────────────────────────────
// Fixture Signals serving layer reader (Fixtures Match Intelligence).
//
// Reads the materialized `fixture_signals` read model (built by
// stuf-api/rebuild_fixture_signals.py) and groups it into per-fixture cards.
// This is presentation glue ONLY: no scoring, no aggregation, no business logic.
// Ranking/banding already happened in the builder. null stays null (missing
// data); it is never coerced to 0. No odds / edge / probability language.
// ──────────────────────────────────────────────────────────────────────────────

export type SignalBand = 'tendency' | 'strong' | 'watch' | 'context' | 'low_info';
export type SignalSourceType = 'team_market' | 'streak_informativeness' | 'referee_context' | 'player_prop';
export type SignalScope = 'overall' | 'home' | 'away';
export type SignalSubjectType = 'team' | 'player' | 'referee';

export type FixtureSignalSearchParams = Record<string, string | string[] | undefined>;

export type FixtureSignalFilters = {
  leagueId: number | 'all';
  season: number;
  windowDays: number;
};

export type FixtureSignalLeagueOption = {
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
};

export type FixtureSignalFilterOptions = {
  defaultSeason: number;
  leagues: FixtureSignalLeagueOption[];
};

export type FixtureSignal = {
  signalKey: string;
  sourceType: SignalSourceType;
  subjectType: SignalSubjectType;
  subjectTeamId: number | null;
  subjectPlayerId: number | null;
  marketKey: string | null;
  propKey: string | null;
  category: string | null;
  scope: SignalScope | null;
  label: string;
  headline: string;
  sample: number | null;
  hitRate: number | null;
  signalStrength: number;
  signalBand: SignalBand;
  signalRank: number;
  sourcePayload: Record<string, unknown>;
};

export type FixtureSignalCard = {
  fixtureId: number;
  leagueId: number;
  season: number;
  playedAt: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  homeTeamLogoUrl: string | null;
  awayTeamName: string;
  awayTeamLogoUrl: string | null;
  leagueName: string;
  leagueLogoUrl: string | null;
  // Best (rank 1) band, surfaced for fast card-level filtering / sorting.
  topBand: SignalBand;
  topStrength: number;
  signals: FixtureSignal[];
};

export type FixtureSignalsResult = {
  cards: FixtureSignalCard[];
};

export type FixtureSignalsTiming = {
  dbMs: number;
  transformMs: number;
  totalMs: number;
  rowCount: number;
};

const SIGNALS_CACHE_SECONDS = 60;
const DEFAULT_WINDOW_DAYS = 14;
const MAX_WINDOW_DAYS = 14;
// One fixture emits at most top_signals_per_fixture (6) rows; a full V1 board for
// a single league/season window is a few hundred rows. This cap keeps the whole
// candidate set in memory so card-level filters see every fixture.
const MAX_SIGNAL_ROWS = 5000;

const FIXTURE_SIGNALS_SELECT = [
  'signal_key',
  'fixture_id',
  'league_id',
  'season',
  'played_at',
  'home_team_id',
  'away_team_id',
  'home_team_name',
  'home_team_logo_url',
  'away_team_name',
  'away_team_logo_url',
  'league_name',
  'league_logo_url',
  'source_type',
  'subject_type',
  'subject_team_id',
  'subject_player_id',
  'market_key',
  'prop_key',
  'category',
  'scope',
  'label',
  'headline',
  'sample',
  'hit_rate',
  'signal_strength',
  'signal_band',
  'signal_rank',
  'source_payload',
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

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBand(value: unknown): value is SignalBand {
  return value === 'tendency' || value === 'strong' || value === 'watch' || value === 'context' || value === 'low_info';
}

function isScope(value: unknown): value is SignalScope {
  return value === 'overall' || value === 'home' || value === 'away';
}

function isSourceType(value: unknown): value is SignalSourceType {
  return (
    value === 'team_market' ||
    value === 'streak_informativeness' ||
    value === 'referee_context' ||
    value === 'player_prop'
  );
}

function isSubjectType(value: unknown): value is SignalSubjectType {
  return value === 'team' || value === 'player' || value === 'referee';
}


// ──────────────────────────────────────────────────────────────────────────────
// Filter options
// ──────────────────────────────────────────────────────────────────────────────

async function loadFixtureSignalFilterOptionsUncached(): Promise<FixtureSignalFilterOptions> {
  const supabaseAdmin = getSupabaseAdmin();
  // Read league scope dynamically from supported_leagues — no hardcoded league list.
  // This is what makes the World Cup (league_id=1) appear when enabled_for_fixtures=true.
  const fixtureLeagueIds = await getSupportedLeagueIds('fixtures');

  const { data: supportedData, error: supportedError } = await supabaseAdmin
    .from('supported_leagues')
    .select('league_id, season')
    .eq('is_active', true)
    .eq('enabled_for_fixtures', true)
    .in('league_id', fixtureLeagueIds)
    .order('display_order', { ascending: true })
    .order('league_id', { ascending: true })
    .order('season', { ascending: false });

  if (supportedError) throw new Error(`Failed to load fixture signal league options: ${supportedError.message}`);

  const supportedRows = (supportedData ?? []) as Array<{ league_id: number; season: number }>;
  if (supportedRows.length === 0) throw new Error('No supported leagues configured for fixtures.');

  const leagueIds = [...new Set(supportedRows.map((r) => r.league_id))];
  const { data: leagueData, error: leagueError } = await supabaseAdmin
    .from('leagues')
    .select('id, name, logo_url')
    .in('id', leagueIds);
  if (leagueError) throw new Error(`Failed to load leagues: ${leagueError.message}`);

  const leaguesById = new Map(
    ((leagueData ?? []) as Array<{ id: number; name: string; logo_url: string | null }>).map((l) => [l.id, l]),
  );

  const leagues: FixtureSignalLeagueOption[] = supportedRows.map((r) => {
    const league = leaguesById.get(r.league_id);
    return {
      leagueId: r.league_id,
      leagueName: league?.name ?? `League ${r.league_id}`,
      leagueLogoUrl: league?.logo_url ?? null,
      season: r.season,
    };
  });

  return {
    defaultSeason: leagues[0]?.season ?? new Date().getUTCFullYear(),
    leagues,
  };
}

export const loadFixtureSignalFilterOptions = unstable_cache(
  loadFixtureSignalFilterOptionsUncached,
  ['fixture-signal-filter-options'],
  { revalidate: 300 },
);

// ──────────────────────────────────────────────────────────────────────────────
// Filter parsing
// ──────────────────────────────────────────────────────────────────────────────

export function parseFixtureSignalFilters(
  searchParams: FixtureSignalSearchParams | undefined,
  options: FixtureSignalFilterOptions,
): FixtureSignalFilters {
  const validSeasons = new Set(options.leagues.map((l) => l.season));
  const requestedSeason = parseInteger(searchParams?.season);
  const season = requestedSeason !== null && validSeasons.has(requestedSeason)
    ? requestedSeason
    : options.defaultSeason;

  const rawLeague = firstParam(searchParams?.leagueId);
  const validLeagueIds = new Set(options.leagues.filter((l) => l.season === season).map((l) => l.leagueId));
  let leagueId: number | 'all' = 'all';
  if (rawLeague && rawLeague !== 'all') {
    const parsed = Number.parseInt(rawLeague, 10);
    if (Number.isInteger(parsed) && validLeagueIds.has(parsed)) leagueId = parsed;
  }

  const requestedWindow = parseInteger(searchParams?.days);
  const windowDays = requestedWindow !== null
    ? Math.max(1, Math.min(MAX_WINDOW_DAYS, requestedWindow))
    : DEFAULT_WINDOW_DAYS;

  return { leagueId, season, windowDays };
}

// ──────────────────────────────────────────────────────────────────────────────
// Row converter
// ──────────────────────────────────────────────────────────────────────────────

type RawSignalRow = Record<string, unknown>;

function rawToSignal(row: RawSignalRow): FixtureSignal | null {
  const signalKey = typeof row.signal_key === 'string' ? row.signal_key : null;
  const sourceType = row.source_type;
  const subjectType = row.subject_type;
  const band = row.signal_band;
  const rank = typeof row.signal_rank === 'number' ? row.signal_rank : null;
  const strength = toFiniteNumber(row.signal_strength as number | string | null);
  if (
    signalKey === null ||
    !isSourceType(sourceType) ||
    !isSubjectType(subjectType) ||
    !isBand(band) ||
    rank === null ||
    strength === null
  ) {
    return null;
  }

  const payload =
    row.source_payload && typeof row.source_payload === 'object' && !Array.isArray(row.source_payload)
      ? (row.source_payload as Record<string, unknown>)
      : {};

  return {
    signalKey,
    sourceType,
    subjectType,
    subjectTeamId: typeof row.subject_team_id === 'number' ? row.subject_team_id : null,
    subjectPlayerId: typeof row.subject_player_id === 'number' ? row.subject_player_id : null,
    marketKey: typeof row.market_key === 'string' ? row.market_key : null,
    propKey: typeof row.prop_key === 'string' ? row.prop_key : null,
    category: typeof row.category === 'string' ? row.category : null,
    scope: isScope(row.scope) ? row.scope : null,
    label: typeof row.label === 'string' ? row.label : signalKey,
    headline: typeof row.headline === 'string' ? row.headline : '',
    sample: typeof row.sample === 'number' ? row.sample : null,
    hitRate: toFiniteNumber(row.hit_rate as number | string | null),
    signalStrength: strength,
    signalBand: band,
    signalRank: rank,
    sourcePayload: payload,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Snapshot loader (cached, league/season/window scoped)
// ──────────────────────────────────────────────────────────────────────────────

const loadFixtureSignalSnapshotRows = unstable_cache(
  async (leagueId: number | 'all', season: number, windowStartIso: string, windowEndIso: string) => {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('fixture_signals')
      .select(FIXTURE_SIGNALS_SELECT)
      .eq('season', season)
      .gte('played_at', windowStartIso)
      .lt('played_at', windowEndIso);

    if (leagueId !== 'all') {
      query = query.eq('league_id', leagueId);
    } else {
      // When 'all', scope to whatever leagues are enabled for fixtures — not a hardcoded list.
      const fixtureLeagueIds = await getSupportedLeagueIds('fixtures');
      query = query.in('league_id', fixtureLeagueIds);
    }

    const { data, error } = await query
      .order('played_at', { ascending: true })
      .order('fixture_id', { ascending: true })
      .order('signal_rank', { ascending: true })
      .limit(MAX_SIGNAL_ROWS);

    if (error) {
      throw new Error(
        `Failed to load fixture signals. Run rebuild_fixture_signals.py. Supabase: ${error.message}`,
      );
    }

    return (data ?? []) as RawSignalRow[];
  },
  ['fixture-signal-rows'],
  { revalidate: SIGNALS_CACHE_SECONDS },
);

// ──────────────────────────────────────────────────────────────────────────────
// Public loader
// ──────────────────────────────────────────────────────────────────────────────

export async function loadFixtureSignalsWithTiming(
  filters: FixtureSignalFilters,
): Promise<{ result: FixtureSignalsResult; timing: FixtureSignalsTiming }> {
  const startedAt = Date.now();

  const now = new Date();
  const windowStart = new Date(now.getTime());
  const windowEnd = new Date(now.getTime() + filters.windowDays * 24 * 60 * 60 * 1000);

  const dbStartedAt = Date.now();
  const rawRows = await loadFixtureSignalSnapshotRows(
    filters.leagueId,
    filters.season,
    windowStart.toISOString(),
    windowEnd.toISOString(),
  );
  const dbMs = Date.now() - dbStartedAt;

  const transformStartedAt = Date.now();
  const cardsByFixture = new Map<number, FixtureSignalCard>();

  for (const row of rawRows) {
    const fixtureId = typeof row.fixture_id === 'number' ? row.fixture_id : null;
    const leagueId = typeof row.league_id === 'number' ? row.league_id : null;
    const playedAt = typeof row.played_at === 'string' ? row.played_at : null;
    const homeTeamId = typeof row.home_team_id === 'number' ? row.home_team_id : null;
    const awayTeamId = typeof row.away_team_id === 'number' ? row.away_team_id : null;
    if (fixtureId === null || leagueId === null || playedAt === null || homeTeamId === null || awayTeamId === null) {
      continue;
    }

    const signal = rawToSignal(row);
    if (signal === null) continue;

    let card = cardsByFixture.get(fixtureId);
    if (!card) {
      card = {
        fixtureId,
        leagueId,
        season: typeof row.season === 'number' ? row.season : filters.season,
        playedAt,
        homeTeamId,
        awayTeamId,
        homeTeamName: typeof row.home_team_name === 'string' ? row.home_team_name : `Team ${homeTeamId}`,
        homeTeamLogoUrl: typeof row.home_team_logo_url === 'string' ? row.home_team_logo_url : null,
        awayTeamName: typeof row.away_team_name === 'string' ? row.away_team_name : `Team ${awayTeamId}`,
        awayTeamLogoUrl: typeof row.away_team_logo_url === 'string' ? row.away_team_logo_url : null,
        leagueName: typeof row.league_name === 'string' ? row.league_name : `League ${leagueId}`,
        leagueLogoUrl: typeof row.league_logo_url === 'string' ? row.league_logo_url : null,
        topBand: signal.signalBand,
        topStrength: signal.signalStrength,
        signals: [],
      };
      cardsByFixture.set(fixtureId, card);
    }
    card.signals.push(signal);
  }

  // Per card: signals arrive rank-ordered from the DB; derive top band/strength
  // from the best (rank 1) signal and keep the array sorted by rank for the UI.
  const allCards: FixtureSignalCard[] = [];
  for (const card of cardsByFixture.values()) {
    card.signals.sort((a, b) => a.signalRank - b.signalRank);
    const best = card.signals[0];
    if (best) {
      card.topBand = best.signalBand;
      card.topStrength = best.signalStrength;
    }
    allCards.push(card);
  }

  const filteredCards = allCards;

  // Board ordering: kickoff first (daily decision flow), then strongest tendency
  // (extremity x sample) first. No confidence band gating.
  filteredCards.sort((a, b) => {
    const timeDelta = new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime();
    if (timeDelta !== 0) return timeDelta;
    return b.topStrength - a.topStrength;
  });

  const transformMs = Date.now() - transformStartedAt;

  return {
    result: { cards: filteredCards },
    timing: {
      dbMs,
      transformMs,
      totalMs: Date.now() - startedAt,
      rowCount: rawRows.length,
    },
  };
}

export async function loadFixtureSignals(filters: FixtureSignalFilters): Promise<FixtureSignalsResult> {
  const { result } = await loadFixtureSignalsWithTiming(filters);
  return result;
}
