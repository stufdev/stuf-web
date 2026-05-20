'use client';

import { Fragment } from 'react';
import { useLanguage } from '../../language-provider';
import type { TeamStatAveragesRecord } from '../types';

type StatisticsSummaryPanelProps = {
  awaySummary: TeamStatAveragesRecord | null;
  awayTeamName: string;
  homeSummary: TeamStatAveragesRecord | null;
  homeTeamName: string;
  isLoading?: boolean;
};

type MetricRow = { label: string; left: number | null | undefined; right: number | null | undefined };
type MetricSection = { title: string; rows: MetricRow[] };

function formatValue(value: number | null | undefined) {
  if (value == null) return '-';
  return value.toFixed(1);
}

function getCellHighlight(left: number | null | undefined, right: number | null | undefined, side: 'left' | 'right') {
  if (left == null || right == null) return '';
  if (left === right) return '';
  if (side === 'left' && left > right) {
    return 'bg-emerald-500/10 text-[#ecfff3] font-semibold';
  }
  if (side === 'right' && right > left) {
    return 'bg-emerald-500/10 text-[#ecfff3] font-semibold';
  }
  return '';
}

function hasAnyValue(rows: MetricRow[]) {
  return rows.some((row) => row.left != null || row.right != null);
}

function getScopeLabel(summary: TeamStatAveragesRecord | null) {
  if (!summary) return 'overall';
  if (summary.scope === 'home') return 'home';
  if (summary.scope === 'away') return 'away';
  return 'overall';
}

function buildSections(homeSummary: TeamStatAveragesRecord | null, awaySummary: TeamStatAveragesRecord | null): MetricSection[] {
  return [
    { title: 'Matches Played', rows: [{ label: 'All matches', left: homeSummary?.matches_played ?? null, right: awaySummary?.matches_played ?? null }] },
    {
      title: 'Average Match Goals', rows: [
        { label: 'Total', left: homeSummary?.avg_goals_total, right: awaySummary?.avg_goals_total },
        { label: 'Scored', left: homeSummary?.avg_goals_for, right: awaySummary?.avg_goals_for },
        { label: 'Conceded', left: homeSummary?.avg_goals_against, right: awaySummary?.avg_goals_against },
      ]
    },
    {
      title: 'Average 1st Half Goals', rows: [
        { label: 'Total', left: homeSummary?.avg_1h_goals_total, right: awaySummary?.avg_1h_goals_total },
        { label: 'Scored', left: homeSummary?.avg_1h_goals_for, right: awaySummary?.avg_1h_goals_for },
        { label: 'Conceded', left: homeSummary?.avg_1h_goals_against, right: awaySummary?.avg_1h_goals_against },
      ]
    },
    {
      title: 'Average 2nd Half Goals', rows: [
        { label: 'Total', left: homeSummary?.avg_2h_goals_total, right: awaySummary?.avg_2h_goals_total },
        { label: 'Scored', left: homeSummary?.avg_2h_goals_for, right: awaySummary?.avg_2h_goals_for },
        { label: 'Conceded', left: homeSummary?.avg_2h_goals_against, right: awaySummary?.avg_2h_goals_against },
      ]
    },
    {
      title: 'Average Corners', rows: [
        { label: 'Total', left: homeSummary?.avg_corners_total, right: awaySummary?.avg_corners_total },
        { label: 'For', left: homeSummary?.avg_corners_for, right: awaySummary?.avg_corners_for },
        { label: 'Against', left: homeSummary?.avg_corners_against, right: awaySummary?.avg_corners_against },
      ]
    },
    {
      title: 'Average 1st Half Corners', rows: [
        { label: 'Total', left: homeSummary?.avg_1h_corners_total, right: awaySummary?.avg_1h_corners_total },
        { label: 'For', left: homeSummary?.avg_1h_corners_for, right: awaySummary?.avg_1h_corners_for },
        { label: 'Against', left: homeSummary?.avg_1h_corners_against, right: awaySummary?.avg_1h_corners_against },
      ]
    },
    {
      title: 'Average 2nd Half Corners', rows: [
        { label: 'Total', left: homeSummary?.avg_2h_corners_total, right: awaySummary?.avg_2h_corners_total },
        { label: 'For', left: homeSummary?.avg_2h_corners_for, right: awaySummary?.avg_2h_corners_for },
        { label: 'Against', left: homeSummary?.avg_2h_corners_against, right: awaySummary?.avg_2h_corners_against },
      ]
    },
    {
      title: 'Average Booking Points', rows: [
        { label: 'Total', left: homeSummary?.avg_booking_points_total, right: awaySummary?.avg_booking_points_total },
        { label: 'For', left: homeSummary?.avg_booking_points_for, right: awaySummary?.avg_booking_points_for },
        { label: 'Against', left: homeSummary?.avg_booking_points_against, right: awaySummary?.avg_booking_points_against },
      ]
    },
    {
      title: 'Average Cards', rows: [
        { label: 'Total', left: homeSummary?.avg_cards_total, right: awaySummary?.avg_cards_total },
        { label: 'For', left: homeSummary?.avg_cards_for, right: awaySummary?.avg_cards_for },
        { label: 'Against', left: homeSummary?.avg_cards_against, right: awaySummary?.avg_cards_against },
      ]
    },
    {
      title: 'Average Fouls', rows: [
        { label: 'Total', left: homeSummary?.avg_fouls_total, right: awaySummary?.avg_fouls_total },
        { label: 'Conceded', left: homeSummary?.avg_fouls_committed, right: awaySummary?.avg_fouls_committed },
        { label: 'Won', left: homeSummary?.avg_fouls_won, right: awaySummary?.avg_fouls_won },
      ]
    },
    {
      title: 'Average Offsides', rows: [
        { label: 'Total', left: homeSummary?.avg_offsides_total, right: awaySummary?.avg_offsides_total },
        { label: 'For', left: homeSummary?.avg_offsides_for, right: awaySummary?.avg_offsides_for },
        { label: 'Against', left: homeSummary?.avg_offsides_against, right: awaySummary?.avg_offsides_against },
      ]
    },
    {
      title: 'Average Shots', rows: [
        { label: 'Total Shots For', left: homeSummary?.avg_total_shots_for, right: awaySummary?.avg_total_shots_for },
        { label: 'Total Shots Against', left: homeSummary?.avg_total_shots_against, right: awaySummary?.avg_total_shots_against },
        { label: 'Shots On Target For', left: homeSummary?.avg_shots_on_target_for, right: awaySummary?.avg_shots_on_target_for },
        { label: 'Shots On Target Against', left: homeSummary?.avg_shots_on_target_against, right: awaySummary?.avg_shots_on_target_against },
      ]
    },
    {
      title: 'Average Goal Kicks', rows: [
        { label: 'Total', left: homeSummary?.avg_goal_kicks_total, right: awaySummary?.avg_goal_kicks_total },
        { label: 'For', left: homeSummary?.avg_goal_kicks_for, right: awaySummary?.avg_goal_kicks_for },
        { label: 'Against', left: homeSummary?.avg_goal_kicks_against, right: awaySummary?.avg_goal_kicks_against },
      ]
    },
    {
      title: 'Average Throw Ins', rows: [
        { label: 'Total', left: homeSummary?.avg_throw_ins_total, right: awaySummary?.avg_throw_ins_total },
        { label: 'For', left: homeSummary?.avg_throw_ins_for, right: awaySummary?.avg_throw_ins_for },
        { label: 'Against', left: homeSummary?.avg_throw_ins_against, right: awaySummary?.avg_throw_ins_against },
      ]
    },
    {
      title: 'Average Tackles', rows: [
        { label: 'Total', left: homeSummary?.avg_tackles_total, right: awaySummary?.avg_tackles_total },
        { label: 'For', left: homeSummary?.avg_tackles_for, right: awaySummary?.avg_tackles_for },
        { label: 'Against', left: homeSummary?.avg_tackles_against, right: awaySummary?.avg_tackles_against },
      ]
    },
  ].filter((section) => hasAnyValue(section.rows));
}

