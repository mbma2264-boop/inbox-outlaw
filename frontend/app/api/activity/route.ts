import { NextResponse } from 'next/server';
import { addActivityLog, listActivityLogs } from '../../../lib/activity-log';
import { requireSessionUser } from '../../../lib/auth';
import type { ActivityLogEntry } from '../../../lib/types';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const items = await listActivityLogs(user.email, 25);
    return NextResponse.json({ items, sessionUser: user });
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const payload = (await request.json()) as Partial<ActivityLogEntry> & { metadata?: Record<string, unknown> | null };
    if (!payload.type || !payload.message) {
      return NextResponse.json({ error: 'Missing activity type or message.' }, { status: 400 });
    }
    const item = await addActivityLog(user.email, payload.type, payload.message, payload.metadata ?? null);
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }
}
