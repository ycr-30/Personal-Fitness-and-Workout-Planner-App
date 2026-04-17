export const AUTH_SERVER_ORIGIN =
  String(import.meta.env.VITE_AUTH_SERVER_ORIGIN || '').trim() ||
  (import.meta.env.DEV ? 'http://localhost:4000' : '')

export const AUTH_SERVER_CONFIG_ERROR =
  'Auth server is not configured for this deployment. Please set VITE_AUTH_SERVER_ORIGIN.'

export function isAuthServerConfigured() {
  return Boolean(AUTH_SERVER_ORIGIN)
}

export function buildAuthServerUrl(path = '/') {
  if (!AUTH_SERVER_ORIGIN) return path
  return new URL(path, AUTH_SERVER_ORIGIN).toString()
}
