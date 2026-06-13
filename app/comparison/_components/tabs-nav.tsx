'use client';

import { useLanguage } from '../../language-provider';
import { cn } from '@/lib/utils';

export type ComparisonTabId =
  | 'recent-matches'
  | 'predictions'
  | 'player-stats'
  | 'referee-stats'
  | 'statistics'
  | 'streaks'
  | 'odds';

export const COMPARISON_TABS: Array<{ id: ComparisonTabId; label: string }> = [
  { id: 'recent-matches', label: 'Recent Matches' },
  { id: 'predictions', label: 'Predictions' },
  { id: 'player-stats', label: 'Player Stats' },
  { id: 'referee-stats', label: 'Referee Stats' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'streaks', label: 'Streaks' },
  { id: 'odds', label: 'Odds' },
];

type TabsNavProps = {
  activeTab: ComparisonTabId;
  onChange: (tab: ComparisonTabId) => void;
};

export function TabsNav({ activeTab, onChange }: TabsNavProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-stretch gap-1">
      {COMPARISON_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'h-8 flex-1 whitespace-nowrap rounded-[5px] px-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors',
              isActive
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {t(tab.label)}
          </button>
        );
      })}
    </div>
  );
}
