'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type {
  CornerQuickFilterOptions,
  CornerQuickFilters,
  CornerQuickFixtureFilter,
  CornerQuickFormWindow,
} from '@/lib/server/corner-quick-scanner';

type CornersQuickFiltersProps = {
  filters: CornerQuickFilters;
  options: CornerQuickFilterOptions;
  isUpdating?: boolean;
  onFiltersChange?: (nextValues: Partial<CornerQuickFilters>) => void;
};

function uniqueLeagueOptions(options: CornerQuickFilterOptions) {
  const seen = new Set<number>();
  return options.leagueSeasons.filter((item) => {
    if (seen.has(item.leagueId)) {
      return false;
    }

    seen.add(item.leagueId);
    return true;
  });
}

function seasonsForLeague(options: CornerQuickFilterOptions, leagueId: number) {
  return options.leagueSeasons
    .filter((item) => item.leagueId === leagueId)
    .map((item) => item.season);
}

const fixtureTabs: Array<[CornerQuickFixtureFilter, string]> = [
  ['all', 'All Teams'],
  ['with_fixture', 'Teams with fixture'],
  ['today', 'Playing Today'],
  ['tomorrow', 'Playing Tomorrow'],
  ['in_2_days', 'Playing in 2 days'],
];

export function CornersQuickFilters({ filters, options, isUpdating = false, onFiltersChange }: CornersQuickFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isUpdating;
  const leagueOptions = uniqueLeagueOptions(options);
  const seasonOptions = seasonsForLeague(options, filters.leagueId);

  function updateQuery(nextValues: Partial<CornerQuickFilters>) {
    if (onFiltersChange) {
      onFiltersChange(nextValues);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const nextPeriodGroup = nextValues.periodGroup ?? filters.periodGroup;
    const nextMarketGroup = nextValues.marketGroup ?? filters.marketGroup;
    const nextLine = nextValues.line ?? filters.line;
    const nextTeamSearch = nextValues.teamSearch ?? filters.teamSearch;
    const nextMinOdds = nextValues.minOdds === undefined ? filters.minOdds : nextValues.minOdds;
    const nextFormWindow = nextValues.formWindow ?? filters.formWindow;
    const nextFixtureFilter = nextValues.fixtureFilter ?? filters.fixtureFilter;
    const nextMinSample = nextValues.minSample ?? filters.minSample;

    params.delete('marketKey');
    params.delete('source');

    params.set('leagueId', String(nextValues.leagueId ?? filters.leagueId));
    params.set('season', String(nextValues.season ?? filters.season));
    params.set('periodGroup', nextPeriodGroup);
    params.set('marketGroup', nextMarketGroup);
    params.set('line', nextLine);
    params.set('formWindow', nextFormWindow);

    if (nextFixtureFilter === 'all') {
      params.delete('fixtureFilter');
    } else {
      params.set('fixtureFilter', nextFixtureFilter);
    }

    if (nextTeamSearch.trim()) {
      params.set('teamSearch', nextTeamSearch.trim());
    } else {
      params.delete('teamSearch');
    }

    if (nextMinOdds !== null && Number.isFinite(nextMinOdds)) {
      params.set('minOdds', String(nextMinOdds));
    } else {
      params.delete('minOdds');
    }

    if (nextMinSample >= 4) {
      params.set('minSample', '4');
    } else {
      params.delete('minSample');
    }

    if (params.toString() === searchParams.toString()) {
      return;
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function updateLeague(leagueId: number) {
    const nextSeason = seasonsForLeague(options, leagueId)[0] ?? filters.season;
    updateQuery({ leagueId, season: nextSeason });
  }

  function updateTeamSearch(input: HTMLInputElement) {
    const nextTeamSearch = input.value.trim();
    if (nextTeamSearch === filters.teamSearch.trim()) {
      return;
    }

    updateQuery({ teamSearch: nextTeamSearch });
  }

  function updateMinOdds(input: HTMLInputElement) {
    const parsed = Number.parseFloat(input.value);
    const nextMinOdds = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    if (nextMinOdds === filters.minOdds) {
      return;
    }

    updateQuery({ minOdds: nextMinOdds });
  }

  return (
    <section aria-busy={isBusy} className="border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-4">
      {isBusy ? (
        <div className="mb-3 rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
          Updating quick scanner...
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_110px_minmax(180px,1fr)_130px_150px_170px]">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">League</span>
          <select
            className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            disabled={isBusy}
            onChange={(event) => updateLeague(Number(event.target.value))}
            value={filters.leagueId}
          >
            {leagueOptions.map((league) => (
              <option key={league.leagueId} value={league.leagueId}>
                {league.leagueName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Season</span>
          <select
            className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            disabled={isBusy}
            onChange={(event) => updateQuery({ season: Number(event.target.value) })}
            value={filters.season}
          >
            {seasonOptions.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Team Search</span>
          <input
            className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            defaultValue={filters.teamSearch}
            disabled={isBusy}
            key={`${filters.leagueId}:${filters.season}:${filters.teamSearch}`}
            onBlur={(event) => updateTeamSearch(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            placeholder="Arsenal"
            type="search"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Min Odds</span>
          <input
            className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            defaultValue={filters.minOdds ?? ''}
            disabled={isBusy}
            key={`min-odds:${filters.minOdds ?? 'none'}`}
            min="1"
            onBlur={(event) => updateMinOdds(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            placeholder="1.50"
            step="0.01"
            type="number"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Form</span>
          <select
            className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            disabled={isBusy}
            onChange={(event) => updateQuery({ formWindow: event.target.value as CornerQuickFormWindow })}
            value={filters.formWindow}
          >
            <option value="season">All season</option>
            <option value="last5">Last 5</option>
            <option value="last10">Last 10</option>
          </select>
        </label>

        <label className="flex h-full items-end gap-2 pb-2 text-sm font-semibold text-[var(--app-text-soft)]">
          <input
            checked={filters.minSample >= 4}
            className="h-4 w-4"
            disabled={isBusy}
            onChange={(event) => updateQuery({ minSample: event.currentTarget.checked ? 4 : 0 })}
            type="checkbox"
          />
          <span>{'> 3 matches played'}</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {fixtureTabs.map(([value, label]) => {
          const isActive = value === filters.fixtureFilter;
          return (
            <button
              className={[
                'h-8 rounded border px-3 text-xs font-semibold transition-colors',
                isActive
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white'
                  : 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-soft)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]',
              ].join(' ')}
              key={value}
              disabled={isBusy || isActive}
              onClick={() => updateQuery({ fixtureFilter: value })}
              type="button"
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
