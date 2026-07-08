import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { getBackendApiBaseUrl, parseBackendError } from '../../../../lib/backend';
import type { GmailStatus } from '../../../../lib/types';

export const runtime = 'nodejs';

const disconnectedStatus = (note: string): GmailStatus => ({
  connected: false,
  has_refresh_token: false,
  scopes: [],
  token_expiry: null,
  note,
});

export async function GET() {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  try {
    const backendUrl = new URL('/api/gmail/status', getBackendApiBaseUrl());
    const response = await fetch(backendUrl, {
      headers: { 'X-Demo-User': user.email },
      cache: 'no-store',
    });

    if (!response.ok) {
      const message = await parseBackendError(response, `Gmail status request failed with ${response.status}.`);
      return NextResponse.json(disconnectedStatus(message));
    }

    return NextResponse.json((await response.json()) as GmailStatus);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load Gmail status.';
    return NextResponse.json(disconnectedStatus(message));
  }
}
