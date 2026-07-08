import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../lib/activity-log';
import { requireSessionUser } from '../../../../lib/auth';
import { getInboxSummary, listEmailRecords, upsertSyncedEmailRecords } from '../../../../lib/email-records';
import { fetchLatestGmailMessages } from '../../../../lib/gmail-local';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let user;
  try { user = await requireSessionUser(); } catch { return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 }); }
  let payload: { limit?: number; pageToken?: string } = {};
  try { payload = (await request.json().catch(() => ({}))) as { limit?: number; pageToken?: string }; } catch { payload = {}; }
  const limit = Math.max(1, Math.min(25, Number(payload.limit ?? 10)));

  try {
    const gmailPayload = await fetchLatestGmailMessages(limit);
    const savedRecords = await upsertSyncedEmailRecords(user.email, gmailPayload.messages);
    const [records, summary] = await Promise.all([listEmailRecords(user.email), getInboxSummary(user.email)]);
    await addActivityLog(user.email, 'gmail_synced', `Synced ${gmailPayload.imported_count} Gmail messages and persisted ${savedRecords.length} records.`, { importedCount: gmailPayload.imported_count, persistedCount: savedRecords.length });
    return NextResponse.json({ importedCount: gmailPayload.imported_count, persistedCount: savedRecords.length, nextPageToken: gmailPayload.next_page_token ?? null, records, summary, sessionUser: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync Gmail.';
    const status = message.includes('not connected') || message.includes('missing') ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
