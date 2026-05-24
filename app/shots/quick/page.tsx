import type { ShotSearchParams } from '@/lib/server/shot-market-scanner';
import {
  loadShotFilterOptions,
  loadShotQuickScanner,
  parseShotQuickFilters,
} from '@/lib/server/shot-market-scanner';
import { ShotsQuickClient } from './_components/shots-quick-client';

export const revalidate = 60;

type ShotsQuickPageProps = {
  searchParams?: Promise<ShotSearchParams>;
};

type ShotsQuickPageData =
  | {
      filters: ReturnType<typeof parseShotQuickFilters>;
      options: Awaited<ReturnType<typeof loadShotFilterOptions>>;
      result: Awaited<ReturnType<typeof loadShotQuickScanner>>;
    }
  | {
      errorMessage: string;
    };

async function loadShotsQuickPageData(searchParams: ShotSearchParams | undefined): Promise<ShotsQuickPageData> {
  try {
    const options = await loadShotFilterOptions();
    const filters = parseShotQuickFilters(searchParams, options);
    const result = await loadShotQuickScanner(filters);
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Shots Quick Search could not be loaded.' };
  }
}

export default async function ShotsQuickPage({ searchParams }: ShotsQuickPageProps) {
  const data = await loadShotsQuickPageData(await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">Shots Quick Search unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <ShotsQuickClient initialFilters={data.filters} initialOptions={data.options} initialResult={data.result} />
    </main>
  );
}
