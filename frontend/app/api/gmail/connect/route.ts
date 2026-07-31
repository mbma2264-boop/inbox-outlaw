import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { createProductionGoogleAuthorizationUrl } from '../../../../lib/gmail-oauth-production';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get('return_to') || `${url.origin}/dashboard`;
    const authorizationUrl = await createProductionGoogleAuthorizationUrl(url.origin, returnTo);
    return NextResponse.json({ authorizationUrl, note: 'Opening Google consent screen.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Google authorization URL.';
    return NextResponse.json({ error: `Gmail connect request failed: ${message}` }, { status: 500 });
  }
}
