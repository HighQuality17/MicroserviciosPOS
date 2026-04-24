import { api } from '@/services/api/client';

const defaultApiUrl = 'http://localhost:3000/api';
const absoluteUrlPattern = /^[a-z][a-z\d+\-.]*:/i;
const uploadsAssetPathPattern = /^\/uploads(?:\/|$)/i;

export function resolveApiAssetUrl(value?: string | null) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  if (absoluteUrlPattern.test(normalizedValue)) {
    return normalizedValue;
  }

  const assetPath = normalizedValue.startsWith('/') ? normalizedValue : `/${normalizedValue}`;
  const apiOrigin = resolveApiAssetOrigin(assetPath);

  if (!apiOrigin) {
    return assetPath;
  }

  return new URL(assetPath, apiOrigin).toString();
}

function resolveApiAssetOrigin(assetPath: string) {
  const baseUrl = api.defaults.baseURL;
  const fallbackOrigin =
    typeof window !== 'undefined' ? window.location.origin : resolveDefaultApiOrigin();

  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    return import.meta.env.DEV && uploadsAssetPathPattern.test(assetPath)
      ? resolveDevApiOrigin()
      : null;
  }

  const normalizedBaseUrl = baseUrl.trim();

  if (absoluteUrlPattern.test(normalizedBaseUrl)) {
    return new URL(normalizedBaseUrl).origin;
  }

  if (import.meta.env.DEV && uploadsAssetPathPattern.test(assetPath)) {
    return resolveDevApiOrigin();
  }

  return new URL(normalizedBaseUrl, fallbackOrigin).origin;
}

function resolveDevApiOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL?.trim();

  if (apiUrl && absoluteUrlPattern.test(apiUrl)) {
    return new URL(apiUrl).origin;
  }

  return resolveDefaultApiOrigin();
}

function resolveDefaultApiOrigin() {
  return new URL(defaultApiUrl).origin;
}
