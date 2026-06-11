'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { ShotFilterOptions, ShotFixtureFilter, ShotFormWindow, ShotQuickFilters, ShotStatistic } from '@/lib/server/shot-market-scanner';

type ShotsQuickFiltersProps = {
  filters: ShotQuickFilters;
  options: ShotFilterOptions;
  isUpdating?: boolean;
  onFiltersChange?: (nextValues: Partial<ShotQuickFilters>) => void;
};

const fixtureTabs: Array<[ShotFixtureFilter, string]> = [
  ['all', 'All Teams'],
  ['with_fixture', 'Teams with fixture'],
  ['today', 'Playing Today'],
  ['tomorrow', 'Playing Tomorrow'],
  ['in_2_days', 'Playing in 2 days'],
];

function uniqueLeagueOptions(options: ShotFilterOptions) {
  const seen = new Set<number>();
  return options.leagueSeasons.filter((item) => {
    if (seen.has(item.leagueId)) return false;
    seen.add(item.leagueId);
    return true;
  });
}

function seasonsForLeague(options: ShotFilterOptions, leagueId: number) {
  return options.leagueSeasons.filter((item) => item.leagueId === leagueId).map((item) => item.season);
}

export function ShotsQuickFilters({ filters, options, isUpdating = false, onFiltersChange }: ShotsQuickFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isUpdating;
  const leagueOptions = uniqueLeagueOptions(options);
  const seasonOptions = seasonsForLeague(options, filters.leagueId);
  const lineOptions = options.linesByStatistic[filters.statistic];

  function updateQuery(nextValues: Partial<ShotQuickFilters>) {
    if (onFiltersChange) {
      onFiltersChange(nextValues);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const nextStatistic = nextValues.statistic ?? filters.statistic;
    const nextTeamSearch = nextValues.teamSearch ?? filters.teamSearch;
    const nextFixtureFilter = nextValues.fixtureFilter ?? filters.fixtureFilter;
    const nextMinSample = nextValues.minSample ?? filters.minSample;

    params.delete('marketKey');
    params.delete('source');
    params.set('leagueId', String(nextValues.leagueId ?? filters.leagueId));
    params.set('season', String(nextValues.season ?? filters.season));
    params.set('statistic', nextStatistic);
    params.set('line', nextValues.line ?? filters.line);
    params.set('formWindow', nextValues.formWindow ?? filters.formWindow);

    if (nextFixtureFilter === 'all') params.delete('fixtureFilter');
    else params.set('fixtureFilter', nextFixtureFilter);
    if (nextTeamSearch.trim()) params.set('teamSearch', nextTeamSearch.trim());
    else params.delete('teamSearch');
    // Raise-only main floor: serialize only when above the default 10 (15 or 20).
    if (nextMinSample > 10) params.set('minSample', String(nextMinSample));
    else params.delete('minSample');

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function updateLeague(leagueId: number) {
    updateQuery({ leagueId, season: seasonsForLeague(options, leagueId)[0] ?? filters.season });
  }

  function updateStatistic(statistic: ShotStatistic) {
    updateQuery({ statistic, line: options.linesByStatistic[statistic][0] });
  }

  return (
    <section aria-busy={isBusy} className="border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-4">
      {isBusy ? (
        <div className="mb-3 rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
          Updating shots quick scanner...
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
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Shot Statistic</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateStatistic(event.target.value as ShotStatistic)} value={filters.statistic}>
            {options.statistics.map((statistic) => <option key={statistic.value} value={statistic.value}>{statistic.label}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Line</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateQuery({ line: event.target.value })} value={filters.line}>
            {lineOptions.map((line) => <option key={line} value={line}>{filters.statistic === 'total_match_shots_under' ? `Under ${line}` : `Over ${line}`}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Team Search</span>
          <input className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" defaultValue={filters.teamSearch} disabled={isBusy} key={`${filters.leagueId}:${filters.season}:${filters.teamSearch}`} onBlur={(event) => updateQuery({ teamSearch: event.currentTarget.value.trim() })} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} placeholder="Arsenal" type="search" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Form</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateQuery({ formWindow: event.target.value as ShotFormWindow })} value={filters.formWindow}>
            <option value="season">All season</option>
            <option value="last5">Last 5</option>
            <option value="last10">Last 10</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Min sample</span>
          <select className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]" disabled={isBusy} onChange={(event) => updateQuery({ minSample: Number(event.target.value) })} value={filters.minSample >= 20 ? 20 : filters.minSample >= 15 ? 15 : 10}>
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
            <button className={['h-8 rounded border px-3 text-xs font-semibold transition-colors', isActive ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white' : 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-soft)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]'].join(' ')} disabled={isBusy || isActive} key={value} onClick={() => updateQuery({ fixtureFilter: value })} type="button">
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
