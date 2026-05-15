import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { createGoogleAuthorizationUrl, getMissingGmailEnv } from '../../../../lib/gmail-local';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  const missing = getMissingGmailEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing Gmail environment variable(s): ${missing.join(', ')}.` },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || `${url.origin}/dashboard`;
  const authorizationUrl = await createGoogleAuthorizationUrl(url.origin, returnTo);
  return NextResponse.json({ authorizationUrl, note: 'Opening Google consent screen.' });
}
