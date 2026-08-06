import { NextResponse } from 'next/server';
import { addActivityLog } from '../../../../lib/activity-log';
import { requireSessionUser } from '../../../../lib/auth';
import { getInboxSummary, listEmailRecords, upsertSyncedEmailRecords } from '../../../../lib/email-records';
import { fetchLatestGmailMessages } from '../../../../lib/gmail-local';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: 'Your Inbox Outlaw session expired. Log in again.' }, { status: 401 });
  }

  let payload: { limit?: number } = {};
  try {
    payload = (await request.json().catch(() => ({}))) as { limit?: number };
  } catch {
    payload = {};
  }

  const limit = Math.max(1, Math.min(25, Number(payload.limit ?? 10)));

  try {
    const gmailPayload = await fetchLatestGmailMessages(limit);
    const savedRecords = await upsertSyncedEmailRecords(user.email, gmailPayload.messages);
    const [records, summary] = await Promise.all([
      listEmailRecords(user.email),
      getInboxSummary(user.email),
    ]);

    await addActivityLog(
      user.email,
      'gmail_synced',
      `Synced ${gmailPayload.imported_count} Gmail messages and persisted ${savedRecords.length} records.`,
      {
        importedCount: gmailPayload.imported_count,
        persistedCount: savedRecords.length,
        totalRecords: summary.total,
      },
    );

    return NextResponse.json(
      {
        importedCount: gmailPayload.imported_count,
        persistedCount: savedRecords.length,
        nextPageToken: gmailPayload.next_page_token ?? null,
        records,
        summary,
        sessionUser: user,
        syncedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      },
    );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unable to sync Gmail.';
    const needsReconnect = /not connected|missing|refresh|token|oauth|401|403|invalid_grant|unauthorized/i.test(rawMessage);
    const publicMessage = needsReconnect
      ? 'Your Gmail authorization needs to be renewed. Click Connect Gmail and approve read-only access again.'
      : rawMessage;

    try {
      await addActivityLog(user.email, 'gmail_synced', publicMessage, {
        outcome: 'failed',
        technicalMessage: rawMessage,
        needsReconnect,
      });
    } catch {
      // Do not hide the original sync error if activity logging fails.
    }

    return NextResponse.json(
      { error: publicMessage, needsReconnect },
      {
        status: needsReconnect ? 409 : 502,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
