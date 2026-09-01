import { NextResponse } from 'next/server';
import { createGoogleLoginUrl } from '../../../../../lib/google-login';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const current = new URL(request.url);
    const returnTo = current.searchParams.get('return_to') || '/dashboard';
    return NextResponse.redirect(createGoogleLoginUrl(current.origin, returnTo), 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start Google sign-in.';
    const url = new URL('/login', request.url);
    url.searchParams.set('error', message);
    return NextResponse.redirect(url, 302);
  }
}
