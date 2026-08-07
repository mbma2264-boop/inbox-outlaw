import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../lib/activity-log';
import { requireSessionUser } from '../../../../lib/auth';
import { clearStoredTokens } from '../../../../lib/gmail-local';

export const runtime = 'nodejs';

async function disconnect() {
  const user = await requireSessionUser();
  await clearStoredTokens();
  try {
    await addActivityLog(user.email, 'gmail_disconnected', 'Disconnected Gmail connection for this user session.');
  } catch {
    // Disconnect should not fail just because activity logging is unavailable.
  }
}

export async function POST() {
  try {
    await disconnect();
    return NextResponse.json({ note: 'Gmail disconnected successfully.' });
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }
}

export async function GET(request: Request) {
  try {
    await disconnect();
    return NextResponse.redirect(new URL('/settings?gmail=disconnected', request.url));
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
