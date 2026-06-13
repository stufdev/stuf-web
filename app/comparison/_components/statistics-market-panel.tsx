'use client';

import { useMemo } from 'react';
import { useLanguage } from '../../language-provider';
import { buildStatisticsRows, STATISTICS_CATEGORY_TABS, type StatisticsMarketRow } from '../helpers';
import type { ComparisonScope, StatisticsCategoryId, TeamMarketTrendRecord } from '../types';

type StatisticsMarketPanelProps = {
  awayTeamName: string;
  awayTrends: TeamMarketTrendRecord[];
  category: StatisticsCategoryId;
  homeTeamName: string;
  homeTrends: TeamMarketTrendRecord[];
  isLoading?: boolean;
  onCategoryChange: (value: StatisticsCategoryId) => void;
  scope: ComparisonScope;
};

function getScopeLabel(scope: ComparisonScope) { return scope === 'all' ? 'All matches' : 'Home/Away matches'; }
function getScopedTeamLabel(teamName: string, side: string, scope: ComparisonScope) { return scope === 'all' ? teamName : `${teamName} (${side})`; }
function formatPercentage(value: number | null | undefined) { if (value == null) return '-'; return `${Math.round(value)}%`; }
function formatSample(record: TeamMarketTrendRecord | null) { if (!record || record.sample <= 0) return '-'; return `(${record.hits}/${record.sample})`; }
function getBarWidth(record: TeamMarketTrendRecord | null) { if (!record || record.sample <= 0) return '0%'; return `${Math.max(0, Math.min(100, record.percentage))}%`; }
function hasRowData(record: TeamMarketTrendRecord | null) { return !!record && record.sample > 0; }

function LeftValue({ record }: { record: TeamMarketTrendRecord | null }) {
  if (!hasRowData(record)) return <span className="text-sm text-muted-foreground">-</span>;
  return <span className="text-sm font-semibold text-foreground">{formatPercentage(record?.percentage)} <span className="font-medium text-muted-foreground">{formatSample(record)}</span></span>;
}

function RightValue({ record }: { record: TeamMarketTrendRecord | null }) {
  if (!hasRowData(record)) return <span className="text-sm text-muted-foreground">-</span>;
  return <span className="text-sm font-semibold text-foreground"><span className="font-medium text-muted-foreground">{formatSample(record)}</span> {formatPercentage(record?.percentage)}</span>;
}

function MirroredMarketRow({ row }: { row: StatisticsMarketRow }) {
  return (
    <div className="grid items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0 md:grid-cols-[140px_minmax(100px,1fr)_minmax(220px,360px)_minmax(100px,1fr)_140px]">
      <div className="hidden justify-end md:flex"><LeftValue record={row.home} /></div>
      <div className="hidden h-5 items-center justify-end md:flex">
        <div className="flex h-5 w-full items-center justify-end rounded-full bg-muted/60 px-0.5">
          {hasRowData(row.home) ? <div className="h-3 rounded-full bg-emerald-500/80" style={{ width: getBarWidth(row.home) }} /> : null}
        </div>
      </div>
      <div className="text-center">
        <p className="text-[13px] font-medium leading-snug text-foreground">{row.label}</p>
        <div className="mt-1 flex items-center justify-between gap-3 md:hidden"><LeftValue record={row.home} /><RightValue record={row.away} /></div>
      </div>
      <div className="hidden h-5 items-center md:flex">
        <div className="flex h-5 w-full items-center rounded-full bg-muted/60 px-0.5">
          {hasRowData(row.away) ? <div className="h-3 rounded-full bg-sky-500/75" style={{ width: getBarWidth(row.away) }} /> : null}
        </div>
      </div>
      <div className="hidden md:flex"><RightValue record={row.away} /></div>
    </div>
  );
}

export function StatisticsMarketPanel({ awayTeamName, awayTrends, category, homeTeamName, homeTrends, isLoading = false, onCategoryChange, scope }: StatisticsMarketPanelProps) {
  const { language, t } = useLanguage();
  const rows = useMemo(() => buildStatisticsRows(homeTrends, awayTrends, category, language), [awayTrends, category, homeTrends, language]);
  const scopeLabel = t(getScopeLabel(scope));
  const homeHeaderLabel = getScopedTeamLabel(homeTeamName, t('Home').toLowerCase(), scope);
  const awayHeaderLabel = getScopedTeamLabel(awayTeamName, t('Away').toLowerCase(), scope);

  return (
    <section className="overflow-hidden rounded-[5px] border border-border/60 bg-background shadow-none">
      <div className="flex flex-col gap-1 border-b border-border/50 bg-muted/15 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{t('Statistics')}</h2>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{scopeLabel} · {t('Current season')}</p>
      </div>

      <div className="flex overflow-x-auto border-b border-border/50 bg-muted/5 px-2">
          {STATISTICS_CATEGORY_TABS.map((tab) => {
            const isActive = tab.id === category;
            return (
              <button
                key={tab.id}
                className={`shrink-0 border-b-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => onCategoryChange(tab.id)}
                type="button"
              >
                {t(tab.label)}
              </button>
            );
          })}
      </div>

      <div className="grid border-b border-border/50 bg-muted/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:grid-cols-[140px_minmax(100px,1fr)_minmax(220px,360px)_minmax(100px,1fr)_140px]">
        <div className="hidden text-right md:block">{homeHeaderLabel}</div>
        <div className="hidden md:block" />
        <div className="text-center">{scopeLabel}</div>
        <div className="hidden md:block" />
        <div className="hidden md:block">{awayHeaderLabel}</div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">{t('Loading current season statistics...')}</div>
      ) : rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">{t('No season market statistics are ready yet for this category.')}</div>
      ) : (
        <div>{rows.map((row) => <MirroredMarketRow key={row.marketKey} row={row} />)}</div>
      )}
    </section>
  );
}
