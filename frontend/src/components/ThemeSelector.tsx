import { Palette } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { isThemeName } from '@/theme/theme';

export function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="surface-subtle flex w-full min-w-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[color:var(--text-secondary)] sm:w-auto sm:max-w-full">
      <Palette size={16} className="theme-accent-icon shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-faint)]">
          Tema
        </p>
        <select
          aria-label="Tema visual activo"
          value={theme}
          onChange={(event) => {
            if (isThemeName(event.target.value)) {
              setTheme(event.target.value);
            }
          }}
          className="surface-inline-select mt-1 w-full min-w-0 rounded-xl text-sm sm:min-w-[12rem]"
        >
          {themes.map((option) => (
            <option key={option.name} value={option.name}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

