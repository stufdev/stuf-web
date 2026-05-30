import { NextRequest, NextResponse } from 'next/server';
import type { ComparisonScope } from '@/app/comparison/types';
import { jsonError, parsePositiveInt } from '@/lib/server/api';
import { loadComparisonCore } from '@/lib/server/comparison-data';

export const dynamic = 'force-dynamic';

const MARKET_KEY_PATTERN = /^[A-Z0-9_]+$/;

export async function GET(request: NextRequest) {
  const fixtureId = parsePositiveInt(request.nextUrl.searchParams.get('fixtureId'), 0, 1);
  const scopeValue = request.nextUrl.searchParams.get('scope');
  const scope: ComparisonScope = scopeValue === 'split' ? 'split' : 'all';

  const rawMarketKey = request.nextUrl.searchParams.get('marketKey');
  const marketKey = rawMarketKey && MARKET_KEY_PATTERN.test(rawMarketKey) ? rawMarketKey : null;

  if (fixtureId <= 0) {
    return jsonError('fixtureId is required.');
  }

  try {
    const payload = await loadComparisonCore(fixtureId, scope, marketKey);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Comparison data could not be loaded.';
    return jsonError(message, 500);
  }
}
