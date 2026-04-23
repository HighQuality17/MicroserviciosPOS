import { api } from '@/services/api/client';

const absoluteUrlPattern = /^[a-z][a-z\d+\-.]*:/i;

export function resolveApiAssetUrl(value?: string | null) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  if (absoluteUrlPattern.test(normalizedValue)) {
    return normalizedValue;
  }

  const baseUrl = api.defaults.baseURL;
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    return normalizedValue;
  }

  const fallbackOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const apiOrigin = new URL(baseUrl, fallbackOrigin).origin;
  const assetPath = normalizedValue.startsWith('/') ? normalizedValue : `/${normalizedValue}`;

  return new URL(assetPath, apiOrigin).toString();
}
