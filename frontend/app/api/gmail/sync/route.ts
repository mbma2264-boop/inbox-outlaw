import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../lib/activity-log';
import { requireSessionUser } from '../../../../lib/auth';
import { getInboxSummary, listEmailRecords, upsertSyncedEmailRecords } from '../../../../lib/email-records';
import type { GmailSyncMessage } from '../../../../lib/types';

export const runtime = 'nodejs';
const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  let user;
  try { user = await requireSessionUser(); } catch { return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 }); }
  let payload: { limit?: number; pageToken?: string } = {};
  try { payload = (await request.json().catch(() => ({}))) as { limit?: number; pageToken?: string }; } catch { payload = {}; }
  const limit = Math.max(1, Math.min(25, Number(payload.limit ?? 10)));
  const backendUrl = new URL(`${BACKEND_API_BASE_URL}/api/gmail/sync`);
  backendUrl.searchParams.set('limit', String(limit));
  if (payload.pageToken) backendUrl.searchParams.set('page_token', payload.pageToken);
  const response = await fetch(backendUrl, { method: 'POST', cache: 'no-store', headers: { 'X-Demo-User': user.email } });
  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { detail?: string } | null;
    return NextResponse.json({ error: errorPayload?.detail || `Gmail sync failed with ${response.status}.` }, { status: response.status === 409 ? 409 : 502 });
  }
  const backendPayload = (await response.json()) as { imported_count: number; next_page_token?: string | null; messages: GmailSyncMessage[] };
  const savedRecords = await upsertSyncedEmailRecords(user.email, backendPayload.messages);
  const [records, summary] = await Promise.all([listEmailRecords(user.email), getInboxSummary(user.email)]);
  await addActivityLog(user.email, 'gmail_synced', `Synced ${backendPayload.imported_count} Gmail messages and persisted ${savedRecords.length} records.`, { importedCount: backendPayload.imported_count, persistedCount: savedRecords.length });
  return NextResponse.json({ importedCount: backendPayload.imported_count, persistedCount: savedRecords.length, nextPageToken: backendPayload.next_page_token ?? null, records, summary, sessionUser: user });
}
