const TOKEN_STORAGE_KEY = 'microservicios-pos-token';

let accessToken: string | null = null;

export function getStoredToken() {
  if (accessToken) {
    return accessToken;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  accessToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  return accessToken;
}

export function setStoredToken(token: string) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function clearStoredToken() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}
