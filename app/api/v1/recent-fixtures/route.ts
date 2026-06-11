import { NextRequest, NextResponse } from 'next/server';
import { loadRecentFixtures } from '@/lib/server/fixture-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const daysRaw = Number(request.nextUrl.searchParams.get('days') ?? '30');
  const days = Math.min(Math.max(Number.isFinite(daysRaw) ? daysRaw : 30, 1), 60);

  try {
    const fixtures = await loadRecentFixtures(days, 'comparison');
    return NextResponse.json(fixtures);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recent fixtures could not be loaded.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
