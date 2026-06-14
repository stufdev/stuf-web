'use client';

import Image from 'next/image';
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

/* ——— Types ——— */
type TeamPanelProps = {
  teamName: string;
  teamLogoUrl: string | null;
  accent: 'left' | 'right';
  marketKey: string;
  matches: HistoricalMatch[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
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

  const parts = match.date.split(' ');
  const topDate = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : match.date;
  const bottomYear = parts.length >= 3 ? parts[2] : '';

  return (
    <TableRow className={`border-border/50 hover:bg-muted/30 ${rowClass}`}>
      <TableCell className="whitespace-nowrap px-2 py-1 font-mono tabular-nums text-muted-foreground">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[11px] font-semibold leading-[1.2] text-foreground/90">{topDate}</span>
          {bottomYear ? <span className="text-[9px] leading-[1.2] text-muted-foreground/70">{bottomYear}</span> : null}
        </div>
      </TableCell>
      <TableCell className="px-1.5 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {match.competitionLabel}
      </TableCell>
      <TableCell className="px-2 py-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
          <span className="truncate text-right text-[12px] font-medium text-foreground sm:text-[13px]">
            {match.isHome ? (
              <span className="font-bold">{match.homeTeamName}</span>
            ) : (
              match.homeTeamName
            )}
          </span>
          <RedCardSlot align="right" redCards={match.homeRedCards} />
        </div>
      </TableCell>
      <TableCell className="px-1.5 py-1 text-center">
        <span className={`font-mono text-[12px] font-bold tabular-nums sm:text-[13px] ${valueClass}`}>
          {goalsDisplay}
        </span>
      </TableCell>
      <TableCell className="px-2 py-1">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1">
          <RedCardSlot align="left" redCards={match.awayRedCards} />
          <span className="truncate text-[12px] font-medium text-foreground sm:text-[13px]">
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
  marketKey,
  matches,
  isLoading = false,
  emptyMessage = 'No historical data available.',
  className,
}: TeamPanelProps) {
  const { language, t } = useLanguage();
  const accentLabel = accent === 'left' ? t('Home') : t('Away');
  const centerColumnLabel = getCenterColumnLabel(marketKey, language);

  return (
    <section className={cn('flex flex-col overflow-hidden rounded-[6px] border border-border/60 bg-background shadow-none', className)}>
      <div className="flex items-center gap-3 border-b border-border/50 bg-muted/[0.06] px-4 py-2.5">
        <div className="flex shrink-0 items-center justify-center">
          {teamLogoUrl ? (
            <Image
              alt={`${teamName} logo`}
              className="size-8 object-contain"
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
            <p className="truncate text-[15px] font-semibold text-foreground">
              {teamName}
            </p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {accentLabel}
            </span>
          </div>
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
            <TableHeader className="bg-muted/[0.08]">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="h-9 px-2 py-1 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('Date')}</TableHead>
                <TableHead className="h-9 px-1.5 py-1 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('Comp')}</TableHead>
                <TableHead className="h-9 px-2 py-1 text-right text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('Home')}</TableHead>
                <TableHead className="h-9 px-1.5 py-1 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{centerColumnLabel}</TableHead>
                <TableHead className="h-9 px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('Away')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => (
                <MatchTableRow key={match.id} marketKey={marketKey} match={match} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
