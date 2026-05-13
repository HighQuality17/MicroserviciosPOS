import { Palette } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { getThemeOption } from '@/theme/theme';

export function ThemeSelector() {
  const { theme } = useTheme();
  const activeTheme = getThemeOption(theme);

  return (
    <div className="app-header__theme-surface app-header__control-card surface-subtle">
      <span className="app-header__control-icon" aria-hidden="true">
        <Palette size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="app-header__control-label">
          Tema
        </p>
        <span className="app-header__control-value mt-1 flex min-w-0 items-center gap-2 text-[color:var(--text)]">
          <span className="min-w-0 truncate">{activeTheme.label}</span>
          <span className="app-header__locked-pill">Fijo</span>
        </span>
      </div>
    </div>
  );
}

