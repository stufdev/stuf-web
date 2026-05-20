import { useLanguage } from '../../language-provider';
import { SelectField } from '../../components/select-field';
import type { UpcomingFixtureRecord } from '../types';
import { getRelationName } from '../helpers';

type ComparisonToolbarProps = {
  upcomingDates: string[];
  selectedDate: string;
  onDateChange: (value: string) => void;
  groupedFixtures: Record<string, UpcomingFixtureRecord[]>;
  selectedFixtureId: number | null;
  onFixtureChange: (value: number | null) => void;
  isLoading: boolean;
  isFixturesLoading: boolean;
};

export function ComparisonToolbar({
  upcomingDates,
  selectedDate,
  onDateChange,
  groupedFixtures,
  selectedFixtureId,
  onFixtureChange,
  isLoading,
  isFixturesLoading,
}: ComparisonToolbarProps) {
  const { locale, t } = useLanguage();
  const fixtureCount = Object.values(groupedFixtures).reduce((total, fixtures) => total + fixtures.length, 0);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
      <div className="w-full sm:w-[220px]">
        <SelectField
          disabled={isLoading || upcomingDates.length === 0}
          label={t('Date')}
          onChange={onDateChange}
          placeholder={t('Select date')}
          value={selectedDate}
        >
          {isLoading ? (
            <option>{t('Loading...')}</option>
          ) : upcomingDates.length === 0 ? (
            <option>{t('No dates')}</option>
          ) : (
            upcomingDates.map((dateStr) => (
              <option key={dateStr} value={dateStr}>
                {new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                })}
              </option>
            ))
          )}
        </SelectField>
      </div>

      <div className="w-full sm:w-[320px]">
        <SelectField
          disabled={isLoading || isFixturesLoading || Object.keys(groupedFixtures).length === 0}
          label={`${t('Fixture')}${fixtureCount > 0 ? ` · ${fixtureCount}` : ''}`}
          onChange={(value) => onFixtureChange(value ? Number(value) : null)}
          placeholder={t('Select fixture')}
          value={selectedFixtureId || ''}
        >
          {isFixturesLoading || isLoading ? (
            <option>{t('Loading fixtures...')}</option>
          ) : Object.keys(groupedFixtures).length === 0 ? (
            <option>{t('No fixtures for this date')}</option>
          ) : (
            Object.entries(groupedFixtures).map(([groupKey, fixtures]) => {
              const label = groupKey.split(':').slice(1).join(':');

              return (
                <optgroup key={groupKey} label={label}>
                  {fixtures.map((fixture) => {
                    const time = new Date(fixture.date).toLocaleTimeString(locale, {
                      hour: '2-digit',
                      hour12: false,
                      minute: '2-digit',
                    });

                    return (
                      <option key={fixture.id} value={fixture.id}>
                        {time} - {getRelationName(fixture.home_team)} vs {getRelationName(fixture.away_team)}
                      </option>
                    );
                  })}
                </optgroup>
              );
            })
          )}
        </SelectField>
      </div>
    </div>
  );
}
