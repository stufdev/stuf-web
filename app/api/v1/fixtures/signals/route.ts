import { NextResponse, type NextRequest } from 'next/server';
import {
  loadFixtureSignalFilterOptions,
  loadFixtureSignalsWithTiming,
  parseFixtureSignalFilters,
} from '@/lib/server/fixture-signals';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const routeStartedAt = Date.now();

  try {
    const searchParams: Record<string, string> = {};
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      searchParams[key] = value;
    }

    const options = await loadFixtureSignalFilterOptions();
    const filters = parseFixtureSignalFilters(searchParams, options);
    const { result, timing } = await loadFixtureSignalsWithTiming(filters);

    const cardsReturned = result.cards.length;
    const serializationStartedAt = Date.now();
    const body = JSON.stringify({ filters, options, result, timing });
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
        `cards_returned;dur=${cardsReturned}`,
        `rows_read;dur=${timing.rowCount}`,
        `payload_bytes;dur=${Buffer.byteLength(body)}`,
      ].join(', '),
    );
    response.headers.set('X-Cards-Returned', String(cardsReturned));
    response.headers.set('X-Payload-Bytes', String(Buffer.byteLength(body)));
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=45');
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fixture signals could not be loaded.' },
      { status: 500 },
    );
  }
}
