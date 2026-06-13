import 'server-only';

import type {
  ComparisonScope,
  PlayerFixtureContextRecord,
  PlayerFixtureStatRecord,
  PlayerGoalEventRecord,
  PlayerGoalSplitId,
  PlayerStatsCategoryId,
} from '@/app/comparison/types';
import { getSupabaseAdmin } from './supabase-admin';

type PlayerMetricMode = {
  category: PlayerStatsCategoryId;
  goalSplit: PlayerGoalSplitId;
};

type PlayerDataset = {
  fixtureMap: Record<number, PlayerFixtureContextRecord>;
  goalEvents: PlayerGoalEventRecord[];
  playerNameMap: Record<number, string>;
  playerRows: PlayerFixtureStatRecord[];
  teamNameMap: Record<number, string>;
};

export type PlayerMatchDetail = {
  fixtureId: number;
  homeAway: 'H' | 'A';
  minutes: number;
  opponentName: string;
  playedAt: string;
  score: string;
  total: number;
};

export type PlayerLeaderboardRow = {
  details: PlayerMatchDetail[];
  matches: number;
  minutes: number;
  per90: number;
  playerId: number;
  playerName: string;
  total: number;
};

export type ComparisonPlayerStatsResponse = {
  awayRows: PlayerLeaderboardRow[];
  homeRows: PlayerLeaderboardRow[];
};

type GoalMetricMaps = {
  firstGoalByFixturePlayer: Map<string, number>;
  firstHalfByFixturePlayer: Map<string, number>;
  secondHalfByFixturePlayer: Map<string, number>;
};

const PLAYER_STATS_SELECT = `
  fixture_id,
  player_id,
  team_id,
  league_id,
  season,
  played_at,
  is_home,
  position,
  minutes,
  substitute,
  goals,
  assists,
  total_shots,
  shots_on_target,
  tackles,
  fouls_committed,
  fouls_drawn,
  offsides,
  yellow_cards,
  red_cards
`;

const PLAYER_EVENTS_SELECT = `
  fixture_id,
  team_id,
  player_id,
  elapsed,
  extra_time,
  type,
  detail,
  created_at
`;

const PLAYER_FIXTURE_CONTEXT_SELECT = `
  id,
  date,
  home_team_id,
  away_team_id,
  home_goals,
  away_goals
`;

const GOAL_EVENT_TYPES = ['Goal', 'Penalty', 'Own Goal'] as const;

// National-team fixtures (World Cup league_id=1, or both sides flagged national)
// have no meaningful single (league, season) sample: the squad's evidence is
// spread across qualifiers, continental cups and friendlies. Mirror the
// cross-competition broadening that loadComparisonCore already applies for the
// team panels (comparison-data.ts) so the player leaderboards include that
// history instead of starving on the empty tournament league/season.
const NATIONAL_WC_LEAGUE_ID = 1;
const NATIONAL_WINDOW_MONTHS = 24;

