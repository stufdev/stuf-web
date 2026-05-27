import type { CardSearchParams } from '@/lib/server/card-market-scanner';
import {
  loadCardFilterOptions,
  loadCardQuickScanner,
  parseCardQuickFilters,
} from '@/lib/server/card-market-scanner';
import { CardsQuickClient } from './_components/cards-quick-client';

export const revalidate = 60;

type CardsQuickPageProps = {
  searchParams?: Promise<CardSearchParams>;
};

type CardsQuickPageData =
  | {
      filters: ReturnType<typeof parseCardQuickFilters>;
      options: Awaited<ReturnType<typeof loadCardFilterOptions>>;
      result: Awaited<ReturnType<typeof loadCardQuickScanner>>;
    }
  | {
      errorMessage: string;
    };

async function loadCardsQuickPageData(searchParams: CardSearchParams | undefined): Promise<CardsQuickPageData> {
  try {
    const options = await loadCardFilterOptions();
    const filters = parseCardQuickFilters(searchParams, options);
    const result = await loadCardQuickScanner(filters);
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Cards Quick Search could not be loaded.' };
  }
}

export default async function CardsQuickPage({ searchParams }: CardsQuickPageProps) {
  const data = await loadCardsQuickPageData(await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">Cards Quick Search unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <CardsQuickClient initialFilters={data.filters} initialOptions={data.options} initialResult={data.result} />
    </main>
  );
}
