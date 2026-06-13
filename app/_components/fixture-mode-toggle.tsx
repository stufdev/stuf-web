'use client';

import { useFixtureMode } from '../fixture-mode-provider';
import { useLanguage } from '../language-provider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

type FixtureModeToggleProps = {
  className?: string;
  itemClassName?: string;
};

export function FixtureModeToggle({ className, itemClassName }: FixtureModeToggleProps) {
  const { fixtureMode, setFixtureMode } = useFixtureMode();
  const { t } = useLanguage();

  return (
    <ToggleGroup
      className={cn(
        "grid h-9 w-full grid-cols-2 rounded-[5px] border border-border/60 bg-muted/15 p-0.5",
        className,
      )}
      onValueChange={(value) => {
        if (value === 'upcoming' || value === 'recent') {
          setFixtureMode(value);
        }
      }}
      size="sm"
      title={t('Switch between upcoming fixtures and recently-played results')}
      type="single"
      value={fixtureMode}
      variant="default"
    >
      <ToggleGroupItem
        className={cn(
          "flex-1 rounded-[4px] text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground data-[state=on]:bg-zinc-950 data-[state=on]:text-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-zinc-950",
          itemClassName,
        )}
        value="upcoming"
      >
        {t('Upcoming')}
      </ToggleGroupItem>
      <ToggleGroupItem
        className={cn(
          "flex-1 rounded-[4px] text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground data-[state=on]:bg-zinc-950 data-[state=on]:text-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-zinc-950",
          itemClassName,
        )}
        value="recent"
      >
        {t('Recent')}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
