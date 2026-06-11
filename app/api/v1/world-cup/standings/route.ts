import { NextResponse } from 'next/server';
import { loadWorldCupStandings } from '@/lib/server/world-cup';

export const dynamic = 'force-dynamic';

export async function GET() {
  const routeStartedAt = Date.now();

  try {
    const dbStartedAt = Date.now();
    const groups = await loadWorldCupStandings();
    const dbMs = Date.now() - dbStartedAt;
    const serializationStartedAt = Date.now();
    const body = JSON.stringify({ groups });
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
        `groups_returned;dur=${groups.length}`,
        `rows_returned;dur=${groups.reduce((sum, group) => sum + group.rows.length, 0)}`,
        `payload_bytes;dur=${Buffer.byteLength(body)}`,
      ].join(', '),
    );
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'World Cup standings could not be loaded.' },
      { status: 500 },
    );
  }
}
