'use client';

import { useLanguage } from '../../language-provider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
}> = [
    { id: 'recent-matches', label: 'Recent Matches' },
    { id: 'predictions', label: 'Predictions' },
    { id: 'player-stats', label: 'Player Stats' },
    { id: 'referee-stats', label: 'Referee Stats' },
    { id: 'statistics', label: 'Statistics' },
    { id: 'odds', label: 'Odds' },
  ];

type TabsNavProps = {
  activeTab: ComparisonTabId;
  onChange: (tab: ComparisonTabId) => void;
};

export function TabsNav({ activeTab, onChange }: TabsNavProps) {
  const { t } = useLanguage();

  return (
    <Tabs value={activeTab} onValueChange={(v) => onChange(v as ComparisonTabId)} className="w-full">
      <div className="overflow-x-auto pb-1">
        <TabsList className="flex h-11 w-max justify-start bg-muted/20 p-1 rounded-md">
          {COMPARISON_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="text-[13px] font-medium tracking-wide data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm px-4 h-full rounded-sm transition-all"
            >
              {t(tab.label)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
