import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../lib/activity-log';
import { destroySession, getSessionUser, SESSION_COOKIE } from '../../../../lib/auth';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (user) await addActivityLog(user.email, 'logout', `Signed out of Inbox Guardian for ${user.email}.`);
  await destroySession();
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
