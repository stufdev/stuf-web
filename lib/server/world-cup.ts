import 'server-only';

import { getSupabaseAdmin } from './supabase-admin';

export const WORLD_CUP_LEAGUE_ID = 1;
export const WORLD_CUP_SEASON = 2026;

export type WorldCupScope = 'overall' | 'home' | 'away';
export type WorldCupPlayerSource = 'qualifiers' | 'worldcup';
export type WorldCupPlayerMetric =
  | 'goals'
  | 'assists'
  | 'goal_involvements'
  | 'cards'
  | 'shots'
  | 'shots_on_target'
  | 'fouls_committed'
  | 'fouls_drawn'
  | 'tackles'
  | 'offsides';

export type WorldCupTeam = {
  id: number;
  logoUrl: string | null;
  name: string;
};

export type WorldCupFixture = {
  awayGoals: number | null;
  awayTeam: WorldCupTeam;
  date: string;
  homeGoals: number | null;
  homeTeam: WorldCupTeam;
  id: number;
  refereeName: string | null;
  roundName: string | null;
  statusShort: string | null;
};

export type WorldCupStandingRow = {
  away: WorldCupStandingSplit;
  description: string | null;
  form: string | null;
  goalsAgainst: number | null;
  goalsDiff: number | null;
  goalsFor: number | null;
  groupName: string;
  home: WorldCupStandingSplit;
  loss: number | null;
  played: number | null;
  points: number | null;
  rank: number | null;
  status: string | null;
  team: WorldCupTeam;
  win: number | null;
  draw: number | null;
};

export type WorldCupStandingSplit = {
  draw: number | null;
  goalsAgainst: number | null;
  goalsFor: number | null;
  loss: number | null;
  played: number | null;
  win: number | null;
};

export type WorldCupStandingsGroup = {
  groupName: string;
  rows: WorldCupStandingRow[];
};

export type WorldCupTeamAverage = {
  avgCardsFor: number | null;
  avgCornersFor: number | null;
  avgFoulsCommitted: number | null;
  avgGoalsAgainst: number | null;
  avgGoalsFor: number | null;
  avgOffsidesFor: number | null;
  avgShotsOnTargetFor: number | null;
  avgTacklesFor: number | null;
  avgTotalShotsFor: number | null;
  matchesPlayed: number;
  team: WorldCupTeam;
};

export type WorldCupTopPlayerRow = {
  appearances: number;
  lineups: number;
  metric: WorldCupPlayerMetric;
  minutes: number;
  pageRank: number;
  per90: number | null;
  playerId: number;
  playerName: string;
  source: WorldCupPlayerSource;
  substitutes: number;
  team: WorldCupTeam;
  total: number;
};

export type WorldCupTopPlayersResult = {
  metric: WorldCupPlayerMetric;
  page: number;
  pageSize: number;
  rows: WorldCupTopPlayerRow[];
  scope: WorldCupScope;
  source: WorldCupPlayerSource;
  totalRows: number;
};

type TeamRow = {
  id: number;
  logo_url: string | null;
  name: string | null;
};

type TeamRelation = TeamRow | TeamRow[] | null;

type FixtureRow = {
  away_goals: number | null;
  away_team: TeamRelation;
  away_team_id: number;
  date: string;
  home_goals: number | null;
  home_team: TeamRelation;
  home_team_id: number;
  id: number;
  referee_name_raw: string | null;
  round_name: string | null;
  status_short: string | null;
};

type StandingRow = {
  away_draw: number | null;
  away_goals_against: number | null;
  away_goals_for: number | null;
  away_loss: number | null;
  away_played: number | null;
  away_win: number | null;
  description: string | null;
  draw: number | null;
  form: string | null;
  goals_against: number | null;
  goals_diff: number | null;
  goals_for: number | null;
  group_name: string | null;
  home_draw: number | null;
  home_goals_against: number | null;
  home_goals_for: number | null;
  home_loss: number | null;
  home_played: number | null;
  home_win: number | null;
  loss: number | null;
  played: number | null;
  points: number | null;
  rank: number | null;
  status: string | null;
  team_id: number;
  win: number | null;
};

type TeamAverageRow = {
  avg_cards_for: number | string | null;
  avg_corners_for: number | string | null;
  avg_fouls_committed: number | string | null;
  avg_goals_against: number | string | null;
  avg_goals_for: number | string | null;
  avg_offsides_for: number | string | null;
  avg_shots_on_target_for: number | string | null;
  avg_tackles_for: number | string | null;
  avg_total_shots_for: number | string | null;
  matches_played: number;
  team_id: number;
};

