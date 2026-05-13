import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getBackendBaseUrl(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configured = (process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();

  if (!configured) {
    return { error: 'BACKEND_API_BASE_URL is not set in Vercel. Add the public backend URL, then redeploy.' };
  }

  let backendUrl: URL;
  try {
    backendUrl = new URL(configured);
  } catch {
    return { error: `BACKEND_API_BASE_URL is not a valid URL: ${configured}` };
  }

  if (backendUrl.origin === requestOrigin) {
    return { error: 'BACKEND_API_BASE_URL is pointing to this frontend Vercel app. It must point to the backend API deployment instead.' };
  }

  return { backendBaseUrl: backendUrl.origin };
}

export async function GET(request: Request) {
  const currentUrl = new URL(request.url);
  const backend = getBackendBaseUrl(request.url);

  if ('error' in backend) {
    const dashboardUrl = new URL('/dashboard', currentUrl.origin);
    dashboardUrl.searchParams.set('gmail', 'error');
    dashboardUrl.searchParams.set('message', backend.error);
    return NextResponse.redirect(dashboardUrl, 302);
  }

  const callbackUrl = new URL('/api/gmail/oauth/callback', backend.backendBaseUrl);
  currentUrl.searchParams.forEach((value, key) => callbackUrl.searchParams.set(key, value));

  return NextResponse.redirect(callbackUrl, 302);
}
