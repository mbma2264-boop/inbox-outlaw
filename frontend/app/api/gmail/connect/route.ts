import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';

export const runtime = 'nodejs';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || `${url.origin}/dashboard`;
  const backendUrl = new URL(`${BACKEND_API_BASE_URL}/api/gmail/oauth/start`);
  backendUrl.searchParams.set('return_to', returnTo);
  const response = await fetch(backendUrl, { cache: 'no-store', headers: { 'X-Demo-User': user.email } });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: `Gmail connect request failed with ${response.status}.`, detail }, { status: 502 });
  }
  const payload = (await response.json()) as { authorization_url: string; state: string; note: string };
  return NextResponse.json({ authorizationUrl: payload.authorization_url, state: payload.state, note: payload.note });
}
