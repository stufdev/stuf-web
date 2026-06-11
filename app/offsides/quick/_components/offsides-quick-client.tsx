'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import type {
  OffsideFilterOptions,
  OffsideQuickFilters,
  OffsideQuickResult,
  OffsideQuickTiming,
} from '@/lib/server/offside-market-scanner';
import { OffsidesQuickColumn } from './offsides-quick-column';
import { OffsidesQuickFilters } from './offsides-quick-filters';

type OffsidesQuickClientProps = {
  initialFilters: OffsideQuickFilters;
  initialOptions: OffsideFilterOptions;
  initialResult: OffsideQuickResult;
};

type RankingsApiResponse =
  | {
      filters: OffsideQuickFilters;
      result: OffsideQuickResult;
      timing: OffsideQuickTiming;
    }
  | {
      error: string;
    };

function quickSearchParams(filters: OffsideQuickFilters) {
  const params = new URLSearchParams();
  params.set('leagueId', String(filters.leagueId));
  params.set('season', String(filters.season));
  params.set('statistic', filters.statistic);
  params.set('line', filters.line);
  params.set('formWindow', filters.formWindow);

  if (filters.fixtureFilter !== 'all') {
    params.set('fixtureFilter', filters.fixtureFilter);
  }

  if (filters.teamSearch.trim()) {
    params.set('teamSearch', filters.teamSearch.trim());
  }

  // Raise-only main floor: only serialize when above the default 10 (15 or 20).
  if (filters.minSample > 10) {
    params.set('minSample', String(filters.minSample));
  }

  return params;
}

function selectedLeagueLabel(options: OffsideFilterOptions, filters: OffsideQuickFilters) {
  const selectedLeague = options.leagueSeasons.find(
    (item) => item.leagueId === filters.leagueId && item.season === filters.season,
  );

  return selectedLeague?.leagueName ?? `League ${filters.leagueId}`;
}

function selectedStatisticLabel(options: OffsideFilterOptions, filters: OffsideQuickFilters) {
  return options.statistics.find((option) => option.value === filters.statistic)?.label ?? 'Offsides';
}

function formatOffsideQuickTitle(filters: OffsideQuickFilters) {
  const line = filters.line;
  switch (filters.statistic) {
    case 'total_match_offsides':
      return `Total Match Offsides - Over ${line}`;
    case 'total_match_offsides_under':
      return `Total Match Offsides - Under ${line}`;
    case 'team_offsides_for':
      return `Team Offsides For - Over ${line}`;
    case 'team_offsides_against':
      return `Team Offsides Against - Over ${line}`;
    default:
      return 'Offsides Quick Search';
  }
}

export function OffsidesQuickClient({ initialFilters, initialOptions, initialResult }: OffsidesQuickClientProps) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState(initialResult);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const totalRows = result.columns.reduce((total, column) => total + column.rows.length, 0);
  const totalEmerging = result.emergingColumns.reduce((total, column) => total + column.rows.length, 0);

  async function updateFilters(nextValues: Partial<OffsideQuickFilters>) {
    const nextFilters = { ...filters, ...nextValues };
    const currentParams = quickSearchParams(filters);
    const nextParams = quickSearchParams(nextFilters);

    if (currentParams.toString() === nextParams.toString()) {
      return;
    }

    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setFilters(nextFilters);
    setErrorMessage(null);
    setIsUpdating(true);
    window.history.replaceState(null, '', `${pathname}?${nextParams.toString()}`);

    const fetchParams = new URLSearchParams(nextParams);
    fetchParams.set('category', 'offsides');

    try {
      const response = await fetch(`/api/markets/rankings?${fetchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const payload = (await response.json()) as RankingsApiResponse;
      if (!response.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : 'Offsides Quick Search could not be loaded.');
      }

      if (requestSequence.current !== requestId) {
        return;
      }

      setFilters(payload.filters);
      setResult(payload.result);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (requestSequence.current === requestId) {
        setErrorMessage(error instanceof Error ? error.message : 'Offsides Quick Search could not be loaded.');
      }
    } finally {
      if (requestSequence.current === requestId) {
        setIsUpdating(false);
      }
    }
  }

  return (
    <>
      <section className="px-4 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{formatOffsideQuickTitle(filters)}</h1>
            <div className="mt-1 text-sm text-[var(--app-text-dim)]">
              Offsides Quick Search rankings by all, home and away scope.
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--app-text-dim)]">
              <span>{selectedLeagueLabel(initialOptions, filters)}</span>
              <span>{filters.season}</span>
              <span>{selectedStatisticLabel(initialOptions, filters)}</span>
              <span>{result.marketLabel}</span>
              <span>{filters.formWindow === 'season' ? 'All season' : filters.formWindow}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              className="rounded border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
              href="/offsides"
            >
              Detailed
            </Link>
            <div className="rounded border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
              {totalRows} ranked teams
              {totalEmerging > 0 && <span className="ml-1 font-normal">· {totalEmerging} emerging</span>}
            </div>
          </div>
        </div>
      </section>

      <OffsidesQuickFilters
        filters={filters}
        isUpdating={isUpdating}
        onFiltersChange={updateFilters}
        options={initialOptions}
      />

      <section className="grid gap-4 px-4 py-4">
        {errorMessage ? (
          <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4 text-sm text-[var(--app-danger-text)]">
            {errorMessage}
          </div>
        ) : null}

        {!result.marketAvailable ? (
          <div className="border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)] p-4 text-sm text-[var(--app-text-dim)]">
            This offside market is not active in market_definitions yet: {result.marketKey}
          </div>
        ) : null}

        {totalRows === 0 && totalEmerging === 0 ? (
          <div className="border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)] px-4 py-10 text-center">
            <div className="text-sm font-semibold text-[var(--app-text)]">No offside quick results for these filters.</div>
            <div className="mt-1 text-xs text-[var(--app-text-dim)]">
              No teams meet the ranking floor (sample ≥ {filters.minSample}). Try another line, league, form window or fixture filter.
            </div>
          </div>
        ) : (
          <>
            {totalRows > 0 && (
              <div className="grid gap-4 xl:grid-cols-3">
                {result.columns.map((column) => (
                  <OffsidesQuickColumn column={column} key={column.scope} />
                ))}
              </div>
            )}

            {totalRows === 0 && totalEmerging > 0 && (
              <div className="border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-sm text-[var(--app-text-dim)]">
                No teams meet the main-ranking floor (sample ≥ {filters.minSample}). Emerging candidates only — treat as low confidence.
              </div>
            )}

            {totalEmerging > 0 && (
              <section>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-[var(--app-text)]">Emerging / low sample</h2>
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                    sample 5–9 · low confidence
                  </span>
                </div>
                <p className="mb-2 text-xs text-[var(--app-text-dim)]">
                  Below the main-ranking floor (sample ≥ 10). Shown for visibility only — not a confirmed signal.
                </p>
                <div className="grid gap-4 xl:grid-cols-3 opacity-80">
                  {result.emergingColumns.map((column) => (
                    <OffsidesQuickColumn column={column} key={`emerging-${column.scope}`} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </>
  );
}
