import { ComponentPropsWithoutRef, ReactNode } from 'react';
import clsx from 'clsx';

type SurfaceTone = 'default' | 'muted' | 'strong';
type SurfacePadding = 'sm' | 'md' | 'lg' | 'none';
type SurfaceElement = 'section' | 'div' | 'article';

export interface SurfaceCardProps extends ComponentPropsWithoutRef<'section'> {
  as?: SurfaceElement;
  children: ReactNode;
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  interactive?: boolean;
  glow?: boolean;
  contentClassName?: string;
}

export function SurfaceCard({
  as = 'section',
  children,
  className,
  tone = 'default',
  padding = 'md',
  interactive = false,
  glow = true,
  contentClassName,
  ...props
}: SurfaceCardProps) {
  const Component = as;

  return (
    <Component
      className={clsx(
        'surface-card',
        tone === 'default' && 'glass-panel',
        tone === 'muted' && 'surface-subtle',
        tone === 'strong' && 'glass-panel-strong',
        interactive && 'surface-card--interactive',
        className,
      )}
      data-padding={padding === 'none' ? undefined : padding}
      {...props}
    >
      {glow ? <div aria-hidden="true" className="card-theme-glow pointer-events-none absolute inset-0" /> : null}
      <div className={clsx('surface-card__body', contentClassName)}>{children}</div>
    </Component>
  );
}
