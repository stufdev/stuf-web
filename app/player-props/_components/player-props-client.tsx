'use client';

import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import type {
  PlayerPropFilterOptions,
  PlayerPropFilters,
  PlayerPropRankingResult,
  PlayerPropRankingRow,
} from '@/lib/server/player-prop-scanner';
import { PlayerPropsFilters } from './player-props-filters';
import { PlayerPropRow } from './player-prop-row';
import { PlayerPropEvidenceModal } from './player-prop-evidence-modal';

type PlayerPropsClientProps = {
  initialFilters: PlayerPropFilters;
  initialOptions: PlayerPropFilterOptions;
  initialResult: PlayerPropRankingResult;
};

type RankingsApiResponse =
  | {
      filters: PlayerPropFilters;
      result: PlayerPropRankingResult;
    }
  | { error: string };

function buildSearchParams(filters: PlayerPropFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set('leagueId', String(filters.leagueId));
  params.set('season', String(filters.season));
  params.set('propKey', filters.propKey);
  if (filters.scope !== 'overall') params.set('scope', filters.scope);
  if (filters.minPercentage > 0) params.set('minPercentage', String(filters.minPercentage));
  // Raise-only main floor: 10 is the default, only serialize when the user raises it.
  if (filters.minMatches > 10) params.set('minMatches', String(filters.minMatches));
  if (filters.playerSearch.trim()) params.set('playerSearch', filters.playerSearch.trim());
  // upcomingOnly defaults to false (Season Review). Only serialize when user enables the upcoming filter.
  if (filters.upcomingOnly) params.set('upcomingOnly', 'true');
  return params;
}

export function PlayerPropsClient({
  initialFilters,
  initialOptions,
  initialResult,
}: PlayerPropsClientProps) {
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState(initialResult);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [evidenceTarget, setEvidenceTarget] = useState<PlayerPropRankingRow | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);

  async function updateFilters(nextValues: Partial<PlayerPropFilters>) {
    const nextFilters = { ...filters, ...nextValues };
    const currentParams = buildSearchParams(filters);
    const nextParams = buildSearchParams(nextFilters);

    if (currentParams.toString() === nextParams.toString()) return;

    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setFilters(nextFilters);
    setErrorMessage(null);
    setIsUpdating(true);
    window.history.replaceState(null, '', `${pathname}?${nextParams.toString()}`);

    try {
      const response = await fetch(
        `/api/player-props/rankings?${nextParams.toString()}`,
        { headers: { Accept: 'application/json' }, signal: controller.signal },
      );
      const payload = (await response.json()) as RankingsApiResponse;
      if (!response.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : 'Rankings could not be loaded.');
      }
      if (requestSequence.current !== requestId) return;
      setFilters(payload.filters);
      setResult(payload.result);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (requestSequence.current === requestId) {
        setErrorMessage(error instanceof Error ? error.message : 'Rankings could not be loaded.');
      }
    } finally {
      if (requestSequence.current === requestId) {
        setIsUpdating(false);
      }
    }
  }

  const selectedLeague = initialOptions.leagueSeasons.find(
    (ls) => ls.leagueId === filters.leagueId && ls.season === filters.season,
  );

  function renderRankingTable(rows: PlayerPropRankingRow[], emerging = false) {
    return (
      <div
        className={`overflow-x-auto rounded border border-[var(--app-border)]${emerging ? ' opacity-80' : ''}`}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--app-border)] bg-[var(--app-panel)] text-xs text-[var(--app-text-dim)] text-left">
              <th className="px-3 py-2 font-medium text-right">#</th>
              <th className="px-3 py-2 font-medium">League</th>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-3 py-2 font-medium text-center">H/G</th>
              <th className="px-3 py-2 font-medium">Hit %</th>
              <th className="px-3 py-2 font-medium text-center">L5</th>
              <th className="px-3 py-2 font-medium text-center">L10</th>
              <th className="px-3 py-2 font-medium text-center">Streak</th>
              <th className="px-3 py-2 font-medium">Next match</th>
              <th className="px-3 py-2 font-medium text-right">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PlayerPropRow
                key={`${row.playerId}-${row.teamId}-${row.propKey}-${row.scope}`}
                row={row}
                onEvidenceClick={setEvidenceTarget}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <section className="px-4 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Player Props</h1>
            <div className="mt-1 text-sm text-[var(--app-text-dim)]">
              Historical hit rates for player props across V1 leagues.
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--app-text-dim)]">
              {selectedLeague && <span>{selectedLeague.leagueName}</span>}
              <span>{filters.season}</span>
              <span>{result.propLabel}</span>
              <span>{filters.scope === 'overall' ? 'All games' : filters.scope === 'home' ? 'Home' : 'Away'}</span>
            </div>
          </div>
          <div className="rounded border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
            {result.rows.length} ranked
            {result.emergingRows.length > 0 && (
              <span className="ml-1 font-normal">· {result.emergingRows.length} emerging</span>
            )}
          </div>
        </div>
      </section>

      {/* Filters */}
      <PlayerPropsFilters
        filters={filters}
        options={initialOptions}
        isUpdating={isUpdating}
        onFiltersChange={updateFilters}
      />

      {/* Body */}
      <section className="px-4 py-4">
        {errorMessage && (
          <div className="mb-4 border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4 text-sm text-[var(--app-danger-text)]">
            {errorMessage}
          </div>
        )}

        {!result.propAvailable && (
          <div className="mb-4 border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel)] p-4 text-sm text-[var(--app-text-dim)]">
            Prop definition not active: {result.propKey}. Run rebuild_player_prop_engine.py after
            applying schema/009_player_prop_engine.sql.
          </div>
        )}

        {result.rows.length === 0 && result.emergingRows.length === 0 && result.propAvailable && (
          <div className="border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] p-8 text-center text-sm text-[var(--app-text-dim)]">
            {filters.upcomingOnly
              ? 'No players meet the ranking floor (sample ≥ 10) with upcoming fixtures. Switch to "All season" to see historical rankings.'
              : (filters.minMatches > 10 || filters.minPercentage > 0)
                ? 'No players found. Try lowering the minimum sample (back to ≥ 10) or percentage filter.'
                : 'No players meet the ranking floor (sample ≥ 10) for this prop and scope.'}
          </div>
        )}

        {result.rows.length > 0 && renderRankingTable(result.rows)}

        {result.rows.length === 0 && result.emergingRows.length > 0 && result.propAvailable && (
          <div className="mb-2 border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-sm text-[var(--app-text-dim)]">
            No players meet the main-ranking floor (sample ≥ 10) for this prop and scope. Emerging
            candidates only — treat as low confidence.
          </div>
        )}

        {result.emergingRows.length > 0 && (
          <section className="mt-6">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--app-text)]">Emerging / low sample</h2>
              <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                sample 5–9 · low confidence
              </span>
            </div>
            <p className="mb-2 text-xs text-[var(--app-text-dim)]">
              Below the main-ranking floor (sample ≥ 10). Shown for visibility only — not a confirmed
              signal.
            </p>
            {renderRankingTable(result.emergingRows, true)}
          </section>
        )}
      </section>

      {/* Evidence modal */}
      {evidenceTarget && (
        <PlayerPropEvidenceModal
          propKey={evidenceTarget.propKey}
          leagueId={evidenceTarget.leagueId}
          season={evidenceTarget.season}
          playerId={evidenceTarget.playerId}
          teamId={evidenceTarget.teamId}
          playerName={evidenceTarget.playerName}
          scope={filters.scope}
          onClose={() => setEvidenceTarget(null)}
        />
      )}
    </>
  );
}
