'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  Flame,
  GitCompareArrows,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ThemeToggle } from '../comparison/_components/theme-toggle';
import { useLanguage } from '../language-provider';
import { useTheme } from '../theme-provider';
import { LanguageToggle } from './language-toggle';
import { LogoMark } from './logo-mark';

type NavItem = {
  href?: string;
  icon: React.ReactNode;
  id: string;
  label: string;
};

const LIVE_ITEMS: NavItem[] = [
  {
    href: '/comparison',
    icon: <GitCompareArrows size={17} strokeWidth={1.8} />,
    id: 'comparison',
    label: 'Comparison',
  },
  {
    href: '/fixtures',
    icon: <CalendarDays size={17} strokeWidth={1.8} />,
    id: 'fixtures',
    label: 'Fixtures',
  },
  {
    href: '/streaks',
    icon: <Flame size={17} strokeWidth={1.8} />,
    id: 'streaks',
    label: 'Streaks',
  },
];

const LATER_ITEMS: NavItem[] = [
  {
    icon: <TrendingUp size={17} strokeWidth={1.8} />,
    id: 'predictions',
    label: 'Predictions',
  },
  {
    icon: <Users size={17} strokeWidth={1.8} />,
    id: 'players',
    label: 'Player DB',
  },
  {
    icon: <DollarSign size={17} strokeWidth={1.8} />,
    id: 'odds',
    label: 'Odds',
  },
  {
    icon: <BarChart3 size={17} strokeWidth={1.8} />,
    id: 'analytics',
    label: 'Analytics',
  },
  {
    icon: <Settings size={17} strokeWidth={1.8} />,
    id: 'settings',
    label: 'Settings',
  },
];

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  if (href === '/') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavButton({ item, pathname }: { item: NavItem; pathname: string }) {
  const { t } = useLanguage();
  const isActive = isActivePath(pathname, item.href);
  const className = `group flex w-full items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
    isActive
      ? 'border-[var(--app-accent)]/18 bg-[var(--app-accent-soft)] text-[var(--app-text)]'
      : item.href
        ? 'border-transparent bg-transparent text-[var(--app-text-soft)] hover:border-[var(--app-border)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]'
        : 'cursor-not-allowed border-transparent bg-transparent text-[var(--app-text-dim)]'
  }`;

  const content = (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border ${
          isActive
            ? 'border-[var(--app-accent)]/18 bg-[var(--app-panel)] text-[var(--app-accent)]'
            : 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-dim)] group-hover:text-[var(--app-text)]'
        }`}
      >
        {item.icon}
      </span>
      <span className="truncate">{t(item.label)}</span>
    </>
  );

  if (item.href) {
    return (
      <Link
        aria-current={isActive ? 'page' : undefined}
        className={className}
        href={item.href}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      aria-disabled="true"
      className={className}
      type="button"
    >
      {content}
    </button>
  );
}

function NavSection({
  items,
  pathname,
  title,
}: {
  items: NavItem[];
  pathname: string;
  title: string;
}) {
  const { t } = useLanguage();

  return (
    <section>
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-text-dim)]">
        {t(title)}
      </p>
      <div className="grid gap-1.5">
        {items.map((item) => (
          <NavButton item={item} key={item.id} pathname={pathname} />
        ))}
      </div>
    </section>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { setThemeMode, themeMode } = useTheme();
  const { t } = useLanguage();

  return (
    <aside className="self-start">
      <div className="flex flex-col gap-4 rounded-[var(--app-shell-radius)] border border-[var(--app-border)] bg-[var(--app-sidebar-bg)] p-4">
        <div className="border-b border-[var(--app-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel-muted)] text-[var(--app-accent)]">
              <LogoMark className="h-6 w-auto" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[-0.03em] text-[var(--app-text)]">STUF</p>
              <p className="mt-0.5 text-[12px] text-[var(--app-text-soft)]">
                {t('Professional football analytics workspace.')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <NavSection items={LIVE_ITEMS} pathname={pathname} title="Modules" />
          <NavSection items={LATER_ITEMS} pathname={pathname} title="Later" />
        </div>

        <div className="border-t border-[var(--app-border)] pt-4">
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-text-dim)]">
                {t('Language')}
              </span>
              <LanguageToggle />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--app-text-dim)]">
                {t('Theme')}
              </span>
              <ThemeToggle onChange={setThemeMode} value={themeMode} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
