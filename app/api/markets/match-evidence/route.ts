import { NextResponse, type NextRequest } from 'next/server';
import {
  loadCornerFilterOptions,
  loadCornerMatchEvidence,
  parseCornerFilters,
  type CornerDetailTiming,
} from '@/lib/server/corner-detail-scanner';
import {
  loadShotFilterOptions,
  loadShotMatchEvidence,
  parseShotFilters,
  type ShotDetailTiming,
} from '@/lib/server/shot-market-scanner';
import {
  loadOffsideFilterOptions,
  loadOffsideMatchEvidence,
  parseOffsideFilters,
  type OffsideDetailTiming,
} from '@/lib/server/offside-market-scanner';
import {
  loadCardFilterOptions,
  loadCardMatchEvidence,
  parseCardFilters,
  type CardDetailTiming,
} from '@/lib/server/card-market-scanner';
import {
  loadGoalFilterOptions,
  loadGoalMatchEvidence,
  normalizeGoalFamily,
  parseGoalFilters,
  statisticFromGoalMarketKey,
  type GoalDetailTiming,
} from '@/lib/server/goal-market-scanner';

export const revalidate = 30;

type MarketSearchParams = Record<string, string | string[] | undefined>;
type MarketDetailTiming = (CornerDetailTiming | ShotDetailTiming | GoalDetailTiming | OffsideDetailTiming | CardDetailTiming) & {
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

function parseTeamIds(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((teamId) => Number.isInteger(teamId) && teamId > 0);
}

function serverTiming(timing: MarketDetailTiming) {
  return [
    `db_profile_time;dur=${timing.dbProfileMs}`,
    `db_evidence_time;dur=${timing.dbEvidenceMs}`,
    `transform_time;dur=${timing.transformMs}`,
    `serialization_time;dur=${timing.serializationMs}`,
    `total_time;dur=${timing.totalRouteMs}`,
    `rows_returned;dur=${timing.returnedEvidenceRowCount}`,
    `payload_bytes;dur=${timing.payloadBytes}`,
  ].join(', ');
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') ?? 'corners';
  if (category !== 'corners' && category !== 'shots' && category !== 'goals' && category !== 'offsides' && category !== 'cards') {
    return NextResponse.json({ error: `Unsupported match evidence category: ${category}` }, { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const searchParamRecord = toSearchParamRecord(request.nextUrl.searchParams);
    const teamIds = parseTeamIds(request.nextUrl.searchParams.get('teamIds'));
    const { filters, result, timing } = category === 'corners'
      ? await (async () => {
          const options = await loadCornerFilterOptions();
          const filters = parseCornerFilters(searchParamRecord, options);
          const selectedTeamIds = teamIds.length > 0 ? teamIds : filters.teamId === null ? [] : [filters.teamId];
          if (selectedTeamIds.length === 0) {
            throw new Error('teamIds is required for match evidence requests.');
          }
          const { result, timing } = await loadCornerMatchEvidence(filters, selectedTeamIds);
          return { filters, result, timing };
        })()
      : category === 'shots'
        ? await (async () => {
          const options = await loadShotFilterOptions();
          const filters = parseShotFilters(searchParamRecord, options);
          const selectedTeamIds = teamIds.length > 0 ? teamIds : filters.teamId === null ? [] : [filters.teamId];
          if (selectedTeamIds.length === 0) {
            throw new Error('teamIds is required for match evidence requests.');
          }
          const { result, timing } = await loadShotMatchEvidence(filters, selectedTeamIds);
          return { filters, result, timing };
        })()
        : category === 'offsides'
          ? await (async () => {
            const options = await loadOffsideFilterOptions();
            const filters = parseOffsideFilters(searchParamRecord, options);
            const selectedTeamIds = teamIds.length > 0 ? teamIds : filters.teamId === null ? [] : [filters.teamId];
            if (selectedTeamIds.length === 0) {
              throw new Error('teamIds is required for match evidence requests.');
            }
            const { result, timing } = await loadOffsideMatchEvidence(filters, selectedTeamIds);
            return { filters, result, timing };
          })()
          : category === 'cards'
            ? await (async () => {
              const options = await loadCardFilterOptions();
              const filters = parseCardFilters(searchParamRecord, options);
              const selectedTeamIds = teamIds.length > 0 ? teamIds : filters.teamId === null ? [] : [filters.teamId];
              if (selectedTeamIds.length === 0) {
                throw new Error('teamIds is required for match evidence requests.');
              }
              const { result, timing } = await loadCardMatchEvidence(filters, selectedTeamIds);
              return { filters, result, timing };
            })()
            : await (async () => {
          const family = statisticFromGoalMarketKey(firstParam(searchParamRecord.marketKey) ?? '')?.family
            ?? normalizeGoalFamily(searchParamRecord.family);
          const options = await loadGoalFilterOptions(family);
          const filters = parseGoalFilters(searchParamRecord, options);
          const selectedTeamIds = teamIds.length > 0 ? teamIds : filters.teamId === null ? [] : [filters.teamId];
          if (selectedTeamIds.length === 0) {
            throw new Error('teamIds is required for match evidence requests.');
          }
          const { result, timing } = await loadGoalMatchEvidence(filters, selectedTeamIds);
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
    response.headers.set('X-Rows-Returned', String(timing.returnedEvidenceRowCount));
    response.headers.set('X-Payload-Bytes', String(payloadBytes));
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=45');
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'teamIds is required for match evidence requests.') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Match evidence could not be loaded.' },
      { status: 500 },
    );
  }
}
