export class ApiRequestError extends Error {
  statusCode: number;
  path?: string;

  constructor(message: string, statusCode: number, path?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.path = path;
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiRequestError && error.statusCode === 401;
}

export function isForbiddenError(error: unknown) {
  return error instanceof ApiRequestError && error.statusCode === 403;
}
