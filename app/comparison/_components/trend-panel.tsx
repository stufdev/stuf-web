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
    <section className="flex flex-col overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-bg)]">
          {teamLogoUrl ? (
            <Image alt={`${teamName} logo`} className="h-4 w-4 object-contain" height={16} src={teamLogoUrl} width={16} />
          ) : (
            <span className="text-[8px] font-semibold uppercase text-[var(--app-text-dim)]">{teamName.slice(0, 2)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{sideLabel}</p>
          <p className="truncate text-[15px] font-semibold text-[var(--app-text)]">{teamName}</p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-[var(--app-border)] bg-[var(--app-bg)] px-2">
        {TREND_CATEGORY_TABS.map((tab) => {
          const isActive = tab.id === category;
          return (
            <button
              key={tab.id}
              className={`shrink-0 border-b px-3 py-2 text-[14px] font-medium transition-colors ${isActive
                ? 'border-[var(--app-border-strong)] bg-[var(--app-panel-muted)] text-[var(--app-text)]'
                : 'border-transparent text-[var(--app-text-dim)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]'
                }`}
              onClick={() => onCategoryChange(tab.id)}
              type="button"
            >
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      <div className="min-h-28">
        {isLoading ? (
          <div className="flex h-24 items-center justify-center px-4 text-[15px] text-[var(--app-text-dim)]">{t('Loading trends...')}</div>
        ) : visibleItems.length === 0 ? (
          <div className="flex h-24 items-center justify-center px-4 text-center text-[15px] text-[var(--app-text-dim)]">{emptyMessage}</div>
        ) : (
          <ul className="divide-y divide-[var(--app-border)]">
            {visibleItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 border-l-2 border-l-[var(--app-border)] px-3 py-1.5 text-[15px] leading-5">
                <span className="text-[var(--app-text)]">{item.text}</span>
                {item.isHot ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#ff8a1f]">
                    <Flame className="h-[1.45rem] w-[1.45rem] fill-current" strokeWidth={1.75} />
                    <span>{t('streak')}</span>
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
