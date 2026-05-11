export type ThemeName =
  | 'midnight-indigo'
  | 'professional-light'
  | 'graphite-cyan'
  | 'arctic-blue'
  | 'emerald-ops'
  | 'slate-amber';

export interface ThemeOption {
  name: ThemeName;
  label: string;
  description: string;
  scheme: 'dark' | 'light';
}

export const defaultTheme: ThemeName = 'professional-light';

export const THEME_STORAGE_KEY = 'microservicios-pos-theme';

export const themeOptions: ThemeOption[] = [
  {
    name: 'midnight-indigo',
    label: 'Midnight Indigo',
    description: 'Tema base actual del POS con acentos indigo y violeta.',
    scheme: 'dark',
  },
  {
    name: 'professional-light',
    label: 'Professional Light',
    description: 'Base clara profesional para POS SaaS con jerarquia slate y acento azul reservado.',
    scheme: 'light',
  },
  {
    name: 'graphite-cyan',
    label: 'Graphite Cyan',
    description: 'Base grafito con acentos cian y azules.',
    scheme: 'dark',
  },
  {
    name: 'arctic-blue',
    label: 'Arctic Blue',
    description: 'Superficies claras con una firma visual azul polar.',
    scheme: 'light',
  },
  {
    name: 'emerald-ops',
    label: 'Emerald Ops',
    description: 'Identidad operativa verde esmeralda con contraste oscuro.',
    scheme: 'dark',
  },
  {
    name: 'slate-amber',
    label: 'Slate Amber',
    description: 'Base slate con acentos ambar y dorados.',
    scheme: 'dark',
  },
];

const themeNames = new Set<ThemeName>(themeOptions.map((theme) => theme.name));
const themeOptionByName = new Map<ThemeName, ThemeOption>(
  themeOptions.map((theme) => [theme.name, theme]),
);

export function isThemeName(value: string): value is ThemeName {
  return themeNames.has(value as ThemeName);
}

export function getThemeOption(theme: ThemeName) {
  return themeOptionByName.get(theme) ?? themeOptionByName.get(defaultTheme)!;
}

export function resolveThemeName(_value: string | null | undefined): ThemeName {
  // Theme switching is locked while preserving the other theme definitions.
  return defaultTheme;
}

export function readStoredTheme(): ThemeName {
  if (typeof window === 'undefined') {
    return defaultTheme;
  }

  const theme = resolveThemeName(window.localStorage.getItem(THEME_STORAGE_KEY));
  persistTheme(theme);
  return theme;
}

export function persistTheme(theme: ThemeName) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, resolveThemeName(theme));
}

export function applyThemeToDocument(theme: ThemeName) {
  if (typeof document === 'undefined') {
    return;
  }

  const resolvedTheme = resolveThemeName(theme);
  const option = getThemeOption(resolvedTheme);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = option.scheme;
}

export function initializeTheme() {
  const theme = readStoredTheme();
  applyThemeToDocument(theme);
  return theme;
}
