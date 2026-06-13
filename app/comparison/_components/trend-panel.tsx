'use client';

import Image from 'next/image';
import { Flame } from 'lucide-react';
import { useLanguage } from '../../language-provider';
import { buildTrendList, TREND_CATEGORY_TABS } from '../helpers';
import type { TeamMarketTrendRecord, TrendCategoryId } from '../types';

type TrendPanelProps = {
  accent: 'left' | 'right';
  category: TrendCategoryId;
  emptyMessage?: string;
  isLoading?: boolean;
  teamLogoUrl: string | null;
  teamName: string;
  trends: TeamMarketTrendRecord[];
  onCategoryChange: (value: TrendCategoryId) => void;
};

export function TrendPanel({
  accent,
  category,
  emptyMessage = 'No trends qualified for this view yet.',
  isLoading = false,
  teamLogoUrl,
  teamName,
  trends,
  onCategoryChange,
}: TrendPanelProps) {
  const { language, t } = useLanguage();
  const sideLabel = accent === 'left' ? t('Home trends') : t('Away trends');
  const visibleItems = buildTrendList(trends, category, language);

  return (
    <section className="flex flex-col overflow-hidden rounded-[6px] border border-border/60 bg-background shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/[0.06] px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-border/70 bg-background">
            {teamLogoUrl ? (
              <Image alt={`${teamName} logo`} className="size-5 object-contain" height={20} src={teamLogoUrl} width={20} />
            ) : (
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">{teamName.slice(0, 2)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{sideLabel}</p>
            <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">{teamName}</p>
          </div>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t(category === 'all' ? 'All' : TREND_CATEGORY_TABS.find((tab) => tab.id === category)?.label ?? 'All')}
        </p>
      </div>

      <div className="flex overflow-x-auto border-b border-border/50 bg-muted/[0.03] px-2">
        {TREND_CATEGORY_TABS.map((tab) => {
          const isActive = tab.id === category;
          return (
            <button
              key={tab.id}
              className={`shrink-0 rounded-[4px] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                isActive
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onCategoryChange(tab.id)}
              type="button"
            >
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      <div className="min-h-20 bg-muted/[0.015]">
        {isLoading ? (
          <div className="flex h-16 items-center justify-center px-4 text-[12px] text-muted-foreground">{t('Loading trends...')}</div>
        ) : visibleItems.length === 0 ? (
          <div className="flex h-16 items-center justify-center px-4 text-center text-[12px] text-muted-foreground">{emptyMessage}</div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3">
            {visibleItems.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 border-b border-r border-border/40 px-3 py-2 text-[12px] leading-5">
                <span className="text-foreground">{item.text}</span>
                {item.isHot ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-amber-500/25 bg-amber-500/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                    <Flame className="size-3 fill-current" strokeWidth={1.8} />
                    {t('streak')}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
