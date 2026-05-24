'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type {
  CornerFilterOptions,
  CornerFilters,
  CornerPeriodGroup,
  CornerStatistic,
  CornerViewMode,
} from '@/lib/server/corner-detail-scanner';

type CornersFiltersProps = {
  filters: CornerFilters;
  options: CornerFilterOptions;
  isUpdating?: boolean;
  onFiltersChange?: (nextValues: Partial<CornerFilters>) => void;
};

function uniqueLeagueOptions(options: CornerFilterOptions) {
  const seen = new Set<number>();
  return options.leagueSeasons.filter((item) => {
    if (seen.has(item.leagueId)) {
      return false;
    }
    seen.add(item.leagueId);
    return true;
  });
}

function seasonsForLeague(options: CornerFilterOptions, leagueId: number) {
  return options.leagueSeasons
    .filter((item) => item.leagueId === leagueId)
    .map((item) => item.season);
}

export function CornersFilters({ filters, options, isUpdating = false, onFiltersChange }: CornersFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isUpdating;
  const leagueOptions = uniqueLeagueOptions(options);
  const seasonOptions = seasonsForLeague(options, filters.leagueId);
  const lineOptions = options.linesByStatistic[filters.statistic];
  const statisticOptions = options.statistics.filter((statistic) => statistic.periodGroup === filters.periodGroup);

  function updateQuery(nextValues: Partial<CornerFilters>) {
    if (onFiltersChange) {
      onFiltersChange({ ...nextValues, teamId: null });
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const nextPeriodGroup = nextValues.periodGroup ?? filters.periodGroup;
    const nextStatistic = nextValues.statistic ?? filters.statistic;
    const nextLine = nextValues.line ?? filters.line;

    params.delete('teamId');
    params.delete('marketKey');
    params.delete('source');

    params.set('leagueId', String(nextValues.leagueId ?? filters.leagueId));
    params.set('season', String(nextValues.season ?? filters.season));
    params.set('periodGroup', nextPeriodGroup);
    params.set('statistic', nextStatistic);
    params.set('line', nextLine);

    const nextViewMode = nextValues.viewMode ?? filters.viewMode;
    if (nextViewMode === 'all') {
      params.delete('viewMode');
    } else {
      params.set('viewMode', nextViewMode);
    }

    const nextTeamSearch = nextValues.teamSearch ?? filters.teamSearch;
    if (nextTeamSearch.trim()) {
      params.set('teamSearch', nextTeamSearch.trim());
    } else {
      params.delete('teamSearch');
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

  function updateStatistic(statistic: CornerStatistic) {
    updateQuery({
      statistic,
      line: options.linesByStatistic[statistic][0],
    });
  }

  function updatePeriodGroup(periodGroup: CornerPeriodGroup) {
    const nextStatistic = options.statistics.find((statistic) => statistic.periodGroup === periodGroup)?.value ?? filters.statistic;
    updateQuery({
      periodGroup,
      statistic: nextStatistic,
      line: options.linesByStatistic[nextStatistic][0],
    });
  }

  function updateTeamSearch(input: HTMLInputElement) {
    const nextTeamSearch = input.value.trim();
    if (nextTeamSearch === filters.teamSearch.trim()) {
      return;
    }

    updateQuery({ teamSearch: nextTeamSearch });
  }

  return (
    <section aria-busy={isBusy} className="border-y border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-4">
      {isBusy ? (
        <div className="mb-3 rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
          Updating corner scanner...
        </div>
      ) : null}
      <div className="mb-4 grid h-10 max-w-xl grid-cols-2 overflow-hidden rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)]">
        {([
          ['full', 'Full Match'],
          ['by_half', 'By Half'],
        ] satisfies Array<[CornerPeriodGroup, string]>).map(([value, label]) => {
          const isActive = value === filters.periodGroup;
          return (
            <button
              className={[
                'text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'text-[var(--app-text-soft)] hover:bg-[var(--app-panel-muted)]',
              ].join(' ')}
              key={value}
              disabled={isBusy || isActive}
              onClick={() => updatePeriodGroup(value)}
              type="button"
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_120px_minmax(220px,1fr)_120px_minmax(260px,1fr)]">
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
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Corner Statistic</span>
          <select
            className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            disabled={isBusy}
            onChange={(event) => updateStatistic(event.target.value as CornerStatistic)}
            value={filters.statistic}
          >
            {statisticOptions.map((statistic) => (
              <option key={statistic.value} value={statistic.value}>
                {statistic.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Line</span>
          <select
            className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            disabled={isBusy}
            onChange={(event) => updateQuery({ line: event.target.value })}
            value={filters.line}
          >
            {lineOptions.map((line) => (
              <option key={line} value={line}>
                {filters.statistic === 'corner_handicap'
                  ? line === '0'
                    ? '0 (Most Corners)'
                    : line
                  : `${filters.statistic === 'total_match_corners_under' ? 'Under' : 'Over'} ${line}`}
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
      </div>

      <div className="mt-4 grid h-10 max-w-xl grid-cols-2 overflow-hidden rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)]">
        {([
          ['all', 'All matches'],
          ['homeaway', 'Home/Away split'],
        ] satisfies Array<[CornerViewMode, string]>).map(([value, label]) => {
          const isActive = value === filters.viewMode;
          return (
            <button
              className={[
                'text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'text-[var(--app-text-soft)] hover:bg-[var(--app-panel-muted)]',
              ].join(' ')}
              key={value}
              disabled={isBusy || isActive}
              onClick={() => updateQuery({ viewMode: value })}
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