function nationalCutoffIso(): string {
  const cutoff = new Date(Date.now() - NATIONAL_WINDOW_MONTHS * 31 * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

async function resolveNationalFixture(homeTeamId: number, awayTeamId: number, leagueId: number) {
  if (leagueId === NATIONAL_WC_LEAGUE_ID) {
    return true;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('id, national')
    .in('id', [homeTeamId, awayTeamId]);

  if (error) {
    throw new Error(`Failed to resolve team nationality for player stats: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ id: number; national: boolean | null }>;
  return rows.length === 2 && rows.every((row) => Boolean(row.national));
}

function getScopeKey(scope: ComparisonScope, side: 'home' | 'away') {
  if (scope === 'all') {
    return 'overall' as const;
  }

  return side === 'home' ? 'home' : 'away';
}

function buildMetricMode(category: PlayerStatsCategoryId, goalSplit: PlayerGoalSplitId): PlayerMetricMode {
  if (category === 'goals') {
    return {
      category,
      goalSplit,
    };
  }

  return {
    category,
    goalSplit: 'goals',
  };
}

function compareGoalEvents(left: PlayerGoalEventRecord, right: PlayerGoalEventRecord) {
  const leftElapsed = left.elapsed ?? Number.MAX_SAFE_INTEGER;
  const rightElapsed = right.elapsed ?? Number.MAX_SAFE_INTEGER;
  if (leftElapsed !== rightElapsed) {
    return leftElapsed - rightElapsed;
  }

  const leftExtra = left.extra_time ?? 0;
  const rightExtra = right.extra_time ?? 0;
  if (leftExtra !== rightExtra) {
    return leftExtra - rightExtra;
  }

  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

function buildGoalMetricMaps(events: PlayerGoalEventRecord[]) {
  const firstGoalByFixturePlayer = new Map<string, number>();
  const firstHalfByFixturePlayer = new Map<string, number>();
  const secondHalfByFixturePlayer = new Map<string, number>();
  const byFixture = new Map<number, PlayerGoalEventRecord[]>();

  for (const event of events) {
    const fixtureEvents = byFixture.get(event.fixture_id) ?? [];
    fixtureEvents.push(event);
    byFixture.set(event.fixture_id, fixtureEvents);
  }

  for (const fixtureEvents of byFixture.values()) {
    const sortedEvents = fixtureEvents.slice().sort(compareGoalEvents);
    const firstEvent = sortedEvents[0];

    if (firstEvent?.player_id && (firstEvent.type === 'Goal' || firstEvent.type === 'Penalty')) {
      firstGoalByFixturePlayer.set(`${firstEvent.fixture_id}:${firstEvent.player_id}`, 1);
    }

    for (const event of sortedEvents) {
      if (!event.player_id) {
        continue;
      }

      if (event.type !== 'Goal' && event.type !== 'Penalty') {
        continue;
      }

      const key = `${event.fixture_id}:${event.player_id}`;
      if (event.elapsed != null && event.elapsed <= 45) {
        firstHalfByFixturePlayer.set(key, (firstHalfByFixturePlayer.get(key) ?? 0) + 1);
      } else if (event.elapsed != null && event.elapsed > 45) {
        secondHalfByFixturePlayer.set(key, (secondHalfByFixturePlayer.get(key) ?? 0) + 1);
      }
    }
  }

  return {
    firstGoalByFixturePlayer,
    firstHalfByFixturePlayer,
    secondHalfByFixturePlayer,
  } satisfies GoalMetricMaps;
}

function getMetricValueForRow(row: PlayerFixtureStatRecord, mode: PlayerMetricMode, goalMaps: GoalMetricMaps) {
  const key = `${row.fixture_id}:${row.player_id}`;

  switch (mode.category) {
    case 'goals':
      if (mode.goalSplit === 'first_goals') {
        return goalMaps.firstGoalByFixturePlayer.get(key) ?? 0;
      }

      if (mode.goalSplit === 'goals_1h') {
        return goalMaps.firstHalfByFixturePlayer.get(key) ?? 0;
      }

      if (mode.goalSplit === 'goals_2h') {
        return goalMaps.secondHalfByFixturePlayer.get(key) ?? 0;
      }

      return row.goals ?? 0;
    case 'assists':
      return row.assists ?? 0;
    case 'cards':
      return (row.yellow_cards ?? 0) + (row.red_cards ?? 0);
    case 'shots':
      return row.total_shots ?? 0;
    case 'shots_on_target':
      return row.shots_on_target ?? 0;
    case 'fouls':
      return row.fouls_committed ?? 0;
    case 'fouls_won':
      return row.fouls_drawn ?? 0;
    case 'tackles':
      return row.tackles ?? 0;
    case 'offsides':
      return row.offsides ?? 0;
    default:
      return 0;
  }
}

function buildLeaderboard(dataset: PlayerDataset, mode: PlayerMetricMode, opponentFallback: string) {
  const goalMaps = buildGoalMetricMaps(dataset.goalEvents);
  const groupedRows = new Map<number, PlayerFixtureStatRecord[]>();

  for (const row of dataset.playerRows) {
    const rows = groupedRows.get(row.player_id) ?? [];
    rows.push(row);
    groupedRows.set(row.player_id, rows);
  }

  return [...groupedRows.entries()]
    .map(([playerId, rows]) => {
      const sortedRows = rows.slice().sort((left, right) => {
        return new Date(right.played_at).getTime() - new Date(left.played_at).getTime();
      });
      const minutes = sortedRows.reduce((sum, row) => sum + (row.minutes ?? 0), 0);
      const total = sortedRows.reduce((sum, row) => sum + getMetricValueForRow(row, mode, goalMaps), 0);
      const per90 = minutes > 0 ? Number(((total / minutes) * 90).toFixed(2)) : 0;

      const details = sortedRows.map((row) => {
        const fixture = dataset.fixtureMap[row.fixture_id];
        const isHome = !!row.is_home;
        const homeAway: 'H' | 'A' = isHome ? 'H' : 'A';
        const opponentId = fixture ? (isHome ? fixture.away_team_id : fixture.home_team_id) : null;
        const opponentName = opponentId ? dataset.teamNameMap[opponentId] ?? opponentFallback : opponentFallback;
        const score = fixture ? `${fixture.home_goals ?? '-'}-${fixture.away_goals ?? '-'}` : '-';

        return {
          fixtureId: row.fixture_id,
          homeAway,
          minutes: row.minutes ?? 0,
          opponentName,
          playedAt: row.played_at,
          score,
          total: getMetricValueForRow(row, mode, goalMaps),
        } satisfies PlayerMatchDetail;
      });

      return {
        details,
        matches: sortedRows.length,
        minutes,
        per90,
        playerId,
        playerName: dataset.playerNameMap[playerId] ?? `Player ${playerId}`,
        total,
      } satisfies PlayerLeaderboardRow;
    })
    .sort((left, right) => {
      if (left.total !== right.total) {
        return right.total - left.total;
      }

      if (left.per90 !== right.per90) {
        return right.per90 - left.per90;
      }

      if (left.minutes !== right.minutes) {
        return right.minutes - left.minutes;
      }

      return left.playerName.localeCompare(right.playerName);
    });
}

async function loadTeamLeaderboard(
  teamId: number,
  leagueId: number,
  season: number,
  scopeKey: 'overall' | 'home' | 'away',
  mode: PlayerMetricMode,
  isNationalFixture: boolean,
) {
  const supabaseAdmin = getSupabaseAdmin();
  let statsQuery = supabaseAdmin
    .from('player_fixture_stats')
    .select(PLAYER_STATS_SELECT)
    .eq('team_id', teamId)
    .order('played_at', { ascending: false });

  if (isNationalFixture) {
    // Cross-competition window: the squad's qualifiers/friendlies/continental
    // appearances live under their real (league, season), never (1, 2026).
    statsQuery = statsQuery.gte('played_at', nationalCutoffIso());
  } else {
    statsQuery = statsQuery.eq('league_id', leagueId).eq('season', season);
  }

  const { data: statsData, error: statsError } = await statsQuery;

  if (statsError) {
    throw new Error(`Failed to load player fixture stats: ${statsError.message}`);
  }

  const scopedRows = ((statsData ?? []) as PlayerFixtureStatRecord[]).filter((row) => {
    if (scopeKey === 'overall') {
      return true;
    }

    return scopeKey === 'home' ? !!row.is_home : !row.is_home;
  });

  if (scopedRows.length === 0) {
    return [] as PlayerLeaderboardRow[];
  }

  const fixtureIds = [...new Set(scopedRows.map((row) => row.fixture_id))];
  const playerIds = [...new Set(scopedRows.map((row) => row.player_id))];

  const [playersResponse, fixturesResponse, goalEventsResponse] = await Promise.all([
    supabaseAdmin.from('players').select('id, name').in('id', playerIds),
    supabaseAdmin.from('fixtures').select(PLAYER_FIXTURE_CONTEXT_SELECT).in('id', fixtureIds),
    supabaseAdmin
      .from('fixture_events')
      .select(PLAYER_EVENTS_SELECT)
      .in('fixture_id', fixtureIds)
      .in('type', [...GOAL_EVENT_TYPES]),
  ]);

  if (playersResponse.error) {
    throw new Error(`Failed to resolve player names: ${playersResponse.error.message}`);
  }

  if (fixturesResponse.error) {
    throw new Error(`Failed to resolve player fixtures: ${fixturesResponse.error.message}`);
  }

  if (goalEventsResponse.error) {
    throw new Error(`Failed to load player goal events: ${goalEventsResponse.error.message}`);
  }

  const fixtureRows = (fixturesResponse.data ?? []) as PlayerFixtureContextRecord[];
  const teamIds = [...new Set(fixtureRows.flatMap((fixture) => [fixture.home_team_id, fixture.away_team_id]))];
  const teamsResponse = teamIds.length
    ? await supabaseAdmin.from('teams').select('id, name').in('id', teamIds)
    : { data: [], error: null };

  if (teamsResponse.error) {
    throw new Error(`Failed to resolve team names for player stats: ${teamsResponse.error.message}`);
  }

  const playerNameMap = Object.fromEntries(
    ((playersResponse.data ?? []) as Array<{ id: number; name: string | null }>).map((player) => [
      player.id,
      player.name ?? `Player ${player.id}`,
    ]),
  ) as Record<number, string>;

  const fixtureMap = Object.fromEntries(
    fixtureRows.map((fixture) => [fixture.id, fixture]),
  ) as Record<number, PlayerFixtureContextRecord>;

  const teamNameMap = Object.fromEntries(
    ((teamsResponse.data ?? []) as Array<{ id: number; name: string }>).map((team) => [team.id, team.name]),
  ) as Record<number, string>;

  return buildLeaderboard(
    {
      fixtureMap,
      goalEvents: (goalEventsResponse.data ?? []) as PlayerGoalEventRecord[],
      playerNameMap,
      playerRows: scopedRows,
      teamNameMap,
    },
    mode,
    'Opponent',
  );
}

export async function loadComparisonPlayerStats(
  homeTeamId: number,
  awayTeamId: number,
  leagueId: number,
  season: number,
  scope: ComparisonScope,
  category: PlayerStatsCategoryId,
  goalSplit: PlayerGoalSplitId,
) {
  const mode = buildMetricMode(category, goalSplit);
  const homeScopeKey = getScopeKey(scope, 'home');
  const awayScopeKey = getScopeKey(scope, 'away');
  const isNationalFixture = await resolveNationalFixture(homeTeamId, awayTeamId, leagueId);

  const [homeRows, awayRows] = await Promise.all([
    loadTeamLeaderboard(homeTeamId, leagueId, season, homeScopeKey, mode, isNationalFixture),
    loadTeamLeaderboard(awayTeamId, leagueId, season, awayScopeKey, mode, isNationalFixture),
  ]);

  return {
    awayRows,
    homeRows,
  } satisfies ComparisonPlayerStatsResponse;
}
