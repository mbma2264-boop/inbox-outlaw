import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../../lib/activity-log';
import { createSession, SESSION_COOKIE } from '../../../../../lib/auth';
import { verifyGoogleLogin } from '../../../../../lib/google-login';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const current = new URL(request.url);
  const error = current.searchParams.get('error');
  if (error) {
    const url = new URL('/login', current.origin);
    url.searchParams.set('error', error);
    return NextResponse.redirect(url, 302);
  }

  const code = current.searchParams.get('code');
  const state = current.searchParams.get('state');
  if (!code) {
    const url = new URL('/login', current.origin);
    url.searchParams.set('error', 'Google did not return an authorization code.');
    return NextResponse.redirect(url, 302);
  }

  try {
    const verified = await verifyGoogleLogin(current.origin, code, state);
    const { user, token, maxAge } = await createSession(verified.email);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge,
    });
    await addActivityLog(user.email, 'login', `Signed in to Inbox Outlaw with verified Google account ${user.email}.`, { provider: 'google', verified: true });
    return NextResponse.redirect(new URL(verified.returnTo, current.origin), 302);
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : 'Google sign-in failed.';
    const url = new URL('/login', current.origin);
    url.searchParams.set('error', message);
    return NextResponse.redirect(url, 302);
  }
}
