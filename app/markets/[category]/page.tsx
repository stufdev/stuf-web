import { notFound } from 'next/navigation';
import type { GenericSearchParams } from '@/lib/server/generic-market-scanner';
import {
  loadGenericFilterOptions,
  loadGenericQuickScannerWithTiming,
  parseGenericQuickFilters,
} from '@/lib/server/generic-market-scanner';
import { GENERIC_MARKET_CATEGORIES, isGenericMarketCategory } from '@/lib/generic-market-categories';
import { MarketsQuickClient } from './_components/markets-quick-client';

export const revalidate = 60;

type MarketsQuickPageProps = {
  params: Promise<{ category: string }>;
  searchParams?: Promise<GenericSearchParams>;
};

type MarketsQuickPageData =
  | {
      filters: ReturnType<typeof parseGenericQuickFilters>;
      options: Awaited<ReturnType<typeof loadGenericFilterOptions>>;
      result: Awaited<ReturnType<typeof loadGenericQuickScannerWithTiming>>['result'];
    }
  | {
      errorMessage: string;
    };

async function loadMarketsQuickPageData(
  category: string,
  searchParams: GenericSearchParams | undefined,
): Promise<MarketsQuickPageData> {
  try {
    const options = await loadGenericFilterOptions(category);
    const filters = parseGenericQuickFilters(searchParams, options);
    const { result } = await loadGenericQuickScannerWithTiming(filters);
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Market board could not be loaded.' };
  }
}

export default async function MarketsQuickPage({ params, searchParams }: MarketsQuickPageProps) {
  const { category } = await params;
  if (!isGenericMarketCategory(category)) {
    notFound();
  }

  const categoryMeta = GENERIC_MARKET_CATEGORIES[category];
  const data = await loadMarketsQuickPageData(category, await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">{categoryMeta.label} board unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <MarketsQuickClient
        categoryLabel={categoryMeta.label}
        categoryDescription={categoryMeta.description}
        initialFilters={data.filters}
        initialOptions={data.options}
        initialResult={data.result}
      />
    </main>
  );
}
