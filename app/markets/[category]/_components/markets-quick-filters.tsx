'use client';

import type {
  GenericFilterOptions,
  GenericFixtureFilter,
  GenericFormWindow,
  GenericQuickFilters,
} from '@/lib/server/generic-market-scanner';

type MarketsQuickFiltersProps = {
  filters: GenericQuickFilters;
  options: GenericFilterOptions;
  isUpdating?: boolean;
  onFiltersChange: (nextValues: Partial<GenericQuickFilters>) => void;
};

const fixtureTabs: Array<[GenericFixtureFilter, string]> = [
  ['all', 'All Teams'],
  ['with_fixture', 'Teams with fixture'],
  ['today', 'Playing Today'],
  ['tomorrow', 'Playing Tomorrow'],
  ['in_2_days', 'Playing in 2 days'],
];

function uniqueLeagueOptions(options: GenericFilterOptions) {
  const seen = new Set<number>();
  return options.leagueSeasons.filter((item) => {
    if (seen.has(item.leagueId)) return false;
    seen.add(item.leagueId);
    return true;
  });
}

function seasonsForLeague(options: GenericFilterOptions, leagueId: number) {
  return options.leagueSeasons.filter((item) => item.leagueId === leagueId).map((item) => item.season);
}

export function MarketsQuickFilters({ filters, options, isUpdating = false, onFiltersChange }: MarketsQuickFiltersProps) {
  const isBusy = isUpdating;
  const leagueOptions = uniqueLeagueOptions(options);
  const seasonOptions = seasonsForLeague(options, filters.leagueId);

  function updateLeague(leagueId: number) {
    onFiltersChange({ leagueId, season: seasonsForLeague(options, leagueId)[0] ?? filters.season });
  }

  return (
    <section aria-busy={isBusy} className="border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-4">
      {isBusy ? (
        <div className="mb-3 rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
          Updating market board...
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_110px_minmax(260px,1.4fr)_minmax(180px,1fr)_150px_170px]">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">League</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateLeague(Number(event.target.value))} value={filters.leagueId}>
            {leagueOptions.map((league) => <option key={league.leagueId} value={league.leagueId}>{league.leagueName}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Season</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => onFiltersChange({ season: Number(event.target.value) })} value={filters.season}>
            {seasonOptions.map((season) => <option key={season} value={season}>{season}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Market</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => onFiltersChange({ marketKey: event.target.value })} value={filters.marketKey}>
            {options.markets.map((market) => <option key={market.key} value={market.key}>{market.label}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Team Search</span>
          <input className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" defaultValue={filters.teamSearch} disabled={isBusy} key={`${filters.leagueId}:${filters.season}:${filters.teamSearch}`} onBlur={(event) => onFiltersChange({ teamSearch: event.currentTarget.value.trim() })} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} placeholder="Arsenal" type="search" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Form</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => onFiltersChange({ formWindow: event.target.value as GenericFormWindow })} value={filters.formWindow}>
            <option value="season">All season</option>
            <option value="last5">Last 5</option>
            <option value="last10">Last 10</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Min sample</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => onFiltersChange({ minSample: Number(event.target.value) })} value={filters.minSample >= 20 ? 20 : filters.minSample >= 15 ? 15 : 10}>
            <option value={10}>≥ 10 (floor)</option>
            <option value={15}>≥ 15</option>
            <option value={20}>≥ 20</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {fixtureTabs.map(([value, label]) => {
          const isActive = value === filters.fixtureFilter;
          return (
            <button className={['h-8 rounded border px-3 text-xs font-semibold transition-colors', isActive ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white' : 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-soft)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]'].join(' ')} disabled={isBusy || isActive} key={value} onClick={() => onFiltersChange({ fixtureFilter: value })} type="button">
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
