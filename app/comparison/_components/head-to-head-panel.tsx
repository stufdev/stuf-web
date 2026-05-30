'use client';

import { useLanguage } from '../../language-provider';
import { getMarketGroup, MARKET_GROUPS } from '../../market-catalog';
import { RedCardSlot } from './red-card-slot';
import { SelectField } from '../../components/select-field';
import {
  getCenterColumnLabel,
  getMatchDisplayValue,
  getMatchRowClass,
  getMatchValueClass,
} from '../helpers';
import type { HistoricalMatch } from '../types';

type HeadToHeadPanelProps = {
  homeTeamName: string;
  awayTeamName: string;
  data: HistoricalMatch[];
  marketGroupId: string;
  marketKey: string;
  scopeLabel: string;
  isLoading?: boolean;
  emptyMessage?: string;
  onMarketGroupChange: (value: string) => void;
  onMarketKeyChange: (value: string) => void;
};

function HeadToHeadRow({
  match,
  marketKey,
}: {
  match: HistoricalMatch;
  marketKey: string;
}) {
  const displayValue = getMatchDisplayValue(match, marketKey);
  const valueClass = getMatchValueClass(match.hit);
  const rowClass = getMatchRowClass(match.hit);

  return (
    <tr className={`border-b border-[var(--app-border)] bg-[var(--app-panel)] last:border-b-0 ${rowClass}`}>
      <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-[var(--app-text-dim)]">
        {match.date}
      </td>
      <td className="px-2 py-2.5 text-center text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--app-text-dim)]">
        {match.competitionLabel}
      </td>
      <td className="px-3 py-2.5">
        <div className="grid grid-cols-[minmax(0,1fr)_36px] items-center gap-2">
          <span className="truncate text-right text-[12px] font-medium text-[var(--app-text)]">{match.homeTeamName}</span>
          <RedCardSlot align="right" redCards={match.homeRedCards} />
        </div>
      </td>
      <td className="px-2 py-2.5 text-center">
        <span className={`font-mono text-[12px] font-semibold tabular-nums ${valueClass}`}>{displayValue}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
          <RedCardSlot align="left" redCards={match.awayRedCards} />
          <span className="truncate text-[12px] font-medium text-[var(--app-text)]">{match.awayTeamName}</span>
        </div>
      </td>
    </tr>
  );
}

export function HeadToHeadPanel({
  homeTeamName,
  awayTeamName,
  data,
  marketGroupId,
  marketKey,
  scopeLabel,
  isLoading = false,
  emptyMessage = 'No head-to-head data available.',
  onMarketGroupChange,
  onMarketKeyChange,
}: HeadToHeadPanelProps) {
  const { language, t } = useLanguage();
  const selectedGroup = getMarketGroup(marketGroupId);
  const selectedLine = selectedGroup.lines.find((line) => line.key === marketKey) ?? selectedGroup.lines[0] ?? null;
  const centerColumnLabel = getCenterColumnLabel(selectedLine?.key ?? marketKey, language);

  return (
    <section className="overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">
              {t('Head To Head')}
            </p>
            <span className="text-[15px] font-medium text-[var(--app-text-dim)]">
              {t(scopeLabel)}
            </span>
          </div>
          <p className="truncate text-[14px] font-semibold text-[var(--app-text)]">
            {homeTeamName} vs {awayTeamName}
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-3 md:grid-cols-2">
        <SelectField label={t('Show stat type')} onChange={onMarketGroupChange} value={marketGroupId}>
          {MARKET_GROUPS.map((group) => (
            <option key={group.id} value={group.id}>
              {t(group.label)}
            </option>
          ))}
        </SelectField>

        <SelectField label={t('Highlight market')} onChange={onMarketKeyChange} value={selectedLine?.key ?? ''}>
          {selectedGroup.lines.map((line) => (
            <option key={line.key} value={line.key}>
              {t(line.label)}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex h-20 items-center justify-center text-[15px] text-[var(--app-text-dim)]">{t('Loading...')}</div>
        ) : data.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-[15px] text-[var(--app-text-dim)]">{emptyMessage}</div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-canvas)]">
                <th className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{t('Date')}</th>
                <th className="px-2 py-2 text-center text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{t('Comp')}</th>
                <th className="px-3 py-2 text-right text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{t('Home')}</th>
                <th className="px-2 py-2 text-center text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{centerColumnLabel}</th>
                <th className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{t('Away')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((match) => (
                <HeadToHeadRow key={match.id} marketKey={selectedLine?.key ?? marketKey} match={match} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
