import type { OffsideSearchParams } from '@/lib/server/offside-market-scanner';
import {
  loadOffsideFilterOptions,
  loadOffsideTeamPanels,
  parseOffsideFilters,
} from '@/lib/server/offside-market-scanner';
import { OffsidesClient } from '../_components/offsides-client';

export const revalidate = 60;

type OffsidesPageProps = {
  searchParams?: Promise<OffsideSearchParams>;
};

type OffsidesPageData =
  | {
      filters: ReturnType<typeof parseOffsideFilters>;
      options: Awaited<ReturnType<typeof loadOffsideFilterOptions>>;
      result: Awaited<ReturnType<typeof loadOffsideTeamPanels>>;
    }
  | {
      errorMessage: string;
    };

async function loadOffsidesPageData(searchParams: OffsideSearchParams | undefined): Promise<OffsidesPageData> {
  try {
    const options = await loadOffsideFilterOptions();
    const filters = parseOffsideFilters(searchParams, options);
    const result = await loadOffsideTeamPanels(filters);
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Offsides could not be loaded.' };
  }
}

export default async function OffsidesDetailedPage({ searchParams }: OffsidesPageProps) {
  const data = await loadOffsidesPageData(await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">Offsides unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <OffsidesClient initialFilters={data.filters} initialOptions={data.options} initialResult={data.result} />
    </main>
  );
}
