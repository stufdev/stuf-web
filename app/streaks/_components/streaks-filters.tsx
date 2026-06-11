'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition } from 'react';
import type { StreakMarketOption, StreakScope, StreakView } from '@/lib/server/streak-scanner';

type StreaksFiltersProps = {
  filters: {
    marketKey: string;
    minStreak: number;
    scope: StreakScope;
    view: StreakView;
  };
  marketOptions: StreakMarketOption[];
};

const SCOPE_OPTIONS: Array<{ label: string; value: StreakScope }> = [
  { label: 'Overall', value: 'overall' },
  { label: 'Home', value: 'home' },
  { label: 'Away', value: 'away' },
];

function clampMinStreak(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return 5;
  }
  return Math.min(Math.max(parsed, 1), 50);
}

export function StreaksFilters({ filters, marketOptions }: StreaksFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateQuery(nextValues: Partial<StreaksFiltersProps['filters']>) {
    const params = new URLSearchParams(searchParams.toString());
    const nextMarketKey = nextValues.marketKey ?? filters.marketKey;
    const nextMinStreak = nextValues.minStreak ?? filters.minStreak;
    const nextScope = nextValues.scope ?? filters.scope;
    const nextView = nextValues.view ?? filters.view;

    if (nextMarketKey === 'ALL') {
      params.delete('marketKey');
    } else {
      params.set('marketKey', nextMarketKey);
    }

    if (nextMinStreak === 5) {
      params.delete('minStreak');
    } else {
      params.set('minStreak', String(nextMinStreak));
    }

    if (nextScope === 'overall') {
      params.delete('scope');
    } else {
      params.set('scope', nextScope);
    }

    // 'active' is the default; only serialize when switching to season mode
    if (nextView === 'active') {
      params.delete('view');
    } else {
      params.set('view', nextView);
    }

    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  function commitMinStreak(input: HTMLInputElement) {
    const nextValue = clampMinStreak(input.value);
    input.value = String(nextValue);
    updateQuery({ minStreak: nextValue });
  }

  const VIEW_OPTIONS: Array<{ label: string; value: StreakView }> = [
    { label: 'Active', value: 'active' },
    { label: 'Season best', value: 'season' },
  ];

  return (
    <section className="border-y border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_150px_minmax(260px,1fr)_minmax(200px,1fr)]">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Market</span>
          <select
            className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            onChange={(event) => updateQuery({ marketKey: event.target.value })}
            value={filters.marketKey}
          >
            <option value="ALL">All active markets</option>
            {marketOptions.map((market) => (
              <option key={market.key} value={market.key}>
                {market.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Min streak</span>
          <input
            className="h-10 rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            inputMode="numeric"
            key={filters.minStreak}
            min={1}
            max={50}
            defaultValue={filters.minStreak}
            onBlur={(event) => commitMinStreak(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            type="number"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">Scope</span>
          <div className="grid h-10 grid-cols-3 overflow-hidden rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)]">
            {SCOPE_OPTIONS.map((option) => {
              const isActive = option.value === filters.scope;
              return (
                <button
                  className={[
                    'text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'text-[var(--app-text-soft)] hover:bg-[var(--app-panel-muted)]',
                  ].join(' ')}
                  key={option.value}
                  onClick={() => updateQuery({ scope: option.value })}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-dim)]">View</span>
          <div className="grid h-10 grid-cols-2 overflow-hidden rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)]">
            {VIEW_OPTIONS.map((option) => {
              const isActive = option.value === filters.view;
              return (
                <button
                  className={[
                    'text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'text-[var(--app-text-soft)] hover:bg-[var(--app-panel-muted)]',
                  ].join(' ')}
                  key={option.value}
                  onClick={() => updateQuery({ view: option.value })}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