type PlayerSeasonRow = {
  appearances: number;
  assists: number;
  assists_per90: number | string | null;
  fouls_committed: number;
  fouls_committed_per90: number | string | null;
  fouls_drawn: number;
  fouls_drawn_per90: number | string | null;
  goals: number;
  goals_per90: number | string | null;
  lineups: number;
  minutes: number;
  offsides: number;
  offsides_per90: number | string | null;
  player_id: number;
  red_cards: number;
  shots_on_target: number;
  shots_on_target_per90: number | string | null;
  tackles: number;
  tackles_per90: number | string | null;
  team_id: number;
  total_shots: number;
  shots_per90: number | string | null;
  yellow_cards: number;
};

type PlayerRow = { id: number; name: string | null };

const FIXTURE_SELECT = `
  id,
  date,
  status_short,
  round_name,
  referee_name_raw,
  home_team_id,
  away_team_id,
  home_goals,
  away_goals,
  home_team:teams!fixtures_home_team_id_fkey(id, name, logo_url),
  away_team:teams!fixtures_away_team_id_fkey(id, name, logo_url)
`;

const TEAM_AVERAGE_SELECT = `
  team_id,
  matches_played,
  avg_goals_for,
  avg_goals_against,
  avg_corners_for,
  avg_cards_for,
  avg_total_shots_for,
  avg_shots_on_target_for,
  avg_fouls_committed,
  avg_offsides_for,
  avg_tackles_for
`;

const PLAYER_SEASON_SELECT = `
  player_id,
  team_id,
  appearances,
  lineups,
  minutes,
  goals,
  assists,
  total_shots,
  shots_on_target,
  yellow_cards,
  red_cards,
  fouls_committed,
  fouls_drawn,
  tackles,
  offsides,
  goals_per90,
  assists_per90,
  shots_per90,
  shots_on_target_per90,
  fouls_committed_per90,
  fouls_drawn_per90,
  tackles_per90,
  offsides_per90
`;

