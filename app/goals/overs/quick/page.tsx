import type { GoalSearchParams } from '@/lib/server/goal-market-scanner';
import { GoalsQuickPage } from '../../_components/goals-quick-page';

export const revalidate = 60;

type PageProps = {
  searchParams?: Promise<GoalSearchParams>;
};

export default function OversQuickPage({ searchParams }: PageProps) {
  return <GoalsQuickPage family="match_totals" searchParams={searchParams} />;
}
