'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, startTransition, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Clock3,
  Filter,
  LoaderCircle,
  Radar,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { fetchJson } from '@/lib/fetch-json';
import { cn } from '@/lib/utils';
import { getDateKey } from '@/lib/date';
import type { UpcomingFixtureView as FixtureView } from '@/lib/upcoming-fixtures';
import { useLanguage } from '@/app/language-provider';
import {
  DEFAULT_MARKET_GROUP,
  DEFAULT_MARKET_LINE,
  getMarketGroup,
  MARKET_GROUPS,
} from '@/app/market-catalog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ScrollArea,
} from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const FIXTURE_WINDOW_DAYS = 14;
const THRESHOLDS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const MINIMUM_SAMPLE_OPTIONS = [0, 5, 8, 10];
const MINIMUM_ODDS_OPTIONS = [0, 1.3, 1.5, 1.7, 2, 2.5, 3];
const INTELLIGENCE_WINDOW_OPTIONS = [3, 6, 9, 14];

type WindowOption = 'all' | '5' | '6' | '8' | '10';
type GroupMode = 'date' | 'league';
type SignalBand = 'tendency' | 'strong' | 'watch' | 'context' | 'low_info';
type SignalSourceType =
  | 'team_market'
  | 'streak_informativeness'
  | 'referee_context'
  | 'player_prop';

type FixtureSignal = {
  signalKey: string;
  sourceType: SignalSourceType;
  label: string;
  headline: string;
  sample: number | null;
  hitRate: number | null;
  signalBand: SignalBand;
  signalRank: number;
  scope: 'overall' | 'home' | 'away' | null;
  sourcePayload: Record<string, unknown>;
};

type FixtureSignalCard = {
  fixtureId: number;
  leagueId: number;
  season: number;
  playedAt: string;
  homeTeamName: string;
  homeTeamLogoUrl: string | null;
  awayTeamName: string;
  awayTeamLogoUrl: string | null;
  leagueName: string;
  leagueLogoUrl: string | null;
  topBand: SignalBand;
  topStrength: number;
  signals: FixtureSignal[];
};

type FixtureSignalLeagueOption = {
  leagueId: number;
  leagueName: string;
  leagueLogoUrl: string | null;
  season: number;
};

type FixtureSignalsResponse = {
  filters: { leagueId: number | 'all'; season: number; windowDays: number };
  options: { defaultSeason: number; leagues: FixtureSignalLeagueOption[] };
  result: { cards: FixtureSignalCard[] };
};

type StatValue = {
  hits: number;
  percentage: number | null;
  sample: number;
};

type RowStats = {
  awayAll: StatValue | null;
  awayAway: StatValue | null;
  homeAll: StatValue | null;
  homeHome: StatValue | null;
};

type SignalRating = {
  matchedCells: number;
  sample: number;
};

type BoardDecisionCard = {
  selection: string;
  line: number | null;
  decisionStatus: string;
  priceSourceQuality: 'reference' | 'conditional' | null;
  referenceBookmaker: string | null;
  referencePrice: number | null;
  referenceCapturedAt: string | null;
};

type FixtureBoardEntry = {
  fixture: FixtureView;
  signal: SignalRating;
  stats: RowStats;
  decisionCards: BoardDecisionCard[];
};

const BAND_STYLES: Record<
  SignalBand,
  { badge: string; card: string; label: string }
> = {
  strong: {
    badge: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    card: 'border-emerald-500/15 bg-gradient-to-br from-emerald-500/6 via-card to-card',
    label: 'Strong',
  },
  tendency: {
    badge: 'border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-300',
    card: 'border-sky-500/15 bg-gradient-to-br from-sky-500/6 via-card to-card',
    label: 'Tendency',
  },
  watch: {
    badge: 'border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300',
    card: 'border-amber-500/15 bg-gradient-to-br from-amber-500/6 via-card to-card',
    label: 'Watch',
  },
  context: {
    badge: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    card: 'border-violet-500/15 bg-gradient-to-br from-violet-500/5 via-card to-card',
    label: 'Context',
  },
  low_info: {
    badge: 'border-border bg-muted/60 text-muted-foreground',
    card: 'border-border/70 bg-card',
    label: 'Low info',
  },
};

const DECISION_STATUS_LABELS: Record<string, string> = {
  stat_signal_only: 'Signal only',
  no_odds_available: 'No odds',
  priced_no_model: 'Priced',
  stale_price: 'Stale price',
  insufficient_data: 'Low data',
  model_ready_no_edge: 'No edge',
  edge_candidate: 'Edge candidate',
  positive_edge: 'Positive edge',
};