function toSingle<T>(value: T | T[] | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toTeam(row: TeamRow | null | undefined, fallbackId: number): WorldCupTeam {
  return {
    id: row?.id ?? fallbackId,
    logoUrl: row?.logo_url ?? null,
    name: row?.name ?? `Team ${fallbackId}`,
  };
}

function groupSortKey(groupName: string) {
  const match = groupName.match(/group\s+([a-z])/i);
  return match ? match[1].toUpperCase().charCodeAt(0) : 999;
}

function parseScope(value: string | null): WorldCupScope {
  return value === 'home' || value === 'away' ? value : 'overall';
}

function parseSource(value: string | null): WorldCupPlayerSource {
  return value === 'worldcup' ? 'worldcup' : 'qualifiers';
}

function parseMetric(value: string | null): WorldCupPlayerMetric {
  switch (value) {
    case 'assists':
    case 'goal_involvements':
    case 'cards':
    case 'shots':
    case 'shots_on_target':
    case 'fouls_committed':
    case 'fouls_drawn':
    case 'tackles':
    case 'offsides':
      return value;
    default:
      return 'goals';
  }
}

export function parseWorldCupTopPlayerParams(searchParams: URLSearchParams) {
  const pageRaw = Number(searchParams.get('page') ?? '1');
  const pageSizeRaw = Number(searchParams.get('pageSize') ?? '20');

  return {
    metric: parseMetric(searchParams.get('metric') ?? searchParams.get('category')),
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1,
    pageSize: Math.min(50, Math.max(10, Number.isFinite(pageSizeRaw) ? Math.trunc(pageSizeRaw) : 20)),
    scope: parseScope(searchParams.get('scope')),
    source: parseSource(searchParams.get('source')),
  };
}

export async function loadWorldCupFixtures(): Promise<WorldCupFixture[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('fixtures')
    .select(FIXTURE_SELECT)
    .eq('league_id', WORLD_CUP_LEAGUE_ID)
    .eq('season', WORLD_CUP_SEASON)
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to load World Cup fixtures: ${error.message}`);
  }

  return ((data ?? []) as FixtureRow[]).map((fixture) => {
    const homeTeam = toSingle<TeamRow>(fixture.home_team);
    const awayTeam = toSingle<TeamRow>(fixture.away_team);
    return {
      awayGoals: fixture.away_goals,
      awayTeam: toTeam(awayTeam, fixture.away_team_id),
      date: fixture.date,
      homeGoals: fixture.home_goals,
      homeTeam: toTeam(homeTeam, fixture.home_team_id),
      id: fixture.id,
      refereeName: fixture.referee_name_raw,
      roundName: fixture.round_name,
      statusShort: fixture.status_short,
    };
  });
}

export async function loadWorldCupStandings(): Promise<WorldCupStandingsGroup[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('team_standings')
    .select(`
      team_id,
      rank,
      points,
      goals_diff,
      group_name,
      form,
      status,
      description,
      played,
      win,
      draw,
      loss,
      goals_for,
      goals_against,
      home_played,
      home_win,
      home_draw,
      home_loss,
      home_goals_for,
      home_goals_against,
      away_played,
      away_win,
      away_draw,
      away_loss,
      away_goals_for,
      away_goals_against
    `)
    .eq('league_id', WORLD_CUP_LEAGUE_ID)
    .eq('season', WORLD_CUP_SEASON);

  if (error) {
    throw new Error(`Failed to load World Cup standings: ${error.message}`);
  }

  const standings = (data ?? []) as StandingRow[];
  const teamIds = standings.map((row) => row.team_id);
  const teams = await loadTeamsById(teamIds);
  const groups = new Map<string, WorldCupStandingRow[]>();

  for (const row of standings) {
    const groupName = row.group_name ?? 'Group';
    const rows = groups.get(groupName) ?? [];
    rows.push({
      away: {
        draw: row.away_draw,
        goalsAgainst: row.away_goals_against,
        goalsFor: row.away_goals_for,
        loss: row.away_loss,
        played: row.away_played,
        win: row.away_win,
      },
      description: row.description,
      draw: row.draw,
      form: row.form,
      goalsAgainst: row.goals_against,
      goalsDiff: row.goals_diff,
      goalsFor: row.goals_for,
      groupName,
      home: {
        draw: row.home_draw,
        goalsAgainst: row.home_goals_against,
        goalsFor: row.home_goals_for,
        loss: row.home_loss,
        played: row.home_played,
        win: row.home_win,
      },
      loss: row.loss,
      played: row.played,
      points: row.points,
      rank: row.rank,
      status: row.status,
      team: toTeam(teams.get(row.team_id), row.team_id),
      win: row.win,
    });
    groups.set(groupName, rows);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => groupSortKey(left) - groupSortKey(right) || left.localeCompare(right))
    .map(([groupName, rows]) => ({
      groupName,
      rows: rows.slice().sort((left, right) => {
        if ((left.rank ?? 999) !== (right.rank ?? 999)) return (left.rank ?? 999) - (right.rank ?? 999);
        return left.team.name.localeCompare(right.team.name);
      }),
    }));
}

export async function loadWorldCupTeamAverages(): Promise<WorldCupTeamAverage[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('team_stat_averages')
    .select(TEAM_AVERAGE_SELECT)
    .eq('league_id', WORLD_CUP_LEAGUE_ID)
    .eq('season', WORLD_CUP_SEASON)
    .eq('scope', 'overall');

  if (error) {
    throw new Error(`Failed to load World Cup team averages: ${error.message}`);
  }

  const rows = (data ?? []) as TeamAverageRow[];
  const teams = await loadTeamsById(rows.map((row) => row.team_id));
  return rows
    .map((row) => ({
      avgCardsFor: toNumber(row.avg_cards_for),
      avgCornersFor: toNumber(row.avg_corners_for),
      avgFoulsCommitted: toNumber(row.avg_fouls_committed),
      avgGoalsAgainst: toNumber(row.avg_goals_against),
      avgGoalsFor: toNumber(row.avg_goals_for),
      avgOffsidesFor: toNumber(row.avg_offsides_for),
      avgShotsOnTargetFor: toNumber(row.avg_shots_on_target_for),
      avgTacklesFor: toNumber(row.avg_tackles_for),
      avgTotalShotsFor: toNumber(row.avg_total_shots_for),
      matchesPlayed: row.matches_played,
      team: toTeam(teams.get(row.team_id), row.team_id),
    }))
    .sort((left, right) => left.team.name.localeCompare(right.team.name));
}

export async function loadWorldCupTopPlayers({
  metric,
  page,
  pageSize,
  scope,
  source,
}: {
  metric: WorldCupPlayerMetric;
  page: number;
  pageSize: number;
  scope: WorldCupScope;
  source: WorldCupPlayerSource;
}): Promise<WorldCupTopPlayersResult> {
  // Qualifiers (projected pre-tournament form) and World Cup (organic tournament
  // stats) are distinct datasets that coexist per player, so they live in
  // separate tables: projected rows in player_tournament_projected_stats,
  // organic rows in player_season_stats. No shared-PK collision.
  const supabaseAdmin = getSupabaseAdmin();
  const table = source === 'worldcup' ? 'player_season_stats' : 'player_tournament_projected_stats';
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(PLAYER_SEASON_SELECT)
    .eq('league_id', WORLD_CUP_LEAGUE_ID)
    .eq('season', WORLD_CUP_SEASON)
    .eq('scope', scope)
    .gt('minutes', 0);

  if (error) {
    throw new Error(`Failed to load World Cup top players: ${error.message}`);
  }

  const rows = ((data ?? []) as PlayerSeasonRow[])
    .map((row) => ({ row, total: playerMetricTotal(row, metric), per90: playerMetricPer90(row, metric) }))
    .filter((item) => item.total > 0)
    .sort((left, right) => {
      if (left.total !== right.total) return right.total - left.total;
      if ((left.per90 ?? -1) !== (right.per90 ?? -1)) return (right.per90 ?? -1) - (left.per90 ?? -1);
      if (left.row.minutes !== right.row.minutes) return right.row.minutes - left.row.minutes;
      return left.row.player_id - right.row.player_id;
    });

  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const playerIds = pageRows.map((item) => item.row.player_id);
  const teamIds = pageRows.map((item) => item.row.team_id);
  const [players, teams] = await Promise.all([loadPlayersById(playerIds), loadTeamsById(teamIds)]);

  return {
    metric,
    page,
    pageSize,
    rows: pageRows.map((item, index) => ({
      appearances: item.row.appearances,
      lineups: item.row.lineups,
      metric,
      minutes: item.row.minutes,
      pageRank: start + index + 1,
      per90: item.per90,
      playerId: item.row.player_id,
      playerName: players.get(item.row.player_id)?.name ?? `Player ${item.row.player_id}`,
      source,
      substitutes: Math.max(0, item.row.appearances - item.row.lineups),
      team: toTeam(teams.get(item.row.team_id), item.row.team_id),
      total: item.total,
    })),
    scope,
    source,
    totalRows: rows.length,
  };
}

async function loadTeamsById(teamIds: number[]) {
  const uniqueIds = [...new Set(teamIds)].filter((id) => Number.isInteger(id));
  if (uniqueIds.length === 0) {
    return new Map<number, TeamRow>();
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('id, name, logo_url')
    .in('id', uniqueIds);

  if (error) {
    throw new Error(`Failed to load World Cup teams: ${error.message}`);
  }

  return new Map<number, TeamRow>(((data ?? []) as TeamRow[]).map((team) => [team.id, team]));
}

async function loadPlayersById(playerIds: number[]) {
  const uniqueIds = [...new Set(playerIds)].filter((id) => Number.isInteger(id));
  if (uniqueIds.length === 0) {
    return new Map<number, PlayerRow>();
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('id, name')
    .in('id', uniqueIds);

  if (error) {
    throw new Error(`Failed to load World Cup players: ${error.message}`);
  }

  return new Map<number, PlayerRow>(((data ?? []) as PlayerRow[]).map((player) => [player.id, player]));
}

function playerMetricTotal(row: PlayerSeasonRow, metric: WorldCupPlayerMetric) {
  switch (metric) {
    case 'assists':
      return row.assists;
    case 'goal_involvements':
      return row.goals + row.assists;
    case 'cards':
      return row.yellow_cards + row.red_cards;
    case 'shots':
      return row.total_shots;
    case 'shots_on_target':
      return row.shots_on_target;
    case 'fouls_committed':
      return row.fouls_committed;
    case 'fouls_drawn':
      return row.fouls_drawn;
    case 'tackles':
      return row.tackles;
    case 'offsides':
      return row.offsides;
    case 'goals':
    default:
      return row.goals;
  }
}

function playerMetricPer90(row: PlayerSeasonRow, metric: WorldCupPlayerMetric) {
  if (row.minutes <= 0) return null;
  switch (metric) {
    case 'assists':
      return toNumber(row.assists_per90);
    case 'shots':
      return toNumber(row.shots_per90);
    case 'shots_on_target':
      return toNumber(row.shots_on_target_per90);
    case 'fouls_committed':
      return toNumber(row.fouls_committed_per90);
    case 'fouls_drawn':
      return toNumber(row.fouls_drawn_per90);
    case 'tackles':
      return toNumber(row.tackles_per90);
    case 'offsides':
      return toNumber(row.offsides_per90);
    case 'goal_involvements':
      return Number((((row.goals + row.assists) / row.minutes) * 90).toFixed(2));
    case 'cards':
      return Number((((row.yellow_cards + row.red_cards) / row.minutes) * 90).toFixed(2));
    case 'goals':
    default:
      return toNumber(row.goals_per90);
  }
}
