import { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className, ...props }: InputProps) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <input
        className={clsx(
          'w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-400/70 focus:bg-slate-950/90',
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
