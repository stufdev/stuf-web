import type { PlayerPropSearchParams } from '@/lib/server/player-prop-scanner';
import {
  loadPlayerPropFilterOptions,
  loadPlayerPropRankings,
  parsePlayerPropFilters,
} from '@/lib/server/player-prop-scanner';
import { PlayerPropsClient } from './_components/player-props-client';

export const revalidate = 60;

type PlayerPropsPageProps = {
  searchParams?: Promise<PlayerPropSearchParams>;
};

type PlayerPropsPageData =
  | {
      filters: ReturnType<typeof parsePlayerPropFilters>;
      options: Awaited<ReturnType<typeof loadPlayerPropFilterOptions>>;
      result: Awaited<ReturnType<typeof loadPlayerPropRankings>>;
    }
  | { errorMessage: string };

async function loadPlayerPropsPageData(
  searchParams: PlayerPropSearchParams | undefined,
): Promise<PlayerPropsPageData> {
  try {
    const options = await loadPlayerPropFilterOptions();
    const filters = parsePlayerPropFilters(searchParams, options);
    const result = await loadPlayerPropRankings(filters);
    return { filters, options, result };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error ? error.message : 'Player Props could not be loaded.',
    };
  }
}

export default async function PlayerPropsPage({ searchParams }: PlayerPropsPageProps) {
  const data = await loadPlayerPropsPageData(await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">
            Player Props unavailable
          </h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
          <p className="mt-3 text-xs text-[var(--app-text-dim)]">
            Apply schema/009_player_prop_engine.sql, then run rebuild_player_prop_engine.py.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <PlayerPropsClient
        initialFilters={data.filters}
        initialOptions={data.options}
        initialResult={data.result}
      />
    </main>
  );
}
