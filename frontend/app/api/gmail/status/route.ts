import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { getMissingGmailEnv, readStoredTokens } from '../../../../lib/gmail-local';
import type { GmailStatus } from '../../../../lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  const missing = getMissingGmailEnv();
  if (missing.length > 0) {
    const payload: GmailStatus = {
      connected: false,
      has_refresh_token: false,
      scopes: [],
      token_expiry: null,
      note: `Gmail OAuth is not configured yet. Missing: ${missing.join(', ')}.`,
    };
    return NextResponse.json(payload);
  }

  const tokens = await readStoredTokens();
  const payload: GmailStatus = {
    connected: Boolean(tokens?.access_token || tokens?.refresh_token),
    has_refresh_token: Boolean(tokens?.refresh_token),
    scopes: tokens?.scope ? tokens.scope.split(/\s+/).filter(Boolean) : [],
    token_expiry: tokens?.expires_at ? new Date(tokens.expires_at).toISOString() : null,
    note: tokens?.access_token || tokens?.refresh_token ? 'Gmail is connected.' : 'Gmail is not connected yet.',
  };

  return NextResponse.json(payload);
}
