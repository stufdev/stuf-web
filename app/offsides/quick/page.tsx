import type { OffsideSearchParams } from '@/lib/server/offside-market-scanner';
import {
  loadOffsideFilterOptions,
  loadOffsideQuickScanner,
  parseOffsideQuickFilters,
} from '@/lib/server/offside-market-scanner';
import { OffsidesQuickClient } from './_components/offsides-quick-client';

export const revalidate = 60;

type OffsidesQuickPageProps = {
  searchParams?: Promise<OffsideSearchParams>;
};

type OffsidesQuickPageData =
  | {
      filters: ReturnType<typeof parseOffsideQuickFilters>;
      options: Awaited<ReturnType<typeof loadOffsideFilterOptions>>;
      result: Awaited<ReturnType<typeof loadOffsideQuickScanner>>;
    }
  | {
      errorMessage: string;
    };

async function loadOffsidesQuickPageData(searchParams: OffsideSearchParams | undefined): Promise<OffsidesQuickPageData> {
  try {
    const options = await loadOffsideFilterOptions();
    const filters = parseOffsideQuickFilters(searchParams, options);
    const result = await loadOffsideQuickScanner(filters);
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Offsides Quick Search could not be loaded.' };
  }
}

export default async function OffsidesQuickPage({ searchParams }: OffsidesQuickPageProps) {
  const data = await loadOffsidesQuickPageData(await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">Offsides Quick Search unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <OffsidesQuickClient initialFilters={data.filters} initialOptions={data.options} initialResult={data.result} />
    </main>
  );
}
