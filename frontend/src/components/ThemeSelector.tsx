import { Palette } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { getThemeOption } from '@/theme/theme';

export function ThemeSelector() {
  const { theme } = useTheme();
  const activeTheme = getThemeOption(theme);

  return (
    <div className="app-header__theme-surface surface-subtle flex w-full min-w-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[color:var(--text-secondary)] sm:w-auto sm:max-w-full">
      <Palette size={16} className="theme-accent-icon shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="app-header__control-label text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-faint)]">
          Tema
        </p>
        <span className="app-header__control-value mt-1 block truncate text-[color:var(--text)]">
          {activeTheme.label}
        </span>
      </div>
    </div>
  );
}

