'use client';

import Image from 'next/image';
import { useLanguage } from '../../language-provider';
import { getMarketGroup, MARKET_GROUPS } from '../../market-catalog';
import { RedCardSlot } from './red-card-slot';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
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
  const goalsDisplay = getMatchDisplayValue(match, marketKey);
  const valueClass = getMatchValueClass(match.hit);
  const rowClass = getMatchRowClass(match.hit);

  return (
    <TableRow className={`border-border/50 hover:bg-muted/30 ${rowClass}`}>
      <TableCell className="px-3 py-1.5 font-mono text-[12px] tabular-nums text-muted-foreground whitespace-nowrap">
        {match.date}
      </TableCell>
      <TableCell className="px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {match.competitionLabel}
      </TableCell>
      <TableCell className="px-3 py-1.5">
        <div className="grid grid-cols-[minmax(0,1fr)_36px] items-center gap-2">
          <span className="truncate text-right text-[13px] font-medium text-foreground">
            {match.isHome ? (
              <span className="font-bold">{match.homeTeamName}</span>
            ) : (
              match.homeTeamName
            )}
          </span>
          <RedCardSlot align="right" redCards={match.homeRedCards} />
        </div>
      </TableCell>
      <TableCell className="px-2 py-1.5 text-center">
        <span className={`font-mono text-[13px] font-bold tabular-nums ${valueClass}`}>
          {goalsDisplay}
        </span>
      </TableCell>
      <TableCell className="px-3 py-1.5">
        <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-1.5">
          <RedCardSlot align="left" redCards={match.awayRedCards} />
          <span className="truncate text-[13px] font-medium text-foreground">
            {!match.isHome ? (
              <span className="font-bold">{match.awayTeamName}</span>
            ) : (
              match.awayTeamName
            )}
          </span>
        </div>
      </TableCell>
    </TableRow>
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
    <section className="flex flex-col overflow-hidden rounded-md border border-border/60 bg-background shadow-sm">
      <div className="flex items-center gap-3 border-b border-border/50 bg-muted/20 px-4 py-3">
        <div className="flex shrink-0 items-center justify-center">
          {teamLogoUrl ? (
            <Image
              alt={`${teamName} logo`}
              className="size-8 object-contain drop-shadow-sm"
              height={32}
              src={teamLogoUrl}
              width={32}
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-muted border border-border/50">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {teamName.slice(0, 2)}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-bold text-foreground">
              {teamName}
            </p>
            <span className="text-[12px] font-medium text-muted-foreground/80">
              {accentLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border/50 bg-muted/10 px-4 py-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('Show stat type')}</label>
          <Select value={marketGroupId} onValueChange={onMarketGroupChange}>
            <SelectTrigger className="h-8 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKET_GROUPS.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {t(group.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('Highlight market')}</label>
          <Select value={selectedLine?.key ?? ''} onValueChange={onMarketKeyChange}>
            <SelectTrigger className="h-8 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectedGroup.lines.map((line) => (
                <SelectItem key={line.key} value={line.key}>
                  {t(line.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex h-24 items-center justify-center px-4 text-center text-[13px] font-medium text-muted-foreground">
            {t('Loading...')}
          </div>
        ) : matches.length === 0 ? (
          <div className="flex h-24 items-center justify-center px-4 text-center text-[13px] font-medium text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="h-8 px-3 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Date')}</TableHead>
                <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Comp')}</TableHead>
                <TableHead className="h-8 px-3 py-1 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Home')}</TableHead>
                <TableHead className="h-8 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{centerColumnLabel}</TableHead>
                <TableHead className="h-8 px-3 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Away')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => (
                <MatchTableRow key={match.id} marketKey={selectedLine?.key ?? marketKey} match={match} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
