import { InputHTMLAttributes, ReactNode, useId } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  fieldClassName?: string;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}

export function Input({
  label,
  hint,
  error,
  className,
  wrapperClassName,
  labelClassName,
  fieldClassName,
  startAdornment,
  endAdornment,
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
  const hasAdornment = Boolean(startAdornment) || Boolean(endAdornment);
  const inputElement = (
    <input
      id={inputId}
      required={required}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy || undefined}
      className={clsx(
        'ui-control px-4 py-3 text-sm',
        hasAdornment && 'ui-control--embedded flex-1 py-0',
        isInvalid && 'ui-control-invalid',
        className,
      )}
      {...props}
    />
  );

  return (
    <div className={clsx('block min-w-0 space-y-2', wrapperClassName)}>
      {label ? (
        <label htmlFor={inputId} className={clsx('ui-control-label', labelClassName)}>
          <span>{label}</span>
          {required ? <span aria-hidden="true" className="theme-required-mark"> *</span> : null}
        </label>
      ) : null}
      {hasAdornment ? (
        <div
          className={clsx('ui-field-shell', fieldClassName)}
          data-invalid={isInvalid || undefined}
          data-disabled={props.disabled || undefined}
        >
          {startAdornment ? <span className="ui-field-adornment">{startAdornment}</span> : null}
          {inputElement}
          {endAdornment ? <span className="ui-field-adornment">{endAdornment}</span> : null}
        </div>
      ) : (
        inputElement
      )}
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
