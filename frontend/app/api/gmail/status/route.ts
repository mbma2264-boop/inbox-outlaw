import { NextResponse } from 'next/server';
import { requireSessionUser } from '../../../../lib/auth';
import type { GmailStatus } from '../../../../lib/types';

export const runtime = 'nodejs';
const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET() {
  let user;
  try { user = await requireSessionUser(); } catch { return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 }); }
  const response = await fetch(`${BACKEND_API_BASE_URL}/api/gmail/status`, { cache: 'no-store', headers: { 'X-Demo-User': user.email } });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: `Gmail status request failed with ${response.status}.`, detail }, { status: 502 });
  }
  const payload = (await response.json()) as GmailStatus;
  return NextResponse.json(payload);
}
