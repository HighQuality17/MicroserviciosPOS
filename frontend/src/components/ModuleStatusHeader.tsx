import { type FocusEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { StatusBadge } from '@/components/StatusBadge';

type ModuleStatusTone = 'default' | 'success' | 'warning' | 'danger' | 'info';
type ModuleStatusIconTone = ModuleStatusTone | 'violet';

interface ModuleStatusHeaderProps {
  ariaLabel: string;
  eyebrow?: string;
  title: string;
  description?: string;
  statusLabel: string;
  statusTone?: ModuleStatusTone;
  icon: ReactNode;
  helpText?: string;
  helpLabel?: string;
  children?: ReactNode;
}

interface ModuleStatusCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconTone?: ModuleStatusIconTone;
  badgeLabel?: string;
  badgeTone?: ModuleStatusTone;
  meta?: ReactNode;
  valueClassName?: string;
  badgeClassName?: string;
}

interface ModuleInfoTooltipProps {
  label: string;
  content: string;
}

export function ModuleStatusHeader({
  ariaLabel,
  eyebrow,
  title,
  description,
  statusLabel,
  statusTone = 'default',
  icon,
  helpText,
  helpLabel,
  children,
}: ModuleStatusHeaderProps) {
  return (
    <section className="pos-status-bar" aria-label={ariaLabel}>
      <div className="pos-status-shell">
        <div className="pos-status-intro">
          <div className="pos-status-beacon" aria-hidden="true">
            {icon}
          </div>
          <div className="min-w-0">
            {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
            <div className="module-status-title-row">
              <div className="module-status-title-wrap">
                <h1 className="module-status-title">{title}</h1>
                {helpText ? (
                  <ModuleInfoTooltip
                    label={helpLabel ?? `Mas info sobre ${title.toLowerCase()}`}
                    content={helpText}
                  />
                ) : null}
              </div>
              <StatusBadge label={statusLabel} tone={statusTone} />
            </div>
            {description ? <p className="module-status-description">{description}</p> : null}
          </div>
        </div>

        {children ? <div className="pos-status-grid">{children}</div> : null}
      </div>
    </section>
  );
}

export function ModuleStatusCard({
  label,
  value,
  icon,
  iconTone = 'default',
  badgeLabel,
  badgeTone = 'default',
  meta,
  valueClassName,
  badgeClassName,
}: ModuleStatusCardProps) {
  return (
    <div className="pos-status-chip">
      <span className="pos-status-chip__icon" aria-hidden="true" data-tone={iconTone}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="pos-status-chip__label">{label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className={clsx('pos-status-chip__value', valueClassName)}>{value}</p>
          {badgeLabel ? (
            <StatusBadge label={badgeLabel} tone={badgeTone} className={badgeClassName} />
          ) : null}
        </div>
        {meta ? <p className="pos-status-chip__meta">{meta}</p> : null}
      </div>
    </div>
  );
}

export function ModuleInfoTooltip({ label, content }: ModuleInfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    const nextFocused = event.relatedTarget;
    if (nextFocused instanceof Node && rootRef.current?.contains(nextFocused)) {
      return;
    }

    setOpen(false);
  }

  return (
    <span
      ref={rootRef}
      className="module-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="module-help__trigger"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
      >
        <span aria-hidden="true">?</span>
      </button>
      <span id={tooltipId} role="tooltip" className="module-help__tooltip" data-open={open}>
        {content}
      </span>
    </span>
  );
}
