import type { GoalFamily, GoalSearchParams } from '@/lib/server/goal-market-scanner';
import {
  loadGoalFilterOptions,
  loadGoalTeamPanels,
  parseGoalFilters,
} from '@/lib/server/goal-market-scanner';
import { GOAL_ROUTE_CONFIG } from '../_lib/goal-route-config';
import { GoalsClient } from './goals-client';

type GoalsDetailedPageProps = {
  family: GoalFamily;
  searchParams?: Promise<GoalSearchParams>;
};

type GoalsPageData =
  | {
      filters: ReturnType<typeof parseGoalFilters>;
      options: Awaited<ReturnType<typeof loadGoalFilterOptions>>;
      result: Awaited<ReturnType<typeof loadGoalTeamPanels>>;
    }
  | {
      errorMessage: string;
    };

async function loadGoalsPageData(
  family: GoalFamily,
  searchParams: GoalSearchParams | undefined,
): Promise<GoalsPageData> {
  try {
    const options = await loadGoalFilterOptions(family);
    const filters = parseGoalFilters({ ...(searchParams ?? {}), family }, options);
    const result = await loadGoalTeamPanels(filters);
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Goals could not be loaded.' };
  }
}

export async function GoalsDetailedPage({ family, searchParams }: GoalsDetailedPageProps) {
  const routeConfig = GOAL_ROUTE_CONFIG[family];
  const data = await loadGoalsPageData(family, await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">{routeConfig.title} unavailable</h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <GoalsClient
        initialFilters={data.filters}
        initialOptions={data.options}
        initialResult={data.result}
        routeConfig={routeConfig}
      />
    </main>
  );
}

