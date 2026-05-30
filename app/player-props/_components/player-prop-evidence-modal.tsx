'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PropScope, PlayerPropEvidenceResult, PlayerPropEvidenceRow } from '@/lib/server/player-prop-scanner';

type EvidenceModalProps = {
  propKey: string;
  leagueId: number;
  season: number;
  playerId: number;
  teamId: number;
  playerName: string | null;
  scope: PropScope;
  onClose: () => void;
};

type EvidenceApiResponse =
  | { result: PlayerPropEvidenceResult }
  | { error: string };

type VenueFilter = 'all' | 'home' | 'away';

function statCell(value: number | null): string {
  return value === null ? '—' : String(value);
}

export function PlayerPropEvidenceModal({
  propKey,
  leagueId,
  season,
  playerId,
  teamId,
  playerName,
  scope,
  onClose,
}: EvidenceModalProps) {
  const [data, setData] = useState<PlayerPropEvidenceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // In-modal filters (client-side only; truth is already computed by the engine).
  const [venueFilter, setVenueFilter] = useState<VenueFilter>(
    scope === 'home' ? 'home' : scope === 'away' ? 'away' : 'all',
  );
  const [opponentFilter, setOpponentFilter] = useState<string>('all');

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    // Always fetch the full (overall) set so the H/A and team toggles can filter
    // client-side without a re-fetch.
    const params = new URLSearchParams({
      propKey,
      leagueId: String(leagueId),
      season: String(season),
      playerId: String(playerId),
      teamId: String(teamId),
      scope: 'overall',
    });

    fetch(`/api/player-props/evidence?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (res) => {
        const payload = (await res.json()) as EvidenceApiResponse;
        if (!res.ok || 'error' in payload) {
          throw new Error('error' in payload ? payload.error : 'Evidence could not be loaded.');
        }
        setData(payload.result);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setErrorMessage(err instanceof Error ? err.message : 'Evidence could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [propKey, leagueId, season, playerId, teamId]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const allRows = useMemo(() => data?.rows ?? [], [data]);

  // Distinct opponents for the team filter dropdown.
  const opponents = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of allRows) {
      if (row.opponentName) seen.set(row.opponentName, row.opponentName);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (venueFilter !== 'all' && row.venueScope !== venueFilter) return false;
      if (opponentFilter !== 'all' && row.opponentName !== opponentFilter) return false;
      return true;
    });
  }, [allRows, venueFilter, opponentFilter]);

  // Summary cards — presentational aggregates over the filtered rows.
  const summary = useMemo(() => {
    const sample = filteredRows.length;
    const hits = filteredRows.filter((r) => r.result).length;
    let total = 0;
    let totalMinutes = 0;
    let hasValue = false;
    for (const r of filteredRows) {
      if (r.numericValue !== null) {
        total += r.numericValue;
        hasValue = true;
      }
      if (r.minutes !== null) totalMinutes += r.minutes;
    }
    const hitRate = sample > 0 ? Math.round((hits / sample) * 1000) / 10 : null;
    const per90 = hasValue && totalMinutes > 0 ? Math.round((total / totalMinutes) * 90 * 100) / 100 : null;
    return { sample, hits, misses: sample - hits, total: hasValue ? total : null, per90, hitRate };
  }, [filteredRows]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-4xl rounded border border-[var(--app-border)] bg-[var(--app-panel)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
          <div>
            <div className="font-semibold text-[var(--app-text)]">
              {data?.playerName ?? playerName ?? `Player ${playerId}`}
            </div>
            <div className="mt-0.5 text-xs text-[var(--app-text-dim)]">
              {data?.propLabel ?? propKey} · {season}
            </div>
          </div>
          <button
            className="rounded p-1.5 text-[var(--app-text-dim)] hover:bg-[var(--app-bg)] hover:text-[var(--app-text)]"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto">
          {isLoading && (
            <div className="px-5 py-8 text-center text-sm text-[var(--app-text-dim)]">
              Loading evidence…
            </div>
          )}

          {errorMessage && (
            <div className="border-b border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] px-5 py-4 text-sm text-[var(--app-danger-text)]">
              {errorMessage}
            </div>
          )}

          {data && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 border-b border-[var(--app-border)] px-5 py-4">
                <div className="rounded border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--app-text-dim)]">Total</div>
                  <div className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                    {summary.total === null ? '—' : summary.total}
                  </div>
                </div>
                <div className="rounded border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--app-text-dim)]">Per 90</div>
                  <div className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-500">
                    {summary.per90 === null ? '—' : summary.per90.toFixed(2)}
                  </div>
                </div>
                <div className="rounded border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--app-text-dim)]">Hit Rate</div>
                  <div className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--app-text)]">
                    {summary.hitRate === null ? '—' : `${summary.hitRate}%`}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-end gap-4 border-b border-[var(--app-border)] px-5 py-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-[var(--app-text-dim)]">Venue</span>
                  <div className="flex gap-1">
                    {([{ v: 'all', l: 'All' }, { v: 'home', l: 'Home' }, { v: 'away', l: 'Away' }] as const).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                          venueFilter === opt.v
                            ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white'
                            : 'border-[var(--app-border)] text-[var(--app-text-dim)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]'
                        }`}
                        onClick={() => setVenueFilter(opt.v)}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                {opponents.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--app-text-dim)]">Opponent</span>
                    <select
                      className="rounded border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1 text-xs text-[var(--app-text)]"
                      value={opponentFilter}
                      onChange={(e) => setOpponentFilter(e.target.value)}
                    >
                      <option value="all">All opponents</option>
                      {opponents.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Match log */}
              {filteredRows.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--app-text-dim)]">
                  No matches for the selected filters.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--app-border)] text-left text-[var(--app-text-dim)]">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Opponent</th>
                      <th className="px-2 py-2 font-medium text-center">H/A</th>
                      <th className="px-2 py-2 font-medium text-center" title="Total shots">Shots</th>
                      <th className="px-2 py-2 font-medium text-center" title="Shots on target">OT</th>
                      <th className="px-2 py-2 font-medium text-center" title="Offsides">Off</th>
                      <th className="px-2 py-2 font-medium text-center" title="Tackles">Tck</th>
                      <th className="px-2 py-2 font-medium text-center" title="Fouls committed">Fls</th>
                      <th className="px-2 py-2 font-medium text-center" title="Fouls drawn / won">FlsW</th>
                      <th className="px-2 py-2 font-medium text-center" title="Goals / Assists">G/A</th>
                      <th className="px-2 py-2 font-medium text-center">Min</th>
                      <th className="px-2 py-2 font-medium text-right">Value</th>
                      <th className="px-2 py-2 font-medium text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row: PlayerPropEvidenceRow) => (
                      <tr
                        key={`${row.fixtureId}-${row.propKey}`}
                        className="border-b border-[var(--app-border)] last:border-0 hover:bg-[var(--app-bg)]"
                      >
                        <td className="px-3 py-2 text-[var(--app-text-dim)] whitespace-nowrap">
                          {row.playedAt
                            ? new Date(row.playedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                            : '—'}
                        </td>
                        <td className="px-3 py-2">{row.opponentName ?? '—'}</td>
                        <td className="px-2 py-2 text-center uppercase text-[var(--app-text-dim)]">
                          {row.venueScope === 'home' ? 'H' : 'A'}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">{statCell(row.totalShots)}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{statCell(row.shotsOnTarget)}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{statCell(row.offsides)}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{statCell(row.tackles)}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{statCell(row.foulsCommitted)}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{statCell(row.foulsDrawn)}</td>
                        <td className="px-2 py-2 text-center tabular-nums text-[var(--app-text-dim)]">
                          {row.goals === null && row.assists === null
                            ? '—'
                            : `${row.goals ?? 0}/${row.assists ?? 0}`}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums text-[var(--app-text-dim)]">
                          {row.minutes ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-right font-mono">{row.numericValue ?? '—'}</td>
                        <td className="px-2 py-2 text-center">
                          {row.result ? (
                            <span className="font-semibold text-emerald-500">✓</span>
                          ) : (
                            <span className="text-[var(--app-text-dim)]">✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {data && filteredRows.length > 0 && (
          <div className="border-t border-[var(--app-border)] px-5 py-3 text-xs text-[var(--app-text-dim)]">
            {summary.sample} match{summary.sample !== 1 ? 'es' : ''} shown
            {' · '}hits: {summary.hits}
            {' · '}misses: {summary.misses}
          </div>
        )}
      </div>
    </div>
  );
}
