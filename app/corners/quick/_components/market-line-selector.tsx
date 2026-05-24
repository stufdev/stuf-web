'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type {
  CornerQuickFilters,
  CornerQuickMarketGroup,
  CornerQuickMarketGroupOption,
  CornerQuickPeriodGroup,
} from '@/lib/server/corner-quick-scanner';

type MarketLineSelectorProps = {
  filters: CornerQuickFilters;
  marketGroups: CornerQuickMarketGroupOption[];
  isUpdating?: boolean;
  onFiltersChange?: (nextValues: Partial<CornerQuickFilters>) => void;
};

function lineLabel(marketGroup: CornerQuickMarketGroup, line: string) {
  if (marketGroup === 'corner_handicap') {
    return line === '0' ? '0 (Most Corners)' : line;
  }

  const operator = marketGroup === 'total_match_corners_under' ? 'Under' : 'Over';
  return `${operator} ${line}`;
}

export function MarketLineSelector({
  filters,
  marketGroups,
  isUpdating = false,
  onFiltersChange,
}: MarketLineSelectorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isUpdating;
  const visibleMarketGroups = marketGroups.filter((group) => group.periodGroup === filters.periodGroup);

  function replaceIfChanged(params: URLSearchParams) {
    if (params.toString() === searchParams.toString()) {
      return;
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function updateMarketLine(marketGroup: CornerQuickMarketGroup, line: string) {
    if (marketGroup === filters.marketGroup && line === filters.line) {
      return;
    }

    if (onFiltersChange) {
      onFiltersChange({ marketGroup, line });
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('periodGroup', filters.periodGroup);
    params.set('marketGroup', marketGroup);
    params.set('line', line);
    params.delete('marketKey');
    params.delete('source');

    replaceIfChanged(params);
  }

  function updatePeriodGroup(periodGroup: CornerQuickPeriodGroup) {
    if (periodGroup === filters.periodGroup) {
      return;
    }

    const nextGroup = marketGroups.find((group) => group.periodGroup === periodGroup);
    if (!nextGroup) {
      return;
    }

    if (onFiltersChange) {
      onFiltersChange({
        periodGroup,
        marketGroup: nextGroup.value,
        line: nextGroup.lines[0],
      });
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('periodGroup', periodGroup);
    params.set('marketGroup', nextGroup.value);
    params.set('line', nextGroup.lines[0]);
    params.delete('marketKey');
    params.delete('source');

    replaceIfChanged(params);
  }

  return (
    <section aria-busy={isBusy} className="border-y border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-4">
      {isBusy ? (
        <div className="mb-3 rounded border border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
          Updating market...
        </div>
      ) : null}
      <div className="mb-4 grid h-10 max-w-xl grid-cols-2 overflow-hidden rounded border border-[var(--app-input-border)] bg-[var(--app-input-bg)]">
        {([
          ['full', 'Full Match'],
          ['by_half', 'By Half'],
        ] satisfies Array<[CornerQuickPeriodGroup, string]>).map(([value, label]) => {
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

      <div className="grid gap-3">
        {visibleMarketGroups.map((group) => (
          <div className="grid gap-2 lg:grid-cols-[240px_minmax(0,1fr)]" key={group.value}>
            <div className="text-sm font-semibold text-[var(--app-text)]">{group.label}</div>
            <div className="flex flex-wrap gap-2">
              {group.lines.map((line) => {
                const isActive = filters.marketGroup === group.value && filters.line === line;
                return (
                  <button
                    className={[
                      'h-8 rounded border px-3 text-xs font-semibold transition-colors',
                      isActive
                        ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white'
                        : 'border-[var(--app-border)] bg-[var(--app-panel-muted)] text-[var(--app-text-soft)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]',
                    ].join(' ')}
                    key={`${group.value}:${line}`}
                    disabled={isBusy || isActive}
                    onClick={() => updateMarketLine(group.value, line)}
                    type="button"
                  >
                    {lineLabel(group.value, line)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
