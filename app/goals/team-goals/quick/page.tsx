import type { GoalSearchParams } from '@/lib/server/goal-market-scanner';
import { GoalsQuickPage } from '../../_components/goals-quick-page';

export const revalidate = 60;

type PageProps = {
  searchParams?: Promise<GoalSearchParams>;
};

export default function TeamGoalsQuickPage({ searchParams }: PageProps) {
  return <GoalsQuickPage family="team_goals" searchParams={searchParams} />;
}
