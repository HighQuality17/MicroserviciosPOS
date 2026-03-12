import { isForbiddenError, isUnauthorizedError } from '@/services/api/errors';

export function isAccessDeniedError(error: unknown) {
  return isForbiddenError(error);
}

export function isSessionExpiredError(error: unknown) {
  return isUnauthorizedError(error);
}

export function translateProtectedError(
  error: unknown,
  fallbackMessage: string,
) {
  if (isForbiddenError(error)) {
    return 'Tu rol actual no tiene permiso para consultar este módulo.';
  }

  if (isUnauthorizedError(error)) {
    return 'Tu sesión expiró. Inicia sesión nuevamente.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
