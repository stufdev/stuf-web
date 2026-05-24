'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type {
  ShotDetailResult,
  ShotFilterOptions,
  ShotFilters,
  ShotMatchEvidenceResult,
} from '@/lib/server/shot-market-scanner';
import { ShotTeamPanel } from './shot-team-panel';
import { ShotsFilters } from './shots-filters';

type ShotsClientProps = {
  initialFilters: ShotFilters;
  initialOptions: ShotFilterOptions;
  initialResult: ShotDetailResult;
};

type TeamProfileApiResponse =
  | {
      filters: ShotFilters;
      result: ShotDetailResult;
      timing: {
        dbProfileMs: number;
        dbEvidenceMs: number;
        transformMs: number;
        totalMs: number;
      };
    }
  | {
      error: string;
    };

type MatchEvidenceApiResponse =
  | {
      filters: ShotFilters;
      result: ShotMatchEvidenceResult;
      timing: {
        dbProfileMs: number;
        dbEvidenceMs: number;
        transformMs: number;
        totalMs: number;
      };
    }
  | {
      error: string;
    };

function shotSearchParams(filters: ShotFilters) {
  const params = new URLSearchParams();
  params.set('leagueId', String(filters.leagueId));
  params.set('season', String(filters.season));
  params.set('statistic', filters.statistic);
  params.set('line', filters.line);

  if (filters.viewMode !== 'all') {
    params.set('viewMode', filters.viewMode);
  }

  if (filters.teamId !== null) {
    params.set('teamId', String(filters.teamId));
  } else if (filters.teamSearch.trim()) {
    params.set('teamSearch', filters.teamSearch.trim());
  }

  return params;
}

function selectedLeagueLabel(options: ShotFilterOptions, filters: ShotFilters) {
  const selectedLeague = options.leagueSeasons.find(
    (item) => item.leagueId === filters.leagueId && item.season === filters.season,
  );

  return selectedLeague?.leagueName ?? `League ${filters.leagueId}`;
}

function getStatisticLabel(options: ShotFilterOptions, filters: ShotFilters) {
  return options.statistics.find((option) => option.value === filters.statistic)?.label ?? 'Shots';
}

function getLineLabel(filters: ShotFilters) {
  return `${filters.statistic === 'total_match_shots_under' ? 'Under' : 'Over'} ${filters.line}`;
}

export function ShotsClient({ initialFilters, initialOptions, initialResult }: ShotsClientProps) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState(initialResult);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEvidenceUpdating, setIsEvidenceUpdating] = useState(
    initialResult.panels.some((panel) => !panel.evidenceLoaded),
  );
  const activeRequest = useRef<AbortController | null>(null);
  const activeEvidenceRequest = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const activeLineCount = initialOptions.linesByStatistic[filters.statistic].length;

  async function loadEvidence(nextFilters: ShotFilters, baseResult: ShotDetailResult, requestId: number) {
    if (baseResult.panels.length === 0 || baseResult.panels.every((panel) => panel.evidenceLoaded)) {
      setIsEvidenceUpdating(false);
      return;
    }

    activeEvidenceRequest.current?.abort();
    const controller = new AbortController();
    activeEvidenceRequest.current = controller;
    setIsEvidenceUpdating(true);

    const evidenceParams = shotSearchParams(nextFilters);
    evidenceParams.set('category', 'shots');
    evidenceParams.set('teamIds', baseResult.panels.map((panel) => panel.teamId).join(','));

    try {
      const response = await fetch(`/api/markets/match-evidence?${evidenceParams.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const payload = (await response.json()) as MatchEvidenceApiResponse;
      if (!response.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : 'Shot evidence could not be loaded.');
      }

      if (requestSequence.current !== requestId) {
        return;
      }

      const rowsByTeamScope = new Map(
        payload.result.groups.map((group) => [`${group.teamId}:${group.scope}`, group.rows]),
      );
      setResult((currentResult) => ({
        ...currentResult,
        evidenceMode: 'evidence',
        panels: currentResult.panels.map((panel) => ({
          ...panel,
          evidenceLoaded: true,
          matchRows: {
            overall: rowsByTeamScope.get(`${panel.teamId}:overall`) ?? [],
            home: rowsByTeamScope.get(`${panel.teamId}:home`) ?? [],
            away: rowsByTeamScope.get(`${panel.teamId}:away`) ?? [],
          },
        })),
      }));
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (requestSequence.current === requestId) {
        setErrorMessage(error instanceof Error ? error.message : 'Shot evidence could not be loaded.');
      }
    } finally {
      if (requestSequence.current === requestId) {
        setIsEvidenceUpdating(false);
      }
    }
  }

  useEffect(() => {
    const requestId = requestSequence.current;
    void loadEvidence(filters, result, requestId);

    return () => {
      activeEvidenceRequest.current?.abort();
    };
    // Initial hydration only; filter-driven evidence loads are chained after the profile request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateFilters(nextValues: Partial<ShotFilters>) {
    const nextFilters = { ...filters, ...nextValues };
    const currentParams = shotSearchParams(filters);
    const nextParams = shotSearchParams(nextFilters);

    if (currentParams.toString() === nextParams.toString()) {
      return;
    }

    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    activeRequest.current?.abort();
    activeEvidenceRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setFilters(nextFilters);
    setErrorMessage(null);
    setIsUpdating(true);
    setIsEvidenceUpdating(false);
    window.history.replaceState(null, '', `${pathname}?${nextParams.toString()}`);

    const fetchParams = new URLSearchParams(nextParams);
    fetchParams.set('category', 'shots');

    try {
      const response = await fetch(`/api/markets/team-profile?${fetchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const payload = (await response.json()) as TeamProfileApiResponse;
      if (!response.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : 'Shots could not be loaded.');
      }

      if (requestSequence.current !== requestId) {
        return;
      }

      setFilters(payload.filters);
      setResult(payload.result);
      void loadEvidence(payload.filters, payload.result, requestId);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (requestSequence.current === requestId) {
        setErrorMessage(error instanceof Error ? error.message : 'Shots could not be loaded.');
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
            <h1 className="text-2xl font-semibold tracking-normal">Shots Detailed</h1>
            <div className="mt-1 text-sm text-[var(--app-text-dim)]">Detailed shot market analysis</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--app-text-dim)]">
              <span>{selectedLeagueLabel(initialOptions, filters)}</span>
              <span>{filters.season}</span>
              <span>{getStatisticLabel(initialOptions, filters)}</span>
              <span>{getLineLabel(filters)}</span>
            </div>
          </div>
          <div className="rounded border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
            {result.panels.length} teams · {activeLineCount} lines
          </div>
        </div>
      </section>

      <ShotsFilters
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
            This shot market is not active in market_definitions yet: {result.marketKey}
          </div>
        ) : null}

        {result.panels.length === 0 ? (
          <div className="border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)] px-4 py-10 text-center">
            <div className="text-sm font-semibold text-[var(--app-text)]">No shot data for these filters.</div>
            <div className="mt-1 text-xs text-[var(--app-text-dim)]">
              Run the shot trend and serving-layer rebuild, or try another filter.
            </div>
          </div>
        ) : (
          result.panels.map((panel) => (
            <ShotTeamPanel
              isUpdating={isUpdating}
              isEvidenceUpdating={isEvidenceUpdating && !panel.evidenceLoaded}
              key={`${panel.teamId}:${panel.marketKey}`}
              onBackToSummary={() => updateFilters({ teamId: null, teamSearch: '' })}
              panel={panel}
              showBackToSummary={filters.teamId !== null}
              viewMode={filters.viewMode}
            />
          ))
        )}
      </section>
    </>
  );
}
