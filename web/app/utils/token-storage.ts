export const AUTH_TOKEN_KEY = 'floofs_access_token';

export function getAccessToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.dispatchEvent(new Event('floofs-auth-changed'));
}

export function clearAccessToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event('floofs-auth-changed'));
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}