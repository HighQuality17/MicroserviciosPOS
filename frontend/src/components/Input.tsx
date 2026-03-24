import { InputHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
  labelClassName?: string;
}

export function Input({
  label,
  hint,
  error,
  className,
  wrapperClassName,
  labelClassName,
  id,
  required,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? inputId + '-hint' : undefined;
  const errorId = error ? inputId + '-error' : undefined;
  const describedBy = [props['aria-describedby'], hintId, errorId]
    .filter(Boolean)
    .join(' ');
  const isInvalid =
    Boolean(error) || props['aria-invalid'] === true || props['aria-invalid'] === 'true';

  return (
    <div className={clsx('block min-w-0 space-y-2', wrapperClassName)}>
      {label ? (
        <label htmlFor={inputId} className={clsx('ui-control-label', labelClassName)}>
          <span>{label}</span>
          {required ? <span aria-hidden="true" className="theme-required-mark"> *</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        required={required}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy || undefined}
        className={clsx(
          'ui-control min-h-11 px-4 py-3 text-sm',
          isInvalid && 'ui-control-invalid',
          className,
        )}
        {...props}
      />
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