import { NextResponse, type NextRequest } from 'next/server';
import {
  loadCornerQuickFilterOptions,
  loadCornerQuickScannerWithTiming,
  parseCornerQuickFilters,
} from '@/lib/server/corner-quick-scanner';
import {
  loadShotFilterOptions,
  loadShotQuickScannerWithTiming,
  parseShotQuickFilters,
} from '@/lib/server/shot-market-scanner';
import {
  loadOffsideFilterOptions,
  loadOffsideQuickScannerWithTiming,
  parseOffsideQuickFilters,
} from '@/lib/server/offside-market-scanner';
import {
  loadCardFilterOptions,
  loadCardQuickScannerWithTiming,
  parseCardQuickFilters,
} from '@/lib/server/card-market-scanner';
import {
  loadGoalFilterOptions,
  loadGoalQuickScannerWithTiming,
  normalizeGoalFamily,
  parseGoalQuickFilters,
  statisticFromGoalMarketKey,
} from '@/lib/server/goal-market-scanner';
import {
  loadGenericFilterOptions,
  loadGenericQuickScannerWithTiming,
  parseGenericQuickFilters,
} from '@/lib/server/generic-market-scanner';
import { isGenericMarketCategory } from '@/lib/generic-market-categories';

export const revalidate = 30;

type MarketSearchParams = Record<string, string | string[] | undefined>;

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

export async function GET(request: NextRequest) {
  const routeStartedAt = Date.now();
  const category = request.nextUrl.searchParams.get('category') ?? 'corners';
  const isKnownCategory = category === 'corners' || category === 'shots' || category === 'goals' || category === 'offsides' || category === 'cards' || isGenericMarketCategory(category);
  if (!isKnownCategory) {
    return NextResponse.json({ error: `Unsupported market ranking category: ${category}` }, { status: 400 });
  }

  try {
    const searchParamRecord = toSearchParamRecord(request.nextUrl.searchParams);
    const { filters, result, timing } = category === 'corners'
      ? await (async () => {
          const options = await loadCornerQuickFilterOptions();
          const filters = parseCornerQuickFilters(searchParamRecord, options);
          const { result, timing } = await loadCornerQuickScannerWithTiming(filters);
          return { filters, result, timing };
        })()
      : category === 'shots'
        ? await (async () => {
          const options = await loadShotFilterOptions();
          const filters = parseShotQuickFilters(searchParamRecord, options);
          const { result, timing } = await loadShotQuickScannerWithTiming(filters);
          return { filters, result, timing };
        })()
        : category === 'offsides'
          ? await (async () => {
            const options = await loadOffsideFilterOptions();
            const filters = parseOffsideQuickFilters(searchParamRecord, options);
            const { result, timing } = await loadOffsideQuickScannerWithTiming(filters);
            return { filters, result, timing };
          })()
          : category === 'cards'
            ? await (async () => {
              const options = await loadCardFilterOptions();
              const filters = parseCardQuickFilters(searchParamRecord, options);
              const { result, timing } = await loadCardQuickScannerWithTiming(filters);
              return { filters, result, timing };
            })()
            : isGenericMarketCategory(category)
              ? await (async () => {
                const options = await loadGenericFilterOptions(category);
                const filters = parseGenericQuickFilters(searchParamRecord, options);
                const { result, timing } = await loadGenericQuickScannerWithTiming(filters);
                return { filters, result, timing };
              })()
              : await (async () => {
          const family = statisticFromGoalMarketKey(firstParam(searchParamRecord.marketKey) ?? '')?.family
            ?? normalizeGoalFamily(searchParamRecord.family);
          const options = await loadGoalFilterOptions(family);
          const filters = parseGoalQuickFilters(searchParamRecord, options);
          const { result, timing } = await loadGoalQuickScannerWithTiming(filters);
          return { filters, result, timing };
        })();
    const rowsReturned = result.columns.reduce((total, column) => total + column.rows.length, 0);
    const serializationStartedAt = Date.now();
    const body = JSON.stringify({ filters, result, timing });
    const serializationMs = Date.now() - serializationStartedAt;
    const totalRouteMs = Date.now() - routeStartedAt;
    const response = new NextResponse(body, {
      headers: {
        'content-type': 'application/json',
      },
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
      { error: error instanceof Error ? error.message : 'Market rankings could not be loaded.' },
      { status: 500 },
    );
  }
}
