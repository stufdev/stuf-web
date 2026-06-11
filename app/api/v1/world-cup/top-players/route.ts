import { NextResponse, type NextRequest } from 'next/server';
import { loadWorldCupTopPlayers, parseWorldCupTopPlayerParams } from '@/lib/server/world-cup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const routeStartedAt = Date.now();

  try {
    const params = parseWorldCupTopPlayerParams(request.nextUrl.searchParams);
    const dbStartedAt = Date.now();
    const result = await loadWorldCupTopPlayers(params);
    const dbMs = Date.now() - dbStartedAt;
    const serializationStartedAt = Date.now();
    const body = JSON.stringify(result);
    const serializationMs = Date.now() - serializationStartedAt;
    const totalRouteMs = Date.now() - routeStartedAt;
    const response = new NextResponse(body, {
      headers: { 'content-type': 'application/json' },
    });
    response.headers.set(
      'Server-Timing',
      [
        `db_time;dur=${dbMs}`,
        `serialization_time;dur=${serializationMs}`,
        `total_time;dur=${totalRouteMs}`,
        `rows_returned;dur=${result.rows.length}`,
        `total_rows;dur=${result.totalRows}`,
        `payload_bytes;dur=${Buffer.byteLength(body)}`,
      ].join(', '),
    );
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'World Cup top players could not be loaded.' },
      { status: 500 },
    );
  }
}
