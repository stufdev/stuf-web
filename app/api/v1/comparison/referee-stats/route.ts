import { NextRequest, NextResponse } from 'next/server';
import { jsonError, parsePositiveInt } from '@/lib/server/api';
import { loadComparisonRefereeStats } from '@/lib/server/referee-stats';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const refereeId = parsePositiveInt(searchParams.get('refereeId'), 0, 1);
  const leagueId = parsePositiveInt(searchParams.get('leagueId'), 0, 1);
  const season = parsePositiveInt(searchParams.get('season'), 0, 1);

  if (!refereeId || !leagueId || !season) {
    return jsonError('refereeId, leagueId and season are required.');
  }

  try {
    const payload = await loadComparisonRefereeStats(refereeId, leagueId, season);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Referee stats could not be loaded.';
    return jsonError(message, 500);
  }
}

