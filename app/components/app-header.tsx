'use client';

import { usePathname } from 'next/navigation';
import { getAppSectionByPath } from './app-sections';
import { useLanguage } from '../language-provider';
import { Badge } from '@/components/ui/badge';

export function AppHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const section = getAppSectionByPath(pathname);

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">
          {t(section.label)}
        </h1>
      </div>

      <Badge variant="outline" className="hidden rounded-md border-border/60 bg-background/70 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:inline-flex">
        STUF
      </Badge>
    </div>
  );
}