function percent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Math.round(Number(value))}%`;
}

function formatSectionDate(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(isoDate));
}

function formatShortDate(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(isoDate));
}

function formatKickoff(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoDate));
}

function sourceTag(sourceType: SignalSourceType, t: (text: string) => string) {
  switch (sourceType) {
    case 'team_market':
      return t('Market');
    case 'referee_context':
      return t('Referee');
    case 'player_prop':
      return t('Player');
    case 'streak_informativeness':
      return t('Streak');
    default:
      return sourceType;
  }
}

function sampleText(value: StatValue | null | undefined) {
  if (!value?.sample) return '-';
  return `${value.hits}/${value.sample}`;
}

function valueMeetsThreshold(value: StatValue | null, threshold: number) {
  return value?.percentage !== null && value?.percentage !== undefined && value.percentage >= threshold;
}

function rowMeetsThreshold(stats: RowStats, threshold: number) {
  return (
    valueMeetsThreshold(stats.homeHome, threshold) ||
    valueMeetsThreshold(stats.homeAll, threshold) ||
    valueMeetsThreshold(stats.awayAll, threshold) ||
    valueMeetsThreshold(stats.awayAway, threshold)
  );
}

function statCellClass(value: StatValue | null, threshold: number) {
  if (valueMeetsThreshold(value, threshold) && value?.sample) {
    return 'bg-emerald-500/[0.16] dark:bg-emerald-500/[0.18]';
  }

  return 'bg-transparent';
}

function cardSide(selection: string): 'home' | 'away' | 'match' {
  if (selection === 'home' || selection === 'win') return 'home';
  if (selection === 'away' || selection === 'loss') return 'away';
  return 'match';
}

function decisionStatusLabel(status: string) {
  return DECISION_STATUS_LABELS[status] ?? status;
}

function teamInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join('')
    .toUpperCase();
}

const METRIC_TONES = {
  neutral: {
    accent: 'from-border via-border/70 to-transparent',
    icon: 'text-muted-foreground',
  },
  emerald: {
    accent: 'from-emerald-500/80 via-emerald-500/25 to-transparent',
    icon: 'text-emerald-400',
  },
  sky: {
    accent: 'from-sky-500/80 via-sky-500/25 to-transparent',
    icon: 'text-sky-400',
  },
  amber: {
    accent: 'from-amber-500/80 via-amber-500/25 to-transparent',
    icon: 'text-amber-400',
  },
} as const;

type MetricTone = keyof typeof METRIC_TONES;

function ControlShell({
  label,
  children,
  caption,
  icon: Icon,
  className,
}: {
  label: string;
  children: React.ReactNode;
  caption?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border/60 bg-background/60 px-3 py-2.5', className)}>
      <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        <span className="truncate">{label}</span>
        {caption ? <span className="truncate text-[10px] normal-case tracking-normal">{caption}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SummaryMetricCard({
  icon: Icon,
  label,
  value,
  description,
  valueClassName,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
  valueClassName?: string;
  tone?: MetricTone;
}) {
  const styles = METRIC_TONES[tone];

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-background/75 px-3.5 py-3 shadow-xs">
      <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r', styles.accent)} />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className={cn('text-2xl font-semibold tracking-tight text-foreground', valueClassName)}>
            {value}
          </p>
        </div>
        <div className={cn('rounded-md border border-border/60 bg-background/60 p-2', styles.icon)}>
          <Icon className="size-4" />
        </div>
      </div>
      {description ? <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function InlineMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: MetricTone;
}) {
  const styles = METRIC_TONES[tone];

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span className={cn('text-sm font-semibold tabular-nums text-foreground', styles.icon)}>{value}</span>
    </div>
  );
}

function ScannerToolbarField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-10 items-center gap-2 rounded-lg border border-border/50 bg-muted/15 px-3',
        className,
      )}
      title={label}
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed border-border/80 bg-muted/10 py-0">
      <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <div className="rounded-full border border-border/70 bg-background p-3 text-muted-foreground">
          <Icon className="size-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  const { t } = useLanguage();

  return (
    <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
      <TriangleAlert className="size-4" />
      <AlertTitle>{t('Loading')}</AlertTitle>
      <AlertDescription>{t(message)}</AlertDescription>
    </Alert>
  );
}

function TeamLine({
  name,
  logoUrl,
  side,
}: {
  name: string;
  logoUrl: string | null;
  side: 'home' | 'away';
}) {
  const { t } = useLanguage();

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
          side === 'home'
            ? 'bg-emerald-500/12 text-emerald-300'
            : 'bg-sky-500/12 text-sky-300',
        )}
      >
        {side === 'home' ? t('Home short') : t('Away short')}
      </span>
      <Avatar size="sm" className="rounded-md border border-border/60 bg-background">
        {logoUrl ? <AvatarImage alt="" className="object-contain p-1" src={logoUrl} /> : null}
        <AvatarFallback className="rounded-md bg-muted/70 text-[10px] font-semibold">
          {teamInitials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium text-foreground">{name}</span>
    </div>
  );
}

function LeagueBadge({
  leagueName,
  leagueLogoUrl,
}: {
  leagueName: string;
  leagueLogoUrl: string | null;
}) {
  return (
    <Badge
      variant="outline"
      className="rounded-md border-border/60 bg-background/70 px-2 py-1 text-foreground"
    >
      <Avatar size="sm" className="rounded-md border border-border/50 bg-background">
        {leagueLogoUrl ? <AvatarImage alt="" className="object-contain p-1" src={leagueLogoUrl} /> : null}
        <AvatarFallback className="rounded-md bg-muted/70 text-[10px] font-semibold">
          {teamInitials(leagueName)}
        </AvatarFallback>
      </Avatar>
      {leagueName}
    </Badge>
  );
}

function SignalBandBadge({ band }: { band: SignalBand }) {
  const { t } = useLanguage();
  const config = BAND_STYLES[band];

  return (
    <Badge className={cn('rounded-md border px-2 py-1', config.badge)} variant="outline">
      {t(config.label)}
    </Badge>
  );
}

function SignalChip({ signal }: { signal: FixtureSignal }) {
  const { t } = useLanguage();
  const amplified = signal.sourcePayload?.referee_amplified === true;
  const bandTone =
    signal.signalBand === 'strong'
      ? 'bg-emerald-400'
      : signal.signalBand === 'tendency'
        ? 'bg-sky-400'
        : signal.signalBand === 'watch'
          ? 'bg-amber-400'
          : signal.signalBand === 'context'
            ? 'bg-violet-400'
            : 'bg-border';

  return (
    <li className="rounded-lg border border-border/60 bg-background/55 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', bandTone)} />
        <Badge variant="secondary" className="rounded-md px-2 py-0.5">
          {sourceTag(signal.sourceType, t)}
        </Badge>
        {amplified ? (
          <Badge variant="outline" className="rounded-md border-border/60 bg-background/70 px-2 py-0.5">
            {t('Referee context')}
          </Badge>
        ) : null}
        {signal.sample !== null ? (
          <span className="ml-auto text-[11px] font-medium text-muted-foreground">
            {signal.hitRate !== null ? `${percent(signal.hitRate)} · ` : ''}
            {`${signal.sample} ${t('matches')}`}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-5 text-foreground">{signal.headline}</p>
    </li>
  );
}

function IntelligenceCard({ card }: { card: FixtureSignalCard }) {
  const { locale, t } = useLanguage();
  const visibleSignals = card.signals.slice(0, 3);
  const hiddenSignalsCount = Math.max(card.signals.length - visibleSignals.length, 0);

  return (
    <Link className="group block" href={`/comparison?fixture=${card.fixtureId}`} prefetch={false}>
      <Card
        className={cn(
          'overflow-hidden border-border/60 bg-card/80 py-0 shadow-sm transition-all duration-200 hover:border-primary/25 hover:shadow-lg',
          BAND_STYLES[card.topBand].card,
        )}
      >
        <CardContent className="p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <LeagueBadge leagueLogoUrl={card.leagueLogoUrl} leagueName={card.leagueName} />
              <SignalBandBadge band={card.topBand} />
              <Badge variant="outline" className="rounded-md border-border/60 bg-background/70 px-2 py-1">
                {`${card.signals.length} ${t('Signals').toLowerCase()}`}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-base font-semibold tabular-nums text-foreground">
                  {formatKickoff(card.playedAt, locale)}
                </p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {formatShortDate(card.playedAt, locale)}
                </p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </div>

          <div className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
            <div className="space-y-3">
              <TeamLine logoUrl={card.homeTeamLogoUrl} name={card.homeTeamName} side="home" />
              <TeamLine logoUrl={card.awayTeamLogoUrl} name={card.awayTeamName} side="away" />
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <Clock3 className="size-3.5" />
                {t('Upcoming schedule')}
              </div>
            </div>

            {visibleSignals.length > 0 ? (
              <div className="space-y-2.5">
                <ul className="grid gap-2.5">
                  {visibleSignals.map((signal) => (
                    <SignalChip key={signal.signalKey} signal={signal} />
                  ))}
                </ul>
                {hiddenSignalsCount > 0 ? (
                  <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                    <span>{`+${hiddenSignalsCount} ${t('More signals').toLowerCase()}`}</span>
                    <span className="font-medium text-foreground">{t('Open Comparison')}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
                {t('No signals for this fixture yet.')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function IntelligenceSection({
  title,
  count,
  cards,
}: {
  title: string;
  count: number;
  cards: FixtureSignalCard[];
}) {
  const { t } = useLanguage();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/50 pb-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{`${count} ${t('Fixtures').toLowerCase()}`}</p>
        </div>
        <Badge variant="outline" className="rounded-md border-border/60 bg-background/70 px-2 py-1">
          {`${count} ${t('Fixtures').toLowerCase()}`}
        </Badge>
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        {cards.map((card) => (
          <IntelligenceCard card={card} key={card.fixtureId} />
        ))}
      </div>
    </section>
  );
}

function IntelligenceLoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="rounded-xl border border-border/70 bg-background/80 p-4 shadow-xs" key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-18" />
            <Skeleton className="mt-4 h-4 w-full" />
          </div>
        ))}
      </div>

      <Card className="overflow-hidden border-border/70 py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 2xl:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="rounded-xl border border-border/70 p-5" key={index}>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-4 w-52" />
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 3 }, (_, rowIndex) => (
                    <div className="rounded-xl border border-border/60 p-3" key={rowIndex}>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-3 h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IntelligenceView({ isActive }: { isActive: boolean }) {
  const { locale, t } = useLanguage();
  const [cards, setCards] = useState<FixtureSignalCard[]>([]);
  const [leagueOptions, setLeagueOptions] = useState<FixtureSignalLeagueOption[]>([]);
  const [leagueId, setLeagueId] = useState<'all' | number>('all');
  const [windowDays, setWindowDays] = useState(FIXTURE_WINDOW_DAYS);
  const [loading, setLoading] = useState(isActive);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isActive) return undefined;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function loadSignals() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        params.set('days', String(windowDays));
        if (leagueId !== 'all') params.set('leagueId', String(leagueId));

        const payload = await fetchJson<FixtureSignalsResponse>(
          `/api/v1/fixtures/signals?${params.toString()}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setCards(payload.result.cards);
        setLeagueOptions(payload.options.leagues);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Failed to load fixture signals', error);
        setErrorMessage('Fixture signals could not be loaded.');
        setCards([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSignals();
    return () => controller.abort();
  }, [isActive, leagueId, windowDays]);

  const uniqueLeagues = useMemo(() => {
    const seen = new Map<number, FixtureSignalLeagueOption>();
    for (const option of leagueOptions) {
      if (!seen.has(option.leagueId)) seen.set(option.leagueId, option);
    }
    return [...seen.values()];
  }, [leagueOptions]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, FixtureSignalCard[]>();
    for (const card of cards) {
      const key = getDateKey(card.playedAt);
      const group = groups.get(key) ?? [];
      group.push(card);
      groups.set(key, group);
    }
    return [...groups.entries()].map(([key, value]) => ({ key, cards: value }));
  }, [cards]);

  const selectedLeagueLabel = useMemo(() => {
    if (leagueId === 'all') return t('All leagues');
    return uniqueLeagues.find((option) => option.leagueId === leagueId)?.leagueName ?? t('League');
  }, [leagueId, t, uniqueLeagues]);

  const strongSignals = useMemo(
    () => cards.filter((card) => card.topBand === 'strong' || card.topBand === 'tendency').length,
    [cards],
  );

  const averageSignals = useMemo(() => {
    if (cards.length === 0) return '0.0';
    const totalSignals = cards.reduce((sum, card) => sum + card.signals.length, 0);
    return (totalSignals / cards.length).toFixed(1);
  }, [cards]);

  const isRefreshing = loading && cards.length > 0;

  if (loading && cards.length === 0 && !errorMessage) {
    return <IntelligenceLoadingState />;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid self-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetricCard
            icon={CalendarDays}
            label={t('Upcoming window')}
            tone="sky"
            value={String(cards.length)}
          />
          <SummaryMetricCard
            icon={Target}
            label={t('Strong signals')}
            tone="emerald"
            value={String(strongSignals)}
          />
          <SummaryMetricCard
            icon={Radar}
            label={t('Visible leagues')}
            tone="neutral"
            value={String(uniqueLeagues.length)}
          />
          <SummaryMetricCard
            icon={BarChart3}
            label={t('Signals per fixture')}
            tone="amber"
            value={averageSignals}
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-gradient-to-br from-muted/20 via-background to-background p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="size-4 text-muted-foreground" />
              {t('Filters')}
            </div>
            {isRefreshing ? (
              <Badge variant="outline" className="rounded-md border-border/60 bg-background/70 px-2 py-1">
                <LoaderCircle className="size-3.5 animate-spin" />
                {t('Loading...')}
              </Badge>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3">
            <ControlShell caption={selectedLeagueLabel} icon={Radar} label={t('League')}>
              <Select
                onValueChange={(value) => {
                  startTransition(() => {
                    setLeagueId(value === 'all' ? 'all' : Number(value));
                  });
                }}
                value={leagueId === 'all' ? 'all' : String(leagueId)}
              >
                <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder={t('All leagues')} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">{t('All leagues')}</SelectItem>
                  {uniqueLeagues.map((option) => (
                    <SelectItem key={option.leagueId} value={String(option.leagueId)}>
                      {option.leagueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlShell>

            <ControlShell caption={`${windowDays}d`} icon={CalendarDays} label={t('Window')}>
              <ScrollArea className="w-full whitespace-nowrap pb-1">
                <ToggleGroup
                  className="grid w-full min-w-max grid-cols-4"
                  onValueChange={(value) => {
                    if (!value) return;
                    startTransition(() => setWindowDays(Number(value)));
                  }}
                  type="single"
                  value={String(windowDays)}
                  variant="outline"
                >
                  {INTELLIGENCE_WINDOW_OPTIONS.map((option) => (
                    <ToggleGroupItem className="h-8" key={option} value={String(option)}>
                      {`${option}d`}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </ScrollArea>
            </ControlShell>

            <div className="flex flex-wrap gap-2">
              <InlineMetric label={t('Active league')} value={selectedLeagueLabel} />
              <InlineMetric label={t('Signals')} tone="emerald" value={String(cards.length ? strongSignals : 0)} />
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {loading && cards.length === 0 ? <IntelligenceLoadingState /> : null}

      {!loading && !errorMessage && groupedByDate.length === 0 ? (
        <EmptyState
          description={t('Adjust the filters or expand the scan horizon.')}
          icon={Sparkles}
          title={t('Signal board is empty for this window.')}
        />
      ) : null}

      {groupedByDate.map(({ key, cards: dateCards }) => (
        <IntelligenceSection
          cards={dateCards}
          count={dateCards.length}
          key={key}
          title={formatSectionDate(dateCards[0].playedAt, locale)}
        />
      ))}
    </div>
  );
}

function HistoricalStatTile({
  label,
  value,
  threshold,
  showLabel = false,
}: {
  label: string;
  value: StatValue | null;
  threshold: number;
  showLabel?: boolean;
}) {
  const hot = valueMeetsThreshold(value, threshold);

  return (
    <div className="flex min-h-[46px] min-w-[88px] flex-col items-center justify-center px-2 py-1 text-center">
      {showLabel ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      ) : null}
      <p
        className={cn(
          'text-[17px] leading-none font-semibold tracking-[-0.03em] tabular-nums',
          showLabel && 'mt-1.5',
          hot ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground',
        )}
      >
        {value?.sample ? percent(value.percentage) : '-'}
      </p>
      <p className="mt-0.5 text-[7px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {sampleText(value)}
      </p>
    </div>
  );
}

function PriceBadge({
  card,
}: {
  card: BoardDecisionCard;
}) {
  const { t } = useLanguage();
  if (card.referencePrice === null) return null;

  const isStale = card.decisionStatus === 'stale_price';
  const toneClass = isStale ? 'text-[#c4b5fd]' : 'text-[#8b5cf6]';

  return (
    <div
      className={cn('flex min-w-[56px] flex-col items-center justify-center px-1 text-center', toneClass)}
      title={`${t(decisionStatusLabel(card.decisionStatus))}${card.referenceBookmaker ? ` · ${card.referenceBookmaker}` : ''}`}
    >
      <span className={cn('text-[13px] leading-none font-semibold tracking-[-0.02em] tabular-nums', isStale && 'line-through')}>
        {card.referencePrice.toFixed(2)}
      </span>
      {card.referenceBookmaker ? (
        <span className="mt-0.5 max-w-full truncate text-[7px] font-semibold uppercase tracking-[0.12em] text-[#c4b5fd]">
          {card.referenceBookmaker}
        </span>
      ) : null}
    </div>
  );
}

function MarketPriceRail({
  cards,
}: {
  cards: BoardDecisionCard[];
}) {
  const priced = cards.filter((card) => card.referencePrice !== null);
  if (priced.length === 0) return null;
  const sorted = [...priced].sort((left, right) => {
    const order = { match: 0, home: 1, away: 2 } as const;
    return order[cardSide(left.selection)] - order[cardSide(right.selection)];
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {sorted.map((card) => (
        <PriceBadge card={card} key={`${card.selection}:${card.line ?? ''}`} />
      ))}
    </div>
  );
}

function FixtureTeamCell({
  teamName,
  teamLogoUrl,
  align = 'left',
  showLinkCue = false,
}: {
  teamName: string;
  teamLogoUrl: string | null;
  align?: 'left' | 'right';
  showLinkCue?: boolean;
}) {
  return (
    <div className={cn('relative min-w-[148px] pr-5', align === 'right' && 'text-right')}>
      {showLinkCue ? (
        <ArrowUpRight
          className="absolute top-1.5 right-0 size-3.5 text-[#9a9a9a]"
          strokeWidth={2.4}
        />
      ) : null}
      <div className={cn('flex items-center gap-2', align === 'right' && 'justify-end')}>
        <Avatar className="size-5 rounded-none border-0 bg-transparent shadow-none">
          {teamLogoUrl ? <AvatarImage alt="" className="object-contain" src={teamLogoUrl} /> : null}
          <AvatarFallback className="rounded-none bg-transparent text-[9px] font-semibold tracking-[0.08em] text-muted-foreground">
            {teamInitials(teamName)}
          </AvatarFallback>
        </Avatar>
        <p className="truncate text-[12px] font-medium leading-4 text-foreground">{teamName}</p>
      </div>
    </div>
  );
}

function KickoffCell({
  date,
  locale,
}: {
  date: string;
  locale: string;
}) {
  return (
    <div className="flex min-h-[46px] min-w-[80px] flex-col items-center justify-center text-center">
      <span className="text-[14px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-foreground">
        {formatKickoff(date, locale)}
      </span>
      <span className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {formatShortDate(date, locale)}
      </span>
    </div>
  );
}

function OddsCell({ cards }: { cards: BoardDecisionCard[] }) {
  const { t } = useLanguage();
  const hasPrices = cards.some((card) => card.referencePrice !== null);

  return (
    <div className="flex min-h-[46px] min-w-[132px] items-center justify-center">
      {hasPrices ? (
        <MarketPriceRail cards={cards} />
      ) : (
        <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#c4b5fd]">{t('No prices')}</p>
      )}
    </div>
  );
}

function SignalAlignmentCell({ signal }: { signal: SignalRating }) {
  const aligned = signal.matchedCells >= 2;

  return (
    <div className="flex min-h-[46px] min-w-[64px] flex-col items-center justify-center text-center">
      <span className={cn('text-[14px] leading-none font-semibold tracking-[-0.02em] tabular-nums', aligned ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground')}>
        {`${signal.matchedCells}/4`}
      </span>
      <span className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{`${signal.sample}m`}</span>
    </div>
  );
}

function ScannerDesktopTable({
  groups,
  threshold,
}: {
  groups: Array<{ entries: FixtureBoardEntry[]; title: string }>;
  threshold: number;
}) {
  const { locale, t } = useLanguage();
  const router = useRouter();

  return (
    <div className="hidden lg:block">
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-background">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[1220px]">
          <Table className="w-full border-separate border-spacing-0 font-sans [&_td]:border-0 [&_th]:border-0">
            <TableHeader>
              <TableRow className="border-b border-border/50 bg-muted/15 hover:bg-transparent [&>th+th]:border-l [&>th+th]:border-border/40">
                <TableHead className="min-w-[168px] px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('Home Team')}</TableHead>
                <TableHead className="min-w-[96px] px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{`${t('Home')} ${t('Split')}`}</TableHead>
                <TableHead className="min-w-[96px] px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{`${t('Home')} ${t('Overall')}`}</TableHead>
                <TableHead className="min-w-[88px] px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('KO')}</TableHead>
                <TableHead className="min-w-[140px] px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('Odds')}</TableHead>
                <TableHead className="min-w-[168px] px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('Away Team')}</TableHead>
                <TableHead className="min-w-[96px] px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{`${t('Away')} ${t('Overall')}`}</TableHead>
                <TableHead className="min-w-[96px] px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{`${t('Away')} ${t('Split')}`}</TableHead>
                <TableHead className="min-w-[72px] px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('Fit')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <Fragment key={group.title}>
                  <TableRow className="border-b border-border/50 bg-[#f3f3f4] hover:bg-[#f3f3f4] dark:bg-muted/20 dark:hover:bg-muted/20">
                    <TableCell className="px-3 py-2.5" colSpan={9}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-sky-500" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#171717] dark:text-foreground/90">
                            {group.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#4d4d4d] dark:text-muted-foreground">{`${group.entries.length} ${t('Fixtures').toLowerCase()}`}</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {group.entries.map((entry) => (
                    <TableRow
                      className="group cursor-pointer border-border/35 transition-colors hover:bg-muted/8 [&>td+td]:border-l [&>td+td]:border-border/30"
                      key={entry.fixture.id}
                      onClick={() => router.push(`/comparison?fixture=${entry.fixture.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          router.push(`/comparison?fixture=${entry.fixture.id}`);
                        }
                      }}
                      role="link"
                      tabIndex={0}
                    >
                      <TableCell className="px-3 py-0 align-middle text-left">
                        <FixtureTeamCell
                          showLinkCue
                          teamLogoUrl={entry.fixture.home_team_view?.logo_url ?? null}
                          teamName={entry.fixture.home_team_view?.name ?? `Team ${entry.fixture.home_team_id}`}
                        />
                      </TableCell>
                      <TableCell className={cn('px-0 py-0 align-middle text-center', statCellClass(entry.stats.homeHome, threshold))}>
                        <HistoricalStatTile
                          label={`${t('Home')} ${t('Split')}`}
                          threshold={threshold}
                          value={entry.stats.homeHome}
                        />
                      </TableCell>
                      <TableCell className={cn('px-0 py-0 align-middle text-center', statCellClass(entry.stats.homeAll, threshold))}>
                        <HistoricalStatTile
                          label={`${t('Home')} ${t('Overall')}`}
                          threshold={threshold}
                          value={entry.stats.homeAll}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-0 align-middle text-center">
                        <KickoffCell date={entry.fixture.date} locale={locale} />
                      </TableCell>
                      <TableCell className="bg-[#2b2d33] px-2 py-0 align-middle text-center dark:bg-[#23252b]">
                        <OddsCell cards={entry.decisionCards} />
                      </TableCell>
                      <TableCell className="px-3 py-0 align-middle text-right">
                        <FixtureTeamCell
                          align="right"
                          teamLogoUrl={entry.fixture.away_team_view?.logo_url ?? null}
                          teamName={entry.fixture.away_team_view?.name ?? `Team ${entry.fixture.away_team_id}`}
                        />
                      </TableCell>
                      <TableCell className={cn('px-0 py-0 align-middle text-center', statCellClass(entry.stats.awayAll, threshold))}>
                        <HistoricalStatTile
                          label={`${t('Away')} ${t('Overall')}`}
                          threshold={threshold}
                          value={entry.stats.awayAll}
                        />
                      </TableCell>
                      <TableCell className={cn('px-0 py-0 align-middle text-center', statCellClass(entry.stats.awayAway, threshold))}>
                        <HistoricalStatTile
                          label={`${t('Away')} ${t('Split')}`}
                          threshold={threshold}
                          value={entry.stats.awayAway}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-0 align-middle text-center">
                        <SignalAlignmentCell signal={entry.signal} />
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScannerMobileCards({
  entries,
  threshold,
}: {
  entries: FixtureBoardEntry[];
  threshold: number;
}) {
  const { locale, t } = useLanguage();

  return (
    <div className="grid gap-4 lg:hidden">
      {entries.map((entry) => {
        return (
          <Link className="group block" href={`/comparison?fixture=${entry.fixture.id}`} key={entry.fixture.id} prefetch={false}>
            <Card className="overflow-hidden border-border/60 bg-card/80 py-0 transition-all duration-200 hover:border-primary/25 hover:shadow-lg">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
                  <Badge variant="outline" className="rounded-md border-border/60 bg-background/70 px-2 py-1">
                    {entry.fixture.league_name ?? `${t('League')} ${entry.fixture.league_id}`}
                  </Badge>
                  <div className="flex items-start gap-2">
                    <div className="text-right">
                      <p className="text-base font-semibold tabular-nums text-foreground">
                        {formatKickoff(entry.fixture.date, locale)}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {formatShortDate(entry.fixture.date, locale)}
                      </p>
                    </div>
                    <ArrowUpRight className="mt-0.5 size-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <TeamLine
                      logoUrl={entry.fixture.home_team_view?.logo_url ?? null}
                      name={entry.fixture.home_team_view?.name ?? `Team ${entry.fixture.home_team_id}`}
                      side="home"
                    />
                    <TeamLine
                      logoUrl={entry.fixture.away_team_view?.logo_url ?? null}
                      name={entry.fixture.away_team_view?.name ?? `Team ${entry.fixture.away_team_id}`}
                      side="away"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <HistoricalStatTile
                      label={`${t('Home')} ${t('Split')}`}
                      showLabel
                      threshold={threshold}
                      value={entry.stats.homeHome}
                    />
                    <HistoricalStatTile
                      label={`${t('Home')} ${t('Overall')}`}
                      showLabel
                      threshold={threshold}
                      value={entry.stats.homeAll}
                    />
                    <HistoricalStatTile
                      label={`${t('Away')} ${t('Overall')}`}
                      showLabel
                      threshold={threshold}
                      value={entry.stats.awayAll}
                    />
                    <HistoricalStatTile
                      label={`${t('Away')} ${t('Split')}`}
                      showLabel
                      threshold={threshold}
                      value={entry.stats.awayAway}
                    />
                  </div>

                  <div className="grid gap-3 rounded-lg border border-border/60 bg-background/50 p-3 sm:grid-cols-[minmax(0,1fr)_104px] sm:items-end">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {t('Market prices')}
                      </p>
                      <div className="mt-2">
                        {entry.decisionCards.some((card) => card.referencePrice !== null) ? (
                          <MarketPriceRail cards={entry.decisionCards} />
                        ) : (
                          <p className="text-sm text-muted-foreground">{t('No prices')}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {t('Signal fit')}
                      </p>
                      <div className="mt-2">
                        <SignalAlignmentCell signal={entry.signal} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function ScannerMobileGroup({
  entries,
  threshold,
  title,
}: {
  entries: FixtureBoardEntry[];
  threshold: number;
  title: string;
}) {
  const { t } = useLanguage();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/50 pb-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{`${entries.length} ${t('Fixtures').toLowerCase()}`}</p>
        </div>
      </div>
      <ScannerMobileCards entries={entries} threshold={threshold} />
    </section>
  );
}

function ScannerLoadingState() {
  return (
    <Card className="overflow-hidden border-border/70 py-0">
      <CardHeader className="border-b border-border/60 py-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="rounded-xl border border-border/70 p-4" key={index}>
              <Skeleton className="h-5 w-48" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, tileIndex) => (
                  <div className="rounded-xl border border-border/60 p-3" key={tileIndex}>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-3 h-6 w-14" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ScannerView({ isActive }: { isActive: boolean }) {
  const { locale, t } = useLanguage();
  const [entries, setEntries] = useState<FixtureBoardEntry[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(DEFAULT_MARKET_GROUP.id);
  const [selectedMarketKey, setSelectedMarketKey] = useState(DEFAULT_MARKET_LINE.key);
  const [threshold, setThreshold] = useState(60);
  const [windowOption, setWindowOption] = useState<WindowOption>('all');
  const [minimumSample, setMinimumSample] = useState(0);
  const [minimumOdds, setMinimumOdds] = useState(0);
  const [groupMode, setGroupMode] = useState<GroupMode>('date');
  const [hideBelowThreshold, setHideBelowThreshold] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedGroup = getMarketGroup(selectedGroupId);
  const selectedLine = selectedGroup.lines.find((line) => line.key === selectedMarketKey) ?? selectedGroup.lines[0] ?? null;
  const selectedLineKey = selectedLine?.key ?? null;

  useEffect(() => {
    if (!isActive) return undefined;

    let cancelled = false;

    async function loadBoard() {
      if (!selectedLine) {
        setEntries([]);
        setErrorMessage(null);
        setLoadingBoard(false);
        return;
      }

      setLoadingBoard(true);
      setErrorMessage(null);

      try {
        const nextEntries = await fetchJson<FixtureBoardEntry[]>(
          `/api/v1/fixtures-board?days=${FIXTURE_WINDOW_DAYS}&marketKey=${encodeURIComponent(selectedLine.key)}&window=${windowOption}&threshold=${threshold}`,
        );

        if (cancelled) return;
        setEntries(nextEntries);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load fixtures scanner data', error);
        setErrorMessage('Fixtures board could not be loaded.');
        setEntries([]);
      } finally {
        if (!cancelled) setLoadingBoard(false);
      }
    }

    void loadBoard();
    return () => {
      cancelled = true;
    };
  }, [isActive, selectedLine, threshold, windowOption]);

  const boardEntries = !selectedLineKey
    ? []
    : entries.filter((entry) => {
        if (hideBelowThreshold && !rowMeetsThreshold(entry.stats, threshold)) return false;
        if (minimumSample !== 0 && entry.signal.sample < minimumSample) return false;
        if (minimumOdds > 0) {
          return entry.decisionCards.some(
            (card) => card.referencePrice !== null && card.referencePrice >= minimumOdds,
          );
        }
        return true;
      });

  const groupedBoardEntries = (() => {
    const groupedMap = new Map<string, FixtureBoardEntry[]>();

    for (const entry of boardEntries) {
      const key = groupMode === 'date' ? getDateKey(entry.fixture.date) : String(entry.fixture.league_id);
      const group = groupedMap.get(key) ?? [];
      group.push(entry);
      groupedMap.set(key, group);
    }

    return [...groupedMap.entries()].map(([key, groupedEntries]) => {
      const sortedEntries = [...groupedEntries].sort((left, right) => {
        return (
          right.signal.matchedCells - left.signal.matchedCells ||
          right.signal.sample - left.signal.sample ||
          new Date(left.fixture.date).getTime() - new Date(right.fixture.date).getTime()
        );
      });

      return { entries: sortedEntries, key };
    });
  })();

  const isRefreshing = loadingBoard && entries.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border/50 bg-background px-2.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          <ScannerToolbarField className="xl:basis-[140px]" label={t('Market')}>
              <Select
                onValueChange={(value) => {
                  startTransition(() => {
                    const nextGroup = getMarketGroup(value);
                    setSelectedGroupId(value);
                    setSelectedMarketKey(nextGroup.lines[0]?.key ?? '');
                  });
                }}
                value={selectedGroupId}
              >
                <SelectTrigger className="h-8 w-full min-w-0 justify-start border-0 bg-transparent p-0 text-left text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder={t('Market')} />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {MARKET_GROUPS.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {t(group.label)}
                    </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
          </ScannerToolbarField>

          <ScannerToolbarField className="min-w-0 flex-1 xl:basis-[210px]" label={t('Line')}>
              <Select
                disabled={selectedGroup.lines.length === 0}
                onValueChange={(value) => {
                  startTransition(() => setSelectedMarketKey(value));
                }}
                value={selectedMarketKey}
              >
                <SelectTrigger className="h-8 w-full min-w-0 justify-start border-0 bg-transparent p-0 text-left text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder={t('Select Line')} />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {selectedGroup.lines.length ? (
                    selectedGroup.lines.map((line) => (
                      <SelectItem key={line.key} value={line.key}>
                        {t(line.label)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__empty" disabled>
                      {t('No market lines available yet')}
                    </SelectItem>
                    )}
                  </SelectContent>
                </Select>
          </ScannerToolbarField>

          <ScannerToolbarField className="xl:basis-[104px]" label={t('Threshold')}>
              <Select
                onValueChange={(value) => {
                  startTransition(() => setThreshold(Number(value)));
                }}
                value={String(threshold)}
              >
                <SelectTrigger className="h-8 w-full min-w-0 justify-start border-0 bg-transparent p-0 text-left text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THRESHOLDS.map((item) => (
                    <SelectItem key={item} value={String(item)}>
                      {`+${item}%`}
                    </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
          </ScannerToolbarField>

          <ScannerToolbarField className="xl:basis-[118px]" label={t('Sample')}>
            <Select
              onValueChange={(value) => {
                startTransition(() => setMinimumSample(Number(value)));
              }}
              value={String(minimumSample)}
            >
              <SelectTrigger className="h-8 w-full min-w-0 justify-start border-0 bg-transparent p-0 text-left text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINIMUM_SAMPLE_OPTIONS.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item === 0 ? t('Any sample') : `${item}+`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ScannerToolbarField>

          <ScannerToolbarField className="xl:basis-[112px]" label={t('Odds')}>
            <Select
              onValueChange={(value) => {
                startTransition(() => setMinimumOdds(Number(value)));
              }}
              value={String(minimumOdds)}
            >
              <SelectTrigger className="h-8 w-full min-w-0 justify-start border-0 bg-transparent p-0 text-left text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINIMUM_ODDS_OPTIONS.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item === 0 ? t('Any odds') : `${item.toFixed(2)}+`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ScannerToolbarField>

          <ScannerToolbarField className="xl:basis-[112px]" label={t('Window')}>
            <Select
              onValueChange={(value) => {
                startTransition(() => setWindowOption(value as WindowOption));
              }}
              value={windowOption}
            >
              <SelectTrigger className="h-8 w-full min-w-0 justify-start border-0 bg-transparent p-0 text-left text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('Season')}</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>
          </ScannerToolbarField>

          <div className="flex h-10 min-w-[150px] items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/15 px-3 xl:basis-[150px]">
            <div className="flex items-center gap-2">
              {isRefreshing ? <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" /> : null}
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('Hide below')}</span>
            </div>
            <Checkbox
              checked={hideBelowThreshold}
              id="fixtures-hide-below-threshold"
              onCheckedChange={(checked) => {
                startTransition(() => setHideBelowThreshold(checked === true));
              }}
            />
          </div>

          <ToggleGroup
            className="grid h-8 min-w-[112px] grid-cols-2 rounded-md border border-border/50 bg-muted/15 xl:ml-auto xl:w-[112px]"
            onValueChange={(value) => {
              if (!value) return;
              startTransition(() => setGroupMode(value as GroupMode));
            }}
            size="sm"
            type="single"
            value={groupMode}
            variant="outline"
          >
            <ToggleGroupItem className="h-8 min-w-0 border-0 bg-transparent px-1.5 !text-[9px] !leading-none font-semibold uppercase tracking-[0.08em] text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:!text-[9px] data-[state=on]:text-background" value="date">
              {t('Date')}
            </ToggleGroupItem>
            <ToggleGroupItem className="h-8 min-w-0 border-0 bg-transparent px-1.5 !text-[9px] !leading-none font-semibold uppercase tracking-[0.08em] text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:!text-[9px] data-[state=on]:text-background" value="league">
              {t('League')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </section>

      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {loadingBoard && entries.length === 0 ? <ScannerLoadingState /> : null}

      {!loadingBoard && !errorMessage && !selectedLine ? (
        <EmptyState
          description={t('Try another statistic group or wait for the next rebuild.')}
          icon={Radar}
          title={t('No market lines available yet')}
        />
      ) : null}

      {!loadingBoard && !errorMessage && selectedLine && groupedBoardEntries.length === 0 ? (
        <EmptyState
          description={t('Lower the threshold or widen the sample window.')}
          icon={Target}
          title={t('No fixtures found for these filters.')}
        />
      ) : null}

      {selectedLine && groupedBoardEntries.length > 0 ? (
        <>
          <div className="grid gap-4 lg:hidden">
            {groupedBoardEntries.map(({ key, entries: groupedEntries }) => {
              const title =
                groupMode === 'date'
                  ? formatSectionDate(groupedEntries[0].fixture.date, locale)
                  : groupedEntries[0].fixture.league_name ?? `${t('League')} ${key}`;

              return (
                <ScannerMobileGroup
                  entries={groupedEntries}
                  key={`${groupMode}:${key}`}
                  threshold={threshold}
                  title={title}
                />
              );
            })}
          </div>

          <ScannerDesktopTable
            groups={groupedBoardEntries.map(({ key, entries: groupedEntries }) => ({
              entries: groupedEntries,
              title:
                groupMode === 'date'
                  ? formatSectionDate(groupedEntries[0].fixture.date, locale)
                  : groupedEntries[0].fixture.league_name ?? `${t('League')} ${key}`,
            }))}
            threshold={threshold}
          />
        </>
      ) : null}
    </div>
  );
}

export function FixturesWorkspace() {
  return (
    <main className="min-h-full">
      <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4 p-3 md:px-5 md:py-4">
        <ScannerView isActive />
        <div className="hidden">
          <IntelligenceView isActive={false} />
        </div>
      </div>
    </main>
  );
}
