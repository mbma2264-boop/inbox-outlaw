import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../lib/activity-log';
import { requireSessionUser } from '../../../../lib/auth';
import { clearStoredTokens } from '../../../../lib/gmail-local';

export const runtime = 'nodejs';

export async function POST() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  await clearStoredTokens();
  await addActivityLog(user.email, 'gmail_disconnected', 'Disconnected Gmail connection for this user session.');

  return NextResponse.json({ note: 'Gmail disconnected successfully.' });
}
