import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/api';
import { loadDecisionCardsForFixture } from '@/lib/server/decision-cards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const fixtureId = Number(request.nextUrl.searchParams.get('fixtureId'));

  if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
    return jsonError('fixtureId is required.');
  }

  try {
    const cards = await loadDecisionCardsForFixture(fixtureId);
    return NextResponse.json({ cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Decision cards could not be loaded.';
    return jsonError(message, 500);
  }
}
