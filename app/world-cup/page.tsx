import {
  loadWorldCupFixtureOdds,
  loadWorldCupFixtures,
  loadWorldCupPlayerStreaks,
  loadWorldCupStandings,
  loadWorldCupTeamAverages,
  loadWorldCupTopPlayers,
  parseWorldCupTopPlayerParams,
} from '@/lib/server/world-cup';
import { WorldCupHubClient } from './_components/world-cup-hub-client';

export const dynamic = 'force-dynamic';

type WorldCupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type WorldCupTab = 'all' | 'fixtures' | 'table' | 'top-players' | 'player-streaks' | 'player-props';
type WorldCupPageData =
  | {
      fixtures: Awaited<ReturnType<typeof loadWorldCupFixtures>>;
      initialPlayerStreaks: Awaited<ReturnType<typeof loadWorldCupPlayerStreaks>>;
      initialTopPlayers: Awaited<ReturnType<typeof loadWorldCupTopPlayers>>;
      standings: Awaited<ReturnType<typeof loadWorldCupStandings>>;
      teamAverages: Awaited<ReturnType<typeof loadWorldCupTeamAverages>>;
    }
  | { errorMessage: string };

function toUrlSearchParams(searchParams: Record<string, string | string[] | undefined> | undefined) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      if (value[0]) params.set(key, value[0]);
    } else if (value) {
      params.set(key, value);
    }
  }
  return params;
}

function parseTab(value: string | null): WorldCupTab {
  switch (value) {
    case 'fixtures':
    case 'table':
    case 'top-players':
    case 'player-streaks':
    case 'player-props':
      return value;
    default:
      return 'all';
  }
}

async function loadWorldCupPageData(
  topPlayerParams: Parameters<typeof loadWorldCupTopPlayers>[0],
): Promise<WorldCupPageData> {
  try {
    // Load fixtures first so we can join odds by fixture ID.
    const fixtures = await loadWorldCupFixtures();

    const [standings, teamAverages, initialTopPlayers, initialPlayerStreaks, fixtureOddsMap] =
      await Promise.all([
        loadWorldCupStandings(),
        loadWorldCupTeamAverages(),
        loadWorldCupTopPlayers(topPlayerParams),
        loadWorldCupPlayerStreaks(),
        loadWorldCupFixtureOdds(fixtures.map((f) => f.id)),
      ]);

    const fixturesWithOdds = fixtures.map((f) => ({
      ...f,
      matchOdds: fixtureOddsMap.get(f.id) ?? null,
    }));

    return { fixtures: fixturesWithOdds, initialPlayerStreaks, initialTopPlayers, standings, teamAverages };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'World Cup data could not be loaded.',
    };
  }
}

export default async function WorldCupPage({ searchParams }: WorldCupPageProps) {
  const resolvedSearchParams = await searchParams;
  const urlSearchParams = toUrlSearchParams(resolvedSearchParams);
  const initialTab = parseTab(urlSearchParams.get('tab'));
  const topPlayerParams = parseWorldCupTopPlayerParams(urlSearchParams);
  const data = await loadWorldCupPageData(topPlayerParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">World Cup hub unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <WorldCupHubClient
      fixtures={data.fixtures}
      initialPlayerStreaks={data.initialPlayerStreaks}
      initialTab={initialTab}
      initialTopPlayers={data.initialTopPlayers}
      standings={data.standings}
      teamAverages={data.teamAverages}
    />
  );
}
