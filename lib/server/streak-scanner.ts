import 'server-only';

import { getDateRange } from '@/lib/date';
import { getSupabaseAdmin } from './supabase-admin';
import { getSupportedLeagueIds } from './league-config';

export type StreakScope = 'overall' | 'home' | 'away';

const NEXT_FIXTURE_WINDOW_DAYS = 6;
const STREAK_CANDIDATE_LIMIT = 200;
const STREAK_RESULT_LIMIT = 50;
const COMPARISON_UPCOMING_STATUSES = ['NS', 'TBD'] as const;

export type StreakScannerFilters = {
  marketKey: string;
  minStreak: number;
  scope: StreakScope;
};

export type StreakMarketOption = {
  key: string;
  label: string;
};

export type StreakNextFixture = {
  fixtureId: number;
  opponentTeamId: number;
  opponentName: string;
  isHome: boolean;
  date: string;
};

export type StreakScannerRow = {
  teamId: number;
  teamName: string;
  teamLogoUrl: string | null;
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
  scope: StreakScope;
  marketKey: string;
  marketLabel: string;
  sample: number;
  hits: number;
  percentage: number;
  currentStreak: number;
  nextFixture: StreakNextFixture | null;
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
  scope: StreakScope;
  market_key: string;
  sample: number;
  hits: number;
  percentage: number | string;
  current_streak: number;
};

type TeamRow = {
  id: number;
  name: string;
  logo_url: string | null;
};

type LeagueRow = {
  id: number;
  name: string;
  logo_url: string | null;
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

function isStreakScope(value: unknown): value is StreakScope {
  return value === 'overall' || value === 'home' || value === 'away';
}

function toFiniteNumber(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMarketDefinitionRows(rows: unknown[]): MarketDefinitionRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<MarketDefinitionRow>;
    if (typeof record.key !== 'string' || typeof record.label !== 'string' || record.is_active !== true) {
      return [];
    }
    return [{ key: record.key, label: record.label, is_active: true }];
  });
}

