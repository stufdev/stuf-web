import { AlertTriangle, Info, Loader2 } from 'lucide-react';

type StateTone = 'default' | 'danger' | 'loading';

type StatePanelProps = {
  title: string;
  description?: string;
  tone?: StateTone;
};

const TONE_STYLES: Record<StateTone, { container: string; icon: string }> = {
  default: {
    container: 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)]',
    icon: 'bg-[var(--app-panel-muted)] text-[var(--app-text-dim)]',
  },
  danger: {
    container: 'border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] text-[var(--app-danger-text)]',
    icon: 'bg-white/70 text-[var(--app-danger-text)] dark:bg-black/10',
  },
  loading: {
    container: 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)]',
    icon: 'bg-[var(--app-panel-muted)] text-[var(--app-accent)]',
  },
};

export function StatePanel({ title, description, tone = 'default' }: StatePanelProps) {
  const styles = TONE_STYLES[tone];
  const Icon = tone === 'danger' ? AlertTriangle : tone === 'loading' ? Loader2 : Info;

  return (
    <div className={`rounded-[12px] border px-5 py-5 ${styles.container}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${styles.icon}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold md:text-[15px]">{title}</p>
          {description ? <p className="mt-1 text-sm opacity-80 md:text-[15px]">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
