import { PropsWithChildren, createContext, useContext, useEffect } from 'react';
import { posApi } from '@/services/api/posApi';
import { useSessionStore } from '@/store/sessionStore';
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
  const currentUser = useSessionStore((state) => state.currentUser);
  const isReady = useSessionStore((state) => state.isReady);
  const setCurrentUser = useSessionStore((state) => state.setCurrentUser);
  const setCurrentUserThemePreference = useSessionStore(
    (state) => state.setCurrentUserThemePreference,
  );

  const theme =
    isReady && currentUser
      ? resolveThemeName(currentUser.themePreference)
      : defaultTheme;

  useEffect(() => {
    applyThemeToDocument(theme);
    persistTheme(theme);
  }, [theme]);

  function setTheme(nextTheme: ThemeName) {
    if (!currentUser) {
      return;
    }

    const currentTheme = resolveThemeName(currentUser.themePreference);
    if (currentTheme === nextTheme) {
      return;
    }

    setCurrentUserThemePreference(nextTheme);

    void posApi
      .updateMyThemePreference(nextTheme)
      .then((user) => {
        setCurrentUser(user);
      })
      .catch((error) => {
        console.error(
          'No fue posible guardar la preferencia de tema del usuario.',
          error,
        );
      });
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
