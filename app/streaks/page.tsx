import type { StreakScope, StreakView } from '@/lib/server/streak-scanner';
import {
  loadActiveStreakMarkets,
  loadGlobalStreakRows,
  type StreakScannerFilters,
} from '@/lib/server/streak-scanner';
import { StreaksFilters } from './_components/streaks-filters';
import { StreaksTable } from './_components/streaks-table';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

type StreaksPageProps = {
  searchParams?: Promise<SearchParams>;
};

const DEFAULT_FILTERS: StreakScannerFilters = {
  marketKey: 'ALL',
  minStreak: 5,
  scope: 'overall',
  view: 'active',
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseMinStreak(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstParam(value) ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FILTERS.minStreak;
  }
  return Math.min(Math.max(parsed, 1), 50);
}

function parseScope(value: string | string[] | undefined): StreakScope {
  const rawValue = firstParam(value);
  if (rawValue === 'home' || rawValue === 'away' || rawValue === 'overall') {
    return rawValue;
  }
  return DEFAULT_FILTERS.scope;
}

function parseMarketKey(value: string | string[] | undefined) {
  const rawValue = firstParam(value)?.trim();
  return rawValue ? rawValue : DEFAULT_FILTERS.marketKey;
}

function parseView(value: string | string[] | undefined): StreakView {
  return firstParam(value) === 'season' ? 'season' : 'active';
}

async function loadStreaksPageData(filters: StreakScannerFilters) {
  try {
    const marketOptions = await loadActiveStreakMarkets();
    const rows = await loadGlobalStreakRows(filters, marketOptions);
    return { marketOptions, rows };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Streaks could not be loaded.',
    };
  }
}

export default async function StreaksPage({ searchParams }: StreaksPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters: StreakScannerFilters = {
    marketKey: parseMarketKey(resolvedSearchParams?.marketKey),
    minStreak: parseMinStreak(resolvedSearchParams?.minStreak),
    scope: parseScope(resolvedSearchParams?.scope),
    view: parseView(resolvedSearchParams?.view),
  };

  const data = await loadStreaksPageData(filters);
  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">Streaks unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <section className="px-4 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Streaks</h1>
            <div className="mt-1 text-sm text-[var(--app-text-dim)]">
              {filters.view === 'season'
                ? `${data.rows.length} season-best entries · peak ≥ ${filters.minStreak} · ${filters.scope}`
                : `${data.rows.length} active signals · min ${filters.minStreak} matches · ${filters.scope}`}
            </div>
          </div>
          <div className="rounded border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-text-dim)]">
            Top 50
          </div>
        </div>
      </section>

      <StreaksFilters filters={filters} marketOptions={data.marketOptions} />
      <StreaksTable rows={data.rows} view={filters.view} />
    </main>
  );
}
