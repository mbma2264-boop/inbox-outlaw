import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import { getBackendApiBaseUrl, parseBackendError } from '../../../../lib/backend';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get('return_to') || `${url.origin}/dashboard`;
    const backendUrl = new URL('/api/gmail/oauth/start', getBackendApiBaseUrl(url.origin));
    backendUrl.searchParams.set('return_to', returnTo);

    const response = await fetch(backendUrl, {
      headers: { 'X-Demo-User': user.email },
      cache: 'no-store',
    });

    if (!response.ok) {
      const message = await parseBackendError(response, `Backend Gmail connect request failed with ${response.status}.`);
      return NextResponse.json({ error: message }, { status: response.status >= 500 ? 502 : response.status });
    }

    const payload = (await response.json()) as { authorization_url?: string; authorizationUrl?: string; note?: string };
    const authorizationUrl = payload.authorization_url || payload.authorizationUrl;
    if (!authorizationUrl) {
      return NextResponse.json({ error: 'Backend did not return a Gmail authorization URL.' }, { status: 502 });
    }

    return NextResponse.json({ authorizationUrl, note: payload.note || 'Opening Google consent screen.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Google authorization URL.';
    return NextResponse.json({ error: `Gmail connect request failed: ${message}` }, { status: 500 });
  }
}
