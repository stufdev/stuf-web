import type {
  CornerQuickFilterOptions,
  CornerQuickFilters,
  CornerQuickResult,
  CornerQuickSearchParams,
} from '@/lib/server/corner-quick-scanner';
import {
  loadCornerQuickFilterOptions,
  loadCornerQuickScanner,
  parseCornerQuickFilters,
} from '@/lib/server/corner-quick-scanner';
import { CornersQuickClient } from './_components/corners-quick-client';

export const revalidate = 60;

type CornersQuickPageProps = {
  searchParams?: Promise<CornerQuickSearchParams>;
};

type CornersQuickPageData =
  | {
      filters: CornerQuickFilters;
      options: CornerQuickFilterOptions;
      result: CornerQuickResult;
    }
  | {
      errorMessage: string;
    };

async function loadCornersQuickPageData(searchParams: CornerQuickSearchParams | undefined): Promise<CornersQuickPageData> {
  try {
    const options = await loadCornerQuickFilterOptions();
    const filters = parseCornerQuickFilters(searchParams, options);
    const result = await loadCornerQuickScanner(filters);
    return { filters, options, result };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Corners Quick Search could not be loaded.',
    };
  }
}

export default async function CornersQuickPage({ searchParams }: CornersQuickPageProps) {
  const data = await loadCornersQuickPageData(await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">Corners Quick Search unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <CornersQuickClient
        initialFilters={data.filters}
        initialOptions={data.options}
        initialResult={data.result}
      />
    </main>
  );
}
