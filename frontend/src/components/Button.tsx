import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'ui-button-base action-button inline-flex items-center justify-center whitespace-nowrap focus-visible:outline-none',
        variant === 'primary' && 'ui-button-primary',
        variant === 'secondary' && 'ui-button-secondary',
        variant === 'ghost' && 'ui-button-ghost',
        variant === 'danger' && 'ui-button-danger',
        className,
      )}
      data-size={size}
      data-loading={loading || undefined}
      disabled={isDisabled}
      aria-busy={loading || props['aria-busy'] || undefined}
      {...props}
    >
      {loading ? <span className="action-button__spinner" aria-hidden="true" /> : null}
      <span className="action-button__content">{children}</span>
    </button>
  );
});

