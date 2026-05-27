'use client';

import type { OffsideFilterOptions, OffsideFixtureFilter, OffsideFormWindow, OffsideQuickFilters, OffsideStatistic } from '@/lib/server/offside-market-scanner';

type OffsidesQuickFiltersProps = {
  filters: OffsideQuickFilters;
  options: OffsideFilterOptions;
  isUpdating?: boolean;
  onFiltersChange: (nextValues: Partial<OffsideQuickFilters>) => void;
};

const fixtureTabs: Array<[OffsideFixtureFilter, string]> = [
  ['all', 'All Teams'],
  ['with_fixture', 'Teams with fixture'],
  ['today', 'Playing Today'],
  ['tomorrow', 'Playing Tomorrow'],
  ['in_2_days', 'Playing in 2 days'],
];

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

export function OffsidesQuickFilters({ filters, options, isUpdating = false, onFiltersChange }: OffsidesQuickFiltersProps) {
  const isBusy = isUpdating;
  const leagueOptions = uniqueLeagueOptions(options);
  const seasonOptions = seasonsForLeague(options, filters.leagueId);
  const lineOptions = options.linesByStatistic[filters.statistic];

  function updateQuery(nextValues: Partial<OffsideQuickFilters>) {
    onFiltersChange(nextValues);
  }

  function updateLeague(leagueId: number) {
    updateQuery({ leagueId, season: seasonsForLeague(options, leagueId)[0] ?? filters.season });
  }

  function updateStatistic(statistic: OffsideStatistic) {
    updateQuery({ statistic, line: options.linesByStatistic[statistic][0] });
  }

  return (
    <section aria-busy={isBusy} className="border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-4">
      {isBusy ? (
        <div className="mb-3 rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
          Updating offsides quick scanner...
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_110px_minmax(190px,1fr)_120px_minmax(180px,1fr)_150px_170px]">
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
            {lineOptions.map((line) => <option key={line} value={line}>{filters.statistic === 'total_match_offsides_under' ? `Under ${line}` : `Over ${line}`}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Team Search</span>
          <input className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" defaultValue={filters.teamSearch} disabled={isBusy} key={`${filters.leagueId}:${filters.season}:${filters.teamSearch}`} onBlur={(event) => updateQuery({ teamSearch: event.currentTarget.value.trim() })} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} placeholder="Arsenal" type="search" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Form</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateQuery({ formWindow: event.target.value as OffsideFormWindow })} value={filters.formWindow}>
            <option value="season">All season</option>
            <option value="last5">Last 5</option>
            <option value="last10">Last 10</option>
          </select>
        </label>

        <label className="flex h-full items-end gap-2 pb-2 text-sm font-semibold text-[var(--app-text-soft)]">
          <input checked={filters.minSample >= 4} className="h-4 w-4" disabled={isBusy} onChange={(event) => updateQuery({ minSample: event.currentTarget.checked ? 4 : 0 })} type="checkbox" />
          <span>{'> 3 matches played'}</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {fixtureTabs.map(([value, label]) => {
          const isActive = value === filters.fixtureFilter;
          return (
            <button className={['h-8 rounded border px-3 text-xs font-semibold transition-colors', isActive ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white' : 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-soft)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]'].join(' ')} disabled={isBusy || isActive} key={value} onClick={() => updateQuery({ fixtureFilter: value })} type="button">
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
