'use client';

import { usePathname } from 'next/navigation';
import { APP_SECTIONS, getAppSectionByPath } from './app-sections';
import { useLanguage } from '../language-provider';

export function AppHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const section = getAppSectionByPath(pathname);
  const liveSections = APP_SECTIONS.filter((item) => item.status === 'Live' && item.href).length;

  return (
    <header className="rounded-[var(--app-shell-radius)] border border-[var(--app-border)] bg-[var(--app-header-bg)] px-5 py-4 md:px-6">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-text-dim)]">{section.shortLabel}</p>
          <h1 className="mt-1 truncate text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--app-text)] md:text-[1.5rem]">
            {t(section.label)}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--app-text-soft)]">
            {t(section.description)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-[var(--app-text-soft)] xl:justify-end">
          <span>{t('Workspace')}: STUF</span>
          <span>{t('Release track')}: V1</span>
          <span>{t('Live modules')}: {liveSections}</span>
        </div>
      </div>
    </header>
  );
}
