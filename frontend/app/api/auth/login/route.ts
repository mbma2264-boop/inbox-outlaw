import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../lib/activity-log';
import { createSession, normalizeEmail, SESSION_COOKIE } from '../../../../lib/auth';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const formData = await request.formData();
  const email = normalizeEmail(String(formData.get('email') || ''));
  const redirectTo = String(formData.get('redirect_to') || '/dashboard');
  if (!email || !email.includes('@')) return NextResponse.redirect(new URL('/login?error=invalid_email', request.url), { status: 303 });
  const { user, token, maxAge } = await createSession(email);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge });
  await addActivityLog(user.email, 'login', `Signed in to Inbox Guardian as ${user.email}.`, { isDemoUser: user.isDemoUser });
  return NextResponse.redirect(new URL(redirectTo, request.url), { status: 303 });
}
