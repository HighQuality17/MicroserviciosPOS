import { ChangeEventHandler, ComponentProps } from 'react';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';
import { Input } from '@/components/Input';

interface SearchFieldProps
  extends Omit<
    ComponentProps<typeof Input>,
    'type' | 'value' | 'onChange' | 'startAdornment' | 'endAdornment'
  > {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onClear?: () => void;
  clearLabel?: string;
}

export function SearchField({
  value,
  onChange,
  onClear,
  clearLabel = 'Limpiar busqueda',
  fieldClassName,
  ...props
}: SearchFieldProps) {
  const showClearAction = Boolean(value) && Boolean(onClear);

  return (
    <Input
      type="search"
      value={value}
      onChange={onChange}
      autoComplete="off"
      startAdornment={<Search size={16} aria-hidden="true" />}
      endAdornment={
        showClearAction ? (
          <button
            type="button"
            className="ui-field-action"
            onClick={onClear}
            aria-label={clearLabel}
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : null
      }
      fieldClassName={clsx('search-field', fieldClassName)}
      {...props}
    />
  );
}
