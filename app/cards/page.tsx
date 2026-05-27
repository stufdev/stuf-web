import type { CardSearchParams } from '@/lib/server/card-market-scanner';
import {
  loadCardFilterOptions,
  loadCardTeamPanels,
  parseCardFilters,
} from '@/lib/server/card-market-scanner';
import { CardsClient } from './_components/cards-client';

export const revalidate = 60;

type CardsPageProps = {
  searchParams?: Promise<CardSearchParams>;
};

type CardsPageData =
  | {
      filters: ReturnType<typeof parseCardFilters>;
      options: Awaited<ReturnType<typeof loadCardFilterOptions>>;
      result: Awaited<ReturnType<typeof loadCardTeamPanels>>;
    }
  | {
      errorMessage: string;
    };

async function loadCardsPageData(searchParams: CardSearchParams | undefined): Promise<CardsPageData> {
  try {
    const options = await loadCardFilterOptions();
    const filters = parseCardFilters(searchParams, options);
    const result = await loadCardTeamPanels(filters);
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Cards could not be loaded.' };
  }
}

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const data = await loadCardsPageData(await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">Cards unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <CardsClient initialFilters={data.filters} initialOptions={data.options} initialResult={data.result} />
    </main>
  );
}
