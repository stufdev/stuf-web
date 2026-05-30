export type AppSectionStatus = 'Live' | 'Soon';

export type AppSection = {
  id: string;
  href?: string;
  label: string;
  shortLabel: string;
  status: AppSectionStatus;
  description: string;
};

export const APP_SECTIONS: AppSection[] = [
  {
    id: 'comparison',
    href: '/comparison',
    label: 'Comparison',
    shortLabel: 'CMP',
    status: 'Live',
    description: 'Head-to-head, team form, player context and referee context in one match view.',
  },
  {
    id: 'fixtures',
    href: '/fixtures',
    label: 'Fixtures',
    shortLabel: 'FIX',
    status: 'Live',
    description: 'Scan the next fixtures by market strength, threshold and sample without leaving the schedule.',
  },
  {
    id: 'streaks',
    href: '/streaks',
    label: 'Streaks',
    shortLabel: 'STR',
    status: 'Live',
    description: 'Track live streak candidates across the next fixtures and jump straight into comparison.',
  },
  {
    id: 'predictions',
    label: 'Predictions',
    shortLabel: 'PRD',
    status: 'Soon',
    description: 'Model signals and confidence scores will land here once this block is ready.',
  },
  {
    id: 'player-props',
    href: '/player-props',
    label: 'Player Props',
    shortLabel: 'PRP',
    status: 'Live',
    description: 'Historical hit rates for player props across upcoming V1 fixtures.',
  },
  {
    id: 'players',
    label: 'Player DB',
    shortLabel: 'PLY',
    status: 'Soon',
    description: 'Search and compare player profiles, trends and season leaders.',
  },
  {
    id: 'odds',
    label: 'Odds',
    shortLabel: 'ODD',
    status: 'Soon',
    description: 'Market prices, bookmaker context and eventual value layers will live here.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    shortLabel: 'ANA',
    status: 'Soon',
    description: 'Cross-module reporting and QA views will live here.',
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'CFG',
    status: 'Soon',
    description: 'Environment, workflow and release preferences will live here.',
  },
];

export const DEFAULT_APP_SECTION: AppSection = {
  id: 'home',
  label: 'Stuf Statistics',
  shortLabel: 'STUF',
  status: 'Live',
  description: 'Professional football analytics workspace.',
};

export function getAppSectionByPath(pathname: string) {
  return (
    APP_SECTIONS.find((section) => section.href && (pathname === section.href || pathname.startsWith(`${section.href}/`))) ??
    DEFAULT_APP_SECTION
  );
}
