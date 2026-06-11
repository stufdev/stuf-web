import { NextRequest, NextResponse } from 'next/server';
import { clampInt, jsonError, parsePositiveInt } from '@/lib/server/api';
import { loadFixturesBoard, type FixturesBoardMode } from '@/lib/server/fixtures-board';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = parsePositiveInt(searchParams.get('days'), 6, 1, 14);
  const marketKey = searchParams.get('marketKey') ?? '';
  const threshold = clampInt(Number(searchParams.get('threshold') ?? 60), 0, 100);
  const windowValue = searchParams.get('window') ?? 'all';
  const windowOption = windowValue === 'all' ? 'all' : parsePositiveInt(windowValue, 5, 1, 20);
  const modeRaw = searchParams.get('mode');
  const mode: FixturesBoardMode = modeRaw === 'recent' ? 'recent' : 'upcoming';

  if (!marketKey) {
    return jsonError('marketKey is required.');
  }

  try {
    const payload = await loadFixturesBoard(days, marketKey, windowOption, threshold, mode);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fixtures board could not be loaded.';
    return jsonError(message, 500);
  }
}

