import { NextResponse, type NextRequest } from 'next/server';
import { loadWorldCupPlayerStreaks } from '@/lib/server/world-cup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const routeStartedAt = Date.now();

  const minStreakRaw = Number(request.nextUrl.searchParams.get('minStreak') ?? '2');
  const minStreak = Number.isFinite(minStreakRaw) ? Math.max(1, Math.min(20, Math.trunc(minStreakRaw))) : 2;

  try {
    const dbStartedAt = Date.now();
    const result = await loadWorldCupPlayerStreaks(minStreak);
    const dbMs = Date.now() - dbStartedAt;
    const serializationStartedAt = Date.now();
    const body = JSON.stringify(result);
    const serializationMs = Date.now() - serializationStartedAt;
    const totalMs = Date.now() - routeStartedAt;

    const response = new NextResponse(body, {
      headers: { 'content-type': 'application/json' },
    });
    response.headers.set(
      'Server-Timing',
      [
        `db_time;dur=${dbMs}`,
        `serialization_time;dur=${serializationMs}`,
        `total_time;dur=${totalMs}`,
        `rows_returned;dur=${result.rows.length}`,
      ].join(', '),
    );
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'World Cup player streaks could not be loaded.' },
      { status: 500 },
    );
  }
}
