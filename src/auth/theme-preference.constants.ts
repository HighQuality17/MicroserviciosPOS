export const themePreferenceValues = [
  'midnight-indigo',
  'graphite-cyan',
  'arctic-blue',
  'emerald-ops',
  'slate-amber',
] as const;

export const defaultThemePreference = 'midnight-indigo';

export type ThemePreference = (typeof themePreferenceValues)[number];

export function isThemePreference(
  value: string | null | undefined,
): value is ThemePreference {
  return Boolean(value) && themePreferenceValues.includes(value as ThemePreference);
}

export function resolveThemePreference(
  value: string | null | undefined,
): ThemePreference {
  return isThemePreference(value) ? value : defaultThemePreference;
}
