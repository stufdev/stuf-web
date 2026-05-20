'use client';

import { useLanguage } from '../../language-provider';

export type ComparisonTabId =
  | 'recent-matches'
  | 'predictions'
  | 'player-stats'
  | 'referee-stats'
  | 'statistics'
  | 'odds';

export const COMPARISON_TABS: Array<{
  id: ComparisonTabId;
  label: string;
  available: boolean;
}> = [
    { id: 'recent-matches', label: 'Recent Matches', available: true },
    { id: 'predictions', label: 'Predictions', available: false },
    { id: 'player-stats', label: 'Player Stats', available: true },
    { id: 'referee-stats', label: 'Referee Stats', available: true },
    { id: 'statistics', label: 'Statistics', available: true },
    { id: 'odds', label: 'Odds', available: false },
  ];

type TabsNavProps = {
  activeTab: ComparisonTabId;
  onChange: (tab: ComparisonTabId) => void;
};

export function TabsNav({ activeTab, onChange }: TabsNavProps) {
  const { t } = useLanguage();

  return (
    <nav className="flex max-w-full gap-1 overflow-x-auto border border-[#2a2a2a] bg-[#050505] p-1">
      {COMPARISON_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            className={`
              inline-flex h-10 items-center gap-1.5 px-4 text-[15px] font-medium
              tracking-[0.01em] transition-colors shrink-0 rounded-[2px]
              ${isActive
                ? 'bg-[#141414] text-[#ededed]'
                : tab.available
                  ? 'text-[#a1a1a1] hover:bg-[#141414] hover:text-[#ededed]'
                  : 'text-[#a1a1a1] cursor-default'
              }
            `}
            onClick={() => {
              if (tab.available) onChange(tab.id);
            }}
            type="button"
          >
            <span>{t(tab.label)}</span>
            {!tab.available ? (
              <span className="rounded-[2px] bg-[#141414] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#a1a1a1]">
                {t('Soon')}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
