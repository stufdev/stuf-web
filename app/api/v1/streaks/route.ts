import { NextRequest, NextResponse } from 'next/server';
import { jsonError, parsePositiveInt } from '@/lib/server/api';
import { loadStreakRows } from '@/lib/server/streaks';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = parsePositiveInt(searchParams.get('days'), 4, 1, 14);
  const marketKey = searchParams.get('marketKey') ?? '';
  const minimumStreak = parsePositiveInt(searchParams.get('minimumStreak'), 5, 1, 50);

  if (!marketKey) {
    return jsonError('marketKey is required.');
  }

  try {
    const payload = await loadStreakRows(days, marketKey, minimumStreak);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Streak rows could not be loaded.';
    return jsonError(message, 500);
  }
}
