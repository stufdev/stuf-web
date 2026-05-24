import { NextResponse, type NextRequest } from 'next/server';
import {
  loadCornerFilterOptions,
  loadCornerLeagueTeamPanelsWithTiming,
  parseCornerFilters,
  type CornerDetailTiming,
} from '@/lib/server/corner-detail-scanner';
import {
  loadShotFilterOptions,
  loadShotTeamPanelsWithTiming,
  parseShotFilters,
  type ShotDetailTiming,
} from '@/lib/server/shot-market-scanner';
import {
  loadGoalFilterOptions,
  loadGoalTeamPanelsWithTiming,
  normalizeGoalFamily,
  parseGoalFilters,
  statisticFromGoalMarketKey,
  type GoalDetailTiming,
} from '@/lib/server/goal-market-scanner';

export const revalidate = 30;

type MarketSearchParams = Record<string, string | string[] | undefined>;
type MarketDetailTiming = (CornerDetailTiming | ShotDetailTiming | GoalDetailTiming) & {
  serializationMs: number;
  totalRouteMs: number;
  payloadBytes: number;
};

function toSearchParamRecord(searchParams: URLSearchParams): MarketSearchParams {
  const params: MarketSearchParams = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  return params;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function serverTiming(timing: MarketDetailTiming) {
  return [
    `db_profile_time;dur=${timing.dbProfileMs}`,
    `db_evidence_time;dur=${timing.dbEvidenceMs}`,
    `transform_time;dur=${timing.transformMs}`,
    `serialization_time;dur=${timing.serializationMs}`,
    `total_time;dur=${timing.totalRouteMs}`,
    `rows_returned;dur=${timing.profileRowCount}`,
    `payload_bytes;dur=${timing.payloadBytes}`,
  ].join(', ');
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') ?? 'corners';
  if (category !== 'corners' && category !== 'shots' && category !== 'goals') {
    return NextResponse.json({ error: `Unsupported team market profile category: ${category}` }, { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const searchParamRecord = toSearchParamRecord(request.nextUrl.searchParams);
    const { filters, result, timing } = category === 'corners'
      ? await (async () => {
          const options = await loadCornerFilterOptions();
          const filters = parseCornerFilters(searchParamRecord, options);
          const { result, timing } = await loadCornerLeagueTeamPanelsWithTiming(filters, { includeEvidence: false });
          return { filters, result, timing };
        })()
      : category === 'shots'
        ? await (async () => {
          const options = await loadShotFilterOptions();
          const filters = parseShotFilters(searchParamRecord, options);
          const { result, timing } = await loadShotTeamPanelsWithTiming(filters, { includeEvidence: false });
          return { filters, result, timing };
        })()
        : await (async () => {
          const family = statisticFromGoalMarketKey(firstParam(searchParamRecord.marketKey) ?? '')?.family
            ?? normalizeGoalFamily(searchParamRecord.family);
          const options = await loadGoalFilterOptions(family);
          const filters = parseGoalFilters(searchParamRecord, options);
          const { result, timing } = await loadGoalTeamPanelsWithTiming(filters, { includeEvidence: false });
          return { filters, result, timing };
        })();
    const serializationStartedAt = Date.now();
    const body = JSON.stringify({ filters, result, timing });
    const serializationMs = Date.now() - serializationStartedAt;
    const totalRouteMs = Date.now() - startedAt;
    const payloadBytes = Buffer.byteLength(body);
    const response = new NextResponse(body, {
      headers: {
        'content-type': 'application/json',
      },
    });
    response.headers.set('Server-Timing', serverTiming({ ...timing, serializationMs, totalRouteMs, payloadBytes }));
    response.headers.set('X-Rows-Returned', String(timing.profileRowCount));
    response.headers.set('X-Payload-Bytes', String(payloadBytes));
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=45');
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Team market profile could not be loaded.' },
      { status: 500 },
    );
  }
}
