import { TextareaHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
  labelClassName?: string;
}

export function Textarea({
  label,
  hint,
  error,
  className,
  wrapperClassName,
  labelClassName,
  id,
  required,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = hint ? textareaId + '-hint' : undefined;
  const errorId = error ? textareaId + '-error' : undefined;
  const describedBy = [props['aria-describedby'], hintId, errorId]
    .filter(Boolean)
    .join(' ');
  const isInvalid =
    Boolean(error) || props['aria-invalid'] === true || props['aria-invalid'] === 'true';

  return (
    <div className={clsx('block min-w-0 space-y-2', wrapperClassName)}>
      {label ? (
        <label htmlFor={textareaId} className={clsx('ui-control-label', labelClassName)}>
          <span>{label}</span>
          {required ? <span aria-hidden="true" className="text-rose-300"> *</span> : null}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        required={required}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy || undefined}
        className={clsx(
          'ui-control min-h-28 px-4 py-3 text-sm',
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