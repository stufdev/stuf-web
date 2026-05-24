import type { GoalSearchParams } from '@/lib/server/goal-market-scanner';
import { GoalsQuickPage } from '../../_components/goals-quick-page';

export const revalidate = 60;

type PageProps = {
  searchParams?: Promise<GoalSearchParams>;
};

export default function GoalsByHalfQuickPage({ searchParams }: PageProps) {
  return <GoalsQuickPage family="goals_by_half" searchParams={searchParams} />;
}
