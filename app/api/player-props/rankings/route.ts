import { NextResponse, type NextRequest } from 'next/server';
import {
  loadPlayerPropFilterOptions,
  loadPlayerPropRankingsWithTiming,
  parsePlayerPropFilters,
} from '@/lib/server/player-prop-scanner';

export const revalidate = 30;

export async function GET(request: NextRequest) {
  const routeStartedAt = Date.now();

  try {
    const searchParams: Record<string, string> = {};
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      searchParams[key] = value;
    }

    const options = await loadPlayerPropFilterOptions();
    const filters = parsePlayerPropFilters(searchParams, options);
    const { result, timing } = await loadPlayerPropRankingsWithTiming(filters);

    const rowsReturned = result.rows.length;
    const serializationStartedAt = Date.now();
    const body = JSON.stringify({ filters, result, timing });
    const serializationMs = Date.now() - serializationStartedAt;
    const totalRouteMs = Date.now() - routeStartedAt;

    const response = new NextResponse(body, {
      headers: { 'content-type': 'application/json' },
    });
    response.headers.set(
      'Server-Timing',
      [
        `db_time;dur=${timing.dbMs}`,
        `transform_time;dur=${timing.transformMs}`,
        `serialization_time;dur=${serializationMs}`,
        `total_time;dur=${totalRouteMs}`,
        `rows_returned;dur=${rowsReturned}`,
        `payload_bytes;dur=${Buffer.byteLength(body)}`,
      ].join(', '),
    );
    response.headers.set('X-Rows-Returned', String(rowsReturned));
    response.headers.set('X-Payload-Bytes', String(Buffer.byteLength(body)));
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=45');
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Player prop rankings could not be loaded.' },
      { status: 500 },
    );
  }
}
