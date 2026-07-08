import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../lib/activity-log';
import { requireSessionUser } from '../../../../lib/auth';
import { getBackendApiBaseUrl, parseBackendError } from '../../../../lib/backend';
import { clearStoredTokens } from '../../../../lib/gmail-local';
import type { GmailStatus } from '../../../../lib/types';

export const runtime = 'nodejs';

export async function POST() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  try {
    const backendUrl = new URL('/api/gmail/disconnect', getBackendApiBaseUrl());
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'X-Demo-User': user.email },
      cache: 'no-store',
    });

    if (!response.ok) {
      const message = await parseBackendError(response, `Gmail disconnect failed with ${response.status}.`);
      return NextResponse.json({ error: message }, { status: response.status >= 500 ? 502 : response.status });
    }

    await clearStoredTokens();
    const payload = (await response.json()) as GmailStatus;
    const note = payload.note || 'Gmail disconnected successfully.';
    await addActivityLog(user.email, 'gmail_disconnected', note);

    return NextResponse.json({ ...payload, note });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to disconnect Gmail.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
