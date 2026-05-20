import { NextRequest, NextResponse } from 'next/server';
import type { ComparisonScope, PlayerGoalSplitId, PlayerStatsCategoryId } from '@/app/comparison/types';
import { jsonError, parsePositiveInt } from '@/lib/server/api';
import { loadComparisonPlayerStats } from '@/lib/server/player-stats';

export const dynamic = 'force-dynamic';

const PLAYER_STATS_CATEGORIES = new Set<PlayerStatsCategoryId>([
  'goals',
  'assists',
  'cards',
  'shots',
  'shots_on_target',
  'fouls',
  'fouls_won',
  'tackles',
  'offsides',
]);

const PLAYER_GOAL_SPLITS = new Set<PlayerGoalSplitId>([
  'goals',
  'first_goals',
  'goals_1h',
  'goals_2h',
]);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const homeTeamId = parsePositiveInt(searchParams.get('homeTeamId'), 0, 1);
  const awayTeamId = parsePositiveInt(searchParams.get('awayTeamId'), 0, 1);
  const leagueId = parsePositiveInt(searchParams.get('leagueId'), 0, 1);
  const season = parsePositiveInt(searchParams.get('season'), 0, 1);
  const scope: ComparisonScope = searchParams.get('scope') === 'split' ? 'split' : 'all';
  const categoryParam = searchParams.get('category');
  const goalSplitParam = searchParams.get('goalSplit');
  const category: PlayerStatsCategoryId = PLAYER_STATS_CATEGORIES.has(categoryParam as PlayerStatsCategoryId)
    ? (categoryParam as PlayerStatsCategoryId)
    : 'goals';
  const goalSplit: PlayerGoalSplitId = PLAYER_GOAL_SPLITS.has(goalSplitParam as PlayerGoalSplitId)
    ? (goalSplitParam as PlayerGoalSplitId)
    : 'goals';

  if (!homeTeamId || !awayTeamId || !leagueId || !season) {
    return jsonError('homeTeamId, awayTeamId, leagueId and season are required.');
  }

  try {
    const payload = await loadComparisonPlayerStats(
      homeTeamId,
      awayTeamId,
      leagueId,
      season,
      scope,
      category,
      goalSplit,
    );
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Player stats could not be loaded.';
    return jsonError(message, 500);
  }
}

