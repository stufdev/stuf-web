import type { GoalFamily } from '@/lib/server/goal-market-scanner';

export type GoalRouteConfig = {
  family: GoalFamily;
  title: string;
  detailedRoute: string;
  quickRoute: string;
  emptyLabel: string;
};

export const GOAL_ROUTE_CONFIG: Record<GoalFamily, GoalRouteConfig> = {
  match_totals: {
    family: 'match_totals',
    title: 'Overs',
    detailedRoute: '/goals/overs',
    quickRoute: '/goals/overs/quick',
    emptyLabel: 'goal totals',
  },
  team_goals: {
    family: 'team_goals',
    title: 'Team Goals',
    detailedRoute: '/goals/team-goals',
    quickRoute: '/goals/team-goals/quick',
    emptyLabel: 'team goal',
  },
  goals_by_half: {
    family: 'goals_by_half',
    title: 'Goals By Half',
    detailedRoute: '/goals/by-half',
    quickRoute: '/goals/by-half/quick',
    emptyLabel: 'goals by half',
  },
};

