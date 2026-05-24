import type { GoalFamily, GoalSearchParams } from '@/lib/server/goal-market-scanner';
import {
  loadGoalFilterOptions,
  loadGoalQuickScanner,
  parseGoalQuickFilters,
} from '@/lib/server/goal-market-scanner';
import { GOAL_ROUTE_CONFIG } from '../_lib/goal-route-config';
import { GoalsQuickClient } from './goals-quick-client';

type GoalsQuickPageProps = {
  family: GoalFamily;
  searchParams?: Promise<GoalSearchParams>;
};

type GoalsQuickPageData =
  | {
      filters: ReturnType<typeof parseGoalQuickFilters>;
      options: Awaited<ReturnType<typeof loadGoalFilterOptions>>;
      result: Awaited<ReturnType<typeof loadGoalQuickScanner>>;
    }
  | {
      errorMessage: string;
    };

async function loadGoalsQuickPageData(
  family: GoalFamily,
  searchParams: GoalSearchParams | undefined,
): Promise<GoalsQuickPageData> {
  try {
    const options = await loadGoalFilterOptions(family);
    const filters = parseGoalQuickFilters({ ...(searchParams ?? {}), family }, options);
    const result = await loadGoalQuickScanner(filters);
    return { filters, options, result };
  } catch (error) {
    return { errorMessage: error instanceof Error ? error.message : 'Goals Quick Search could not be loaded.' };
  }
}

export async function GoalsQuickPage({ family, searchParams }: GoalsQuickPageProps) {
  const routeConfig = GOAL_ROUTE_CONFIG[family];
  const data = await loadGoalsQuickPageData(family, await searchParams);

  if ('errorMessage' in data) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]">
        <div className="border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-4">
          <h1 className="text-lg font-semibold text-[var(--app-danger-text)]">
            {routeConfig.title} Quick Search unavailable
          </h1>
          <p className="mt-2 text-sm text-[var(--app-danger-text)]">{data.errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <GoalsQuickClient
        initialFilters={data.filters}
        initialOptions={data.options}
        initialResult={data.result}
        routeConfig={routeConfig}
      />
    </main>
  );
}

