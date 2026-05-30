import { NextResponse, type NextRequest } from 'next/server';
import { loadPlayerPropEvidence } from '@/lib/server/player-prop-scanner';
import type { PropScope } from '@/lib/server/player-prop-scanner';

export const revalidate = 30;

function parseScope(value: string | null): PropScope {
  if (value === 'home' || value === 'away') return value;
  return 'overall';
}

export async function GET(request: NextRequest) {
  const routeStartedAt = Date.now();
  const sp = request.nextUrl.searchParams;

  const propKey = sp.get('propKey');
  const leagueIdRaw = sp.get('leagueId');
  const seasonRaw = sp.get('season');
  const playerIdRaw = sp.get('playerId');
  const teamIdRaw = sp.get('teamId');
  const scope = parseScope(sp.get('scope'));

  if (!propKey) {
    return NextResponse.json({ error: 'propKey is required.' }, { status: 400 });
  }
  const leagueId = leagueIdRaw ? Number.parseInt(leagueIdRaw, 10) : NaN;
  const season = seasonRaw ? Number.parseInt(seasonRaw, 10) : NaN;
  const playerId = playerIdRaw ? Number.parseInt(playerIdRaw, 10) : NaN;
  const teamId = teamIdRaw ? Number.parseInt(teamIdRaw, 10) : NaN;

  if (!Number.isInteger(leagueId) || leagueId <= 0) {
    return NextResponse.json({ error: 'leagueId must be a positive integer.' }, { status: 400 });
  }
  if (!Number.isInteger(season) || season <= 2000) {
    return NextResponse.json({ error: 'season must be a valid year.' }, { status: 400 });
  }
  if (!Number.isInteger(playerId) || playerId <= 0) {
    return NextResponse.json({ error: 'playerId must be a positive integer.' }, { status: 400 });
  }
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json({ error: 'teamId must be a positive integer.' }, { status: 400 });
  }

  try {
    const result = await loadPlayerPropEvidence(propKey, leagueId, season, playerId, teamId, scope);
    const rowsReturned = result.rows.length;
    const serializationStartedAt = Date.now();
    const body = JSON.stringify({ result });
    const serializationMs = Date.now() - serializationStartedAt;
    const totalRouteMs = Date.now() - routeStartedAt;

    const response = new NextResponse(body, {
      headers: { 'content-type': 'application/json' },
    });
    response.headers.set(
      'Server-Timing',
      [
        `serialization_time;dur=${serializationMs}`,
        `total_time;dur=${totalRouteMs}`,
        `rows_returned;dur=${rowsReturned}`,
        `payload_bytes;dur=${Buffer.byteLength(body)}`,
      ].join(', '),
    );
    response.headers.set('X-Rows-Returned', String(rowsReturned));
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=45');
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Player prop evidence could not be loaded.' },
      { status: 500 },
    );
  }
}
