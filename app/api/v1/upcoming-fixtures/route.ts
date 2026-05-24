import { NextRequest, NextResponse } from 'next/server';
import { parsePositiveInt, jsonError } from '@/lib/server/api';
import { loadUpcomingFixtures } from '@/lib/server/fixture-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const days = parsePositiveInt(request.nextUrl.searchParams.get('days'), 6, 1, 14);
    const fixtures = await loadUpcomingFixtures(days, 'comparison');
    return NextResponse.json(fixtures);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upcoming fixtures could not be loaded.';
    return jsonError(message, 500);
  }
}

