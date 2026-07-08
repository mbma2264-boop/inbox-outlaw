const PRODUCTION_BACKEND_API_BASE_URL = 'https://inbox-outlaw-backend.onrender.com';

function isLocalBackendUrl(value: string) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function configuredBackendUrl() {
  const configuredUrl = (
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).trim();

  if (configuredUrl && !(process.env.NODE_ENV === 'production' && isLocalBackendUrl(configuredUrl))) {
    return configuredUrl;
  }

  return PRODUCTION_BACKEND_API_BASE_URL;
}

export function getBackendApiBaseUrl(requestOrigin?: string) {
  const configured = configuredBackendUrl();
  let backendUrl: URL;

  try {
    backendUrl = new URL(configured);
  } catch {
    throw new Error(`BACKEND_API_BASE_URL is not a valid URL: ${configured}`);
  }

  if (requestOrigin && backendUrl.origin === requestOrigin) {
    throw new Error('BACKEND_API_BASE_URL is pointing to this frontend Vercel app. It must point to the backend API deployment instead.');
  }

  return backendUrl.origin;
}

export function getBackendDocsUrl() {
  return `${getBackendApiBaseUrl()}/docs`;
}

export async function parseBackendError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { detail?: string; error?: string } | null;
  return payload?.detail || payload?.error || fallback;
}
