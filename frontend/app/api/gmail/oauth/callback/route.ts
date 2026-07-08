import { NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '../../../../../lib/backend';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const currentUrl = new URL(request.url);
  let backendBaseUrl: string;

  try {
    backendBaseUrl = getBackendApiBaseUrl(currentUrl.origin);
  } catch (error) {
    const dashboardUrl = new URL('/dashboard', currentUrl.origin);
    dashboardUrl.searchParams.set('gmail', 'error');
    dashboardUrl.searchParams.set(
      'message',
      error instanceof Error ? error.message : 'gmail_connect_failed',
    );
    return NextResponse.redirect(dashboardUrl, 302);
  }

  const callbackUrl = new URL('/api/gmail/oauth/callback', backendBaseUrl);
  currentUrl.searchParams.forEach((value, key) => callbackUrl.searchParams.set(key, value));

  return NextResponse.redirect(callbackUrl, 302);
}
