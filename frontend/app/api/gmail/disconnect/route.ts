import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../lib/activity-log';
import { requireSessionUser } from '../../../../lib/auth';

export const runtime = 'nodejs';
const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST() {
  let user;
  try { user = await requireSessionUser(); } catch { return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 }); }
  const response = await fetch(`${BACKEND_API_BASE_URL}/api/gmail/disconnect`, { method: 'POST', cache: 'no-store', headers: { 'X-Demo-User': user.email } });
  const payload = (await response.json().catch(() => null)) as { detail?: string; note?: string } | null;
  if (!response.ok) return NextResponse.json({ error: payload?.detail || `Disconnect failed with ${response.status}.` }, { status: 502 });
  await addActivityLog(user.email, 'gmail_disconnected', 'Disconnected Gmail connection for this user session.');
  return NextResponse.json(payload);
}
