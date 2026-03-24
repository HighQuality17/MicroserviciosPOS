import { ReactNode, SelectHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
  labelClassName?: string;
}

export function Select({
  children,
  label,
  hint,
  error,
  className,
  wrapperClassName,
  labelClassName,
  id,
  required,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = hint ? selectId + '-hint' : undefined;
  const errorId = error ? selectId + '-error' : undefined;
  const describedBy = [props['aria-describedby'], hintId, errorId]
    .filter(Boolean)
    .join(' ');
  const isInvalid =
    Boolean(error) || props['aria-invalid'] === true || props['aria-invalid'] === 'true';

  return (
    <div className={clsx('block min-w-0 space-y-2', wrapperClassName)}>
      {label ? (
        <label htmlFor={selectId} className={clsx('ui-control-label', labelClassName)}>
          <span>{label}</span>
          {required ? <span aria-hidden="true" className="theme-required-mark"> *</span> : null}
        </label>
      ) : null}
      <select
        id={selectId}
        required={required}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy || undefined}
        className={clsx(
          'ui-control min-h-11 px-4 py-3 text-sm',
          isInvalid && 'ui-control-invalid',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {hint ? (
        <p id={hintId} className="ui-control-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="ui-control-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}