function toStatRows(rows: unknown[]): TeamSeasonMarketStatRow[] {
  return rows.flatMap((row) => {
    const record = row as Partial<TeamSeasonMarketStatRow>;
    if (
      typeof record.team_id !== 'number' ||
      typeof record.league_id !== 'number' ||
      typeof record.season !== 'number' ||
      !isStreakScope(record.scope) ||
      typeof record.market_key !== 'string' ||
      typeof record.sample !== 'number' ||
      typeof record.hits !== 'number' ||
      typeof record.current_streak !== 'number' ||
      (typeof record.percentage !== 'number' && typeof record.percentage !== 'string')
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

function isActionableNextFixture(
  scope: StreakScope,
  nextFixture: StreakNextFixture | null,
): nextFixture is StreakNextFixture {
  if (!nextFixture) {
    return false;
  }

  if (scope === 'home') {
    return nextFixture.isHome;
  }

  if (scope === 'away') {
    return !nextFixture.isHome;
  }

  return true;
}

export async function loadActiveStreakMarkets(): Promise<StreakMarketOption[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('market_definitions')
    .select('key, label, is_active')
    .eq('is_active', true)
    .order('label', { ascending: true });

  if (error) {
    throw new Error(`Failed to load active markets: ${error.message}`);
  }

  return toMarketDefinitionRows((data ?? []) as unknown[]).map((market) => ({
    key: market.key,
    label: market.label,
  }));
}

export async function loadGlobalStreakRows(
  filters: StreakScannerFilters,
  activeMarkets: StreakMarketOption[],
): Promise<StreakScannerRow[]> {
  const activeMarketMap = new Map(activeMarkets.map((market) => [market.key, market.label]));
  const selectedMarketKeys = filters.marketKey === 'ALL'
    ? [...activeMarketMap.keys()]
    : activeMarketMap.has(filters.marketKey)
      ? [filters.marketKey]
      : [];

  if (selectedMarketKeys.length === 0) {
    return [];
  }

  const supabaseAdmin = getSupabaseAdmin();
  const [streakLeagueIds, comparisonLeagueIds] = await Promise.all([
    getSupportedLeagueIds('streaks'),
    getSupportedLeagueIds('comparison'),
  ]);
  const { data: statData, error: statError } = await supabaseAdmin
    .from('team_season_market_stats')
    .select('team_id, league_id, season, scope, market_key, sample, hits, percentage, current_streak')
    .gte('current_streak', filters.minStreak)
    .eq('scope', filters.scope)
    .in('league_id', streakLeagueIds)
    .in('market_key', selectedMarketKeys)
    .order('current_streak', { ascending: false })
    .limit(STREAK_CANDIDATE_LIMIT);

  if (statError) {
    throw new Error(`Failed to load streak rows: ${statError.message}`);
  }

  const statRows = toStatRows((statData ?? []) as unknown[]);
  if (statRows.length === 0) {
    return [];
  }

  const teamIds = [...new Set(statRows.map((row) => row.team_id))];
  const leagueIds = [...new Set(statRows.map((row) => row.league_id))];
  const { start, end } = getDateRange(NEXT_FIXTURE_WINDOW_DAYS);

  const { data: fixtureTeamData, error: fixtureTeamError } = await supabaseAdmin
    .from('fixture_teams')
    .select('fixture_id, team_id, opponent_team_id, is_home, played_at')
    .in('team_id', teamIds)
    .in('league_id', comparisonLeagueIds)
    .gte('played_at', start.toISOString())
    .lt('played_at', end.toISOString())
    .order('played_at', { ascending: true });

  if (fixtureTeamError) {
    throw new Error(`Failed to load next fixtures for streaks: ${fixtureTeamError.message}`);
  }

  const fixtureTeamRows = toFixtureTeamRows((fixtureTeamData ?? []) as unknown[]);
  const fixtureIds = [...new Set(fixtureTeamRows.map((row) => row.fixture_id))];
  let eligibleFixtureIds = new Set<number>();

  if (fixtureIds.length > 0) {
    const { data: fixtureData, error: fixtureError } = await supabaseAdmin
      .from('fixtures')
      .select('id')
      .in('id', fixtureIds)
      .in('league_id', comparisonLeagueIds)
      .in('status_short', [...COMPARISON_UPCOMING_STATUSES])
      .gte('date', start.toISOString())
      .lt('date', end.toISOString());

    if (fixtureError) {
      throw new Error(`Failed to verify comparison fixtures for streaks: ${fixtureError.message}`);
    }

    eligibleFixtureIds = new Set(toFixtureIdRows((fixtureData ?? []) as unknown[]).map((row) => row.id));
  }

  const eligibleFixtureTeamRows = fixtureTeamRows.filter((row) => eligibleFixtureIds.has(row.fixture_id));
  if (eligibleFixtureTeamRows.length === 0) {
    return [];
  }

  const opponentTeamIds = eligibleFixtureTeamRows.map((row) => row.opponent_team_id);
  const allTeamIds = [...new Set([...teamIds, ...opponentTeamIds])];

  const [{ data: teamData, error: teamError }, { data: leagueData, error: leagueError }] = await Promise.all([
    supabaseAdmin.from('teams').select('id, name, logo_url').in('id', allTeamIds),
    supabaseAdmin.from('leagues').select('id, name, logo_url').in('id', leagueIds),
  ]);

  if (teamError) {
    throw new Error(`Failed to load streak teams: ${teamError.message}`);
  }

  if (leagueError) {
    throw new Error(`Failed to load streak leagues: ${leagueError.message}`);
  }

  const teamsById = new Map(toTeamRows((teamData ?? []) as unknown[]).map((team) => [team.id, team]));
  const leaguesById = new Map(toLeagueRows((leagueData ?? []) as unknown[]).map((league) => [league.id, league]));
  const nextFixtureByTeamId = new Map<number, StreakNextFixture>();

  for (const fixtureRow of eligibleFixtureTeamRows) {
    if (nextFixtureByTeamId.has(fixtureRow.team_id)) {
      continue;
    }

    const opponent = teamsById.get(fixtureRow.opponent_team_id);
    nextFixtureByTeamId.set(fixtureRow.team_id, {
      fixtureId: fixtureRow.fixture_id,
      opponentTeamId: fixtureRow.opponent_team_id,
      opponentName: opponent?.name ?? `Team ${fixtureRow.opponent_team_id}`,
      isHome: fixtureRow.is_home,
      date: fixtureRow.played_at,
    });
  }

  return statRows.flatMap((row) => {
    const nextFixture = nextFixtureByTeamId.get(row.team_id) ?? null;
    if (!isActionableNextFixture(filters.scope, nextFixture)) {
      return [];
    }

    const team = teamsById.get(row.team_id);
    const league = leaguesById.get(row.league_id);

    return [{
      teamId: row.team_id,
      teamName: team?.name ?? `Team ${row.team_id}`,
      teamLogoUrl: team?.logo_url ?? null,
      leagueId: row.league_id,
      leagueName: league?.name ?? `League ${row.league_id}`,
      leagueLogoUrl: league?.logo_url ?? null,
      season: row.season,
      scope: row.scope,
      marketKey: row.market_key,
      marketLabel: activeMarketMap.get(row.market_key) ?? row.market_key,
      sample: row.sample,
      hits: row.hits,
      percentage: toFiniteNumber(row.percentage),
      currentStreak: row.current_streak,
      nextFixture,
    } satisfies StreakScannerRow];
  }).slice(0, STREAK_RESULT_LIMIT);
}
