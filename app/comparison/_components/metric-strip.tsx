import type { ComparisonScope, Metrics } from '../types';

type MetricStripProps = {
  homeTeamName: string;
  awayTeamName: string;
  homeMetrics: Metrics;
  awayMetrics: Metrics;
  scope: ComparisonScope;
  comparisonLabel: string;
  isComparable: boolean;
};

function MetricCell({ label, value, secondary, accent = false }: { label: string; value: string; secondary: string; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col justify-center border-b border-[#2a2a2a] bg-[#050505] px-3 py-1.5 last:border-b-0 flex-1">
      <p className="text-[15px] font-medium uppercase tracking-[0.06em] text-[#a1a1a1]">{label}</p>
      <div className="mt-0.5 flex flex-col gap-0.5">
        <span className={`font-mono text-[14px] font-semibold tabular-nums tracking-[-0.02em] leading-none ${accent ? 'text-[#a1a1a1]' : 'text-[#ededed]'}`}>{value}</span>
        <span className="min-w-0 text-[14px] text-[#a1a1a1] leading-tight">{secondary}</span>
      </div>
    </div>
  );
}

export function MetricStrip({ homeTeamName, awayTeamName, homeMetrics, awayMetrics, scope, comparisonLabel, isComparable }: MetricStripProps) {
  const hitDelta = homeMetrics.hitRate - awayMetrics.hitRate;
  const edgeLabel = !isComparable ? 'Independent panels' : hitDelta === 0 ? 'Even' : hitDelta > 0 ? `${homeTeamName} +${hitDelta}` : `${awayTeamName} +${Math.abs(hitDelta)}`;

  return (
    <section className="flex flex-col overflow-hidden h-full">
      <MetricCell label="Context" secondary={comparisonLabel} value={scope === 'all' ? 'All matches' : 'Home/Away'} />
      <MetricCell accent label={homeTeamName} secondary={`${homeMetrics.hits}/${homeMetrics.total} hits · avg ${homeMetrics.avg}`} value={`${homeMetrics.hitRate}%`} />
      <MetricCell accent label={awayTeamName} secondary={`${awayMetrics.hits}/${awayMetrics.total} hits · avg ${awayMetrics.avg}`} value={`${awayMetrics.hitRate}%`} />
      <MetricCell label="Edge" secondary={isComparable ? 'Hit-rate spread' : 'Independent markets'} value={edgeLabel} />
    </section>
  );
}
