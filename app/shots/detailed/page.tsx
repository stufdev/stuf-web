import type { ShotSearchParams } from '@/lib/server/shot-market-scanner';
import {
  loadShotFilterOptions,
  loadShotTeamPanels,
  parseShotFilters,
} from '@/lib/server/shot-market-scanner';
import { ShotsClient } from '../_components/shots-client';

export const revalidate = 60;

type ShotsPageProps = {
  searchParams?: Promise<ShotSearchParams>;
};

type ShotsPageData =
  | {
      filters: ReturnType<typeof parseShotFilters>;
      options: Awaited<ReturnType<typeof loadShotFilterOptions>>;
      result: Awaited<ReturnType<typeof loadShotTeamPanels>>;
    }
  | {
      errorMessage: string;
    };

async function loadShotsPageData(searchParams: ShotSearchParams | undefined): Promise<ShotsPageData> {
  try {
    const options = await loadShotFilterOptions();
    const filters = parseShotFilters(searchParams, options);
    const result = await loadShotTeamPanels(filters);
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Shots could not be loaded.' };
  }
}

export default async function ShotsDetailedPage({ searchParams }: ShotsPageProps) {
  const data = await loadShotsPageData(await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">Shots unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <ShotsClient initialFilters={data.filters} initialOptions={data.options} initialResult={data.result} />
    </main>
  );
}
