import { NextRequest, NextResponse } from 'next/server';
import type { ComparisonScope } from '@/app/comparison/types';
import { jsonError, parsePositiveInt } from '@/lib/server/api';
import { loadComparisonCore } from '@/lib/server/comparison-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const fixtureId = parsePositiveInt(request.nextUrl.searchParams.get('fixtureId'), 0, 1);
  const scopeValue = request.nextUrl.searchParams.get('scope');
  const scope: ComparisonScope = scopeValue === 'split' ? 'split' : 'all';

  if (fixtureId <= 0) {
    return jsonError('fixtureId is required.');
  }

  try {
    const payload = await loadComparisonCore(fixtureId, scope);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Comparison data could not be loaded.';
    return jsonError(message, 500);
  }
}

