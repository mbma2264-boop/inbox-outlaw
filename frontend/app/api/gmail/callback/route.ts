import { NextResponse } from 'next/server';
import { handleGoogleCallback } from '../../../../../frontend/lib/gmail-local';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard?gmail_error=missing_oauth_parameters', url.origin));
    }

    const redirectTo = await handleGoogleCallback(url.origin, code, state);
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  } catch (error) {
    const url = new URL(request.url);
    const message = error instanceof Error ? error.message : 'Google OAuth failed.';
    return NextResponse.redirect(new URL(`/dashboard?gmail_error=${encodeURIComponent(message)}`, url.origin));
  }
}