export function StatisticsSummaryPanel({ awaySummary, awayTeamName, homeSummary, homeTeamName, isLoading = false }: StatisticsSummaryPanelProps) {
  const { t } = useLanguage();
  const sections = buildSections(homeSummary, awaySummary);

  return (
    <section className="overflow-hidden rounded-[5px] border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="grid border-b border-[var(--app-border)] md:grid-cols-[1fr_200px_1fr]">
        <div className="border-r border-[var(--app-border)] bg-[var(--app-panel-muted)] px-3 py-2 text-left">
          <h2 className="text-[14px] font-semibold text-[var(--app-text)]">{homeTeamName} ({t(getScopeLabel(homeSummary))})</h2>
        </div>
        <div className="border-r border-[var(--app-border)] bg-[var(--app-canvas)] px-3 py-2 text-center">
          <p className="text-[15px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{t('Team comparison summary')}</p>
        </div>
        <div className="bg-[var(--app-panel-muted)] px-3 py-2 text-right">
          <h2 className="text-[14px] font-semibold text-[var(--app-text)]">{awayTeamName} ({t(getScopeLabel(awaySummary))})</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-[15px] text-[var(--app-text-dim)]">{t('Loading statistics summary...')}</div>
      ) : !homeSummary || !awaySummary ? (
        <div className="flex h-32 items-center justify-center px-4 text-center text-[15px] text-[var(--app-text-dim)]">{t('Statistics summary is not ready yet for this fixture context.')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <tbody>
              {sections.map((section) => (
                <Fragment key={section.title}>
                  <tr key={`${section.title}-header`} className="border-b border-[var(--app-border)] bg-[var(--app-canvas)]">
                    <td colSpan={3} className="px-3 py-1 text-center text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{t(section.title)}</td>
                  </tr>
                  {section.rows.map((row, rowIndex) => (
                    <tr key={`${section.title}-${row.label}`} className={`bg-[var(--app-panel)] ${rowIndex === section.rows.length - 1 ? '' : 'border-b border-[var(--app-border)]'}`}>
                      <td className={`w-[33%] border-r border-[var(--app-border)] px-3 py-1 text-[12px] font-medium text-[var(--app-text)] ${getCellHighlight(row.left, row.right, 'left')}`}>{formatValue(row.left)}</td>
                      <td className="w-[34%] border-r border-[var(--app-border)] px-3 py-1 text-center text-[12px] font-medium text-[var(--app-text-dim)]">{t(row.label)}</td>
                      <td className={`w-[33%] px-3 py-1 text-right text-[12px] font-medium text-[var(--app-text)] ${getCellHighlight(row.left, row.right, 'right')}`}>{formatValue(row.right)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
