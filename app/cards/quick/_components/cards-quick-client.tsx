'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import type {
  CardFilterOptions,
  CardQuickFilters,
  CardQuickResult,
  CardQuickTiming,
} from '@/lib/server/card-market-scanner';
import { CardsQuickColumn } from './cards-quick-column';
import { CardsQuickFilters } from './cards-quick-filters';

type CardsQuickClientProps = {
  initialFilters: CardQuickFilters;
  initialOptions: CardFilterOptions;
  initialResult: CardQuickResult;
};

type RankingsApiResponse =
  | {
      filters: CardQuickFilters;
      result: CardQuickResult;
      timing: CardQuickTiming;
    }
  | {
      error: string;
    };

function quickSearchParams(filters: CardQuickFilters) {
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

function selectedLeagueLabel(options: CardFilterOptions, filters: CardQuickFilters) {
  const selectedLeague = options.leagueSeasons.find(
    (item) => item.leagueId === filters.leagueId && item.season === filters.season,
  );

  return selectedLeague?.leagueName ?? `League ${filters.leagueId}`;
}

function selectedStatisticLabel(options: CardFilterOptions, filters: CardQuickFilters) {
  return options.statistics.find((option) => option.value === filters.statistic)?.label ?? 'Cards';
}

function formatCardQuickTitle(filters: CardQuickFilters) {
  const line = filters.line;
  switch (filters.statistic) {
    case 'total_match_cards':
      return `Total Match Cards - Over ${line}`;
    case 'total_match_cards_under':
      return `Total Match Cards - Under ${line}`;
    case 'team_cards_for':
      return `Team Cards For - Over ${line}`;
    case 'team_cards_against':
      return `Team Cards Against - Over ${line}`;
    case 'each_team_cards':
      return `Each Team Cards - Over ${line}`;
    default:
      return 'Cards Quick Search';
  }
}

export function CardsQuickClient({ initialFilters, initialOptions, initialResult }: CardsQuickClientProps) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState(initialResult);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const totalRows = result.columns.reduce((total, column) => total + column.rows.length, 0);
  const totalEmerging = result.emergingColumns.reduce((total, column) => total + column.rows.length, 0);

  async function updateFilters(nextValues: Partial<CardQuickFilters>) {
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
    fetchParams.set('category', 'cards');

    try {
      const response = await fetch(`/api/markets/rankings?${fetchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const payload = (await response.json()) as RankingsApiResponse;
      if (!response.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : 'Cards Quick Search could not be loaded.');
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
        setErrorMessage(error instanceof Error ? error.message : 'Cards Quick Search could not be loaded.');
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
            <h1 className="text-2xl font-semibold tracking-normal">{formatCardQuickTitle(filters)}</h1>
            <div className="mt-1 text-sm text-[var(--app-text-dim)]">
              Cards Quick Search rankings by all, home and away scope.
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
              href="/cards"
              prefetch={false}
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

      <CardsQuickFilters
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
            This card market is not active in market_definitions yet: {result.marketKey}
          </div>
        ) : null}

        {totalRows === 0 && totalEmerging === 0 ? (
          <div className="border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)] px-4 py-10 text-center">
            <div className="text-sm font-semibold text-[var(--app-text)]">No card quick results for these filters.</div>
            <div className="mt-1 text-xs text-[var(--app-text-dim)]">
              No teams meet the ranking floor (sample ≥ {filters.minSample}). Try another line, league, form window or fixture filter.
            </div>
          </div>
        ) : (
          <>
            {totalRows > 0 && (
              <div className="grid gap-4 xl:grid-cols-3">
                {result.columns.map((column) => (
                  <CardsQuickColumn column={column} key={column.scope} />
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
                    <CardsQuickColumn column={column} key={`emerging-${column.scope}`} />
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
