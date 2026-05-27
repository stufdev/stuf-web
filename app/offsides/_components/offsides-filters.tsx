'use client';

import type { OffsideFilterOptions, OffsideFilters, OffsideStatistic, OffsideViewMode } from '@/lib/server/offside-market-scanner';

type OffsidesFiltersProps = {
  filters: OffsideFilters;
  options: OffsideFilterOptions;
  isUpdating?: boolean;
  onFiltersChange: (nextValues: Partial<OffsideFilters>) => void;
};

function uniqueLeagueOptions(options: OffsideFilterOptions) {
  const seen = new Set<number>();
  return options.leagueSeasons.filter((item) => {
    if (seen.has(item.leagueId)) return false;
    seen.add(item.leagueId);
    return true;
  });
}

function seasonsForLeague(options: OffsideFilterOptions, leagueId: number) {
  return options.leagueSeasons.filter((item) => item.leagueId === leagueId).map((item) => item.season);
}

export function OffsidesFilters({ filters, options, isUpdating = false, onFiltersChange }: OffsidesFiltersProps) {
  const isBusy = isUpdating;
  const leagueOptions = uniqueLeagueOptions(options);
  const seasonOptions = seasonsForLeague(options, filters.leagueId);
  const lineOptions = options.linesByStatistic[filters.statistic];

  function updateQuery(nextValues: Partial<OffsideFilters>) {
    onFiltersChange({ ...nextValues, teamId: null });
  }

  function updateLeague(leagueId: number) {
    updateQuery({ leagueId, season: seasonsForLeague(options, leagueId)[0] ?? filters.season });
  }

  function updateStatistic(statistic: OffsideStatistic) {
    updateQuery({ statistic, line: options.linesByStatistic[statistic][0] });
  }

  return (
    <section aria-busy={isBusy} className="border-y border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-4">
      {isBusy ? (
        <div className="mb-3 rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
          Updating offsides scanner...
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_120px_minmax(220px,1fr)_120px_minmax(260px,1fr)]">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">League</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateLeague(Number(event.target.value))} value={filters.leagueId}>
            {leagueOptions.map((league) => <option key={league.leagueId} value={league.leagueId}>{league.leagueName}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Season</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateQuery({ season: Number(event.target.value) })} value={filters.season}>
            {seasonOptions.map((season) => <option key={season} value={season}>{season}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Offside Statistic</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateStatistic(event.target.value as OffsideStatistic)} value={filters.statistic}>
            {options.statistics.map((statistic) => <option key={statistic.value} value={statistic.value}>{statistic.label}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Line</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateQuery({ line: event.target.value })} value={filters.line}>
            {lineOptions.map((line) => (
              <option key={line} value={line}>
                {filters.statistic === 'total_match_offsides_under' ? `Under ${line}` : `Over ${line}`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Team Search</span>
          <input className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" defaultValue={filters.teamSearch} disabled={isBusy} key={`${filters.leagueId}:${filters.season}:${filters.teamSearch}`} onBlur={(event) => updateQuery({ teamSearch: event.currentTarget.value.trim() })} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} placeholder="Arsenal" type="search" />
        </label>
      </div>

      <div className="mt-4 grid h-10 max-w-xl grid-cols-2 overflow-hidden rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)]">
        {([['all', 'All matches'], ['homeaway', 'Home/Away split']] satisfies Array<[OffsideViewMode, string]>).map(([value, label]) => {
          const isActive = value === filters.viewMode;
          return (
            <button className={['text-sm font-semibold transition-colors', isActive ? 'bg-[var(--app-accent)] text-white' : 'text-[var(--app-text-soft)] hover:bg-[var(--app-panel-muted)]'].join(' ')} disabled={isBusy || isActive} key={value} onClick={() => updateQuery({ viewMode: value })} type="button">
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
