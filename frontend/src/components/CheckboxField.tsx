import { InputHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

interface CheckboxFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'type'> {
  label: string;
  description?: string;
  error?: string;
  wrapperClassName?: string;
  checkboxClassName?: string;
}

export function CheckboxField({
  label,
  description,
  error,
  wrapperClassName,
  checkboxClassName,
  className,
  id,
  required,
  ...props
}: CheckboxFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? inputId + '-description' : undefined;
  const errorId = error ? inputId + '-error' : undefined;
  const describedBy = [props['aria-describedby'], descriptionId, errorId]
    .filter(Boolean)
    .join(' ');
  const isInvalid =
    Boolean(error) || props['aria-invalid'] === true || props['aria-invalid'] === 'true';

  return (
    <div
      className={clsx(
        'surface-subtle rounded-2xl px-4 py-3',
        wrapperClassName,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <label htmlFor={inputId} className={clsx('text-sm font-medium text-[color:var(--text)]', className)}>
            <span>{label}</span>
            {required ? <span aria-hidden="true" className="text-rose-300"> *</span> : null}
          </label>
          {description ? (
            <p id={descriptionId} className="mt-1 text-xs text-[color:var(--text-muted)]">
              {description}
            </p>
          ) : null}
          {error ? (
            <p id={errorId} className="mt-2 text-xs text-rose-100">
              {error}
            </p>
          ) : null}
        </div>
        <input
          id={inputId}
          type="checkbox"
          required={required}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy || undefined}
          className={clsx(
            'mt-1 h-5 w-5 shrink-0 rounded border-[color:var(--line-strong)] bg-[#090b16] text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b16] disabled:cursor-not-allowed disabled:opacity-70',
            isInvalid && 'border-rose-400/70 focus-visible:ring-rose-400/20',
            checkboxClassName,
          )}
          {...props}
        />
      </div>
    </div>
  );
}