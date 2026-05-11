import { PropsWithChildren, createContext, useContext, useEffect } from 'react';
import {
  ThemeName,
  applyThemeToDocument,
  defaultTheme,
  persistTheme,
  resolveThemeName,
  themeOptions,
} from '@/theme/theme';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: typeof themeOptions;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = resolveThemeName(defaultTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    persistTheme(theme);
  }, [theme]);

  function setTheme(_nextTheme: ThemeName) {
    // Keep the provider contract stable while theme switching is disabled.
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: themeOptions }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
