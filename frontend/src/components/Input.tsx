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
        <label htmlFor={inputId} className={clsx('text-sm font-medium text-slate-100', labelClassName)}>
          <span>{label}</span>
          {required ? <span aria-hidden="true" className="text-rose-300"> *</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        required={required}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy || undefined}
        className={clsx(
          'min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-teal-400/70 focus:bg-slate-950/90 focus-visible:ring-2 focus-visible:ring-teal-300/30 disabled:cursor-not-allowed disabled:border-slate-700/70 disabled:bg-slate-900/70 disabled:text-slate-400',
          isInvalid &&
            'border-rose-400/70 bg-rose-500/5 focus:border-rose-400/70 focus-visible:ring-rose-400/20',
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-slate-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
