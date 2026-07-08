import { NextResponse } from 'next/server';
import { handleGoogleCallback } from '../../../../../lib/gmail-local';

export const runtime = 'nodejs';

function dashboardRedirect(origin: string, gmail: 'connected' | 'error', message?: string) {
  const url = new URL('/dashboard', origin);
  url.searchParams.set('gmail', gmail);
  if (gmail === 'connected') url.searchParams.set('connected', 'true');
  if (message) url.searchParams.set('message', message);
  return NextResponse.redirect(url, 302);
}

function safeReturnTo(rawReturnTo: string, origin: string) {
  try {
    const returnTo = new URL(rawReturnTo, origin);
    if (returnTo.origin === origin) return returnTo;
  } catch {
    // Fall back below.
  }
  return new URL('/dashboard', origin);
}

export async function GET(request: Request) {
  const currentUrl = new URL(request.url);
  const code = currentUrl.searchParams.get('code');
  const state = currentUrl.searchParams.get('state');
  const error = currentUrl.searchParams.get('error');

  if (error) {
    return dashboardRedirect(currentUrl.origin, 'error', error);
  }

  if (!code || !state) {
    return dashboardRedirect(currentUrl.origin, 'error', 'Missing Google authorization code or state.');
  }

  try {
    const returnTo = await handleGoogleCallback(currentUrl.origin, code, state);
    const redirectUrl = safeReturnTo(returnTo, currentUrl.origin);
    redirectUrl.searchParams.set('gmail', 'connected');
    redirectUrl.searchParams.set('connected', 'true');
    return NextResponse.redirect(redirectUrl, 302);
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : 'Gmail connection failed.';
    return dashboardRedirect(currentUrl.origin, 'error', message);
  }
}
