import type {
  CornerDetailResult,
  CornerFilterOptions,
  CornerFilters,
  CornerSearchParams,
} from '@/lib/server/corner-detail-scanner';
import {
  loadCornerFilterOptions,
  loadCornerLeagueTeamPanels,
  parseCornerFilters,
} from '@/lib/server/corner-detail-scanner';
import { CornersClient } from './_components/corners-client';

export const revalidate = 60;

type CornersPageProps = {
  searchParams?: Promise<CornerSearchParams>;
};

type CornersPageData =
  | {
      filters: CornerFilters;
      options: CornerFilterOptions;
      result: CornerDetailResult;
    }
  | {
      errorMessage: string;
    };

async function loadCornersPageData(searchParams: CornerSearchParams | undefined): Promise<CornersPageData> {
  try {
    const options = await loadCornerFilterOptions();
    const filters = parseCornerFilters(searchParams, options);
    const result = await loadCornerLeagueTeamPanels(filters);
    return { filters, options, result };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Corners could not be loaded.',
    };
  }
}

export default async function CornersPage({ searchParams }: CornersPageProps) {
  const data = await loadCornersPageData(await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">Corners unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <CornersClient
        initialFilters={data.filters}
        initialOptions={data.options}
        initialResult={data.result}
      />
    </main>
  );
}
