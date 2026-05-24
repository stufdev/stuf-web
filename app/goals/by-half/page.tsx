import type { GoalSearchParams } from '@/lib/server/goal-market-scanner';
import { GoalsDetailedPage } from '../_components/goals-detailed-page';

export const revalidate = 60;

type PageProps = {
  searchParams?: Promise<GoalSearchParams>;
};

export default function GoalsByHalfPage({ searchParams }: PageProps) {
  return <GoalsDetailedPage family="goals_by_half" searchParams={searchParams} />;
}

