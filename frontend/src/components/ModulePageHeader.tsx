import { ReactNode } from 'react';
import clsx from 'clsx';
import { StatusBadge } from '@/components/StatusBadge';
import { ModuleInfoTooltip } from '@/components/ModuleStatusHeader';

export type ModuleHeaderTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet';
export type ModuleHeaderBadgeTone = Exclude<ModuleHeaderTone, 'violet'>;
export type ModuleHeaderAccent = 'default' | 'info' | 'teal' | 'success' | 'warning' | 'danger';

export interface ModulePageHeaderBadge {
  label: string;
  tone?: ModuleHeaderBadgeTone;
  className?: string;
}

export interface ModulePageHeaderSummary {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
}

export interface ModulePageHeaderCard {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  accent?: ModuleHeaderAccent;
  icon?: ReactNode;
  iconTone?: ModuleHeaderTone;
  badge?: ModulePageHeaderBadge;
}

interface ModulePageHeaderProps {
  ariaLabel: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  badges?: ModulePageHeaderBadge[];
  icon?: ReactNode;
  helpText?: string;
  helpLabel?: string;
  aside?: ReactNode;
  summary?: ModulePageHeaderSummary;
  asideAction?: ReactNode;
  cards?: ModulePageHeaderCard[];
  className?: string;
}

export function ModulePageHeader({
  ariaLabel,
  eyebrow,
  title,
  description,
  badges = [],
  icon,
  helpText,
  helpLabel,
  aside,
  summary,
  asideAction,
  cards = [],
  className,
}: ModulePageHeaderProps) {
  const hasAside = Boolean(aside) || Boolean(summary) || Boolean(asideAction);
  const normalizedTitle = typeof title === 'string' ? title.toLowerCase() : 'modulo';

  return (
    <section
      className={clsx('module-page-header module-page-header--operational', className)}
      aria-label={ariaLabel}
    >
      <div className="module-page-header__shell">
        <div className="module-page-header__main">
          <div className="module-page-header__copy">
            {eyebrow ? <p className="module-page-header__eyebrow">{eyebrow}</p> : null}
            <div className="module-page-header__title-row">
              <div className="module-page-header__title-wrap">
                {icon ? (
                  <span className="module-page-header__title-icon" aria-hidden="true">
                    {icon}
                  </span>
                ) : null}
                <h1 className="module-page-header__title">{title}</h1>
                {helpText ? (
                  <ModuleInfoTooltip
                    label={helpLabel ?? `Mas info sobre ${normalizedTitle}`}
                    content={helpText}
                  />
                ) : null}
                {badges.length > 0 ? (
                  <div className="module-page-header__badges">
                    {badges.map((badge, index) => (
                      <StatusBadge
                        key={`${badge.label}-${badge.tone ?? 'default'}-${index}`}
                        label={badge.label}
                        tone={badge.tone ?? 'default'}
                        className={clsx('module-page-header__badge', badge.className)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            {description ? <p className="module-page-header__description">{description}</p> : null}
          </div>

          {hasAside ? (
            <div className="module-page-header__aside">
              {aside}
              {summary ? (
                <div className="module-page-header__summary">
                  <p className="module-page-header__summary-label">{summary.label}</p>
                  <p className="module-page-header__summary-value">{summary.value}</p>
                  {summary.note ? (
                    <p className="module-page-header__summary-note">{summary.note}</p>
                  ) : null}
                </div>
              ) : null}
              {asideAction ? <div className="module-page-header__aside-action">{asideAction}</div> : null}
            </div>
          ) : null}
        </div>

        {cards.length > 0 ? (
          <div className="module-page-header__cards">
            {cards.map((card, index) => (
              <div
                key={`module-card-${index}`}
                className="module-page-header__card"
                data-accent={card.accent ?? 'default'}
              >
                <div className="module-page-header__card-main">
                  {card.icon ? (
                    <span
                      className="module-page-header__card-icon"
                      aria-hidden="true"
                      data-tone={card.iconTone ?? 'default'}
                    >
                      {card.icon}
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <div className="module-page-header__card-top">
                      <p className="module-page-header__card-label">{card.label}</p>
                      {card.badge ? (
                        <StatusBadge
                          label={card.badge.label}
                          tone={card.badge.tone ?? 'default'}
                          className={clsx(
                            'module-page-header__card-badge',
                            card.badge.className,
                          )}
                        />
                      ) : null}
                    </div>
                    <p className="module-page-header__card-value">{card.value}</p>
                    {card.note ? (
                      <p className="module-page-header__card-note">{card.note}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
