'use client';

import Image from 'next/image';
import { useLanguage } from '../../language-provider';
import { getMarketGroup, MARKET_GROUPS } from '../../market-catalog';
import { RedCardSlot } from './red-card-slot';
import { SelectField } from '../../components/select-field';
import {
  calculateMatchValue,
  evaluateHit,
  getCenterColumnLabel,
  getMatchDisplayValue,
  getMatchRowClass,
  getMatchValueClass,
} from '../helpers';
import type { HistoricalMatch } from '../types';

/* ——— Types ——— */
type TeamPanelProps = {
  teamName: string;
  teamLogoUrl: string | null;
  accent: 'left' | 'right';
  marketGroupId: string;
  marketKey: string;
  matches: HistoricalMatch[];
  isLoading?: boolean;
  emptyMessage?: string;
  onMarketGroupChange: (value: string) => void;
  onMarketKeyChange: (value: string) => void;
};

/* ——— Row component ——— */
function MatchTableRow({
  match,
  marketKey,
}: {
  match: HistoricalMatch;
  marketKey: string;
}) {
  const value = calculateMatchValue(match, marketKey);
  const isHit = evaluateHit(value, marketKey);
  const goalsDisplay = getMatchDisplayValue(match, marketKey);
  const valueClass = getMatchValueClass(isHit);
  const rowClass = getMatchRowClass(isHit);

  return (
    <tr className={`border-b border-[var(--app-border)] bg-[var(--app-panel)] last:border-b-0 ${rowClass}`}>
      <td className="px-3 py-2 font-mono text-[12px] tabular-nums text-[var(--app-text-dim)]">
        {match.date}
      </td>
      <td className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-[var(--app-text-dim)]">
        {match.competitionLabel}
      </td>
      <td className="px-3 py-2.5">
        <div className="grid grid-cols-[minmax(0,1fr)_36px] items-center gap-2">
          <span className="truncate text-right text-xs font-medium text-[var(--app-text)]">
            {match.isHome ? (
              <span className="font-semibold text-[var(--app-text)]">{match.homeTeamName}</span>
            ) : (
              match.homeTeamName
            )}
          </span>
          <RedCardSlot align="right" redCards={match.homeRedCards} />
        </div>
      </td>
      <td className="px-2 py-2.5 text-center">
        <span className={`font-mono text-xs font-semibold tabular-nums ${valueClass}`}>
          {goalsDisplay}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-1.5">
          <RedCardSlot align="left" redCards={match.awayRedCards} />
          <span className="truncate text-xs font-medium text-[var(--app-text)]">
            {!match.isHome ? (
              <span className="font-semibold text-[var(--app-text)]">{match.awayTeamName}</span>
            ) : (
              match.awayTeamName
            )}
          </span>
        </div>
      </td>
    </tr>
  );
}

/* ——— Main component ——— */
export function TeamPanel({
  teamName,
  teamLogoUrl,
  accent,
  marketGroupId,
  marketKey,
  matches,
  isLoading = false,
  emptyMessage = 'No historical data available.',
  onMarketGroupChange,
  onMarketKeyChange,
}: TeamPanelProps) {
  const { language, t } = useLanguage();
  const accentLabel = accent === 'left' ? t('Home') : t('Away');
  const selectedGroup = getMarketGroup(marketGroupId);
  const selectedLine = selectedGroup.lines.find((line) => line.key === marketKey) ?? selectedGroup.lines[0] ?? null;
  const centerColumnLabel = getCenterColumnLabel(selectedLine?.key ?? marketKey, language);

  return (
    <section className="flex flex-col overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-canvas)]">
          {teamLogoUrl ? (
            <Image
              alt={`${teamName} logo`}
              className="h-4 w-4 object-contain"
              height={16}
              src={teamLogoUrl}
              width={16}
            />
          ) : (
            <span className="text-[15px] font-semibold uppercase text-[var(--app-text-dim)]">
              {teamName.slice(0, 2)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[14px] font-semibold text-[var(--app-text)]">
              {teamName}
            </p>
            <span className="text-[15px] font-medium text-[var(--app-text-dim)]">
              {accentLabel}
            </span>
          </div>
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
          <div className="flex h-24 items-center justify-center px-4 text-center text-[15px] text-[var(--app-text-dim)]">
            {t('Loading...')}
          </div>
        ) : matches.length === 0 ? (
          <div className="flex h-24 items-center justify-center px-4 text-center text-[15px] text-[var(--app-text-dim)]">
            {emptyMessage}
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--app-border)] bg-[var(--app-canvas)]">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--app-text-dim)]">{t('Date')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-[var(--app-text-dim)]">{t('Comp')}</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-[var(--app-text-dim)]">{t('Home')}</th>
                <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-[var(--app-text-dim)]">{centerColumnLabel}</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--app-text-dim)]">{t('Away')}</th>
              </tr>
            </thead>
              <tbody>
                {matches.map((match) => (
                  <MatchTableRow key={match.id} marketKey={selectedLine?.key ?? marketKey} match={match} />
                ))}
              </tbody>
            </table>
        )}
      </div>
    </section>
  );
}
