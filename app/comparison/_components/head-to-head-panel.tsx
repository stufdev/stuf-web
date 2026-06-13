'use client';

import { Swords } from 'lucide-react';
import { useLanguage } from '../../language-provider';
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
  getCenterColumnLabel,
  getMatchDisplayValue,
  getMatchRowClass,
  getMatchValueClass,
} from '../helpers';
import type { HistoricalMatch } from '../types';
import { cn } from '@/lib/utils';

type HeadToHeadPanelProps = {
  homeTeamName: string;
  awayTeamName: string;
  data: HistoricalMatch[];
  marketKey: string;
  scopeLabel: string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
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
    <TableRow className={`border-border/50 hover:bg-muted/30 ${rowClass}`}>
      <TableCell className="whitespace-nowrap px-3 py-1 font-mono text-[12px] tabular-nums text-muted-foreground">
        {match.date}
      </TableCell>
      <TableCell className="px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {match.competitionLabel}
      </TableCell>
      <TableCell className="px-3 py-1">
        <div className="grid grid-cols-[minmax(0,1fr)_36px] items-center gap-2">
          <span className="truncate text-right text-[13px] font-semibold text-foreground">{match.homeTeamName}</span>
          <RedCardSlot align="right" redCards={match.homeRedCards} />
        </div>
      </TableCell>
      <TableCell className="px-2 py-1 text-center">
        <span className={`font-mono text-[13px] font-bold tabular-nums ${valueClass}`}>{displayValue}</span>
      </TableCell>
      <TableCell className="px-3 py-1">
        <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
          <RedCardSlot align="left" redCards={match.awayRedCards} />
          <span className="truncate text-[13px] font-semibold text-foreground">{match.awayTeamName}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function HeadToHeadPanel({
  homeTeamName,
  awayTeamName,
  data,
  marketKey,
  scopeLabel,
  isLoading = false,
  emptyMessage = 'No head-to-head data available.',
  className,
}: HeadToHeadPanelProps) {
  const { language, t } = useLanguage();
  const centerColumnLabel = getCenterColumnLabel(marketKey, language);

  return (
    <section className={cn('overflow-hidden rounded-[6px] border border-border/60 bg-background', className)}>
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/[0.06] px-4 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground/80">
              {t('Head To Head')}
            </p>
            <span className="text-[12px] font-medium text-muted-foreground/60">{t(scopeLabel)}</span>
          </div>
          <p className="mt-0.5 truncate text-[15px] font-bold text-foreground">
            {homeTeamName} vs {awayTeamName}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto bg-muted/[0.015]">
        {isLoading ? (
          <div className="flex h-16 items-center justify-center text-[12px] font-medium text-muted-foreground">{t('Loading...')}</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-9 text-center">
            <span className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-muted/[0.12]">
              <Swords className="size-4 text-muted-foreground/50" />
            </span>
            <p className="text-[13px] font-semibold text-foreground/80">{t('No previous meetings')}</p>
            <p className="max-w-xs text-[11px] leading-4 text-muted-foreground">
              {t('These two teams have not faced each other in the selected scope. Head-to-head will appear here once they do.')}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/[0.08]">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="h-9 px-3 py-1 text-left text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('Date')}</TableHead>
                <TableHead className="h-9 px-2 py-1 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('Comp')}</TableHead>
                <TableHead className="h-9 px-3 py-1 text-right text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('Home')}</TableHead>
                <TableHead className="h-9 px-2 py-1 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{centerColumnLabel}</TableHead>
                <TableHead className="h-9 px-3 py-1 text-left text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('Away')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((match) => (
                <HeadToHeadRow key={match.id} marketKey={marketKey} match={match} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
