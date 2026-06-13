import { notFound } from 'next/navigation';
import type { GenericSearchParams } from '@/lib/server/generic-market-scanner';
import {
  loadGenericFilterOptions,
  loadGenericTeamPanelsWithTiming,
  parseGenericFilters,
} from '@/lib/server/generic-market-scanner';
import { GENERIC_MARKET_CATEGORIES, isGenericMarketCategory } from '@/lib/generic-market-categories';
import { MarketsDetailedView } from '../_components/markets-detailed-view';

export const revalidate = 60;

type MarketsDetailedPageProps = {
  params: Promise<{ category: string }>;
  searchParams?: Promise<GenericSearchParams>;
};

type MarketsDetailedPageData =
  | {
      filters: ReturnType<typeof parseGenericFilters>;
      options: Awaited<ReturnType<typeof loadGenericFilterOptions>>;
      result: Awaited<ReturnType<typeof loadGenericTeamPanelsWithTiming>>['result'];
    }
  | {
      errorMessage: string;
    };

async function loadMarketsDetailedPageData(
  category: string,
  searchParams: GenericSearchParams | undefined,
): Promise<MarketsDetailedPageData> {
  try {
    const options = await loadGenericFilterOptions(category);
    const filters = parseGenericFilters(searchParams, options);
    const includeEvidence = filters.teamId !== null || filters.teamSearch.trim() !== '';
    const { result } = await loadGenericTeamPanelsWithTiming(filters, { includeEvidence });
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Market detail could not be loaded.' };
  }
}

export default async function MarketsDetailedPage({ params, searchParams }: MarketsDetailedPageProps) {
  const { category } = await params;
  if (!isGenericMarketCategory(category)) {
    notFound();
  }

  const categoryMeta = GENERIC_MARKET_CATEGORIES[category];
  const data = await loadMarketsDetailedPageData(category, await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">{categoryMeta.label} detail unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <MarketsDetailedView
        categoryLabel={categoryMeta.label}
        filters={data.filters}
        options={data.options}
        result={data.result}
      />
    </main>
  );
}
