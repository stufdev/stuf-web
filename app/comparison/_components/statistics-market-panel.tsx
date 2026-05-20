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
  if (!hasRowData(record)) return <span className="text-[12px] text-[var(--app-text-dim)]">-</span>;
  return (<span className="text-[12px] font-semibold text-[var(--app-text)]">{formatPercentage(record?.percentage)}{' '}<span className="font-medium text-[var(--app-text-dim)]">{formatSample(record)}</span></span>);
}

function RightValue({ record }: { record: TeamMarketTrendRecord | null }) {
  if (!hasRowData(record)) return <span className="text-[12px] text-[var(--app-text-dim)]">-</span>;
  return (<span className="text-[12px] font-semibold text-[var(--app-text)]"><span className="font-medium text-[var(--app-text-dim)]">{formatSample(record)}</span>{' '}{formatPercentage(record?.percentage)}</span>);
}

function MirroredMarketRow({ row }: { row: StatisticsMarketRow }) {
  return (
    <div className="grid items-center gap-3 border-b border-[var(--app-border)] px-3 py-1.5 last:border-b-0 md:grid-cols-[140px_minmax(100px,1fr)_minmax(200px,320px)_minmax(100px,1fr)_140px]">
      <div className="hidden justify-end md:flex"><LeftValue record={row.home} /></div>
      <div className="hidden h-5 items-center justify-end md:flex">
        <div className="flex h-5 w-full items-center justify-end rounded-[5px] bg-[var(--app-canvas)] px-0.5">
          {hasRowData(row.home) ? <div className="h-3 rounded-[4px] bg-[#7fb8e8]" style={{ width: getBarWidth(row.home) }} /> : null}
        </div>
      </div>
      <div className="text-center">
        <p className="text-[12px] font-medium leading-snug text-[var(--app-text)]">{row.label}</p>
        <div className="mt-0.5 flex items-center justify-between gap-3 text-[12px] md:hidden"><LeftValue record={row.home} /><RightValue record={row.away} /></div>
      </div>
      <div className="hidden h-5 items-center md:flex">
        <div className="flex h-5 w-full items-center rounded-[5px] bg-[var(--app-canvas)] px-0.5">
          {hasRowData(row.away) ? <div className="h-3 rounded-[4px] bg-[#92e08d]" style={{ width: getBarWidth(row.away) }} /> : null}
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
    <section className="overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex flex-col gap-1 border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--app-text)]">{t('Statistics')}</h2>
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{t('Current season')}</p>
      </div>

      <div className="border-b border-[var(--app-border)] px-3 py-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {STATISTICS_CATEGORY_TABS.map((tab) => {
            const isActive = tab.id === category;
            return (
              <button key={tab.id} className={`whitespace-nowrap rounded-[5px] border px-2.5 py-1 text-[15px] font-medium transition-colors ${isActive ? 'border-[var(--app-border-strong)] bg-[var(--app-panel-muted)] text-[var(--app-text)]' : 'border-transparent bg-transparent text-[var(--app-text-dim)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]'}`} onClick={() => onCategoryChange(tab.id)} type="button">{t(tab.label)}</button>
            );
          })}
        </div>
      </div>

      <div className="grid border-b border-[var(--app-border)] bg-[var(--app-canvas)] px-3 py-1.5 text-[12px] font-semibold text-[var(--app-text-dim)] md:grid-cols-[140px_minmax(100px,1fr)_minmax(200px,320px)_minmax(100px,1fr)_140px]">
        <div className="hidden text-right md:block">{homeHeaderLabel}</div>
        <div className="hidden md:block" />
        <div className="text-center">{scopeLabel}</div>
        <div className="hidden md:block" />
        <div className="hidden md:block">{awayHeaderLabel}</div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center px-4 text-center text-[12px] text-[var(--app-text-dim)]">{t('Loading current season statistics...')}</div>
      ) : rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center px-4 text-center text-[12px] text-[var(--app-text-dim)]">{t('No season market statistics are ready yet for this category.')}</div>
      ) : (
        <div>{rows.map((row) => <MirroredMarketRow key={row.marketKey} row={row} />)}</div>
      )}
    </section>
  );
}
